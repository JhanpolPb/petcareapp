// CU-11 Gestionar usuarios · CU-16 Generar reportes
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { ah, esFecha, hoy, idValido, sumarDias } from '../utils.js';
import { publico, validarDatos } from './auth.js';

const r = Router();
r.param('id', idValido);
const ROLES = ['propietario', 'admin'];

r.get('/usuarios', ah(async (_req, res) => {
  const { rows } = await query(
    `SELECT p.id_propietario, p.nombre, p.telefono, p.correo, p.rol, to_char(p.creado_en, 'YYYY-MM-DD') AS creado_en,
            COUNT(m.id_mascota)::int AS mascotas
     FROM propietario p LEFT JOIN mascota m ON m.id_propietario = p.id_propietario
     GROUP BY p.id_propietario ORDER BY p.nombre`
  );
  res.json(rows);
}));

// Crear usuario (propietario o administrador)
r.post('/usuarios', ah(async (req, res) => {
  const { nombre, telefono, correo, contrasena, rol = 'propietario' } = req.body || {};
  const err = validarDatos({ nombre, telefono, correo });
  if (err) return res.status(400).json({ error: err });
  if (!ROLES.includes(rol)) return res.status(400).json({ error: 'Rol inválido' });
  if (typeof contrasena !== 'string' || contrasena.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener mínimo 8 caracteres' });
  }
  const email = correo.trim().toLowerCase();
  const dup = await query('SELECT 1 FROM propietario WHERE correo = $1', [email]);
  if (dup.rows.length) return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });
  const { rows } = await query(
    `INSERT INTO propietario (nombre, telefono, correo, contrasena, rol) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [nombre.trim(), telefono.trim(), email, await bcrypt.hash(contrasena, 10), rol]
  );
  res.status(201).json(publico(rows[0]));
}));

// Editar usuario: datos de contacto, rol y, opcionalmente, nueva contraseña
r.put('/usuarios/:id', ah(async (req, res) => {
  const { nombre, telefono, correo, contrasena, rol } = req.body || {};
  const err = validarDatos({ nombre, telefono, correo });
  if (err) return res.status(400).json({ error: err });
  if (!ROLES.includes(rol)) return res.status(400).json({ error: 'Rol inválido' });
  const id = Number(req.params.id);
  if (id === req.user.id && rol !== 'admin') return res.status(400).json({ error: 'No puede quitarse a sí mismo el rol de administrador' });
  const email = correo.trim().toLowerCase();
  const dup = await query('SELECT 1 FROM propietario WHERE correo = $1 AND id_propietario <> $2', [email, id]);
  if (dup.rows.length) return res.status(409).json({ error: 'Ese correo ya está en uso' });

  const params = [nombre.trim(), telefono.trim(), email, rol];
  let sql = 'UPDATE propietario SET nombre = $1, telefono = $2, correo = $3, rol = $4';
  if (contrasena) {
    if (contrasena.length < 8) return res.status(400).json({ error: 'La contraseña debe tener mínimo 8 caracteres' });
    params.push(await bcrypt.hash(contrasena, 10));
    sql += `, contrasena = $${params.length}`;
  }
  params.push(id);
  const { rows } = await query(`${sql} WHERE id_propietario = $${params.length} RETURNING *`, params);
  if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(publico(rows[0]));
}));

r.delete('/usuarios/:id', ah(async (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'No puede eliminar su propia cuenta' });
  const { rows } = await query('DELETE FROM propietario WHERE id_propietario = $1 RETURNING id_propietario', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ ok: true });
}));

// CU-16 Reporte general. ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD filtra citas, servicios y vacunas por fecha.
r.get('/reportes', ah(async (req, res) => {
  const h = hoy();
  const desde = esFecha(req.query.desde) ? req.query.desde : '1900-01-01';
  const hasta = esFecha(req.query.hasta) ? req.query.hasta : '2999-12-31';
  if (desde > hasta) return res.status(400).json({ error: 'La fecha inicial no puede ser posterior a la final' });
  const rango = [desde, hasta];

  // Última dosis registrada de cada vacuna por mascota (para saber cuáles están vencidas)
  const ULTIMAS = `SELECT DISTINCT ON (id_mascota, lower(nombre)) fecha_proxima
                   FROM vacuna ORDER BY id_mascota, lower(nombre), fecha_aplicacion DESC`;

  const [tot, citasEstado, serviciosEstado, serviciosTipo, especies, citasMes, serviciosMes, topProp, horas] = await Promise.all([
    query(`SELECT
             (SELECT COUNT(*)::int FROM propietario WHERE rol = 'propietario') AS propietarios,
             (SELECT COUNT(*)::int FROM mascota) AS mascotas,
             (SELECT COUNT(*)::int FROM cita WHERE fecha BETWEEN $1 AND $2) AS citas,
             (SELECT COUNT(*)::int FROM cita WHERE fecha BETWEEN $1 AND $2 AND estado = 'Atendida') AS citas_atendidas,
             (SELECT COUNT(*)::int FROM cita WHERE fecha BETWEEN $1 AND $2 AND estado = 'Cancelada') AS citas_canceladas,
             (SELECT COUNT(*)::int FROM servicio WHERE fecha_servicio BETWEEN $1 AND $2) AS servicios,
             (SELECT COUNT(*)::int FROM servicio WHERE fecha_servicio BETWEEN $1 AND $2 AND estado = 'Realizado') AS servicios_realizados,
             (SELECT COUNT(*)::int FROM vacuna WHERE fecha_aplicacion BETWEEN $1 AND $2) AS vacunas,
             (SELECT COUNT(*)::int FROM cita WHERE estado = 'Programada' AND fecha = $3) AS citas_hoy,
             (SELECT COUNT(*)::int FROM cita WHERE estado = 'Programada' AND fecha >= $3) AS citas_proximas,
             (SELECT COUNT(*)::int FROM servicio WHERE estado = 'Solicitado') AS servicios_pendientes,
             (SELECT COUNT(*)::int FROM (${ULTIMAS}) u WHERE fecha_proxima < $3) AS vacunas_vencidas,
             (SELECT COUNT(*)::int FROM (${ULTIMAS}) u WHERE fecha_proxima BETWEEN $3 AND $4) AS vacunas_por_vencer`,
      [...rango, h, sumarDias(h, 30)]),
    query(`SELECT estado AS k, COUNT(*)::int AS total FROM cita WHERE fecha BETWEEN $1 AND $2 GROUP BY estado ORDER BY total DESC`, rango),
    query(`SELECT estado AS k, COUNT(*)::int AS total FROM servicio WHERE fecha_servicio BETWEEN $1 AND $2 GROUP BY estado ORDER BY total DESC`, rango),
    query(`SELECT tipo_servicio AS k, COUNT(*)::int AS total FROM servicio WHERE fecha_servicio BETWEEN $1 AND $2 GROUP BY tipo_servicio ORDER BY total DESC`, rango),
    query(`SELECT especie AS k, COUNT(*)::int AS total FROM mascota GROUP BY especie ORDER BY total DESC`),
    query(`SELECT to_char(fecha, 'YYYY-MM') AS k, COUNT(*)::int AS total
           FROM cita WHERE fecha BETWEEN $1 AND $2 GROUP BY 1 ORDER BY 1 DESC LIMIT 12`, rango),
    query(`SELECT to_char(fecha_servicio, 'YYYY-MM') AS k, COUNT(*)::int AS total
           FROM servicio WHERE fecha_servicio BETWEEN $1 AND $2 GROUP BY 1 ORDER BY 1 DESC LIMIT 12`, rango),
    query(`SELECT p.nombre AS k, COUNT(*)::int AS total
           FROM cita c JOIN mascota m ON m.id_mascota = c.id_mascota JOIN propietario p ON p.id_propietario = m.id_propietario
           WHERE c.fecha BETWEEN $1 AND $2 AND c.estado <> 'Cancelada'
           GROUP BY p.id_propietario, p.nombre ORDER BY total DESC, p.nombre LIMIT 5`, rango),
    query(`SELECT to_char(hora, 'HH24:MI') AS k, COUNT(*)::int AS total
           FROM cita WHERE fecha BETWEEN $1 AND $2 AND estado <> 'Cancelada'
           GROUP BY 1 ORDER BY total DESC, 1 LIMIT 5`, rango),
  ]);

  res.json({
    generado: new Date().toISOString(),
    desde: esFecha(req.query.desde) ? desde : null,
    hasta: esFecha(req.query.hasta) ? hasta : null,
    totales: tot.rows[0],
    citasPorEstado: citasEstado.rows,
    serviciosPorEstado: serviciosEstado.rows,
    serviciosPorTipo: serviciosTipo.rows,
    mascotasPorEspecie: especies.rows,
    citasPorMes: citasMes.rows.reverse(),
    serviciosPorMes: serviciosMes.rows.reverse(),
    propietariosFrecuentes: topProp.rows,
    horasMasSolicitadas: horas.rows,
  });
}));

export default r;

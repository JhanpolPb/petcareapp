// CU-11 Gestionar usuarios · CU-16 Generar reportes
import { Router } from 'express';
import { query } from '../db.js';
import { ah, hoy } from '../utils.js';

const r = Router();

r.get('/usuarios', ah(async (_req, res) => {
  const { rows } = await query(
    `SELECT p.id_propietario, p.nombre, p.telefono, p.correo, p.rol, p.creado_en,
            COUNT(m.id_mascota)::int AS mascotas
     FROM propietario p LEFT JOIN mascota m ON m.id_propietario = p.id_propietario
     GROUP BY p.id_propietario ORDER BY p.nombre`
  );
  res.json(rows);
}));

r.patch('/usuarios/:id/rol', ah(async (req, res) => {
  const { rol } = req.body || {};
  if (!['propietario', 'admin'].includes(rol)) return res.status(400).json({ error: 'Rol inválido' });
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'No puede cambiar su propio rol' });
  const { rows } = await query('UPDATE propietario SET rol = $1 WHERE id_propietario = $2 RETURNING id_propietario', [rol, req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ ok: true });
}));

r.delete('/usuarios/:id', ah(async (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'No puede eliminar su propia cuenta' });
  await query('DELETE FROM propietario WHERE id_propietario = $1', [req.params.id]);
  res.json({ ok: true });
}));

// CU-16 Reporte general
r.get('/reportes', ah(async (_req, res) => {
  const h = hoy();
  const [tot, citasEstado, serviciosTipo, especies, citasMes] = await Promise.all([
    query(`SELECT
             (SELECT COUNT(*)::int FROM propietario WHERE rol = 'propietario') AS propietarios,
             (SELECT COUNT(*)::int FROM mascota) AS mascotas,
             (SELECT COUNT(*)::int FROM cita) AS citas,
             (SELECT COUNT(*)::int FROM cita WHERE estado = 'Programada' AND fecha >= $1) AS citas_proximas,
             (SELECT COUNT(*)::int FROM vacuna) AS vacunas,
             (SELECT COUNT(*)::int FROM servicio) AS servicios`, [h]),
    query(`SELECT estado, COUNT(*)::int AS total FROM cita GROUP BY estado ORDER BY total DESC`),
    query(`SELECT tipo_servicio, COUNT(*)::int AS total FROM servicio GROUP BY tipo_servicio ORDER BY total DESC`),
    query(`SELECT especie, COUNT(*)::int AS total FROM mascota GROUP BY especie ORDER BY total DESC`),
    query(`SELECT to_char(fecha, 'YYYY-MM') AS mes, COUNT(*)::int AS total
           FROM cita GROUP BY 1 ORDER BY 1 DESC LIMIT 6`),
  ]);
  res.json({
    generado: new Date().toISOString(),
    totales: tot.rows[0],
    citasPorEstado: citasEstado.rows,
    serviciosPorTipo: serviciosTipo.rows,
    mascotasPorEspecie: especies.rows,
    citasPorMes: citasMes.rows.reverse(),
  });
}));

export default r;

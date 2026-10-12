// RF04 Solicitar citas · RF08 Consultar citas · RF12 Cancelar cita · CU-13 Gestionar citas (admin)
import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { ah, ahoraHM, esDomingo, esFecha, esHora, esId, hoy, HORARIOS, idValido, mascotaAutorizada } from '../utils.js';

const r = Router();
r.param('id', idValido);

const ESTADOS = ['Programada', 'Atendida', 'Cancelada'];

const SELECT = `SELECT c.id_cita, c.id_mascota, c.fecha, to_char(c.hora, 'HH24:MI') AS hora, c.motivo, c.estado,
                       m.nombre_mascota, m.especie, p.id_propietario, p.nombre AS propietario, p.telefono
                FROM cita c
                JOIN mascota m ON m.id_mascota = c.id_mascota
                JOIN propietario p ON p.id_propietario = m.id_propietario`;

// Horas libres de una fecha (sin las que ya pasaron si es hoy). idExcluir: cita que se está reprogramando.
async function horasLibres(fecha, idExcluir = 0) {
  const { rows } = await query(
    `SELECT to_char(hora, 'HH24:MI') AS hora FROM cita WHERE fecha = $1 AND estado = 'Programada' AND id_cita <> $2`,
    [fecha, idExcluir]
  );
  const ocupadas = new Set(rows.map((x) => x.hora));
  const ahora = fecha === hoy() ? ahoraHM() : '';
  return HORARIOS.filter((h) => !ocupadas.has(h) && h > ahora);
}

// Valida fecha, hora y motivo de una cita. Devuelve { status, msg } si hay error.
async function validarFranja({ fecha, hora, motivo }, idExcluir = 0) {
  if (!esFecha(fecha)) return { status: 400, msg: 'Fecha inválida' };
  if (fecha < hoy()) return { status: 400, msg: 'La fecha no puede ser anterior a hoy' };
  if (esDomingo(fecha)) return { status: 400, msg: 'No hay atención los domingos' };
  if (!esHora(hora) || !HORARIOS.includes(hora.slice(0, 5))) {
    return { status: 400, msg: 'Hora fuera del horario de atención (08:00 a 17:30)' };
  }
  if (motivo && String(motivo).length > 200) return { status: 400, msg: 'Motivo demasiado largo (máx. 200)' };
  const libres = await horasLibres(fecha, idExcluir);
  if (!libres.includes(hora.slice(0, 5))) {
    return fecha === hoy() && hora.slice(0, 5) <= ahoraHM()
      ? { status: 400, msg: 'Esa hora ya pasó, elija una más tarde' }
      : { status: 409, msg: 'Ese horario ya está ocupado, elija otro' };
  }
  return null;
}

const limpiarMotivo = (m) => (m ? String(m).trim() || null : null);

async function buscar(id) {
  const { rows } = await query(`${SELECT} WHERE c.id_cita = $1`, [id]);
  return rows[0];
}

// CU-06 Consultar citas programadas (admin: todas)
r.get('/', ah(async (req, res) => {
  const { rows } = req.user.rol === 'admin'
    ? await query(`${SELECT} ORDER BY c.fecha DESC, c.hora DESC`)
    : await query(`${SELECT} WHERE m.id_propietario = $1 ORDER BY c.fecha DESC, c.hora DESC`, [req.user.id]);
  res.json(rows);
}));

// Horarios disponibles para una fecha
r.get('/disponibilidad', ah(async (req, res) => {
  const { fecha, excluir } = req.query;
  if (!esFecha(fecha)) return res.status(400).json({ error: 'Fecha inválida' });
  if (esDomingo(fecha)) return res.json({ fecha, disponibles: [], mensaje: 'No hay atención los domingos' });
  if (fecha < hoy()) return res.json({ fecha, disponibles: [], mensaje: 'La fecha ya pasó' });
  res.json({ fecha, disponibles: await horasLibres(fecha, esId(excluir) ? Number(excluir) : 0) });
}));

// CU-05 Solicitar cita veterinaria
r.post('/', ah(async (req, res) => {
  const { id_mascota, fecha, hora, motivo } = req.body || {};
  const a = await mascotaAutorizada(id_mascota, req.user);
  if (a.error) return res.status(a.error).json({ error: a.msg });
  const inv = await validarFranja({ fecha, hora, motivo });
  if (inv) return res.status(inv.status).json({ error: inv.msg });

  const { rows } = await query(
    `INSERT INTO cita (id_mascota, fecha, hora, motivo) VALUES ($1, $2, $3, $4) RETURNING id_cita`,
    [a.mascota.id_mascota, fecha, hora, limpiarMotivo(motivo)]
  );
  res.status(201).json(await buscar(rows[0].id_cita));
}));

// Reprogramar una cita (fecha, hora, motivo y, para el admin, la mascota)
r.put('/:id', ah(async (req, res) => {
  const cita = await buscar(req.params.id);
  if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });
  const actual = await mascotaAutorizada(cita.id_mascota, req.user);
  if (actual.error) return res.status(actual.error).json({ error: actual.msg });
  if (cita.estado !== 'Programada') return res.status(400).json({ error: 'Solo se pueden modificar citas programadas' });

  const { fecha, hora, motivo } = req.body || {};
  const idMascota = req.body?.id_mascota ?? cita.id_mascota;
  const nueva = await mascotaAutorizada(idMascota, req.user);
  if (nueva.error) return res.status(nueva.error).json({ error: nueva.msg });
  const inv = await validarFranja({ fecha, hora, motivo }, cita.id_cita);
  if (inv) return res.status(inv.status).json({ error: inv.msg });

  await query(
    'UPDATE cita SET id_mascota = $1, fecha = $2, hora = $3, motivo = $4 WHERE id_cita = $5',
    [nueva.mascota.id_mascota, fecha, hora, limpiarMotivo(motivo), cita.id_cita]
  );
  res.json(await buscar(cita.id_cita));
}));

// RF12 Cancelar una cita veterinaria
r.patch('/:id/cancelar', ah(async (req, res) => {
  const cita = await buscar(req.params.id);
  if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });
  const a = await mascotaAutorizada(cita.id_mascota, req.user);
  if (a.error) return res.status(a.error).json({ error: a.msg });
  if (cita.estado !== 'Programada') return res.status(400).json({ error: 'Solo se pueden cancelar citas programadas' });
  await query(`UPDATE cita SET estado = 'Cancelada' WHERE id_cita = $1`, [cita.id_cita]);
  res.json({ ...cita, estado: 'Cancelada' });
}));

// CU-13 El administrador cambia el estado de una cita
r.patch('/:id/estado', requireAdmin, ah(async (req, res) => {
  const { estado } = req.body || {};
  if (!ESTADOS.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
  const { rows } = await query('UPDATE cita SET estado = $1 WHERE id_cita = $2 RETURNING id_cita', [estado, req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Cita no encontrada' });
  res.json({ ok: true, estado });
}));

r.delete('/:id', requireAdmin, ah(async (req, res) => {
  const { rows } = await query('DELETE FROM cita WHERE id_cita = $1 RETURNING id_cita', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Cita no encontrada' });
  res.json({ ok: true });
}));

export default r;

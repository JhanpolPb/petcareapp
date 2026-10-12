// RF04 Solicitar citas · RF08 Consultar citas · RF12 Cancelar cita · CU-13 Gestionar citas (admin)
import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { ah, esDomingo, esFecha, esHora, hoy, HORARIOS, mascotaAutorizada } from '../utils.js';

const r = Router();

const SELECT = `SELECT c.id_cita, c.id_mascota, c.fecha, to_char(c.hora, 'HH24:MI') AS hora, c.motivo, c.estado,
                       m.nombre_mascota, p.nombre AS propietario, p.telefono
                FROM cita c
                JOIN mascota m ON m.id_mascota = c.id_mascota
                JOIN propietario p ON p.id_propietario = m.id_propietario`;

// CU-06 Consultar citas programadas (admin: todas)
r.get('/', ah(async (req, res) => {
  const { rows } = req.user.rol === 'admin'
    ? await query(`${SELECT} ORDER BY c.fecha DESC, c.hora DESC`)
    : await query(`${SELECT} WHERE m.id_propietario = $1 ORDER BY c.fecha DESC, c.hora DESC`, [req.user.id]);
  res.json(rows);
}));

// Horarios disponibles para una fecha
r.get('/disponibilidad', ah(async (req, res) => {
  const { fecha } = req.query;
  if (!esFecha(fecha)) return res.status(400).json({ error: 'Fecha inválida' });
  if (esDomingo(fecha)) return res.json({ fecha, disponibles: [], mensaje: 'No hay atención los domingos' });
  const { rows } = await query(
    `SELECT to_char(hora, 'HH24:MI') AS hora FROM cita WHERE fecha = $1 AND estado = 'Programada'`,
    [fecha]
  );
  const ocupadas = new Set(rows.map((x) => x.hora));
  res.json({ fecha, disponibles: HORARIOS.filter((h) => !ocupadas.has(h)) });
}));

// CU-05 Solicitar cita veterinaria
r.post('/', ah(async (req, res) => {
  const { id_mascota, fecha, hora, motivo } = req.body || {};
  const a = await mascotaAutorizada(id_mascota, req.user);
  if (a.error) return res.status(a.error).json({ error: a.msg });
  if (!esFecha(fecha)) return res.status(400).json({ error: 'Fecha inválida' });
  if (fecha < hoy()) return res.status(400).json({ error: 'La fecha no puede ser anterior a hoy' });
  if (esDomingo(fecha)) return res.status(400).json({ error: 'No hay atención los domingos' });
  if (!esHora(hora) || !HORARIOS.includes(hora.slice(0, 5))) {
    return res.status(400).json({ error: 'Hora fuera del horario de atención (08:00 a 17:30)' });
  }
  if (motivo && String(motivo).length > 200) return res.status(400).json({ error: 'Motivo demasiado largo (máx. 200)' });

  const ocupada = await query(
    `SELECT 1 FROM cita WHERE fecha = $1 AND hora = $2 AND estado = 'Programada'`,
    [fecha, hora]
  );
  if (ocupada.rows.length) return res.status(409).json({ error: 'Ese horario ya está ocupado, elija otro' });

  const { rows } = await query(
    `INSERT INTO cita (id_mascota, fecha, hora, motivo) VALUES ($1, $2, $3, $4) RETURNING id_cita`,
    [a.mascota.id_mascota, fecha, hora, motivo ? String(motivo).trim() || null : null]
  );
  const creada = await query(`${SELECT} WHERE c.id_cita = $1`, [rows[0].id_cita]);
  res.status(201).json(creada.rows[0]);
}));

// RF12 Cancelar una cita veterinaria
r.patch('/:id/cancelar', ah(async (req, res) => {
  const { rows } = await query(`${SELECT} WHERE c.id_cita = $1`, [req.params.id]);
  const cita = rows[0];
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
  if (!['Programada', 'Atendida', 'Cancelada'].includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
  const { rowCount, rows } = await query(
    'UPDATE cita SET estado = $1 WHERE id_cita = $2 RETURNING id_cita', [estado, req.params.id]
  );
  if (!(rowCount ?? rows.length)) return res.status(404).json({ error: 'Cita no encontrada' });
  res.json({ ok: true, estado });
}));

export default r;

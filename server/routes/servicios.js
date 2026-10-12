// RF10 Solicitar servicio de peluquería · CU-15 Gestionar servicios (admin)
import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { ah, esDomingo, esFecha, hoy, mascotaAutorizada, TIPOS_SERVICIO } from '../utils.js';

const r = Router();

const SELECT = `SELECT s.*, m.nombre_mascota, p.nombre AS propietario, p.telefono
                FROM servicio s
                JOIN mascota m ON m.id_mascota = s.id_mascota
                JOIN propietario p ON p.id_propietario = m.id_propietario`;

r.get('/tipos', (_req, res) => res.json(TIPOS_SERVICIO));

r.get('/', ah(async (req, res) => {
  const { rows } = req.user.rol === 'admin'
    ? await query(`${SELECT} ORDER BY s.fecha_servicio DESC`)
    : await query(`${SELECT} WHERE m.id_propietario = $1 ORDER BY s.fecha_servicio DESC`, [req.user.id]);
  res.json(rows);
}));

// CU-09 Solicitar servicio de peluquería
r.post('/', ah(async (req, res) => {
  const { id_mascota, tipo_servicio, fecha_servicio } = req.body || {};
  const a = await mascotaAutorizada(id_mascota, req.user);
  if (a.error) return res.status(a.error).json({ error: a.msg });
  if (!TIPOS_SERVICIO.includes(tipo_servicio)) return res.status(400).json({ error: 'Tipo de servicio inválido' });
  if (!esFecha(fecha_servicio)) return res.status(400).json({ error: 'Fecha inválida' });
  if (fecha_servicio < hoy()) return res.status(400).json({ error: 'La fecha no puede ser anterior a hoy' });
  if (esDomingo(fecha_servicio)) return res.status(400).json({ error: 'No hay atención los domingos' });

  const { rows } = await query(
    `INSERT INTO servicio (id_mascota, tipo_servicio, fecha_servicio) VALUES ($1, $2, $3) RETURNING id_servicio`,
    [a.mascota.id_mascota, tipo_servicio, fecha_servicio]
  );
  const creado = await query(`${SELECT} WHERE s.id_servicio = $1`, [rows[0].id_servicio]);
  res.status(201).json(creado.rows[0]);
}));

r.patch('/:id/cancelar', ah(async (req, res) => {
  const { rows } = await query('SELECT * FROM servicio WHERE id_servicio = $1', [req.params.id]);
  const s = rows[0];
  if (!s) return res.status(404).json({ error: 'Servicio no encontrado' });
  const a = await mascotaAutorizada(s.id_mascota, req.user);
  if (a.error) return res.status(a.error).json({ error: a.msg });
  if (!['Solicitado', 'Confirmado'].includes(s.estado)) return res.status(400).json({ error: 'Este servicio ya no se puede cancelar' });
  await query(`UPDATE servicio SET estado = 'Cancelado' WHERE id_servicio = $1`, [s.id_servicio]);
  res.json({ ok: true });
}));

r.patch('/:id/estado', requireAdmin, ah(async (req, res) => {
  const { estado } = req.body || {};
  if (!['Solicitado', 'Confirmado', 'Realizado', 'Cancelado'].includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
  const { rows } = await query('UPDATE servicio SET estado = $1 WHERE id_servicio = $2 RETURNING id_servicio', [estado, req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Servicio no encontrado' });
  res.json({ ok: true, estado });
}));

export default r;

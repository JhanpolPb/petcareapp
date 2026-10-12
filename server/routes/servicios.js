// RF10 Solicitar servicio de peluquería · CU-15 Gestionar servicios (admin)
import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { ah, esDomingo, esFecha, hoy, idValido, mascotaAutorizada, TIPOS_SERVICIO } from '../utils.js';

const r = Router();
r.param('id', idValido);

const ESTADOS = ['Solicitado', 'Confirmado', 'Realizado', 'Cancelado'];
const ABIERTOS = ['Solicitado', 'Confirmado'];

const SELECT = `SELECT s.*, m.nombre_mascota, m.especie, p.id_propietario, p.nombre AS propietario, p.telefono
                FROM servicio s
                JOIN mascota m ON m.id_mascota = s.id_mascota
                JOIN propietario p ON p.id_propietario = m.id_propietario`;

function validar({ tipo_servicio, fecha_servicio }) {
  if (!TIPOS_SERVICIO.includes(tipo_servicio)) return 'Tipo de servicio inválido';
  if (!esFecha(fecha_servicio)) return 'Fecha inválida';
  if (fecha_servicio < hoy()) return 'La fecha no puede ser anterior a hoy';
  if (esDomingo(fecha_servicio)) return 'No hay atención los domingos';
  return null;
}

async function buscar(id) {
  const { rows } = await query(`${SELECT} WHERE s.id_servicio = $1`, [id]);
  return rows[0];
}

r.get('/tipos', (_req, res) => res.json(TIPOS_SERVICIO));

r.get('/', ah(async (req, res) => {
  const { rows } = req.user.rol === 'admin'
    ? await query(`${SELECT} ORDER BY s.fecha_servicio DESC, s.id_servicio DESC`)
    : await query(`${SELECT} WHERE m.id_propietario = $1 ORDER BY s.fecha_servicio DESC, s.id_servicio DESC`, [req.user.id]);
  res.json(rows);
}));

// CU-09 Solicitar servicio de peluquería
r.post('/', ah(async (req, res) => {
  const b = req.body || {};
  const a = await mascotaAutorizada(b.id_mascota, req.user);
  if (a.error) return res.status(a.error).json({ error: a.msg });
  const err = validar(b);
  if (err) return res.status(400).json({ error: err });

  const { rows } = await query(
    `INSERT INTO servicio (id_mascota, tipo_servicio, fecha_servicio) VALUES ($1, $2, $3) RETURNING id_servicio`,
    [a.mascota.id_mascota, b.tipo_servicio, b.fecha_servicio]
  );
  res.status(201).json(await buscar(rows[0].id_servicio));
}));

// Modificar un servicio pendiente (tipo, fecha y, para el admin, la mascota)
r.put('/:id', ah(async (req, res) => {
  const s = await buscar(req.params.id);
  if (!s) return res.status(404).json({ error: 'Servicio no encontrado' });
  const actual = await mascotaAutorizada(s.id_mascota, req.user);
  if (actual.error) return res.status(actual.error).json({ error: actual.msg });
  if (!ABIERTOS.includes(s.estado)) return res.status(400).json({ error: 'Solo se pueden modificar servicios pendientes' });

  const b = req.body || {};
  const nueva = await mascotaAutorizada(b.id_mascota ?? s.id_mascota, req.user);
  if (nueva.error) return res.status(nueva.error).json({ error: nueva.msg });
  const err = validar(b);
  if (err) return res.status(400).json({ error: err });

  await query(
    'UPDATE servicio SET id_mascota = $1, tipo_servicio = $2, fecha_servicio = $3 WHERE id_servicio = $4',
    [nueva.mascota.id_mascota, b.tipo_servicio, b.fecha_servicio, s.id_servicio]
  );
  res.json(await buscar(s.id_servicio));
}));

r.patch('/:id/cancelar', ah(async (req, res) => {
  const s = await buscar(req.params.id);
  if (!s) return res.status(404).json({ error: 'Servicio no encontrado' });
  const a = await mascotaAutorizada(s.id_mascota, req.user);
  if (a.error) return res.status(a.error).json({ error: a.msg });
  if (!ABIERTOS.includes(s.estado)) return res.status(400).json({ error: 'Este servicio ya no se puede cancelar' });
  await query(`UPDATE servicio SET estado = 'Cancelado' WHERE id_servicio = $1`, [s.id_servicio]);
  res.json({ ok: true });
}));

r.patch('/:id/estado', requireAdmin, ah(async (req, res) => {
  const { estado } = req.body || {};
  if (!ESTADOS.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
  const { rows } = await query('UPDATE servicio SET estado = $1 WHERE id_servicio = $2 RETURNING id_servicio', [estado, req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Servicio no encontrado' });
  res.json({ ok: true, estado });
}));

r.delete('/:id', requireAdmin, ah(async (req, res) => {
  const { rows } = await query('DELETE FROM servicio WHERE id_servicio = $1 RETURNING id_servicio', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Servicio no encontrado' });
  res.json({ ok: true });
}));

export default r;

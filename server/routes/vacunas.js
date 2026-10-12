// RF06 Registrar vacunaciones · CU-08 Consultar vacunaciones · CU-14 Gestionar vacunas (admin)
import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { ah, esFecha, hoy, mascotaAutorizada, texto } from '../utils.js';

const r = Router();

const SELECT = `SELECT v.*, m.nombre_mascota, p.nombre AS propietario
                FROM vacuna v
                JOIN mascota m ON m.id_mascota = v.id_mascota
                JOIN propietario p ON p.id_propietario = m.id_propietario`;

r.get('/', ah(async (req, res) => {
  const { rows } = req.user.rol === 'admin'
    ? await query(`${SELECT} ORDER BY v.fecha_aplicacion DESC`)
    : await query(`${SELECT} WHERE m.id_propietario = $1 ORDER BY v.fecha_aplicacion DESC`, [req.user.id]);
  res.json(rows);
}));

function validar(b) {
  if (!texto(b.nombre, 50)) return 'El nombre de la vacuna es obligatorio (máx. 50)';
  if (!esFecha(b.fecha_aplicacion)) return 'Fecha de aplicación inválida';
  if (b.fecha_aplicacion > hoy()) return 'La fecha de aplicación no puede ser futura';
  if (b.fecha_proxima) {
    if (!esFecha(b.fecha_proxima)) return 'Fecha de próxima dosis inválida';
    if (b.fecha_proxima <= b.fecha_aplicacion) return 'La próxima dosis debe ser posterior a la aplicación';
  }
  return null;
}

// Registrar vacunación (lo hace el administrador / veterinaria, ver diagrama de secuencia 6.3)
r.post('/', requireAdmin, ah(async (req, res) => {
  const b = req.body || {};
  const a = await mascotaAutorizada(b.id_mascota, req.user);
  if (a.error) return res.status(a.error).json({ error: a.msg });
  const err = validar(b);
  if (err) return res.status(400).json({ error: err });
  const { rows } = await query(
    `INSERT INTO vacuna (id_mascota, nombre, fecha_aplicacion, fecha_proxima)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [a.mascota.id_mascota, b.nombre.trim(), b.fecha_aplicacion, b.fecha_proxima || null]
  );
  res.status(201).json(rows[0]);
}));

r.put('/:id', requireAdmin, ah(async (req, res) => {
  const b = req.body || {};
  const err = validar(b);
  if (err) return res.status(400).json({ error: err });
  const { rows } = await query(
    `UPDATE vacuna SET nombre = $1, fecha_aplicacion = $2, fecha_proxima = $3 WHERE id_vacuna = $4 RETURNING *`,
    [b.nombre.trim(), b.fecha_aplicacion, b.fecha_proxima || null, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Vacuna no encontrada' });
  res.json(rows[0]);
}));

r.delete('/:id', requireAdmin, ah(async (req, res) => {
  await query('DELETE FROM vacuna WHERE id_vacuna = $1', [req.params.id]);
  res.json({ ok: true });
}));

export default r;

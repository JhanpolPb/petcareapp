// RF02 Registrar mascotas · RF03 Actualizar información · RF05 Historial · CU-12 Gestionar mascotas (admin)
import { Router } from 'express';
import { query } from '../db.js';
import { ah, mascotaAutorizada, texto } from '../utils.js';

const r = Router();
const ESPECIES = ['Perro', 'Gato', 'Ave', 'Conejo', 'Otro'];

function validar(b) {
  if (!texto(b.nombre_mascota, 50)) return 'El nombre de la mascota es obligatorio (máx. 50)';
  if (!ESPECIES.includes(b.especie)) return 'Especie inválida';
  if (!texto(b.raza, 50)) return 'La raza es obligatoria (máx. 50)';
  const edad = Number(b.edad);
  if (!Number.isInteger(edad) || edad < 0 || edad > 99) return 'La edad debe ser un número entre 0 y 99';
  if (!['Macho', 'Hembra'].includes(b.sexo)) return 'Sexo inválido';
  return null;
}

// Lista: el propietario ve sus mascotas; el administrador ve todas
r.get('/', ah(async (req, res) => {
  const base = `SELECT m.*, p.nombre AS propietario, p.correo AS correo_propietario
                FROM mascota m JOIN propietario p ON p.id_propietario = m.id_propietario`;
  const { rows } = req.user.rol === 'admin'
    ? await query(`${base} ORDER BY m.nombre_mascota`)
    : await query(`${base} WHERE m.id_propietario = $1 ORDER BY m.nombre_mascota`, [req.user.id]);
  res.json(rows);
}));

// CU-03 Registrar mascota
r.post('/', ah(async (req, res) => {
  const b = req.body || {};
  const err = validar(b);
  if (err) return res.status(400).json({ error: err });
  const { rows } = await query(
    `INSERT INTO mascota (id_propietario, nombre_mascota, especie, raza, edad, sexo)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.user.id, b.nombre_mascota.trim(), b.especie, b.raza.trim(), Number(b.edad), b.sexo]
  );
  res.status(201).json(rows[0]);
}));

// Detalle + historial de servicios (CU-07)
r.get('/:id', ah(async (req, res) => {
  const a = await mascotaAutorizada(req.params.id, req.user);
  if (a.error) return res.status(a.error).json({ error: a.msg });
  const id = a.mascota.id_mascota;
  const [citas, vacunas, servicios] = await Promise.all([
    query('SELECT * FROM cita WHERE id_mascota = $1 ORDER BY fecha DESC, hora DESC', [id]),
    query('SELECT * FROM vacuna WHERE id_mascota = $1 ORDER BY fecha_aplicacion DESC', [id]),
    query('SELECT * FROM servicio WHERE id_mascota = $1 ORDER BY fecha_servicio DESC', [id]),
  ]);
  res.json({ ...a.mascota, citas: citas.rows, vacunas: vacunas.rows, servicios: servicios.rows });
}));

// CU-04 Actualizar información de mascota
r.put('/:id', ah(async (req, res) => {
  const a = await mascotaAutorizada(req.params.id, req.user);
  if (a.error) return res.status(a.error).json({ error: a.msg });
  const b = req.body || {};
  const err = validar(b);
  if (err) return res.status(400).json({ error: err });
  const { rows } = await query(
    `UPDATE mascota SET nombre_mascota = $1, especie = $2, raza = $3, edad = $4, sexo = $5
     WHERE id_mascota = $6 RETURNING *`,
    [b.nombre_mascota.trim(), b.especie, b.raza.trim(), Number(b.edad), b.sexo, a.mascota.id_mascota]
  );
  res.json(rows[0]);
}));

r.delete('/:id', ah(async (req, res) => {
  const a = await mascotaAutorizada(req.params.id, req.user);
  if (a.error) return res.status(a.error).json({ error: a.msg });
  await query('DELETE FROM mascota WHERE id_mascota = $1', [a.mascota.id_mascota]);
  res.json({ ok: true });
}));

export default r;

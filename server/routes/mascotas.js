// RF02 Registrar mascotas · RF03 Actualizar información · RF05 Historial · CU-12 Gestionar mascotas (admin)
import { Router } from 'express';
import { query } from '../db.js';
import { ah, esId, idValido, mascotaAutorizada, texto } from '../utils.js';

const r = Router();
r.param('id', idValido);
const ESPECIES = ['Perro', 'Gato', 'Ave', 'Conejo', 'Otro'];

function validar(b) {
  if (!texto(b.nombre_mascota, 50)) return 'El nombre de la mascota es obligatorio (máx. 50)';
  if (!ESPECIES.includes(b.especie)) return 'Especie inválida';
  if (!texto(b.raza, 50)) return 'La raza es obligatoria (máx. 50)';
  if (b.edad === '' || b.edad === null || b.edad === undefined) return 'La edad es obligatoria';
  const edad = Number(b.edad);
  if (!Number.isInteger(edad) || edad < 0 || edad > 99) return 'La edad debe ser un número entre 0 y 99';
  if (!['Macho', 'Hembra'].includes(b.sexo)) return 'Sexo inválido';
  return null;
}

// Dueño de la mascota: el propietario siempre es él mismo; el admin puede elegirlo.
async function resolverDueno(b, user, porDefecto) {
  if (user.rol !== 'admin' || b.id_propietario === undefined || b.id_propietario === '') return { id: porDefecto };
  if (!esId(b.id_propietario)) return { error: 'Seleccione un propietario válido' };
  const { rows } = await query('SELECT id_propietario FROM propietario WHERE id_propietario = $1', [b.id_propietario]);
  if (!rows.length) return { error: 'El propietario seleccionado no existe' };
  return { id: rows[0].id_propietario };
}

const BASE = `SELECT m.*, p.nombre AS propietario, p.correo AS correo_propietario, p.telefono AS telefono_propietario
              FROM mascota m JOIN propietario p ON p.id_propietario = m.id_propietario`;

// Lista: el propietario ve sus mascotas; el administrador ve todas
r.get('/', ah(async (req, res) => {
  const { rows } = req.user.rol === 'admin'
    ? await query(`${BASE} ORDER BY m.nombre_mascota`)
    : await query(`${BASE} WHERE m.id_propietario = $1 ORDER BY m.nombre_mascota`, [req.user.id]);
  res.json(rows);
}));

// CU-03 Registrar mascota
r.post('/', ah(async (req, res) => {
  const b = req.body || {};
  const err = validar(b);
  if (err) return res.status(400).json({ error: err });
  const dueno = await resolverDueno(b, req.user, req.user.id);
  if (dueno.error) return res.status(400).json({ error: dueno.error });
  const { rows } = await query(
    `INSERT INTO mascota (id_propietario, nombre_mascota, especie, raza, edad, sexo)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [dueno.id, b.nombre_mascota.trim(), b.especie, b.raza.trim(), Number(b.edad), b.sexo]
  );
  res.status(201).json(rows[0]);
}));

// Detalle + historial de servicios (CU-07)
r.get('/:id', ah(async (req, res) => {
  const a = await mascotaAutorizada(req.params.id, req.user);
  if (a.error) return res.status(a.error).json({ error: a.msg });
  const id = a.mascota.id_mascota;
  const [citas, vacunas, servicios, dueno] = await Promise.all([
    query(`SELECT id_cita, fecha, to_char(hora, 'HH24:MI') AS hora, motivo, estado FROM cita WHERE id_mascota = $1 ORDER BY fecha DESC, hora DESC`, [id]),
    query('SELECT * FROM vacuna WHERE id_mascota = $1 ORDER BY fecha_aplicacion DESC', [id]),
    query('SELECT * FROM servicio WHERE id_mascota = $1 ORDER BY fecha_servicio DESC', [id]),
    query('SELECT nombre, telefono, correo FROM propietario WHERE id_propietario = $1', [a.mascota.id_propietario]),
  ]);
  res.json({
    ...a.mascota,
    propietario: dueno.rows[0]?.nombre,
    telefono_propietario: dueno.rows[0]?.telefono,
    correo_propietario: dueno.rows[0]?.correo,
    citas: citas.rows,
    vacunas: vacunas.rows,
    servicios: servicios.rows,
  });
}));

// CU-04 Actualizar información de mascota
r.put('/:id', ah(async (req, res) => {
  const a = await mascotaAutorizada(req.params.id, req.user);
  if (a.error) return res.status(a.error).json({ error: a.msg });
  const b = req.body || {};
  const err = validar(b);
  if (err) return res.status(400).json({ error: err });
  const dueno = await resolverDueno(b, req.user, a.mascota.id_propietario);
  if (dueno.error) return res.status(400).json({ error: dueno.error });
  const { rows } = await query(
    `UPDATE mascota SET id_propietario = $1, nombre_mascota = $2, especie = $3, raza = $4, edad = $5, sexo = $6
     WHERE id_mascota = $7 RETURNING *`,
    [dueno.id, b.nombre_mascota.trim(), b.especie, b.raza.trim(), Number(b.edad), b.sexo, a.mascota.id_mascota]
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

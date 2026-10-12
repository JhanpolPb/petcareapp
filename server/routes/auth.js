// RF01 Registrar propietarios · RF09 Iniciar sesión · RF11 Editar información del propietario
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { firmarToken, requireAuth } from '../middleware/auth.js';
import { ah, esCorreo, texto } from '../utils.js';

const r = Router();

export const publico = (u) => ({
  id_propietario: u.id_propietario,
  nombre: u.nombre,
  telefono: u.telefono,
  correo: u.correo,
  rol: u.rol,
});

export function validarDatos({ nombre, telefono, correo }) {
  if (!texto(nombre, 100)) return 'El nombre es obligatorio (máx. 100 caracteres)';
  if (typeof telefono !== 'string' || !/^[0-9+\s-]{7,20}$/.test(telefono.trim())) return 'Teléfono inválido (7 a 20 dígitos)';
  if (!esCorreo(correo) || correo.length > 100) return 'Correo electrónico inválido';
  return null;
}

// CU-01 Registrarse
r.post('/registro', ah(async (req, res) => {
  const { nombre, telefono, correo, contrasena } = req.body || {};
  const err = validarDatos({ nombre, telefono, correo });
  if (err) return res.status(400).json({ error: err });
  if (typeof contrasena !== 'string' || contrasena.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener mínimo 8 caracteres' });
  }
  const email = correo.trim().toLowerCase();
  const existe = await query('SELECT 1 FROM propietario WHERE correo = $1', [email]);
  if (existe.rows.length) return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });

  const hash = await bcrypt.hash(contrasena, 10); // RNF03: contraseña cifrada
  const { rows } = await query(
    `INSERT INTO propietario (nombre, telefono, correo, contrasena)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [nombre.trim(), telefono.trim(), email, hash]
  );
  res.status(201).json({ token: firmarToken(rows[0]), usuario: publico(rows[0]) });
}));

// CU-02 Iniciar sesión
r.post('/login', ah(async (req, res) => {
  const { correo, contrasena } = req.body || {};
  if (!correo || !contrasena) return res.status(400).json({ error: 'Ingrese correo y contraseña' });
  const { rows } = await query('SELECT * FROM propietario WHERE correo = $1', [String(correo).trim().toLowerCase()]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(String(contrasena), u.contrasena))) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  }
  res.json({ token: firmarToken(u), usuario: publico(u) });
}));

r.get('/perfil', requireAuth, ah(async (req, res) => {
  const { rows } = await query('SELECT * FROM propietario WHERE id_propietario = $1', [req.user.id]);
  if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(publico(rows[0]));
}));

// RF11 Editar información del propietario
r.put('/perfil', requireAuth, ah(async (req, res) => {
  const { nombre, telefono, correo, contrasena } = req.body || {};
  const err = validarDatos({ nombre, telefono, correo });
  if (err) return res.status(400).json({ error: err });
  const email = correo.trim().toLowerCase();
  const dup = await query('SELECT 1 FROM propietario WHERE correo = $1 AND id_propietario <> $2', [email, req.user.id]);
  if (dup.rows.length) return res.status(409).json({ error: 'Ese correo ya está en uso' });

  let sql = 'UPDATE propietario SET nombre = $1, telefono = $2, correo = $3';
  const params = [nombre.trim(), telefono.trim(), email];
  if (contrasena) {
    if (contrasena.length < 8) return res.status(400).json({ error: 'La contraseña debe tener mínimo 8 caracteres' });
    params.push(await bcrypt.hash(contrasena, 10));
    sql += `, contrasena = $${params.length}`;
  }
  params.push(req.user.id);
  sql += ` WHERE id_propietario = $${params.length} RETURNING *`;
  const { rows } = await query(sql, params);
  res.json({ token: firmarToken(rows[0]), usuario: publico(rows[0]) });
}));

export default r;

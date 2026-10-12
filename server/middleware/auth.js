import jwt from 'jsonwebtoken';
import { query } from '../db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'petcareapp-clave-local-cambiar-en-produccion';

export function firmarToken(usuario) {
  return jwt.sign(
    { id: usuario.id_propietario, rol: usuario.rol, nombre: usuario.nombre },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

// Exige un token válido (RF09 - Iniciar sesión).
// El rol se lee de la base de datos en cada petición: si el administrador cambia el rol
// o elimina la cuenta, el cambio aplica de inmediato sin esperar a que venza el token.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Debe iniciar sesión' });
  let datos;
  try {
    datos = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Sesión expirada o inválida' });
  }
  try {
    const { rows } = await query('SELECT id_propietario, rol, nombre FROM propietario WHERE id_propietario = $1', [datos.id]);
    if (!rows.length) return res.status(401).json({ error: 'La cuenta ya no existe' });
    req.user = { id: rows[0].id_propietario, rol: rows[0].rol, nombre: rows[0].nombre };
    next();
  } catch (e) {
    next(e);
  }
}

// Exige rol administrador (CU-11 a CU-16)
export function requireAdmin(req, res, next) {
  if (req.user?.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso solo para administradores' });
  }
  next();
}

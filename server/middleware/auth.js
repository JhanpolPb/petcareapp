import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'petcareapp-clave-local-cambiar-en-produccion';

export function firmarToken(usuario) {
  return jwt.sign(
    { id: usuario.id_propietario, rol: usuario.rol, nombre: usuario.nombre },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

// Exige un token válido (RF09 - Iniciar sesión)
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Debe iniciar sesión' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Sesión expirada o inválida' });
  }
}

// Exige rol administrador (CU-11 a CU-16)
export function requireAdmin(req, res, next) {
  if (req.user?.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso solo para administradores' });
  }
  next();
}

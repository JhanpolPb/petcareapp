import { query } from './db.js';

export const ZONA = process.env.TZ_APP || 'America/Bogota';

// Fecha de hoy (YYYY-MM-DD) en la zona horaria de Colombia
export function hoy() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date());
}

export function sumarDias(fechaISO, dias) {
  const d = new Date(`${fechaISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export const esFecha = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
export const esHora = (v) => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(v);
export const esCorreo = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const texto = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;

// Horario de atención veterinaria: lunes a sábado, 08:00 a 17:30, cada 30 minutos
export const HORARIOS = (() => {
  const h = [];
  for (let m = 8 * 60; m <= 17 * 60 + 30; m += 30) {
    h.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return h;
})();

export const esDomingo = (fechaISO) => new Date(`${fechaISO}T12:00:00Z`).getUTCDay() === 0;

export const TIPOS_SERVICIO = ['Baño', 'Corte de pelo', 'Baño y corte', 'Corte de uñas', 'Limpieza de oídos'];

// Verifica que la mascota exista y que el usuario sea su dueño (o administrador)
export async function mascotaAutorizada(idMascota, user) {
  const { rows } = await query('SELECT * FROM mascota WHERE id_mascota = $1', [idMascota]);
  if (rows.length === 0) return { error: 404, msg: 'Mascota no encontrada' };
  if (user.rol !== 'admin' && rows[0].id_propietario !== user.id) {
    return { error: 403, msg: 'No tiene permiso sobre esta mascota' };
  }
  return { mascota: rows[0] };
}

// Envuelve controladores async para enviar errores al manejador central
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

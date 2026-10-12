// Cliente HTTP para la API de PetCareApp
const KEY = 'petcareapp.sesion';

export function leerSesion() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
}

export function guardarSesion(s) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* almacenamiento no disponible */
  }
}

export async function api(ruta, { method = 'GET', body } = {}) {
  const sesion = leerSesion();
  const res = await fetch(`/api${ruta}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(sesion?.token ? { Authorization: `Bearer ${sesion.token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && sesion) {
    guardarSesion(null);
    window.location.href = '/login';
  }
  if (!res.ok) throw new Error(data.error || 'Ocurrió un error, intente de nuevo');
  return data;
}

// Utilidades de formato
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export function fmtFecha(iso) {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${Number(d)} ${MESES[Number(m) - 1]} ${a}`;
}

export function fmtMes(ym) {
  if (!ym) return '—';
  const [a, m] = ym.split('-');
  return `${MESES[Number(m) - 1]} ${a.slice(2)}`;
}

export function hoyISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

export function sumarDias(iso, dias) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Incluye el texto si coincide con la búsqueda (sin distinguir mayúsculas ni tildes)
const normalizar = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function coincide(busqueda, ...campos) {
  const q = normalizar(busqueda.trim());
  return !q || campos.some((c) => normalizar(c).includes(q));
}

// Descarga un CSV (separado por ; para que Excel en español lo abra en columnas)
export function descargarCSV(nombre, filas) {
  const celda = (v) => {
    const s = String(v ?? '');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '﻿' + filas.map((f) => f.map(celda).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `${nombre}-${hoyISO()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

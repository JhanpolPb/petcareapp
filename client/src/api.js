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

export function hoyISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

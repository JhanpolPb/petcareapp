import { useCallback, useEffect, useState } from 'react';
import { BellRing, CalendarCheck, Eye, EyeOff, Lock, PawPrint, Scissors, Syringe } from 'lucide-react';
import { api } from './api.js';

export function Logo() {
  return (
    <div className="logo">
      <img src="/favicon.svg" alt="" width="34" height="34" />
      <span>PetCare<b>App</b></span>
    </div>
  );
}

export function Encabezado({ titulo, sub, children }) {
  return (
    <header className="encabezado">
      <div>
        <h1>{titulo}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      <div className="acciones">{children}</div>
    </header>
  );
}

const COLORES = {
  Programada: 'azul', Atendida: 'verde', Cancelada: 'gris',
  Solicitado: 'ambar', Confirmado: 'azul', Realizado: 'verde', Cancelado: 'gris',
  admin: 'coral', propietario: 'azul',
};
export function Estado({ valor }) {
  return <span className={`badge ${COLORES[valor] || 'gris'}`}>{valor}</span>;
}

export function Vacio({ icono = '🐾', children }) {
  return (
    <div className="vacio">
      <div className="vacio-icono" aria-hidden="true">{icono}</div>
      <p>{children}</p>
    </div>
  );
}

export function Modal({ titulo, onClose, children }) {
  useEffect(() => {
    const f = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [onClose]);
  return (
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-head">
          <h2>{titulo}</h2>
          <button className="cerrar" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Alerta({ tipo = 'error', children }) {
  if (!children) return null;
  return <div className={`alerta ${tipo}`} role="alert">{children}</div>;
}

export function Campo({ label, children, ayuda }) {
  return (
    <label className="campo">
      <span>{label}</span>
      {children}
      {ayuda && <small>{ayuda}</small>}
    </label>
  );
}

// Input con icono a la izquierda
export function Entrada({ icono: Icono, ...props }) {
  return (
    <div className="entrada">
      <Icono className="entrada-icono" size={18} aria-hidden="true" />
      <input {...props} />
    </div>
  );
}

// Input de contraseña con botón para mostrarla u ocultarla
export function EntradaClave(props) {
  const [ver, setVer] = useState(false);
  const Ojo = ver ? EyeOff : Eye;
  return (
    <div className="entrada">
      <Lock className="entrada-icono" size={18} aria-hidden="true" />
      <input {...props} type={ver ? 'text' : 'password'} />
      <button type="button" className="entrada-ojo" onClick={() => setVer(!ver)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
        <Ojo size={18} />
      </button>
    </div>
  );
}

const BENEFICIOS = [
  [CalendarCheck, 'Citas veterinarias con horarios disponibles en tiempo real'],
  [Syringe, 'Control de vacunas y refuerzos'],
  [Scissors, 'Reserva de baño y peluquería'],
  [BellRing, 'Recordatorios de citas y vacunas'],
];

// Estructura de las pantallas de inicio de sesión y registro
export function PanelAuth({ titulo, texto, children }) {
  return (
    <div className="auth">
      <aside className="auth-arte">
        <Logo />
        <div className="auth-arte-cuerpo">
          <h2>{titulo}</h2>
          <p>{texto}</p>
          <ul className="beneficios">
            {BENEFICIOS.map(([Icono, t]) => (
              <li key={t}><span className="beneficio-icono"><Icono size={18} aria-hidden="true" /></span>{t}</li>
            ))}
          </ul>
        </div>
        <PawPrint className="auth-huella" size={260} strokeWidth={1.2} aria-hidden="true" />
      </aside>
      <main className="auth-lado">{children}</main>
    </div>
  );
}

// Hook para cargar datos de la API
export function useCarga(ruta) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const recargar = useCallback(() => {
    if (!ruta) return;
    api(ruta).then(setDatos).catch((e) => setError(e.message));
  }, [ruta]);
  useEffect(recargar, [recargar]);
  return { datos, error, recargar, setDatos };
}

export function Cargando() {
  return <div className="cargando" aria-live="polite">Cargando…</div>;
}

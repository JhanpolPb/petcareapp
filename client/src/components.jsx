import { useCallback, useEffect, useState } from 'react';
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

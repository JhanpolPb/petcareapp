import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  BellRing, Bird, CalendarCheck, Cat, CircleAlert, CircleCheck, Dog, Eye, EyeOff, Inbox, LoaderCircle,
  Lock, PawPrint, Rabbit, Scissors, Search, Syringe, TriangleAlert, X,
} from 'lucide-react';
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
      {children && <div className="acciones">{children}</div>}
    </header>
  );
}

const COLORES = {
  Programada: 'azul', Atendida: 'verde', Cancelada: 'gris',
  Solicitado: 'ambar', Confirmado: 'azul', Realizado: 'verde', Cancelado: 'gris',
  admin: 'coral', propietario: 'azul',
};
const ETIQUETAS = { admin: 'Administrador', propietario: 'Propietario' };
export function Estado({ valor }) {
  return <span className={`badge ${COLORES[valor] || 'gris'}`}>{ETIQUETAS[valor] || valor}</span>;
}

// Icono según la especie de la mascota
const ESPECIE_ICONO = { Perro: Dog, Gato: Cat, Ave: Bird, Conejo: Rabbit, Otro: PawPrint };
export const ESPECIES = Object.keys(ESPECIE_ICONO);
export function IconoEspecie({ especie, size = 22 }) {
  const I = ESPECIE_ICONO[especie] || PawPrint;
  return <I size={size} aria-hidden="true" />;
}

export function Vacio({ icono: Icono = Inbox, children }) {
  return (
    <div className="vacio">
      <div className="vacio-icono" aria-hidden="true"><Icono size={26} /></div>
      <p>{children}</p>
    </div>
  );
}

export function Modal({ titulo, onClose, children, ancho }) {
  useEffect(() => {
    const f = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [onClose]);
  return (
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${ancho ? 'ancho' : ''}`} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-head">
          <h2>{titulo}</h2>
          <button className="btn-icono" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Alerta({ tipo = 'error', children }) {
  if (!children) return null;
  const I = tipo === 'ok' ? CircleCheck : CircleAlert;
  return (
    <div className={`alerta ${tipo}`} role="alert">
      <I size={18} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
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

export function Buscador({ valor, onChange, placeholder = 'Buscar…' }) {
  return (
    <div className="entrada buscador">
      <Search className="entrada-icono" size={18} aria-hidden="true" />
      <input type="search" value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  );
}

// Botón cuadrado solo con icono (editar, eliminar…)
export function BotonIcono({ icono: Icono, label, peligro, ...props }) {
  return (
    <button type="button" className={`btn-icono ${peligro ? 'peligro' : ''}`} title={label} aria-label={label} {...props}>
      <Icono size={17} />
    </button>
  );
}

// Filtro en forma de pestañas: opciones = [[valor, etiqueta, cantidad?], ...]
export function Filtros({ valor, onChange, opciones }) {
  return (
    <div className="tabs" role="tablist">
      {opciones.map(([v, label, n]) => (
        <button key={v} role="tab" aria-selected={valor === v} className={valor === v ? 'activo' : ''} onClick={() => onChange(v)}>
          {label}{n !== undefined && <span className="tab-n">{n}</span>}
        </button>
      ))}
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

// ---------- Confirmaciones y avisos ----------
const UICtx = createContext(null);
export const useUI = () => useContext(UICtx);

export function UIProvider({ children }) {
  const [confirmacion, setConfirmacion] = useState(null);
  const [avisos, setAvisos] = useState([]);
  const sig = useRef(0);

  const avisar = useCallback((texto, tipo = 'ok') => {
    const id = ++sig.current;
    setAvisos((a) => [...a, { id, texto, tipo }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 3500);
  }, []);

  // confirmar({ titulo, mensaje, boton, peligro }) -> Promise<boolean>
  const confirmar = useCallback((opciones) => new Promise((resolve) => setConfirmacion({ ...opciones, resolve })), []);

  function cerrar(valor) {
    confirmacion.resolve(valor);
    setConfirmacion(null);
  }

  return (
    <UICtx.Provider value={{ avisar, confirmar }}>
      {children}
      {confirmacion && (
        <Modal titulo={confirmacion.titulo || 'Confirmar'} onClose={() => cerrar(false)}>
          <div className="confirmar">
            {confirmacion.peligro && <span className="confirmar-icono"><TriangleAlert size={22} /></span>}
            <p>{confirmacion.mensaje}</p>
          </div>
          <div className="modal-pie">
            <button className="btn suave" onClick={() => cerrar(false)}>Volver</button>
            <button className={`btn ${confirmacion.peligro ? 'peligro' : 'primario'}`} onClick={() => cerrar(true)} autoFocus>
              {confirmacion.boton || 'Confirmar'}
            </button>
          </div>
        </Modal>
      )}
      <div className="avisos" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`aviso ${a.tipo}`}>
            {a.tipo === 'ok' ? <CircleCheck size={18} /> : <CircleAlert size={18} />}
            <span>{a.texto}</span>
          </div>
        ))}
      </div>
    </UICtx.Provider>
  );
}

// Ejecuta una acción contra la API mostrando un aviso de éxito o de error
export function useAccion() {
  const { avisar, confirmar } = useUI();
  return useCallback(async (fn, { exito, confirmacion } = {}) => {
    if (confirmacion && !(await confirmar(confirmacion))) return false;
    try {
      await fn();
      if (exito) avisar(exito);
      return true;
    } catch (e) {
      avisar(e.message, 'error');
      return false;
    }
  }, [avisar, confirmar]);
}

// Hook para cargar datos de la API
export function useCarga(ruta) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const recargar = useCallback(() => {
    if (!ruta) return;
    api(ruta)
      .then((d) => { setDatos(d); setError(''); })
      .catch((e) => setError(e.message));
  }, [ruta]);
  useEffect(recargar, [recargar]);
  return { datos, error, recargar, setDatos };
}

export function Cargando() {
  return (
    <div className="cargando" aria-live="polite">
      <LoaderCircle className="girar" size={18} aria-hidden="true" /> Cargando…
    </div>
  );
}

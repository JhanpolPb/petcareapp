import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  ChartColumn, LayoutDashboard, LogOut, Menu, PawPrint, Scissors, Stethoscope, Syringe, UserCog, Users, X,
} from 'lucide-react';
import { api, guardarSesion, leerSesion } from './api.js';
import { Logo, UIProvider } from './components.jsx';
import Login from './pages/Login.jsx';
import Registro from './pages/Registro.jsx';
import Inicio from './pages/Inicio.jsx';
import Mascotas from './pages/Mascotas.jsx';
import MascotaDetalle from './pages/MascotaDetalle.jsx';
import Citas from './pages/Citas.jsx';
import Vacunas from './pages/Vacunas.jsx';
import Servicios from './pages/Servicios.jsx';
import Perfil from './pages/Perfil.jsx';
import Usuarios from './pages/Usuarios.jsx';
import Reportes from './pages/Reportes.jsx';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function App() {
  const [sesion, setSesion] = useState(leerSesion);

  // Al abrir la app se refrescan los datos del usuario (por si el admin cambió su rol)
  useEffect(() => {
    if (!sesion?.token) return;
    api('/auth/perfil')
      .then((usuario) => {
        const s = { ...sesion, usuario };
        guardarSesion(s);
        setSesion(s);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const auth = {
    usuario: sesion?.usuario,
    esAdmin: sesion?.usuario?.rol === 'admin',
    entrar(s) {
      guardarSesion(s);
      setSesion(s);
    },
    salir() {
      guardarSesion(null);
      setSesion(null);
    },
  };

  return (
    <AuthCtx.Provider value={auth}>
      <UIProvider>
        <Routes>
          <Route path="/login" element={sesion ? <Navigate to="/" /> : <Login />} />
          <Route path="/registro" element={sesion ? <Navigate to="/" /> : <Registro />} />
          <Route path="/*" element={sesion ? <Privado /> : <Navigate to="/login" />} />
        </Routes>
      </UIProvider>
    </AuthCtx.Provider>
  );
}

function Privado() {
  const { usuario, esAdmin, salir } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);

  useEffect(() => setMenu(false), [pathname]);

  const grupos = [
    ['', [
      ['/', 'Inicio', LayoutDashboard],
      ['/mascotas', esAdmin ? 'Mascotas' : 'Mis mascotas', PawPrint],
      ['/citas', 'Citas veterinarias', Stethoscope],
      ['/vacunas', 'Vacunación', Syringe],
      ['/servicios', 'Peluquería', Scissors],
    ]],
    ...(esAdmin ? [['Administración', [
      ['/usuarios', 'Usuarios', Users],
      ['/reportes', 'Reportes', ChartColumn],
    ]]] : []),
    ['Cuenta', [['/perfil', 'Mi perfil', UserCog]]],
  ];

  const iniciales = usuario.nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

  return (
    <div className="shell">
      <aside className={`sidebar ${menu ? 'abierto' : ''}`}>
        <div className="sidebar-top">
          <Logo />
          <button className="menu-btn" onClick={() => setMenu(!menu)} aria-label={menu ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menu}>
            {menu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        <nav>
          {grupos.map(([titulo, links]) => (
            <div key={titulo || 'principal'} className="nav-grupo">
              {titulo && <span className="nav-titulo">{titulo}</span>}
              {links.map(([to, label, Icono]) => (
                <NavLink key={to} to={to} end={to === '/'} className="nav-link">
                  <Icono size={19} aria-hidden="true" /> {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-user">
          <span className="avatar-usuario" aria-hidden="true">{iniciales}</span>
          <div className="sidebar-user-datos">
            <strong>{usuario.nombre}</strong>
            <small>{esAdmin ? 'Administrador' : 'Propietario'}</small>
          </div>
          <button className="btn-icono" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={() => { salir(); nav('/login'); }}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <main className="contenido">
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/mascotas" element={<Mascotas />} />
          <Route path="/mascotas/:id" element={<MascotaDetalle />} />
          <Route path="/citas" element={<Citas />} />
          <Route path="/vacunas" element={<Vacunas />} />
          <Route path="/servicios" element={<Servicios />} />
          <Route path="/perfil" element={<Perfil />} />
          {esAdmin && <Route path="/usuarios" element={<Usuarios />} />}
          {esAdmin && <Route path="/reportes" element={<Reportes />} />}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

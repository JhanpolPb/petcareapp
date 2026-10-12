import { createContext, useContext, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { guardarSesion, leerSesion } from './api.js';
import { Logo } from './components.jsx';
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
      <Routes>
        <Route path="/login" element={sesion ? <Navigate to="/" /> : <Login />} />
        <Route path="/registro" element={sesion ? <Navigate to="/" /> : <Registro />} />
        <Route path="/*" element={sesion ? <Privado /> : <Navigate to="/login" />} />
      </Routes>
    </AuthCtx.Provider>
  );
}

function Privado() {
  const { usuario, esAdmin, salir } = useAuth();
  const nav = useNavigate();
  const [menu, setMenu] = useState(false);

  const links = [
    ['/', 'Inicio', '🏠'],
    ['/mascotas', esAdmin ? 'Mascotas' : 'Mis mascotas', '🐾'],
    ['/citas', 'Citas veterinarias', '🩺'],
    ['/vacunas', 'Vacunación', '💉'],
    ['/servicios', 'Peluquería', '✂️'],
    ...(esAdmin ? [['/usuarios', 'Usuarios', '👥'], ['/reportes', 'Reportes', '📊']] : []),
    ['/perfil', 'Mi perfil', '⚙️'],
  ];

  return (
    <div className="shell">
      <aside className={`sidebar ${menu ? 'abierto' : ''}`}>
        <div className="sidebar-top">
          <Logo />
          <button className="menu-btn" onClick={() => setMenu(!menu)} aria-label="Abrir menú">☰</button>
        </div>
        <nav onClick={() => setMenu(false)}>
          {links.map(([to, label, icon]) => (
            <NavLink key={to} to={to} end={to === '/'} className="nav-link">
              <span aria-hidden="true">{icon}</span> {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div>
            <strong>{usuario.nombre}</strong>
            <small>{esAdmin ? 'Administrador' : 'Propietario'}</small>
          </div>
          <button className="btn-link" onClick={() => { salir(); nav('/login'); }}>Cerrar sesión</button>
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

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { Alerta, Campo, Logo } from '../components.jsx';

export default function Login() {
  const { entrar } = useAuth();
  const [f, setF] = useState({ correo: '', contrasena: '' });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      entrar(await api('/auth/login', { method: 'POST', body: f }));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-arte">
        <Logo />
        <h2>Todo el cuidado de tu mascota, en un solo lugar.</h2>
        <p>Agenda citas veterinarias, lleva el control de vacunas y reserva peluquería sin llamadas.</p>
        <div className="huellas" aria-hidden="true">🐶 🐱 🐰 🦜</div>
      </div>
      <form className="auth-form" onSubmit={enviar}>
        <h1>Iniciar sesión</h1>
        <p className="sub">Ingresa con tu correo y contraseña.</p>
        <Alerta>{error}</Alerta>
        <Campo label="Correo electrónico">
          <input type="email" required autoComplete="email" value={f.correo}
            onChange={(e) => setF({ ...f, correo: e.target.value })} />
        </Campo>
        <Campo label="Contraseña">
          <input type="password" required autoComplete="current-password" value={f.contrasena}
            onChange={(e) => setF({ ...f, contrasena: e.target.value })} />
        </Campo>
        <button className="btn primario ancho" disabled={cargando}>{cargando ? 'Ingresando…' : 'Ingresar'}</button>
        <p className="centro">¿No tienes cuenta? <Link to="/registro">Regístrate</Link></p>
      </form>
    </div>
  );
}

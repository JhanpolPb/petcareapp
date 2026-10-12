import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { Alerta, Campo, Logo } from '../components.jsx';

export default function Registro() {
  const { entrar } = useAuth();
  const [f, setF] = useState({ nombre: '', telefono: '', correo: '', contrasena: '', confirmar: '' });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setError('');
    if (f.contrasena !== f.confirmar) return setError('Las contraseñas no coinciden');
    setCargando(true);
    try {
      const { confirmar, ...datos } = f;
      entrar(await api('/auth/registro', { method: 'POST', body: datos }));
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
        <h2>Crea tu cuenta gratis.</h2>
        <p>Registra a tus mascotas y ten su historial de citas, vacunas y servicios siempre a mano.</p>
        <div className="huellas" aria-hidden="true">🐾 🐾 🐾</div>
      </div>
      <form className="auth-form" onSubmit={enviar}>
        <h1>Registrarse</h1>
        <p className="sub">Datos del propietario.</p>
        <Alerta>{error}</Alerta>
        <Campo label="Nombre completo">
          <input required maxLength={100} value={f.nombre} onChange={set('nombre')} autoComplete="name" />
        </Campo>
        <Campo label="Teléfono">
          <input required inputMode="tel" maxLength={20} value={f.telefono} onChange={set('telefono')} autoComplete="tel" />
        </Campo>
        <Campo label="Correo electrónico">
          <input type="email" required maxLength={100} value={f.correo} onChange={set('correo')} autoComplete="email" />
        </Campo>
        <div className="fila">
          <Campo label="Contraseña" ayuda="Mínimo 8 caracteres">
            <input type="password" required minLength={8} value={f.contrasena} onChange={set('contrasena')} autoComplete="new-password" />
          </Campo>
          <Campo label="Confirmar contraseña">
            <input type="password" required minLength={8} value={f.confirmar} onChange={set('confirmar')} autoComplete="new-password" />
          </Campo>
        </div>
        <button className="btn primario ancho" disabled={cargando}>{cargando ? 'Creando cuenta…' : 'Crear cuenta'}</button>
        <p className="centro">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
      </form>
    </div>
  );
}

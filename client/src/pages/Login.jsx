import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LoaderCircle, Mail } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { Alerta, Campo, Entrada, EntradaClave, PanelAuth } from '../components.jsx';

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
    <PanelAuth
      titulo="Todo el cuidado de tu mascota, en un solo lugar."
      texto="Agenda citas veterinarias, lleva el control de vacunas y reserva peluquería sin llamadas."
    >
      <form className="auth-form" onSubmit={enviar}>
        <h1>Iniciar sesión</h1>
        <p className="sub">Bienvenido de nuevo. Ingresa con tu correo y contraseña.</p>
        <Alerta>{error}</Alerta>
        <Campo label="Correo electrónico">
          <Entrada icono={Mail} type="email" required autoComplete="email" placeholder="tucorreo@ejemplo.com"
            value={f.correo} onChange={(e) => setF({ ...f, correo: e.target.value })} />
        </Campo>
        <Campo label="Contraseña">
          <EntradaClave required autoComplete="current-password" placeholder="Tu contraseña"
            value={f.contrasena} onChange={(e) => setF({ ...f, contrasena: e.target.value })} />
        </Campo>
        <button className="btn primario ancho grande" disabled={cargando}>
          {cargando
            ? <><LoaderCircle className="girar" size={18} aria-hidden="true" /> Ingresando…</>
            : <>Ingresar <ArrowRight size={18} aria-hidden="true" /></>}
        </button>
        <p className="auth-pie">¿No tienes cuenta? <Link to="/registro">Regístrate</Link></p>
      </form>
    </PanelAuth>
  );
}

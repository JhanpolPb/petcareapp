import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LoaderCircle, Mail, Phone, User } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { Alerta, Campo, Entrada, EntradaClave, PanelAuth } from '../components.jsx';

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
    <PanelAuth
      titulo="Crea tu cuenta gratis."
      texto="Registra a tus mascotas y ten su historial de citas, vacunas y servicios siempre a mano."
    >
      <form className="auth-form" onSubmit={enviar}>
        <h1>Registrarse</h1>
        <p className="sub">Completa tus datos como propietario.</p>
        <Alerta>{error}</Alerta>
        <Campo label="Nombre completo">
          <Entrada icono={User} required maxLength={100} value={f.nombre} onChange={set('nombre')} autoComplete="name" placeholder="Nombre y apellido" />
        </Campo>
        <div className="fila">
          <Campo label="Teléfono">
            <Entrada icono={Phone} required inputMode="tel" maxLength={20} value={f.telefono} onChange={set('telefono')} autoComplete="tel" placeholder="300 123 4567" />
          </Campo>
          <Campo label="Correo electrónico">
            <Entrada icono={Mail} type="email" required maxLength={100} value={f.correo} onChange={set('correo')} autoComplete="email" placeholder="tucorreo@ejemplo.com" />
          </Campo>
        </div>
        <div className="fila">
          <Campo label="Contraseña" ayuda="Mínimo 8 caracteres">
            <EntradaClave required minLength={8} value={f.contrasena} onChange={set('contrasena')} autoComplete="new-password" />
          </Campo>
          <Campo label="Confirmar contraseña">
            <EntradaClave required minLength={8} value={f.confirmar} onChange={set('confirmar')} autoComplete="new-password" />
          </Campo>
        </div>
        <button className="btn primario ancho grande" disabled={cargando}>
          {cargando
            ? <><LoaderCircle className="girar" size={18} aria-hidden="true" /> Creando cuenta…</>
            : <>Crear cuenta <ArrowRight size={18} aria-hidden="true" /></>}
        </button>
        <p className="auth-pie">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
      </form>
    </PanelAuth>
  );
}

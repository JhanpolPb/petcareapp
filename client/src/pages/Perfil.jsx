// RF11 Editar información del propietario
import { useEffect, useState } from 'react';
import { Mail, Phone, User } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { Alerta, Campo, Cargando, Encabezado, Entrada, EntradaClave, useUI } from '../components.jsx';

export default function Perfil() {
  const { entrar } = useAuth();
  const { avisar } = useUI();
  const [f, setF] = useState(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api('/auth/perfil').then((u) => setF({ ...u, contrasena: '', confirmar: '' })).catch((e) => setError(e.message));
  }, []);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setError('');
    if (f.contrasena && f.contrasena !== f.confirmar) return setError('Las contraseñas no coinciden');
    setGuardando(true);
    try {
      const { confirmar, ...body } = f;
      const s = await api('/auth/perfil', { method: 'PUT', body });
      entrar(s);
      setF({ ...s.usuario, contrasena: '', confirmar: '' });
      avisar('Datos actualizados correctamente');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <Encabezado titulo="Mi perfil" sub="Actualiza tus datos de contacto y tu contraseña" />
      {!f ? (error ? <Alerta>{error}</Alerta> : <Cargando />) : (
        <form className="card form-angosto" onSubmit={enviar}>
          <Alerta>{error}</Alerta>
          <h2>Datos personales</h2>
          <Campo label="Nombre completo"><Entrada icono={User} required maxLength={100} value={f.nombre} onChange={set('nombre')} /></Campo>
          <div className="fila">
            <Campo label="Teléfono"><Entrada icono={Phone} required maxLength={20} value={f.telefono} onChange={set('telefono')} /></Campo>
            <Campo label="Correo electrónico"><Entrada icono={Mail} type="email" required maxLength={100} value={f.correo} onChange={set('correo')} /></Campo>
          </div>
          <h2 className="separado">Cambiar contraseña</h2>
          <div className="fila">
            <Campo label="Nueva contraseña" ayuda="Déjala vacía para conservar la actual">
              <EntradaClave minLength={8} value={f.contrasena} onChange={set('contrasena')} autoComplete="new-password" />
            </Campo>
            <Campo label="Confirmar contraseña">
              <EntradaClave minLength={8} value={f.confirmar} onChange={set('confirmar')} autoComplete="new-password" required={Boolean(f.contrasena)} />
            </Campo>
          </div>
          <button className="btn primario" disabled={guardando}>Guardar cambios</button>
        </form>
      )}
    </>
  );
}

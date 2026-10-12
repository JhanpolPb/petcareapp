// RF11 Editar información del propietario
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { Alerta, Campo, Cargando, Encabezado } from '../components.jsx';

export default function Perfil() {
  const { entrar } = useAuth();
  const [f, setF] = useState(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    api('/auth/perfil').then((u) => setF({ ...u, contrasena: '' })).catch((e) => setError(e.message));
  }, []);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setOk('');
    try {
      const s = await api('/auth/perfil', { method: 'PUT', body: f });
      entrar(s);
      setF({ ...s.usuario, contrasena: '' });
      setOk('Datos actualizados correctamente');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <Encabezado titulo="Mi perfil" sub="Actualiza tus datos de contacto" />
      {!f ? <Cargando /> : (
        <form className="card form-angosto" onSubmit={enviar}>
          <Alerta>{error}</Alerta>
          <Alerta tipo="ok">{ok}</Alerta>
          <Campo label="Nombre completo"><input required maxLength={100} value={f.nombre} onChange={set('nombre')} /></Campo>
          <Campo label="Teléfono"><input required maxLength={20} value={f.telefono} onChange={set('telefono')} /></Campo>
          <Campo label="Correo electrónico"><input type="email" required maxLength={100} value={f.correo} onChange={set('correo')} /></Campo>
          <Campo label="Nueva contraseña" ayuda="Déjala vacía para conservar la actual">
            <input type="password" minLength={8} value={f.contrasena} onChange={set('contrasena')} autoComplete="new-password" />
          </Campo>
          <button className="btn primario">Guardar cambios</button>
        </form>
      )}
    </>
  );
}

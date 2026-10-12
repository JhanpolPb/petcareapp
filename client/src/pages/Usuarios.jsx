// CU-11 Gestionar usuarios (admin)
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Mail, Pencil, Phone, Trash2, User, UserPlus, Users } from 'lucide-react';
import { api, coincide, descargarCSV, fmtFecha } from '../api.js';
import { useAuth } from '../App.jsx';
import {
  Alerta, BotonIcono, Buscador, Campo, Cargando, Encabezado, Entrada, EntradaClave, Estado, Filtros, Modal, useAccion, useCarga, Vacio,
} from '../components.jsx';

const NUEVO = { nombre: '', telefono: '', correo: '', contrasena: '', rol: 'propietario' };

export default function Usuarios() {
  const { usuario } = useAuth();
  const accion = useAccion();
  const [params, setParams] = useSearchParams();
  const { datos, error, recargar } = useCarga('/admin/usuarios');
  const [form, setForm] = useState(null);
  const [rol, setRol] = useState('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (params.get('nuevo')) {
      setForm(NUEVO);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const todos = datos || [];
  const lista = todos
    .filter((u) => !rol || u.rol === rol)
    .filter((u) => coincide(busqueda, u.nombre, u.correo, u.telefono));

  const eliminar = (u) => accion(() => api(`/admin/usuarios/${u.id_propietario}`, { method: 'DELETE' }).then(recargar), {
    exito: 'Cuenta eliminada',
    confirmacion: {
      titulo: 'Eliminar cuenta',
      mensaje: `¿Eliminar la cuenta de ${u.nombre}?${u.mascotas ? ` También se borrarán sus ${u.mascotas} mascota(s) con todo su historial.` : ''}`,
      boton: 'Eliminar cuenta', peligro: true,
    },
  });

  function exportar() {
    descargarCSV('usuarios', [
      ['Nombre', 'Correo', 'Teléfono', 'Rol', 'Mascotas', 'Registro'],
      ...lista.map((u) => [u.nombre, u.correo, u.telefono, u.rol, u.mascotas, u.creado_en]),
    ]);
  }

  return (
    <>
      <Encabezado titulo="Gestionar usuarios" sub={`${todos.length} cuentas registradas`}>
        <button className="btn suave" onClick={exportar} disabled={!lista.length}><Download size={17} /> Exportar</button>
        <button className="btn primario" onClick={() => setForm(NUEVO)}><UserPlus size={18} /> Nuevo usuario</button>
      </Encabezado>
      <Alerta>{error}</Alerta>

      <div className="barra-filtros">
        <Filtros valor={rol} onChange={setRol} opciones={[
          ['', 'Todos', todos.length],
          ['propietario', 'Propietarios', todos.filter((u) => u.rol === 'propietario').length],
          ['admin', 'Administradores', todos.filter((u) => u.rol === 'admin').length],
        ]} />
        <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Nombre, correo o teléfono" />
      </div>

      {!datos ? <Cargando /> : lista.length === 0 ? (
        <Vacio icono={Users}>Ningún usuario coincide con la búsqueda.</Vacio>
      ) : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr><th>Nombre</th><th>Contacto</th><th>Mascotas</th><th>Registro</th><th>Rol</th><th className="col-acciones">Acciones</th></tr>
            </thead>
            <tbody>
              {lista.map((u) => {
                const yo = u.id_propietario === usuario.id_propietario;
                return (
                  <tr key={u.id_propietario}>
                    <td><strong>{u.nombre}</strong>{yo && <span className="badge gris mini">Tú</span>}</td>
                    <td>{u.correo}<br /><small>{u.telefono}</small></td>
                    <td>{u.mascotas}</td>
                    <td className="nowrap">{fmtFecha(u.creado_en)}</td>
                    <td><Estado valor={u.rol} /></td>
                    <td className="col-acciones">
                      <div className="acciones-fila">
                        <BotonIcono icono={Pencil} label="Editar" onClick={() => setForm({ ...u, contrasena: '' })} />
                        {!yo && <BotonIcono icono={Trash2} label="Eliminar" peligro onClick={() => eliminar(u)} />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {form && <FormUsuario inicial={form} esYo={form.id_propietario === usuario.id_propietario} onClose={() => setForm(null)} onGuardado={() => { setForm(null); recargar(); }} />}
    </>
  );
}

function FormUsuario({ inicial, esYo, onClose, onGuardado }) {
  const accion = useAccion();
  const [f, setF] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const nuevo = !inicial.id_propietario;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setGuardando(true);
    const { nombre, telefono, correo, contrasena, rol } = f;
    const body = { nombre, telefono, correo, contrasena, rol };
    const ok = await accion(
      () => (nuevo ? api('/admin/usuarios', { method: 'POST', body }) : api(`/admin/usuarios/${f.id_propietario}`, { method: 'PUT', body })),
      { exito: nuevo ? 'Usuario creado' : 'Cambios guardados' },
    );
    setGuardando(false);
    if (ok) onGuardado();
  }

  return (
    <Modal titulo={nuevo ? 'Nuevo usuario' : `Editar a ${inicial.nombre}`} onClose={onClose}>
      <form onSubmit={enviar}>
        <Campo label="Nombre completo">
          <Entrada icono={User} required maxLength={100} value={f.nombre} onChange={set('nombre')} />
        </Campo>
        <div className="fila">
          <Campo label="Teléfono">
            <Entrada icono={Phone} required inputMode="tel" maxLength={20} value={f.telefono} onChange={set('telefono')} />
          </Campo>
          <Campo label="Rol">
            <select value={f.rol} onChange={set('rol')} disabled={esYo}>
              <option value="propietario">Propietario</option>
              <option value="admin">Administrador</option>
            </select>
          </Campo>
        </div>
        <Campo label="Correo electrónico">
          <Entrada icono={Mail} type="email" required maxLength={100} value={f.correo} onChange={set('correo')} />
        </Campo>
        <Campo label={nuevo ? 'Contraseña' : 'Nueva contraseña'} ayuda={nuevo ? 'Mínimo 8 caracteres' : 'Déjala vacía para conservar la actual'}>
          <EntradaClave required={nuevo} minLength={8} value={f.contrasena} onChange={set('contrasena')} autoComplete="new-password" />
        </Campo>
        <div className="modal-pie">
          <button type="button" className="btn suave" onClick={onClose}>Volver</button>
          <button className="btn primario" disabled={guardando}>{nuevo ? 'Crear usuario' : 'Guardar cambios'}</button>
        </div>
      </form>
    </Modal>
  );
}

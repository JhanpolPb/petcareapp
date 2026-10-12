// CU-11 Gestionar usuarios (admin)
import { useState } from 'react';
import { api, fmtFecha } from '../api.js';
import { useAuth } from '../App.jsx';
import { Alerta, Cargando, Encabezado, Estado, useCarga } from '../components.jsx';

export default function Usuarios() {
  const { usuario } = useAuth();
  const { datos, error, recargar } = useCarga('/admin/usuarios');
  const [msg, setMsg] = useState('');
  const [filtro, setFiltro] = useState('');

  const lista = (datos || []).filter((u) => `${u.nombre} ${u.correo}`.toLowerCase().includes(filtro.toLowerCase()));

  async function accion(fn) {
    setMsg('');
    try {
      await fn();
      recargar();
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <>
      <Encabezado titulo="Gestionar usuarios" sub={`${datos?.length ?? 0} cuentas registradas`} />
      <Alerta>{error || msg}</Alerta>
      <input className="buscador" placeholder="Buscar por nombre o correo…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      {!datos ? <Cargando /> : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr><th>Nombre</th><th>Contacto</th><th>Mascotas</th><th>Registro</th><th>Rol</th><th></th></tr>
            </thead>
            <tbody>
              {lista.map((u) => {
                const yo = u.id_propietario === usuario.id_propietario;
                return (
                  <tr key={u.id_propietario}>
                    <td><strong>{u.nombre}</strong>{yo && <small> (tú)</small>}</td>
                    <td>{u.correo}<br /><small>{u.telefono}</small></td>
                    <td>{u.mascotas}</td>
                    <td>{fmtFecha(String(u.creado_en))}</td>
                    <td><Estado valor={u.rol} /></td>
                    <td className="nowrap">
                      {!yo && (
                        <>
                          <button className="btn suave chico" onClick={() => accion(() => api(`/admin/usuarios/${u.id_propietario}/rol`, { method: 'PATCH', body: { rol: u.rol === 'admin' ? 'propietario' : 'admin' } }))}>
                            {u.rol === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                          </button>{' '}
                          <button className="btn peligro-suave chico" onClick={() => confirm(`¿Eliminar la cuenta de ${u.nombre} y todas sus mascotas?`) && accion(() => api(`/admin/usuarios/${u.id_propietario}`, { method: 'DELETE' }))}>
                            Eliminar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

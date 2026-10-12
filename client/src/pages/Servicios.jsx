// RF10 / CU-09 Solicitar servicio de peluquería · CU-15 Gestionar servicios (admin)
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtFecha, hoyISO } from '../api.js';
import { useAuth } from '../App.jsx';
import { Alerta, Campo, Cargando, Encabezado, Estado, Modal, useCarga, Vacio } from '../components.jsx';

const ESTADOS = ['Solicitado', 'Confirmado', 'Realizado', 'Cancelado'];

export default function Servicios() {
  const { esAdmin } = useAuth();
  const { datos, error, recargar } = useCarga('/servicios');
  const [nuevo, setNuevo] = useState(false);
  const [msg, setMsg] = useState('');

  async function cancelar(s) {
    if (!confirm(`¿Cancelar ${s.tipo_servicio} de ${s.nombre_mascota}?`)) return;
    try {
      await api(`/servicios/${s.id_servicio}/cancelar`, { method: 'PATCH' });
      recargar();
    } catch (e) {
      setMsg(e.message);
    }
  }

  async function cambiarEstado(s, estado) {
    await api(`/servicios/${s.id_servicio}/estado`, { method: 'PATCH', body: { estado } });
    recargar();
  }

  return (
    <>
      <Encabezado titulo={esAdmin ? 'Gestionar servicios' : 'Peluquería'} sub="Baño, corte y cuidado estético">
        <button className="btn primario" onClick={() => setNuevo(true)}>+ Solicitar servicio</button>
      </Encabezado>
      <Alerta>{error || msg}</Alerta>
      {!datos ? <Cargando /> : datos.length === 0 ? (
        <Vacio icono="✂️">No hay servicios solicitados.</Vacio>
      ) : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr><th>Fecha</th><th>Mascota</th>{esAdmin && <th>Propietario</th>}<th>Servicio</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {datos.map((s) => (
                <tr key={s.id_servicio}>
                  <td>{fmtFecha(s.fecha_servicio)}</td>
                  <td><strong>{s.nombre_mascota}</strong></td>
                  {esAdmin && <td>{s.propietario}<br /><small>{s.telefono}</small></td>}
                  <td>{s.tipo_servicio}</td>
                  <td>
                    {esAdmin ? (
                      <select className="select-estado" value={s.estado} onChange={(e) => cambiarEstado(s, e.target.value)} aria-label="Estado del servicio">
                        {ESTADOS.map((x) => <option key={x}>{x}</option>)}
                      </select>
                    ) : <Estado valor={s.estado} />}
                  </td>
                  <td>
                    {!esAdmin && ['Solicitado', 'Confirmado'].includes(s.estado) && (
                      <button className="btn peligro-suave chico" onClick={() => cancelar(s)}>Cancelar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {nuevo && <FormServicio onClose={() => setNuevo(false)} onGuardado={() => { setNuevo(false); recargar(); }} />}
    </>
  );
}

function FormServicio({ onClose, onGuardado }) {
  const { datos: mascotas } = useCarga('/mascotas');
  const { datos: tipos } = useCarga('/servicios/tipos');
  const [f, setF] = useState({ id_mascota: '', tipo_servicio: '', fecha_servicio: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (mascotas?.length && !f.id_mascota) setF((x) => ({ ...x, id_mascota: String(mascotas[0].id_mascota) }));
  }, [mascotas]);
  useEffect(() => {
    if (tipos?.length && !f.tipo_servicio) setF((x) => ({ ...x, tipo_servicio: tipos[0] }));
  }, [tipos]);

  async function enviar(e) {
    e.preventDefault();
    setError('');
    try {
      await api('/servicios', { method: 'POST', body: { ...f, id_mascota: Number(f.id_mascota) } });
      onGuardado();
    } catch (err) {
      setError(err.message);
    }
  }

  if (mascotas && mascotas.length === 0) {
    return (
      <Modal titulo="Solicitar servicio" onClose={onClose}>
        <Vacio>Primero debes <Link to="/mascotas">registrar una mascota</Link>.</Vacio>
      </Modal>
    );
  }

  return (
    <Modal titulo="Solicitar servicio de peluquería" onClose={onClose}>
      <form onSubmit={enviar}>
        <Alerta>{error}</Alerta>
        <Campo label="Mascota">
          <select required value={f.id_mascota} onChange={(e) => setF({ ...f, id_mascota: e.target.value })}>
            {(mascotas || []).map((m) => <option key={m.id_mascota} value={m.id_mascota}>{m.nombre_mascota}</option>)}
          </select>
        </Campo>
        <fieldset className="horas">
          <legend>Servicio</legend>
          <div className="chips">
            {(tipos || []).map((t) => (
              <button type="button" key={t} className={`chip ${f.tipo_servicio === t ? 'activo' : ''}`} onClick={() => setF({ ...f, tipo_servicio: t })}>
                {t}
              </button>
            ))}
          </div>
        </fieldset>
        <Campo label="Fecha deseada" ayuda="Lunes a sábado. La peluquería confirmará la hora por teléfono.">
          <input type="date" required min={hoyISO()} value={f.fecha_servicio} onChange={(e) => setF({ ...f, fecha_servicio: e.target.value })} />
        </Campo>
        <div className="modal-pie">
          <button type="button" className="btn suave" onClick={onClose}>Cancelar</button>
          <button className="btn primario">Solicitar</button>
        </div>
      </form>
    </Modal>
  );
}

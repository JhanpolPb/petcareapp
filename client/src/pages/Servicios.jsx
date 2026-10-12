// RF10 / CU-09 Solicitar servicio de peluquería · CU-15 Gestionar servicios (admin)
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Ban, Download, Pencil, Plus, Scissors, Trash2 } from 'lucide-react';
import { api, coincide, descargarCSV, fmtFecha, hoyISO } from '../api.js';
import { useAuth } from '../App.jsx';
import {
  Alerta, BotonIcono, Buscador, Campo, Cargando, Encabezado, Estado, Filtros, Modal, useAccion, useCarga, Vacio,
} from '../components.jsx';

const ESTADOS = ['Solicitado', 'Confirmado', 'Realizado', 'Cancelado'];
const ABIERTOS = ['Solicitado', 'Confirmado'];

export default function Servicios() {
  const { esAdmin } = useAuth();
  const accion = useAccion();
  const [params, setParams] = useSearchParams();
  const { datos, error, recargar } = useCarga('/servicios');
  const [form, setForm] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (params.get('nuevo')) {
      setForm({ id_mascota: params.get('mascota') || '', tipo_servicio: '', fecha_servicio: '' });
      setParams({}, { replace: true });
    }
    const estado = params.get('estado');
    if (estado) {
      setFiltro(estado);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const todos = datos || [];
  const lista = todos
    .filter((s) => !filtro || s.estado === filtro)
    .filter((s) => coincide(busqueda, s.nombre_mascota, s.propietario, s.tipo_servicio));

  const cancelar = (s) => accion(() => api(`/servicios/${s.id_servicio}/cancelar`, { method: 'PATCH' }).then(recargar), {
    exito: 'Servicio cancelado',
    confirmacion: { titulo: 'Cancelar servicio', mensaje: `¿Cancelar ${s.tipo_servicio.toLowerCase()} de ${s.nombre_mascota} del ${fmtFecha(s.fecha_servicio)}?`, boton: 'Cancelar servicio', peligro: true },
  });
  const eliminar = (s) => accion(() => api(`/servicios/${s.id_servicio}`, { method: 'DELETE' }).then(recargar), {
    exito: 'Servicio eliminado',
    confirmacion: { titulo: 'Eliminar servicio', mensaje: `Se eliminará definitivamente ${s.tipo_servicio.toLowerCase()} de ${s.nombre_mascota}. Esta acción no se puede deshacer.`, boton: 'Eliminar', peligro: true },
  });
  const cambiarEstado = (s, estado) => accion(() => api(`/servicios/${s.id_servicio}/estado`, { method: 'PATCH', body: { estado } }).then(recargar), {
    exito: `Servicio marcado como ${estado.toLowerCase()}`,
  });

  function exportar() {
    descargarCSV('servicios', [
      ['Fecha', 'Mascota', 'Propietario', 'Teléfono', 'Servicio', 'Estado'],
      ...lista.map((s) => [s.fecha_servicio, s.nombre_mascota, s.propietario, s.telefono, s.tipo_servicio, s.estado]),
    ]);
  }

  return (
    <>
      <Encabezado titulo={esAdmin ? 'Gestionar servicios de peluquería' : 'Peluquería'} sub="Baño, corte y cuidado estético, de lunes a sábado">
        {esAdmin && <button className="btn suave" onClick={exportar} disabled={!lista.length}><Download size={17} /> Exportar</button>}
        <button className="btn primario" onClick={() => setForm({ id_mascota: '', tipo_servicio: '', fecha_servicio: '' })}><Plus size={18} /> Solicitar servicio</button>
      </Encabezado>
      <Alerta>{error}</Alerta>

      <div className="barra-filtros">
        <Filtros valor={filtro} onChange={setFiltro} opciones={[
          ['', 'Todos', todos.length],
          ...ESTADOS.map((e) => [e, `${e}s`, todos.filter((s) => s.estado === e).length]),
        ]} />
        <Buscador valor={busqueda} onChange={setBusqueda} placeholder={esAdmin ? 'Mascota, propietario o servicio' : 'Mascota o servicio'} />
      </div>

      {!datos ? <Cargando /> : lista.length === 0 ? (
        <Vacio icono={Scissors}>{todos.length ? 'Ningún servicio coincide con el filtro.' : 'No hay servicios solicitados.'}</Vacio>
      ) : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr><th>Fecha</th><th>Mascota</th>{esAdmin && <th>Propietario</th>}<th>Servicio</th><th>Estado</th><th className="col-acciones">Acciones</th></tr>
            </thead>
            <tbody>
              {lista.map((s) => (
                <tr key={s.id_servicio}>
                  <td className="nowrap">{fmtFecha(s.fecha_servicio)}{s.fecha_servicio === hoyISO() && <span className="badge coral mini">Hoy</span>}</td>
                  <td><Link to={`/mascotas/${s.id_mascota}`}><strong>{s.nombre_mascota}</strong></Link></td>
                  {esAdmin && <td>{s.propietario}<br /><small>{s.telefono}</small></td>}
                  <td>{s.tipo_servicio}</td>
                  <td>
                    {esAdmin ? (
                      <select className={`select-estado ${s.estado}`} value={s.estado} onChange={(e) => cambiarEstado(s, e.target.value)} aria-label="Estado del servicio">
                        {ESTADOS.map((x) => <option key={x}>{x}</option>)}
                      </select>
                    ) : <Estado valor={s.estado} />}
                  </td>
                  <td className="col-acciones">
                    <div className="acciones-fila">
                      {ABIERTOS.includes(s.estado) && <BotonIcono icono={Pencil} label="Modificar" onClick={() => setForm(s)} />}
                      {!esAdmin && ABIERTOS.includes(s.estado) && <BotonIcono icono={Ban} label="Cancelar servicio" peligro onClick={() => cancelar(s)} />}
                      {esAdmin && <BotonIcono icono={Trash2} label="Eliminar" peligro onClick={() => eliminar(s)} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {form && <FormServicio inicial={form} onClose={() => setForm(null)} onGuardado={() => { setForm(null); recargar(); }} />}
    </>
  );
}

function FormServicio({ inicial, onClose, onGuardado }) {
  const { esAdmin } = useAuth();
  const accion = useAccion();
  const editando = Boolean(inicial.id_servicio);
  const { datos: mascotas } = useCarga('/mascotas');
  const { datos: tipos } = useCarga('/servicios/tipos');
  const [f, setF] = useState({
    id_mascota: String(inicial.id_mascota || ''), tipo_servicio: inicial.tipo_servicio || '', fecha_servicio: inicial.fecha_servicio || '',
  });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (mascotas?.length && !f.id_mascota) setF((x) => ({ ...x, id_mascota: String(mascotas[0].id_mascota) }));
  }, [mascotas]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (tipos?.length && !f.tipo_servicio) setF((x) => ({ ...x, tipo_servicio: tipos[0] }));
  }, [tipos]); // eslint-disable-line react-hooks/exhaustive-deps

  async function enviar(e) {
    e.preventDefault();
    setGuardando(true);
    const body = { ...f, id_mascota: Number(f.id_mascota) };
    const ok = await accion(
      () => (editando ? api(`/servicios/${inicial.id_servicio}`, { method: 'PUT', body }) : api('/servicios', { method: 'POST', body })),
      { exito: editando ? 'Servicio modificado' : 'Servicio solicitado' },
    );
    setGuardando(false);
    if (ok) onGuardado();
  }

  if (mascotas && mascotas.length === 0) {
    return (
      <Modal titulo="Solicitar servicio" onClose={onClose}>
        <Vacio>Primero debes <Link to="/mascotas?nuevo=1">registrar una mascota</Link>.</Vacio>
      </Modal>
    );
  }

  return (
    <Modal titulo={editando ? 'Modificar servicio' : 'Solicitar servicio de peluquería'} onClose={onClose}>
      <form onSubmit={enviar}>
        <Campo label="Mascota">
          <select required value={f.id_mascota} onChange={(e) => setF({ ...f, id_mascota: e.target.value })} disabled={editando && !esAdmin}>
            {(mascotas || []).map((m) => (
              <option key={m.id_mascota} value={m.id_mascota}>{m.nombre_mascota}{esAdmin ? ` — ${m.propietario}` : ''}</option>
            ))}
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
          <button type="button" className="btn suave" onClick={onClose}>Volver</button>
          <button className="btn primario" disabled={guardando}>{editando ? 'Guardar cambios' : 'Solicitar'}</button>
        </div>
      </form>
    </Modal>
  );
}

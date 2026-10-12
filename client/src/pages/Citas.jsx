// CU-05 Solicitar cita · CU-06 Consultar citas · RF12 Cancelar · CU-13 Gestionar citas (admin)
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Ban, CalendarClock, CalendarX2, Download, Plus, Trash2 } from 'lucide-react';
import { api, coincide, descargarCSV, fmtFecha, hoyISO } from '../api.js';
import { useAuth } from '../App.jsx';
import {
  Alerta, BotonIcono, Buscador, Campo, Cargando, Encabezado, Estado, Filtros, Modal, useAccion, useCarga, Vacio,
} from '../components.jsx';

const ESTADOS = ['Programada', 'Atendida', 'Cancelada'];

export default function Citas() {
  const { esAdmin } = useAuth();
  const accion = useAccion();
  const [params, setParams] = useSearchParams();
  const { datos, error, recargar } = useCarga('/citas');
  const [form, setForm] = useState(null);
  const [filtro, setFiltro] = useState('Programada');
  const [busqueda, setBusqueda] = useState('');
  const [fecha, setFecha] = useState('');

  // Accesos directos: /citas?nuevo=1&mascota=ID
  useEffect(() => {
    if (params.get('nuevo')) {
      setForm({ id_mascota: params.get('mascota') || '', fecha: '', hora: '', motivo: '' });
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const todas = datos || [];
  const lista = todas
    .filter((c) => !filtro || c.estado === filtro)
    .filter((c) => !fecha || c.fecha === fecha)
    .filter((c) => coincide(busqueda, c.nombre_mascota, c.propietario, c.motivo));
  // Las programadas se muestran de la más próxima a la más lejana
  if (filtro === 'Programada') lista.sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`));
  const contar = (e) => todas.filter((c) => c.estado === e).length;

  const cancelar = (c) => accion(() => api(`/citas/${c.id_cita}/cancelar`, { method: 'PATCH' }).then(recargar), {
    exito: 'Cita cancelada',
    confirmacion: { titulo: 'Cancelar cita', mensaje: `¿Cancelar la cita de ${c.nombre_mascota} del ${fmtFecha(c.fecha)} a las ${c.hora}?`, boton: 'Cancelar cita', peligro: true },
  });
  const eliminar = (c) => accion(() => api(`/citas/${c.id_cita}`, { method: 'DELETE' }).then(recargar), {
    exito: 'Cita eliminada',
    confirmacion: { titulo: 'Eliminar cita', mensaje: `Se eliminará definitivamente la cita de ${c.nombre_mascota} del ${fmtFecha(c.fecha)}. Esta acción no se puede deshacer.`, boton: 'Eliminar', peligro: true },
  });
  const cambiarEstado = (c, estado) => accion(() => api(`/citas/${c.id_cita}/estado`, { method: 'PATCH', body: { estado } }).then(recargar), {
    exito: `Cita marcada como ${estado.toLowerCase()}`,
  });

  function exportar() {
    descargarCSV('citas', [
      ['Fecha', 'Hora', 'Mascota', 'Propietario', 'Teléfono', 'Motivo', 'Estado'],
      ...lista.map((c) => [c.fecha, c.hora, c.nombre_mascota, c.propietario, c.telefono, c.motivo || '', c.estado]),
    ]);
  }

  return (
    <>
      <Encabezado titulo={esAdmin ? 'Gestionar citas veterinarias' : 'Citas veterinarias'} sub="Atención de lunes a sábado, de 8:00 a.m. a 6:00 p.m. (última cita 5:30 p.m.)">
        {esAdmin && <button className="btn suave" onClick={exportar} disabled={!lista.length}><Download size={17} /> Exportar</button>}
        <button className="btn primario" onClick={() => setForm({ id_mascota: '', fecha: '', hora: '', motivo: '' })}><Plus size={18} /> Solicitar cita</button>
      </Encabezado>
      <Alerta>{error}</Alerta>

      <div className="barra-filtros">
        <Filtros valor={filtro} onChange={setFiltro} opciones={[
          ...ESTADOS.map((e) => [e, `${e}s`, contar(e)]),
          ['', 'Todas', todas.length],
        ]} />
        <div className="barra-filtros-der">
          <input type="date" className="filtro-fecha" value={fecha} onChange={(e) => setFecha(e.target.value)} aria-label="Filtrar por fecha" />
          <Buscador valor={busqueda} onChange={setBusqueda} placeholder={esAdmin ? 'Mascota, propietario o motivo' : 'Mascota o motivo'} />
        </div>
      </div>

      {!datos ? <Cargando /> : lista.length === 0 ? (
        <Vacio icono={CalendarX2}>{busqueda || fecha ? 'Ninguna cita coincide con la búsqueda.' : 'No hay citas en esta categoría.'}</Vacio>
      ) : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th><th>Hora</th><th>Mascota</th>
                {esAdmin && <th>Propietario</th>}
                <th>Motivo</th><th>Estado</th><th className="col-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id_cita}>
                  <td className="nowrap">{fmtFecha(c.fecha)}{c.fecha === hoyISO() && <span className="badge coral mini">Hoy</span>}</td>
                  <td>{c.hora}</td>
                  <td><Link to={`/mascotas/${c.id_mascota}`}><strong>{c.nombre_mascota}</strong></Link></td>
                  {esAdmin && <td>{c.propietario}<br /><small>{c.telefono}</small></td>}
                  <td className="col-texto">{c.motivo || <span className="tenue">Sin motivo</span>}</td>
                  <td>
                    {esAdmin ? (
                      <select className={`select-estado ${c.estado}`} value={c.estado} onChange={(e) => cambiarEstado(c, e.target.value)} aria-label="Estado de la cita">
                        {ESTADOS.map((e) => <option key={e}>{e}</option>)}
                      </select>
                    ) : <Estado valor={c.estado} />}
                  </td>
                  <td className="col-acciones">
                    <div className="acciones-fila">
                      {c.estado === 'Programada' && (
                        <BotonIcono icono={CalendarClock} label="Reprogramar" onClick={() => setForm(c)} />
                      )}
                      {!esAdmin && c.estado === 'Programada' && (
                        <BotonIcono icono={Ban} label="Cancelar cita" peligro onClick={() => cancelar(c)} />
                      )}
                      {esAdmin && <BotonIcono icono={Trash2} label="Eliminar" peligro onClick={() => eliminar(c)} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {form && (
        <FormCita
          inicial={form}
          onClose={() => setForm(null)}
          onGuardado={() => { setForm(null); setFiltro('Programada'); recargar(); }}
        />
      )}
    </>
  );
}

function FormCita({ inicial, onClose, onGuardado }) {
  const { esAdmin } = useAuth();
  const accion = useAccion();
  const editando = Boolean(inicial.id_cita);
  const { datos: mascotas } = useCarga('/mascotas');
  const [f, setF] = useState({
    id_mascota: String(inicial.id_mascota || ''), fecha: inicial.fecha || '', hora: inicial.hora || '', motivo: inicial.motivo || '',
  });
  const [horas, setHoras] = useState(null);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (mascotas?.length && !f.id_mascota) setF((x) => ({ ...x, id_mascota: String(mascotas[0].id_mascota) }));
  }, [mascotas]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!f.fecha) return;
    setHoras(null);
    setAviso('');
    const excluir = editando ? `&excluir=${inicial.id_cita}` : '';
    api(`/citas/disponibilidad?fecha=${f.fecha}${excluir}`)
      .then((d) => {
        setHoras(d.disponibles);
        setAviso(d.mensaje || '');
        setF((x) => (d.disponibles.includes(x.hora) ? x : { ...x, hora: '' }));
      })
      .catch((e) => setError(e.message));
  }, [f.fecha]); // eslint-disable-line react-hooks/exhaustive-deps

  async function enviar(e) {
    e.preventDefault();
    setError('');
    if (!f.hora) return setError('Seleccione una hora disponible');
    setGuardando(true);
    const body = { ...f, id_mascota: Number(f.id_mascota) };
    const ok = await accion(
      () => (editando ? api(`/citas/${inicial.id_cita}`, { method: 'PUT', body }) : api('/citas', { method: 'POST', body })),
      { exito: editando ? 'Cita reprogramada' : 'Cita agendada' },
    );
    setGuardando(false);
    if (ok) onGuardado();
  }

  if (mascotas && mascotas.length === 0) {
    return (
      <Modal titulo="Solicitar cita" onClose={onClose}>
        <Vacio>Primero debes <Link to="/mascotas?nuevo=1">registrar una mascota</Link>.</Vacio>
      </Modal>
    );
  }

  return (
    <Modal titulo={editando ? 'Reprogramar cita' : 'Solicitar cita veterinaria'} onClose={onClose}>
      <form onSubmit={enviar}>
        <Alerta>{error}</Alerta>
        <Campo label="Mascota">
          <select required value={f.id_mascota} onChange={(e) => setF({ ...f, id_mascota: e.target.value })} disabled={editando && !esAdmin}>
            {(mascotas || []).map((m) => (
              <option key={m.id_mascota} value={m.id_mascota}>
                {m.nombre_mascota}{esAdmin ? ` — ${m.propietario}` : ''}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Fecha">
          <input type="date" required min={hoyISO()} value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} />
        </Campo>
        {f.fecha && (
          <fieldset className="horas">
            <legend>Hora disponible</legend>
            {!horas ? <Cargando /> : horas.length === 0 ? (
              <p className="sub">{aviso || 'No hay horarios disponibles en esta fecha.'}</p>
            ) : (
              <div className="chips">
                {horas.map((h) => (
                  <button type="button" key={h} className={`chip ${f.hora === h ? 'activo' : ''}`} onClick={() => setF({ ...f, hora: h })}>
                    {h}
                  </button>
                ))}
              </div>
            )}
          </fieldset>
        )}
        <Campo label="Motivo de la consulta (opcional)">
          <input maxLength={200} value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} placeholder="Ej. control anual, vómito, revisión de piel" />
        </Campo>
        <div className="modal-pie">
          <button type="button" className="btn suave" onClick={onClose}>Volver</button>
          <button className="btn primario" disabled={guardando}>{editando ? 'Guardar cambios' : 'Agendar cita'}</button>
        </div>
      </form>
    </Modal>
  );
}

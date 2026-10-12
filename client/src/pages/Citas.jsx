// CU-05 Solicitar cita · CU-06 Consultar citas · RF12 Cancelar · CU-13 Gestionar citas (admin)
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtFecha, hoyISO } from '../api.js';
import { useAuth } from '../App.jsx';
import { Alerta, Campo, Cargando, Encabezado, Estado, Modal, useCarga, Vacio } from '../components.jsx';

export default function Citas() {
  const { esAdmin } = useAuth();
  const { datos, error, recargar } = useCarga('/citas');
  const [nueva, setNueva] = useState(false);
  const [filtro, setFiltro] = useState('Programada');
  const [msg, setMsg] = useState('');

  const lista = (datos || []).filter((c) => !filtro || c.estado === filtro);

  async function cancelar(c) {
    if (!confirm(`¿Cancelar la cita de ${c.nombre_mascota} del ${fmtFecha(c.fecha)}?`)) return;
    try {
      await api(`/citas/${c.id_cita}/cancelar`, { method: 'PATCH' });
      recargar();
    } catch (e) {
      setMsg(e.message);
    }
  }

  async function cambiarEstado(c, estado) {
    await api(`/citas/${c.id_cita}/estado`, { method: 'PATCH', body: { estado } });
    recargar();
  }

  return (
    <>
      <Encabezado titulo={esAdmin ? 'Gestionar citas veterinarias' : 'Citas veterinarias'} sub="Atención de lunes a sábado, 8:00 a.m. a 6:00 p.m.">
        <button className="btn primario" onClick={() => setNueva(true)}>+ Solicitar cita</button>
      </Encabezado>
      <Alerta>{error || msg}</Alerta>

      <div className="tabs" role="tablist">
        {['Programada', 'Atendida', 'Cancelada', ''].map((e) => (
          <button key={e} role="tab" aria-selected={filtro === e} className={filtro === e ? 'activo' : ''} onClick={() => setFiltro(e)}>
            {e ? `${e}s` : 'Todas'}
          </button>
        ))}
      </div>

      {!datos ? <Cargando /> : lista.length === 0 ? (
        <Vacio icono="📅">No hay citas en esta categoría.</Vacio>
      ) : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th><th>Hora</th><th>Mascota</th>
                {esAdmin && <th>Propietario</th>}
                <th>Motivo</th><th>Estado</th><th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id_cita}>
                  <td>{fmtFecha(c.fecha)}</td>
                  <td>{c.hora}</td>
                  <td><strong>{c.nombre_mascota}</strong></td>
                  {esAdmin && <td>{c.propietario}<br /><small>{c.telefono}</small></td>}
                  <td>{c.motivo || '—'}</td>
                  <td>
                    {esAdmin ? (
                      <select className="select-estado" value={c.estado} onChange={(e) => cambiarEstado(c, e.target.value)} aria-label="Estado de la cita">
                        <option>Programada</option><option>Atendida</option><option>Cancelada</option>
                      </select>
                    ) : <Estado valor={c.estado} />}
                  </td>
                  <td>
                    {!esAdmin && c.estado === 'Programada' && (
                      <button className="btn peligro-suave chico" onClick={() => cancelar(c)}>Cancelar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {nueva && <FormCita onClose={() => setNueva(false)} onGuardado={() => { setNueva(false); setFiltro('Programada'); recargar(); }} />}
    </>
  );
}

function FormCita({ onClose, onGuardado }) {
  const { datos: mascotas } = useCarga('/mascotas');
  const [f, setF] = useState({ id_mascota: '', fecha: '', hora: '', motivo: '' });
  const [horas, setHoras] = useState(null);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (mascotas?.length && !f.id_mascota) setF((x) => ({ ...x, id_mascota: String(mascotas[0].id_mascota) }));
  }, [mascotas]);

  useEffect(() => {
    if (!f.fecha) return;
    setHoras(null);
    setF((x) => ({ ...x, hora: '' }));
    api(`/citas/disponibilidad?fecha=${f.fecha}`)
      .then((d) => {
        const ahora = new Date().toLocaleTimeString('en-GB', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' });
        setHoras(f.fecha === hoyISO() ? d.disponibles.filter((h) => h > ahora) : d.disponibles);
        setAviso(d.mensaje || '');
      })
      .catch((e) => setError(e.message));
  }, [f.fecha]);

  async function enviar(e) {
    e.preventDefault();
    setError('');
    if (!f.hora) return setError('Seleccione una hora disponible');
    try {
      await api('/citas', { method: 'POST', body: { ...f, id_mascota: Number(f.id_mascota) } });
      onGuardado();
    } catch (err) {
      setError(err.message);
    }
  }

  if (mascotas && mascotas.length === 0) {
    return (
      <Modal titulo="Solicitar cita" onClose={onClose}>
        <Vacio>Primero debes <Link to="/mascotas">registrar una mascota</Link>.</Vacio>
      </Modal>
    );
  }

  return (
    <Modal titulo="Solicitar cita veterinaria" onClose={onClose}>
      <form onSubmit={enviar}>
        <Alerta>{error}</Alerta>
        <Campo label="Mascota">
          <select required value={f.id_mascota} onChange={(e) => setF({ ...f, id_mascota: e.target.value })}>
            {(mascotas || []).map((m) => (
              <option key={m.id_mascota} value={m.id_mascota}>
                {m.nombre_mascota}{m.propietario && mascotas.some((x) => x.id_propietario !== m.id_propietario) ? ` (${m.propietario})` : ''}
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
          <button type="button" className="btn suave" onClick={onClose}>Cancelar</button>
          <button className="btn primario">Agendar cita</button>
        </div>
      </form>
    </Modal>
  );
}

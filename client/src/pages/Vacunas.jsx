// CU-08 Consultar vacunaciones · RF06 / CU-14 Registrar y gestionar vacunas (admin)
import { useState } from 'react';
import { api, fmtFecha, hoyISO } from '../api.js';
import { useAuth } from '../App.jsx';
import { Alerta, Campo, Cargando, Encabezado, Modal, useCarga, Vacio } from '../components.jsx';

const VACUNAS_COMUNES = ['Rabia', 'Parvovirus', 'Moquillo', 'Hepatitis', 'Leptospirosis', 'Triple felina', 'Leucemia felina', 'Desparasitación'];

export default function Vacunas() {
  const { esAdmin } = useAuth();
  const { datos, error, recargar } = useCarga('/vacunas');
  const [form, setForm] = useState(null);
  const h = hoyISO();

  async function eliminar(v) {
    if (!confirm(`¿Eliminar el registro de ${v.nombre} de ${v.nombre_mascota}?`)) return;
    await api(`/vacunas/${v.id_vacuna}`, { method: 'DELETE' });
    recargar();
  }

  function estadoDosis(v) {
    if (!v.fecha_proxima) return <span className="badge gris">Sin refuerzo</span>;
    if (v.fecha_proxima < h) return <span className="badge coral">Vencida</span>;
    const dias = (Date.parse(v.fecha_proxima) - Date.parse(h)) / 86400000;
    if (dias <= 30) return <span className="badge ambar">Próxima</span>;
    return <span className="badge verde">Al día</span>;
  }

  return (
    <>
      <Encabezado titulo={esAdmin ? 'Gestionar vacunas' : 'Vacunación'} sub={esAdmin ? 'Registro de vacunas aplicadas en la veterinaria' : 'Esquema de vacunación de tus mascotas'}>
        {esAdmin && <button className="btn primario" onClick={() => setForm({ id_mascota: '', nombre: '', fecha_aplicacion: h, fecha_proxima: '' })}>+ Registrar vacuna</button>}
      </Encabezado>
      <Alerta>{error}</Alerta>
      {!esAdmin && <p className="nota">Las vacunas las registra la veterinaria al aplicarlas. Recibirás un recordatorio 30 días antes de cada refuerzo.</p>}
      {!datos ? <Cargando /> : datos.length === 0 ? (
        <Vacio icono="💉">No hay vacunas registradas.</Vacio>
      ) : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr>
                <th>Mascota</th>{esAdmin && <th>Propietario</th>}<th>Vacuna</th><th>Aplicada</th><th>Próxima dosis</th><th>Estado</th>{esAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {datos.map((v) => (
                <tr key={v.id_vacuna}>
                  <td><strong>{v.nombre_mascota}</strong></td>
                  {esAdmin && <td>{v.propietario}</td>}
                  <td>{v.nombre}</td>
                  <td>{fmtFecha(v.fecha_aplicacion)}</td>
                  <td>{fmtFecha(v.fecha_proxima)}</td>
                  <td>{estadoDosis(v)}</td>
                  {esAdmin && (
                    <td className="nowrap">
                      <button className="btn suave chico" onClick={() => setForm({ ...v, fecha_proxima: v.fecha_proxima || '' })}>Editar</button>{' '}
                      <button className="btn peligro-suave chico" onClick={() => eliminar(v)}>Eliminar</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {form && <FormVacuna inicial={form} onClose={() => setForm(null)} onGuardado={() => { setForm(null); recargar(); }} />}
    </>
  );
}

function FormVacuna({ inicial, onClose, onGuardado }) {
  const { datos: mascotas } = useCarga('/mascotas');
  const [f, setF] = useState(inicial);
  const [error, setError] = useState('');
  const nueva = !inicial.id_vacuna;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setError('');
    try {
      const body = { ...f, id_mascota: Number(f.id_mascota), fecha_proxima: f.fecha_proxima || null };
      if (nueva) await api('/vacunas', { method: 'POST', body });
      else await api(`/vacunas/${f.id_vacuna}`, { method: 'PUT', body });
      onGuardado();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal titulo={nueva ? 'Registrar vacunación' : 'Editar vacunación'} onClose={onClose}>
      <form onSubmit={enviar}>
        <Alerta>{error}</Alerta>
        {nueva && (
          <Campo label="Mascota">
            <select required value={f.id_mascota} onChange={set('id_mascota')}>
              <option value="">Seleccione…</option>
              {(mascotas || []).map((m) => (
                <option key={m.id_mascota} value={m.id_mascota}>{m.nombre_mascota} — {m.propietario}</option>
              ))}
            </select>
          </Campo>
        )}
        <Campo label="Vacuna">
          <input required maxLength={50} list="vacunas-comunes" value={f.nombre} onChange={set('nombre')} />
          <datalist id="vacunas-comunes">{VACUNAS_COMUNES.map((v) => <option key={v} value={v} />)}</datalist>
        </Campo>
        <div className="fila">
          <Campo label="Fecha de aplicación">
            <input type="date" required max={hoyISO()} value={f.fecha_aplicacion} onChange={set('fecha_aplicacion')} />
          </Campo>
          <Campo label="Próxima dosis (opcional)">
            <input type="date" min={f.fecha_aplicacion} value={f.fecha_proxima} onChange={set('fecha_proxima')} />
          </Campo>
        </div>
        <div className="modal-pie">
          <button type="button" className="btn suave" onClick={onClose}>Cancelar</button>
          <button className="btn primario">Guardar</button>
        </div>
      </form>
    </Modal>
  );
}

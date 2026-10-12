// CU-08 Consultar vacunaciones · RF06 / CU-14 Registrar y gestionar vacunas (admin)
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, Pencil, Plus, Syringe, Trash2 } from 'lucide-react';
import { api, coincide, descargarCSV, fmtFecha, hoyISO, sumarDias } from '../api.js';
import { useAuth } from '../App.jsx';
import {
  Alerta, BotonIcono, Buscador, Campo, Cargando, Encabezado, Filtros, Modal, useAccion, useCarga, Vacio,
} from '../components.jsx';

const VACUNAS_COMUNES = ['Rabia', 'Parvovirus', 'Moquillo', 'Hepatitis', 'Leptospirosis', 'Triple felina', 'Leucemia felina', 'Desparasitación'];
const ESTADOS = {
  vencida: ['Vencida', 'coral'],
  proxima: ['Próxima', 'ambar'],
  aldia: ['Al día', 'verde'],
  sin: ['Sin refuerzo', 'gris'],
};

function estadoDosis(v, h) {
  if (!v.fecha_proxima) return 'sin';
  if (v.fecha_proxima < h) return 'vencida';
  if (v.fecha_proxima <= sumarDias(h, 30)) return 'proxima';
  return 'aldia';
}

export default function Vacunas() {
  const { esAdmin } = useAuth();
  const accion = useAccion();
  const [params, setParams] = useSearchParams();
  const { datos, error, recargar } = useCarga('/vacunas');
  const [form, setForm] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const h = hoyISO();
  const nueva = { id_mascota: '', nombre: '', fecha_aplicacion: h, fecha_proxima: '' };

  useEffect(() => {
    if (esAdmin && params.get('nuevo')) {
      setForm({ ...nueva, id_mascota: params.get('mascota') || '' });
      setParams({}, { replace: true });
    }
  }, [params, setParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const todas = (datos || []).map((v) => ({ ...v, est: estadoDosis(v, h) }));
  const lista = todas
    .filter((v) => !filtro || v.est === filtro)
    .filter((v) => coincide(busqueda, v.nombre, v.nombre_mascota, v.propietario));

  const eliminar = (v) => accion(() => api(`/vacunas/${v.id_vacuna}`, { method: 'DELETE' }).then(recargar), {
    exito: 'Registro de vacuna eliminado',
    confirmacion: { titulo: 'Eliminar vacuna', mensaje: `¿Eliminar el registro de ${v.nombre} aplicado a ${v.nombre_mascota} el ${fmtFecha(v.fecha_aplicacion)}?`, boton: 'Eliminar', peligro: true },
  });

  function exportar() {
    descargarCSV('vacunas', [
      ['Mascota', 'Propietario', 'Vacuna', 'Aplicada', 'Próxima dosis', 'Estado'],
      ...lista.map((v) => [v.nombre_mascota, v.propietario, v.nombre, v.fecha_aplicacion, v.fecha_proxima || '', ESTADOS[v.est][0]]),
    ]);
  }

  return (
    <>
      <Encabezado titulo={esAdmin ? 'Gestionar vacunas' : 'Vacunación'} sub={esAdmin ? 'Registro de vacunas aplicadas en la veterinaria' : 'Esquema de vacunación de tus mascotas'}>
        {esAdmin && <button className="btn suave" onClick={exportar} disabled={!lista.length}><Download size={17} /> Exportar</button>}
        {esAdmin && <button className="btn primario" onClick={() => setForm(nueva)}><Plus size={18} /> Registrar vacuna</button>}
      </Encabezado>
      <Alerta>{error}</Alerta>
      {!esAdmin && <p className="nota">Las vacunas las registra la veterinaria al aplicarlas. Recibirás un recordatorio 30 días antes de cada refuerzo.</p>}

      <div className="barra-filtros">
        <Filtros valor={filtro} onChange={setFiltro} opciones={[
          ['', 'Todas', todas.length],
          ...Object.entries(ESTADOS).map(([k, [label]]) => [k, label, todas.filter((v) => v.est === k).length]),
        ]} />
        <Buscador valor={busqueda} onChange={setBusqueda} placeholder={esAdmin ? 'Vacuna, mascota o propietario' : 'Vacuna o mascota'} />
      </div>

      {!datos ? <Cargando /> : lista.length === 0 ? (
        <Vacio icono={Syringe}>{todas.length ? 'Ninguna vacuna coincide con el filtro.' : 'No hay vacunas registradas.'}</Vacio>
      ) : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr>
                <th>Mascota</th>{esAdmin && <th>Propietario</th>}<th>Vacuna</th><th>Aplicada</th><th>Próxima dosis</th><th>Estado</th>
                {esAdmin && <th className="col-acciones">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {lista.map((v) => (
                <tr key={v.id_vacuna}>
                  <td><Link to={`/mascotas/${v.id_mascota}`}><strong>{v.nombre_mascota}</strong></Link></td>
                  {esAdmin && <td>{v.propietario}</td>}
                  <td>{v.nombre}</td>
                  <td className="nowrap">{fmtFecha(v.fecha_aplicacion)}</td>
                  <td className="nowrap">{fmtFecha(v.fecha_proxima)}</td>
                  <td><span className={`badge ${ESTADOS[v.est][1]}`}>{ESTADOS[v.est][0]}</span></td>
                  {esAdmin && (
                    <td className="col-acciones">
                      <div className="acciones-fila">
                        <BotonIcono icono={Pencil} label="Editar" onClick={() => setForm({ ...v, fecha_proxima: v.fecha_proxima || '' })} />
                        <BotonIcono icono={Trash2} label="Eliminar" peligro onClick={() => eliminar(v)} />
                      </div>
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
  const accion = useAccion();
  const { datos: mascotas } = useCarga('/mascotas');
  const [f, setF] = useState({ ...inicial, id_mascota: String(inicial.id_mascota || '') });
  const [guardando, setGuardando] = useState(false);
  const nueva = !inicial.id_vacuna;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  // Atajos para la fecha del refuerzo
  const refuerzo = (dias) => setF({ ...f, fecha_proxima: sumarDias(f.fecha_aplicacion || hoyISO(), dias) });

  async function enviar(e) {
    e.preventDefault();
    setGuardando(true);
    const body = { ...f, id_mascota: Number(f.id_mascota), fecha_proxima: f.fecha_proxima || null };
    const ok = await accion(
      () => (nueva ? api('/vacunas', { method: 'POST', body }) : api(`/vacunas/${f.id_vacuna}`, { method: 'PUT', body })),
      { exito: nueva ? 'Vacuna registrada' : 'Cambios guardados' },
    );
    setGuardando(false);
    if (ok) onGuardado();
  }

  return (
    <Modal titulo={nueva ? 'Registrar vacunación' : 'Editar vacunación'} onClose={onClose}>
      <form onSubmit={enviar}>
        <Campo label="Mascota">
          <select required value={f.id_mascota} onChange={set('id_mascota')}>
            <option value="">Seleccione…</option>
            {(mascotas || []).map((m) => (
              <option key={m.id_mascota} value={m.id_mascota}>{m.nombre_mascota} — {m.propietario}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Vacuna">
          <input required maxLength={50} list="vacunas-comunes" value={f.nombre} onChange={set('nombre')} placeholder="Escriba o elija de la lista" />
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
        <div className="atajos">
          <span>Refuerzo en:</span>
          {[[30, '1 mes'], [90, '3 meses'], [180, '6 meses'], [365, '1 año']].map(([d, l]) => (
            <button type="button" key={d} className="chip chico" onClick={() => refuerzo(d)}>{l}</button>
          ))}
          {f.fecha_proxima && <button type="button" className="btn-link" onClick={() => setF({ ...f, fecha_proxima: '' })}>Quitar</button>}
        </div>
        <div className="modal-pie">
          <button type="button" className="btn suave" onClick={onClose}>Volver</button>
          <button className="btn primario" disabled={guardando}>Guardar</button>
        </div>
      </form>
    </Modal>
  );
}

// CU-03 Registrar mascota · CU-04 Actualizar · CU-12 Gestionar mascotas (admin)
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, History, PawPrint, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, coincide, descargarCSV } from '../api.js';
import { useAuth } from '../App.jsx';
import {
  Alerta, BotonIcono, Buscador, Campo, Cargando, Encabezado, ESPECIES, Filtros, IconoEspecie, Modal, useAccion, useCarga, Vacio,
} from '../components.jsx';

const VACIA = { nombre_mascota: '', especie: 'Perro', raza: '', edad: '', sexo: 'Hembra', id_propietario: '' };

export default function Mascotas() {
  const { esAdmin } = useAuth();
  const accion = useAccion();
  const [params, setParams] = useSearchParams();
  const { datos, error, recargar } = useCarga('/mascotas');
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [especie, setEspecie] = useState('');

  useEffect(() => {
    if (params.get('nuevo')) {
      setEditando(VACIA);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const todas = datos || [];
  const lista = todas
    .filter((m) => !especie || m.especie === especie)
    .filter((m) => coincide(busqueda, m.nombre_mascota, m.raza, m.propietario));

  const eliminar = (m) => accion(() => api(`/mascotas/${m.id_mascota}`, { method: 'DELETE' }).then(recargar), {
    exito: `${m.nombre_mascota} fue eliminada`,
    confirmacion: { titulo: 'Eliminar mascota', mensaje: `¿Eliminar a ${m.nombre_mascota}? También se borrarán sus citas, vacunas y servicios.`, boton: 'Eliminar', peligro: true },
  });

  function exportar() {
    descargarCSV('mascotas', [
      ['Nombre', 'Especie', 'Raza', 'Edad', 'Sexo', 'Propietario', 'Correo', 'Teléfono'],
      ...lista.map((m) => [m.nombre_mascota, m.especie, m.raza, m.edad, m.sexo, m.propietario, m.correo_propietario, m.telefono_propietario]),
    ]);
  }

  const presentes = ESPECIES.filter((e) => todas.some((m) => m.especie === e));

  return (
    <>
      <Encabezado titulo={esAdmin ? 'Gestionar mascotas' : 'Mis mascotas'} sub={`${todas.length} ${todas.length === 1 ? 'registrada' : 'registradas'}`}>
        {esAdmin && <button className="btn suave" onClick={exportar} disabled={!lista.length}><Download size={17} /> Exportar</button>}
        <button className="btn primario" onClick={() => setEditando(VACIA)}><Plus size={18} /> Registrar mascota</button>
      </Encabezado>
      <Alerta>{error}</Alerta>

      {todas.length > 0 && (
        <div className="barra-filtros">
          <Filtros valor={especie} onChange={setEspecie} opciones={[
            ['', 'Todas', todas.length],
            ...presentes.map((e) => [e, e, todas.filter((m) => m.especie === e).length]),
          ]} />
          <Buscador valor={busqueda} onChange={setBusqueda} placeholder={esAdmin ? 'Nombre, raza o propietario' : 'Nombre o raza'} />
        </div>
      )}

      {!datos ? <Cargando /> : lista.length === 0 ? (
        <Vacio icono={PawPrint}>
          {todas.length ? 'Ninguna mascota coincide con la búsqueda.' : esAdmin ? 'No hay mascotas registradas.' : 'Aún no has registrado mascotas.'}
        </Vacio>
      ) : (
        <div className="cards-mascotas">
          {lista.map((m) => (
            <article key={m.id_mascota} className="card mascota">
              <Link to={`/mascotas/${m.id_mascota}`} className="mascota-link">
                <div className={`avatar especie-${m.especie}`}><IconoEspecie especie={m.especie} size={28} /></div>
                <div>
                  <h3>{m.nombre_mascota}</h3>
                  <p>{m.especie} · {m.raza}</p>
                  <p>{m.edad} {m.edad === 1 ? 'año' : 'años'} · {m.sexo}</p>
                  {esAdmin && <small>Propietario: {m.propietario}</small>}
                </div>
              </Link>
              <div className="mascota-acciones">
                <Link className="btn suave chico" to={`/mascotas/${m.id_mascota}`}><History size={16} /> Historial</Link>
                <span className="espaciador" />
                <BotonIcono icono={Pencil} label="Editar" onClick={() => setEditando(m)} />
                <BotonIcono icono={Trash2} label="Eliminar" peligro onClick={() => eliminar(m)} />
              </div>
            </article>
          ))}
        </div>
      )}
      {editando && (
        <FormMascota inicial={editando} onClose={() => setEditando(null)} onGuardado={() => { setEditando(null); recargar(); }} />
      )}
    </>
  );
}

export function FormMascota({ inicial, onClose, onGuardado }) {
  const { esAdmin } = useAuth();
  const accion = useAccion();
  const { datos: usuarios } = useCarga(esAdmin ? '/admin/usuarios' : null);
  const [f, setF] = useState({ ...inicial, id_propietario: String(inicial.id_propietario || '') });
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const nueva = !inicial.id_mascota;

  async function enviar(e) {
    e.preventDefault();
    setGuardando(true);
    const body = { ...f, edad: Number(f.edad) };
    if (!esAdmin) delete body.id_propietario;
    const ok = await accion(
      () => (nueva ? api('/mascotas', { method: 'POST', body }) : api(`/mascotas/${f.id_mascota}`, { method: 'PUT', body })),
      { exito: nueva ? 'Mascota registrada' : 'Cambios guardados' },
    );
    setGuardando(false);
    if (ok) onGuardado();
  }

  return (
    <Modal titulo={nueva ? 'Registrar mascota' : `Editar a ${inicial.nombre_mascota}`} onClose={onClose}>
      <form onSubmit={enviar}>
        {esAdmin && (
          <Campo label="Propietario">
            <select required value={f.id_propietario} onChange={set('id_propietario')}>
              <option value="">Seleccione un propietario…</option>
              {(usuarios || []).map((u) => (
                <option key={u.id_propietario} value={u.id_propietario}>{u.nombre} — {u.correo}</option>
              ))}
            </select>
          </Campo>
        )}
        <Campo label="Nombre">
          <input required maxLength={50} value={f.nombre_mascota} onChange={set('nombre_mascota')} autoFocus={!esAdmin} />
        </Campo>
        <div className="fila">
          <Campo label="Especie">
            <select value={f.especie} onChange={set('especie')}>
              {ESPECIES.map((e) => <option key={e}>{e}</option>)}
            </select>
          </Campo>
          <Campo label="Raza">
            <input required maxLength={50} value={f.raza} onChange={set('raza')} placeholder="Ej. Criolla, Labrador" />
          </Campo>
        </div>
        <div className="fila">
          <Campo label="Edad (años)">
            <input type="number" required min={0} max={99} value={f.edad} onChange={set('edad')} />
          </Campo>
          <Campo label="Sexo">
            <select value={f.sexo} onChange={set('sexo')}>
              <option>Hembra</option>
              <option>Macho</option>
            </select>
          </Campo>
        </div>
        <div className="modal-pie">
          <button type="button" className="btn suave" onClick={onClose}>Volver</button>
          <button className="btn primario" disabled={guardando}>{nueva ? 'Registrar' : 'Guardar cambios'}</button>
        </div>
      </form>
    </Modal>
  );
}

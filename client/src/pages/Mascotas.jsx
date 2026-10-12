import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { Alerta, Campo, Cargando, Encabezado, Modal, useCarga, Vacio } from '../components.jsx';

export const EMOJI = { Perro: '🐶', Gato: '🐱', Ave: '🦜', Conejo: '🐰', Otro: '🐾' };
const VACIA = { nombre_mascota: '', especie: 'Perro', raza: '', edad: '', sexo: 'Hembra' };

export default function Mascotas() {
  const { esAdmin } = useAuth();
  const { datos, error, recargar } = useCarga('/mascotas');
  const [editando, setEditando] = useState(null);
  const [filtro, setFiltro] = useState('');

  const lista = (datos || []).filter((m) =>
    `${m.nombre_mascota} ${m.raza} ${m.propietario}`.toLowerCase().includes(filtro.toLowerCase())
  );

  async function eliminar(m) {
    if (!confirm(`¿Eliminar a ${m.nombre_mascota}? Se borrará también su historial.`)) return;
    await api(`/mascotas/${m.id_mascota}`, { method: 'DELETE' });
    recargar();
  }

  return (
    <>
      <Encabezado titulo={esAdmin ? 'Gestionar mascotas' : 'Mis mascotas'} sub={`${datos?.length ?? 0} registradas`}>
        {!esAdmin && <button className="btn primario" onClick={() => setEditando(VACIA)}>+ Registrar mascota</button>}
      </Encabezado>
      <Alerta>{error}</Alerta>
      {esAdmin && (
        <input className="buscador" placeholder="Buscar por nombre, raza o propietario…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      )}
      {!datos ? <Cargando /> : lista.length === 0 ? (
        <Vacio>{esAdmin ? 'No hay mascotas que coincidan.' : 'Aún no has registrado mascotas.'}</Vacio>
      ) : (
        <div className="cards-mascotas">
          {lista.map((m) => (
            <article key={m.id_mascota} className="card mascota">
              <Link to={`/mascotas/${m.id_mascota}`} className="mascota-link">
                <div className="avatar" aria-hidden="true">{EMOJI[m.especie] || '🐾'}</div>
                <div>
                  <h3>{m.nombre_mascota}</h3>
                  <p>{m.raza} · {m.edad} {m.edad === 1 ? 'año' : 'años'} · {m.sexo}</p>
                  {esAdmin && <small>Propietario: {m.propietario}</small>}
                </div>
              </Link>
              <div className="mascota-acciones">
                <Link className="btn suave" to={`/mascotas/${m.id_mascota}`}>Historial</Link>
                <button className="btn suave" onClick={() => setEditando(m)}>Editar</button>
                <button className="btn peligro-suave" onClick={() => eliminar(m)}>Eliminar</button>
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
  const [f, setF] = useState(inicial);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const nueva = !inicial.id_mascota;

  async function enviar(e) {
    e.preventDefault();
    setError('');
    try {
      const body = { ...f, edad: Number(f.edad) };
      if (nueva) await api('/mascotas', { method: 'POST', body });
      else await api(`/mascotas/${f.id_mascota}`, { method: 'PUT', body });
      onGuardado();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal titulo={nueva ? 'Registrar mascota' : `Editar a ${inicial.nombre_mascota}`} onClose={onClose}>
      <form onSubmit={enviar}>
        <Alerta>{error}</Alerta>
        <Campo label="Nombre">
          <input required maxLength={50} value={f.nombre_mascota} onChange={set('nombre_mascota')} autoFocus />
        </Campo>
        <div className="fila">
          <Campo label="Especie">
            <select value={f.especie} onChange={set('especie')}>
              {Object.keys(EMOJI).map((e) => <option key={e}>{e}</option>)}
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
          <button type="button" className="btn suave" onClick={onClose}>Cancelar</button>
          <button className="btn primario">{nueva ? 'Registrar' : 'Guardar cambios'}</button>
        </div>
      </form>
    </Modal>
  );
}

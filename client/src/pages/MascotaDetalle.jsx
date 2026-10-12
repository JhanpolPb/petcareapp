// CU-07 Consultar historial de servicios
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, ClipboardList, Mail, Pencil, Phone, Scissors, Stethoscope, Syringe, Trash2 } from 'lucide-react';
import { api, fmtFecha } from '../api.js';
import { useAuth } from '../App.jsx';
import { Alerta, Cargando, Estado, Filtros, IconoEspecie, useAccion, useCarga, Vacio } from '../components.jsx';
import { FormMascota } from './Mascotas.jsx';

const TIPOS = { cita: Stethoscope, servicio: Scissors, vacuna: Syringe };

export default function MascotaDetalle() {
  const { id } = useParams();
  const { esAdmin } = useAuth();
  const nav = useNavigate();
  const accion = useAccion();
  const { datos: m, error, recargar } = useCarga(`/mascotas/${id}`);
  const [editando, setEditando] = useState(false);
  const [tipo, setTipo] = useState('');

  if (error) return <><Link to="/mascotas" className="volver"><ArrowLeft size={16} /> Volver a mascotas</Link><Alerta>{error}</Alerta></>;
  if (!m) return <Cargando />;

  const historial = [
    ...m.citas.map((c) => ({ tipo: 'cita', fecha: c.fecha, titulo: 'Cita veterinaria', detalle: `${c.hora}${c.motivo ? ` · ${c.motivo}` : ''}`, estado: c.estado })),
    ...m.servicios.map((s) => ({ tipo: 'servicio', fecha: s.fecha_servicio, titulo: s.tipo_servicio, detalle: 'Peluquería', estado: s.estado })),
    ...m.vacunas.map((v) => ({ tipo: 'vacuna', fecha: v.fecha_aplicacion, titulo: `Vacuna: ${v.nombre}`, detalle: v.fecha_proxima ? `Próxima dosis: ${fmtFecha(v.fecha_proxima)}` : 'Sin refuerzo' })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const visibles = historial.filter((h) => !tipo || h.tipo === tipo);

  const eliminar = () => accion(() => api(`/mascotas/${m.id_mascota}`, { method: 'DELETE' }).then(() => nav('/mascotas')), {
    exito: `${m.nombre_mascota} fue eliminada`,
    confirmacion: { titulo: 'Eliminar mascota', mensaje: `¿Eliminar a ${m.nombre_mascota}? También se borrarán sus citas, vacunas y servicios.`, boton: 'Eliminar', peligro: true },
  });

  return (
    <>
      <Link to="/mascotas" className="volver"><ArrowLeft size={16} /> Volver a mascotas</Link>
      <section className="card perfil-mascota">
        <div className={`avatar grande especie-${m.especie}`}><IconoEspecie especie={m.especie} size={40} /></div>
        <div className="perfil-mascota-datos">
          <h1>{m.nombre_mascota}</h1>
          <p className="sub">{m.especie} · {m.raza} · {m.edad} {m.edad === 1 ? 'año' : 'años'} · {m.sexo}</p>
          {esAdmin && (
            <p className="contacto">
              <strong>{m.propietario}</strong>
              <span><Phone size={14} /> {m.telefono_propietario}</span>
              <span><Mail size={14} /> {m.correo_propietario}</span>
            </p>
          )}
        </div>
        <div className="perfil-mascota-acciones">
          <Link className="btn primario" to={`/citas?nuevo=1&mascota=${m.id_mascota}`}><CalendarPlus size={17} /> Agendar cita</Link>
          <button className="btn suave" onClick={() => setEditando(true)}><Pencil size={16} /> Editar</button>
          <button className="btn peligro-suave" onClick={eliminar}><Trash2 size={16} /> Eliminar</button>
        </div>
      </section>

      <div className="stats">
        <div className="stat"><span className="stat-icono"><Stethoscope size={20} /></span><span className="stat-n">{m.citas.length}</span><span className="stat-l">Citas</span></div>
        <div className="stat"><span className="stat-icono"><Syringe size={20} /></span><span className="stat-n">{m.vacunas.length}</span><span className="stat-l">Vacunas</span></div>
        <div className="stat"><span className="stat-icono"><Scissors size={20} /></span><span className="stat-n">{m.servicios.length}</span><span className="stat-l">Servicios</span></div>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Historial</h2>
          <Filtros valor={tipo} onChange={setTipo} opciones={[['', 'Todo'], ['cita', 'Citas'], ['vacuna', 'Vacunas'], ['servicio', 'Peluquería']]} />
        </div>
        {visibles.length === 0 ? (
          <Vacio icono={ClipboardList}>No hay registros en el historial.</Vacio>
        ) : (
          <ol className="linea-tiempo">
            {visibles.map((h, i) => {
              const Icono = TIPOS[h.tipo];
              return (
                <li key={i}>
                  <span className={`lt-icono ${h.tipo}`} aria-hidden="true"><Icono size={18} /></span>
                  <div className="lt-cuerpo">
                    <div className="lt-top">
                      <strong>{h.titulo}</strong>
                      {h.estado && <Estado valor={h.estado} />}
                    </div>
                    <small>{fmtFecha(h.fecha)} · {h.detalle}</small>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
      {editando && <FormMascota inicial={m} onClose={() => setEditando(false)} onGuardado={() => { setEditando(false); recargar(); }} />}
    </>
  );
}

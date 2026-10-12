// CU-07 Consultar historial de servicios
import { Link, useParams } from 'react-router-dom';
import { fmtFecha } from '../api.js';
import { Alerta, Cargando, Estado, useCarga, Vacio } from '../components.jsx';
import { EMOJI } from './Mascotas.jsx';

export default function MascotaDetalle() {
  const { id } = useParams();
  const { datos: m, error } = useCarga(`/mascotas/${id}`);

  if (error) return <Alerta>{error}</Alerta>;
  if (!m) return <Cargando />;

  const historial = [
    ...m.citas.map((c) => ({ fecha: c.fecha, icono: '🩺', titulo: 'Cita veterinaria', detalle: `${c.hora.slice(0, 5)}${c.motivo ? ` · ${c.motivo}` : ''}`, estado: c.estado })),
    ...m.servicios.map((s) => ({ fecha: s.fecha_servicio, icono: '✂️', titulo: s.tipo_servicio, detalle: 'Peluquería', estado: s.estado })),
    ...m.vacunas.map((v) => ({ fecha: v.fecha_aplicacion, icono: '💉', titulo: `Vacuna: ${v.nombre}`, detalle: v.fecha_proxima ? `Próxima dosis: ${fmtFecha(v.fecha_proxima)}` : 'Dosis única' })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <>
      <Link to="/mascotas" className="volver">← Volver a mascotas</Link>
      <section className="card perfil-mascota">
        <div className="avatar grande" aria-hidden="true">{EMOJI[m.especie] || '🐾'}</div>
        <div>
          <h1>{m.nombre_mascota}</h1>
          <p className="sub">{m.especie} · {m.raza} · {m.edad} {m.edad === 1 ? 'año' : 'años'} · {m.sexo}</p>
        </div>
        <div className="mini-stats">
          <div><b>{m.citas.length}</b><small>citas</small></div>
          <div><b>{m.vacunas.length}</b><small>vacunas</small></div>
          <div><b>{m.servicios.length}</b><small>servicios</small></div>
        </div>
      </section>

      <section className="card">
        <h2>Historial de servicios</h2>
        {historial.length === 0 ? (
          <Vacio icono="📋">Esta mascota aún no tiene historial.</Vacio>
        ) : (
          <ol className="linea-tiempo">
            {historial.map((h, i) => (
              <li key={i}>
                <span className="lt-icono" aria-hidden="true">{h.icono}</span>
                <div className="lt-cuerpo">
                  <div className="lt-top">
                    <strong>{h.titulo}</strong>
                    {h.estado && <Estado valor={h.estado} />}
                  </div>
                  <small>{fmtFecha(h.fecha)} · {h.detalle}</small>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

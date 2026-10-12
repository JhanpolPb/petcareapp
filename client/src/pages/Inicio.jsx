import { Link } from 'react-router-dom';
import { useAuth } from '../App.jsx';
import { fmtFecha, hoyISO } from '../api.js';
import { Cargando, Encabezado, Estado, useCarga, Vacio } from '../components.jsx';

const ICONO = { cita: '🩺', vacuna: '💉', servicio: '✂️' };

export default function Inicio() {
  const { usuario, esAdmin } = useAuth();
  const rec = useCarga('/recordatorios');
  const masc = useCarga('/mascotas');
  const citas = useCarga('/citas');

  const proximas = (citas.datos || [])
    .filter((c) => c.estado === 'Programada' && c.fecha >= hoyISO())
    .sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`));

  return (
    <>
      <Encabezado titulo={`Hola, ${usuario.nombre.split(' ')[0]}`} sub={esAdmin ? 'Panel de administración de PetCareApp' : 'Esto es lo que viene para tus mascotas'}>
        {!esAdmin && <Link className="btn primario" to="/citas">+ Agendar cita</Link>}
      </Encabezado>

      <div className="stats">
        <Stat n={masc.datos?.length} label={esAdmin ? 'Mascotas registradas' : 'Mis mascotas'} to="/mascotas" />
        <Stat n={proximas.length} label="Citas programadas" to="/citas" />
        <Stat n={rec.datos?.length} label="Recordatorios activos" />
      </div>

      <div className="grid-2">
        <section className="card">
          <h2>🔔 Recordatorios</h2>
          {!rec.datos ? <Cargando /> : rec.datos.length === 0 ? (
            <Vacio icono="✅">No tienes recordatorios para los próximos días.</Vacio>
          ) : (
            <ul className="recordatorios">
              {rec.datos.map((r, i) => (
                <li key={i} className={r.urgente ? 'urgente' : ''}>
                  <span className="rec-icono" aria-hidden="true">{ICONO[r.tipo]}</span>
                  <div>
                    <strong>{r.titulo}</strong>
                    <small>{r.detalle}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2>🩺 Próximas citas</h2>
          {!citas.datos ? <Cargando /> : proximas.length === 0 ? (
            <Vacio icono="📅">No hay citas programadas. <Link to="/citas">Agenda una</Link>.</Vacio>
          ) : (
            <ul className="lista-simple">
              {proximas.slice(0, 5).map((c) => (
                <li key={c.id_cita}>
                  <div>
                    <strong>{c.nombre_mascota}</strong>
                    <small>{fmtFecha(c.fecha)} · {c.hora}{esAdmin ? ` · ${c.propietario}` : ''}</small>
                  </div>
                  <Estado valor={c.estado} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {!esAdmin && masc.datos?.length === 0 && (
        <section className="card destacado">
          <h2>Empieza registrando a tu mascota</h2>
          <p>Con tu mascota registrada podrás agendar citas, solicitar peluquería y ver su vacunación.</p>
          <Link className="btn primario" to="/mascotas">Registrar mascota</Link>
        </section>
      )}
    </>
  );
}

function Stat({ n, label, to }) {
  const inner = (
    <>
      <span className="stat-n">{n ?? '–'}</span>
      <span className="stat-l">{label}</span>
    </>
  );
  return to ? <Link to={to} className="stat">{inner}</Link> : <div className="stat">{inner}</div>;
}

import { Link } from 'react-router-dom';
import {
  BellRing, CalendarCheck, CalendarDays, CalendarPlus, Check, ChevronRight, CircleCheck, PawPrint, Scissors, Stethoscope,
  Syringe, TriangleAlert, UserPlus, Users,
} from 'lucide-react';
import { useAuth } from '../App.jsx';
import { api, fmtFecha, hoyISO } from '../api.js';
import { BotonIcono, Cargando, Encabezado, Estado, useAccion, useCarga, Vacio } from '../components.jsx';

const ICONO = { cita: Stethoscope, vacuna: Syringe, servicio: Scissors };

export default function Inicio() {
  const { esAdmin } = useAuth();
  return esAdmin ? <PanelAdmin /> : <PanelPropietario />;
}

function Saludo({ sub, children }) {
  const { usuario } = useAuth();
  return <Encabezado titulo={`Hola, ${usuario.nombre.split(' ')[0]}`} sub={sub}>{children}</Encabezado>;
}

function Stat({ n, label, to, icono: Icono, tono }) {
  const inner = (
    <>
      <span className={`stat-icono ${tono || ''}`}><Icono size={20} aria-hidden="true" /></span>
      <span className="stat-n">{n ?? '–'}</span>
      <span className="stat-l">{label}</span>
    </>
  );
  return to ? <Link to={to} className="stat">{inner}</Link> : <div className="stat">{inner}</div>;
}

function Recordatorios({ datos }) {
  if (!datos) return <Cargando />;
  if (datos.length === 0) return <Vacio icono={CircleCheck}>No hay recordatorios para los próximos días.</Vacio>;
  return (
    <ul className="recordatorios">
      {datos.map((r, i) => {
        const Icono = ICONO[r.tipo];
        return (
          <li key={i} className={r.urgente ? 'urgente' : ''}>
            <span className="rec-icono" aria-hidden="true"><Icono size={18} /></span>
            <div>
              <strong>{r.titulo}</strong>
              <small>{r.detalle}</small>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ---------- Panel del administrador ----------
function PanelAdmin() {
  const accion = useAccion();
  const h = hoyISO();
  const rep = useCarga('/admin/reportes');
  const citas = useCarga('/citas');
  const servicios = useCarga('/servicios');
  const rec = useCarga('/recordatorios');
  const t = rep.datos?.totales;

  const agendaHoy = (citas.datos || [])
    .filter((c) => c.fecha === h && c.estado !== 'Cancelada')
    .sort((a, b) => a.hora.localeCompare(b.hora));
  const porConfirmar = (servicios.datos || [])
    .filter((s) => s.estado === 'Solicitado')
    .sort((a, b) => a.fecha_servicio.localeCompare(b.fecha_servicio));

  const atender = (c) => accion(
    () => api(`/citas/${c.id_cita}/estado`, { method: 'PATCH', body: { estado: 'Atendida' } }).then(() => { citas.recargar(); rep.recargar(); }),
    { exito: `Cita de ${c.nombre_mascota} marcada como atendida` },
  );
  const confirmar = (s) => accion(
    () => api(`/servicios/${s.id_servicio}/estado`, { method: 'PATCH', body: { estado: 'Confirmado' } }).then(() => { servicios.recargar(); rep.recargar(); }),
    { exito: `${s.tipo_servicio} de ${s.nombre_mascota} confirmado` },
  );

  return (
    <>
      <Saludo sub={`Panel de administración · ${fmtFecha(h)}`} />

      <div className="atajos-panel">
        <Link className="atajo" to="/citas?nuevo=1"><CalendarPlus size={20} /> Nueva cita</Link>
        <Link className="atajo" to="/vacunas?nuevo=1"><Syringe size={20} /> Registrar vacuna</Link>
        <Link className="atajo" to="/servicios?nuevo=1"><Scissors size={20} /> Nuevo servicio</Link>
        <Link className="atajo" to="/mascotas?nuevo=1"><PawPrint size={20} /> Nueva mascota</Link>
        <Link className="atajo" to="/usuarios?nuevo=1"><UserPlus size={20} /> Nuevo usuario</Link>
      </div>

      <div className="stats cuatro">
        <Stat n={t?.citas_hoy} label="Citas pendientes hoy" to="/citas" icono={CalendarDays} />
        <Stat n={t?.servicios_pendientes} label="Servicios por confirmar" to="/servicios?estado=Solicitado" icono={Scissors} tono="ambar" />
        <Stat n={t?.vacunas_vencidas} label="Vacunas vencidas" to="/vacunas" icono={TriangleAlert} tono="coral" />
        <Stat n={t ? `${t.propietarios} / ${t.mascotas}` : null} label="Propietarios / mascotas" to="/usuarios" icono={Users} />
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Agenda de hoy</h2>
            <Link to="/citas" className="ver-todo">Ver citas <ChevronRight size={16} /></Link>
          </div>
          {!citas.datos ? <Cargando /> : agendaHoy.length === 0 ? (
            <Vacio icono={CalendarCheck}>No hay citas para hoy.</Vacio>
          ) : (
            <ul className="lista-simple">
              {agendaHoy.map((c) => (
                <li key={c.id_cita}>
                  <span className="hora-chip">{c.hora}</span>
                  <div className="lista-cuerpo">
                    <strong>{c.nombre_mascota}</strong>
                    <small>{c.propietario}{c.motivo ? ` · ${c.motivo}` : ''}</small>
                  </div>
                  {c.estado === 'Programada'
                    ? <BotonIcono icono={Check} label="Marcar como atendida" onClick={() => atender(c)} />
                    : <Estado valor={c.estado} />}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Peluquería por confirmar</h2>
            <Link to="/servicios" className="ver-todo">Ver servicios <ChevronRight size={16} /></Link>
          </div>
          {!servicios.datos ? <Cargando /> : porConfirmar.length === 0 ? (
            <Vacio icono={CircleCheck}>No hay solicitudes pendientes.</Vacio>
          ) : (
            <ul className="lista-simple">
              {porConfirmar.slice(0, 6).map((s) => (
                <li key={s.id_servicio}>
                  <div className="lista-cuerpo">
                    <strong>{s.tipo_servicio} · {s.nombre_mascota}</strong>
                    <small>{fmtFecha(s.fecha_servicio)} · {s.propietario} · {s.telefono}</small>
                  </div>
                  <button className="btn suave chico" onClick={() => confirmar(s)}><Check size={15} /> Confirmar</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2><BellRing size={18} /> Recordatorios de la semana</h2>
          <Link to="/reportes" className="ver-todo">Ver reportes <ChevronRight size={16} /></Link>
        </div>
        <Recordatorios datos={rec.datos} />
      </section>
    </>
  );
}

// ---------- Panel del propietario ----------
function PanelPropietario() {
  const rec = useCarga('/recordatorios');
  const masc = useCarga('/mascotas');
  const citas = useCarga('/citas');

  const proximas = (citas.datos || [])
    .filter((c) => c.estado === 'Programada' && c.fecha >= hoyISO())
    .sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`));

  return (
    <>
      <Saludo sub="Esto es lo que viene para tus mascotas">
        <Link className="btn primario" to="/citas?nuevo=1"><CalendarPlus size={18} /> Agendar cita</Link>
      </Saludo>

      <div className="stats">
        <Stat n={masc.datos?.length} label="Mis mascotas" to="/mascotas" icono={PawPrint} />
        <Stat n={proximas.length} label="Citas programadas" to="/citas" icono={CalendarDays} />
        <Stat n={rec.datos?.length} label="Recordatorios activos" icono={BellRing} tono="ambar" />
      </div>

      {masc.datos?.length === 0 && (
        <section className="card destacado">
          <h2>Empieza registrando a tu mascota</h2>
          <p>Con tu mascota registrada podrás agendar citas, solicitar peluquería y ver su vacunación.</p>
          <Link className="btn primario" to="/mascotas?nuevo=1"><PawPrint size={18} /> Registrar mascota</Link>
        </section>
      )}

      <div className="grid-2">
        <section className="card">
          <h2>Recordatorios</h2>
          <Recordatorios datos={rec.datos} />
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Próximas citas</h2>
            <Link to="/citas" className="ver-todo">Ver todas <ChevronRight size={16} /></Link>
          </div>
          {!citas.datos ? <Cargando /> : proximas.length === 0 ? (
            <Vacio icono={CalendarCheck}>No tienes citas programadas. <Link to="/citas?nuevo=1">Agenda una</Link>.</Vacio>
          ) : (
            <ul className="lista-simple">
              {proximas.slice(0, 5).map((c) => (
                <li key={c.id_cita}>
                  <span className="hora-chip">{c.hora}</span>
                  <div className="lista-cuerpo">
                    <strong>{c.nombre_mascota}</strong>
                    <small>{fmtFecha(c.fecha)}{c.motivo ? ` · ${c.motivo}` : ''}</small>
                  </div>
                  <Estado valor={c.estado} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

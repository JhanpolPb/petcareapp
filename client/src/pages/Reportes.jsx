// CU-16 Generar reportes (admin)
import { useState } from 'react';
import {
  CalendarCheck, CalendarX2, ChartColumn, Download, Printer, Scissors, Syringe, Table2, TriangleAlert, Users,
} from 'lucide-react';
import { descargarCSV, fmtFecha, fmtMes, hoyISO, sumarDias } from '../api.js';
import { Alerta, Cargando, Encabezado, Filtros, useCarga, Vacio } from '../components.jsx';

function rangoDe(periodo) {
  const h = hoyISO();
  if (periodo === '30') return [sumarDias(h, -30), h];
  if (periodo === 'mes') return [`${h.slice(0, 7)}-01`, h];
  if (periodo === 'anio') return [`${h.slice(0, 4)}-01-01`, `${h.slice(0, 4)}-12-31`];
  return ['', ''];
}

const pct = (a, b) => (b ? `${Math.round((a / b) * 100)} %` : '—');

export default function Reportes() {
  const [periodo, setPeriodo] = useState('todo');
  const [manual, setManual] = useState({ desde: '', hasta: '' });
  const [desde, hasta] = periodo === 'manual' ? [manual.desde, manual.hasta] : rangoDe(periodo);
  const qs = new URLSearchParams({ ...(desde && { desde }), ...(hasta && { hasta }) }).toString();
  const { datos: r, error } = useCarga(`/admin/reportes${qs ? `?${qs}` : ''}`);

  const textoPeriodo = desde || hasta
    ? `del ${desde ? fmtFecha(desde) : 'inicio'} al ${hasta ? fmtFecha(hasta) : 'hoy'}`
    : 'desde el inicio';

  const graficas = r && [
    { id: 'citasMes', titulo: 'Citas por mes', filas: r.citasPorMes.map((x) => [fmtMes(x.k), x.total]), tipo: 'columnas', unidad: 'citas' },
    { id: 'serviciosMes', titulo: 'Servicios de peluquería por mes', filas: r.serviciosPorMes.map((x) => [fmtMes(x.k), x.total]), tipo: 'columnas', unidad: 'servicios' },
    { id: 'citasEstado', titulo: 'Citas por estado', filas: r.citasPorEstado.map((x) => [x.k, x.total]), unidad: 'citas' },
    { id: 'serviciosEstado', titulo: 'Servicios por estado', filas: r.serviciosPorEstado.map((x) => [x.k, x.total]), unidad: 'servicios' },
    { id: 'serviciosTipo', titulo: 'Servicios más solicitados', filas: r.serviciosPorTipo.map((x) => [x.k, x.total]), unidad: 'servicios' },
    { id: 'horas', titulo: 'Horarios con más citas', filas: r.horasMasSolicitadas.map((x) => [x.k, x.total]), unidad: 'citas' },
    { id: 'propietarios', titulo: 'Propietarios con más citas', filas: r.propietariosFrecuentes.map((x) => [x.k, x.total]), unidad: 'citas' },
    { id: 'especies', titulo: 'Mascotas por especie (total)', filas: r.mascotasPorEspecie.map((x) => [x.k, x.total]), unidad: 'mascotas' },
  ];

  function exportarCSV() {
    const t = r.totales;
    descargarCSV('reporte-petcareapp', [
      ['Reporte PetCareApp', textoPeriodo],
      ['Generado', new Date(r.generado).toLocaleString('es-CO')],
      [],
      ['Indicador', 'Valor'],
      ['Propietarios', t.propietarios], ['Mascotas', t.mascotas],
      ['Citas en el periodo', t.citas], ['Citas atendidas', t.citas_atendidas], ['Citas canceladas', t.citas_canceladas],
      ['Servicios en el periodo', t.servicios], ['Servicios realizados', t.servicios_realizados],
      ['Vacunas aplicadas', t.vacunas], ['Vacunas vencidas', t.vacunas_vencidas], ['Vacunas por vencer (30 días)', t.vacunas_por_vencer],
      ['Citas programadas desde hoy', t.citas_proximas], ['Servicios por confirmar', t.servicios_pendientes],
      ...graficas.flatMap((g) => [[], [g.titulo, 'Total'], ...g.filas]),
    ]);
  }

  return (
    <>
      <Encabezado titulo="Reportes" sub={r ? `Actividad ${textoPeriodo} · generado el ${new Date(r.generado).toLocaleString('es-CO')}` : 'Indicadores de la veterinaria'}>
        <button className="btn suave" onClick={() => window.print()} disabled={!r}><Printer size={17} /> Imprimir / PDF</button>
        <button className="btn primario" onClick={exportarCSV} disabled={!r}><Download size={17} /> Exportar CSV</button>
      </Encabezado>

      <div className="barra-filtros no-imprimir">
        <Filtros valor={periodo} onChange={setPeriodo} opciones={[
          ['todo', 'Todo'], ['30', 'Últimos 30 días'], ['mes', 'Este mes'], ['anio', 'Este año'], ['manual', 'Personalizado'],
        ]} />
        {periodo === 'manual' && (
          <div className="rango">
            <input type="date" value={manual.desde} max={manual.hasta || undefined} onChange={(e) => setManual({ ...manual, desde: e.target.value })} aria-label="Desde" />
            <span>a</span>
            <input type="date" value={manual.hasta} min={manual.desde || undefined} onChange={(e) => setManual({ ...manual, hasta: e.target.value })} aria-label="Hasta" />
          </div>
        )}
      </div>

      <Alerta>{error}</Alerta>
      {!r ? (!error && <Cargando />) : (
        <>
          <div className="stats seis">
            <Kpi icono={CalendarCheck} n={r.totales.citas} l="Citas" d={`${pct(r.totales.citas_atendidas, r.totales.citas)} atendidas`} />
            <Kpi icono={CalendarX2} n={r.totales.citas_canceladas} l="Citas canceladas" d={`${pct(r.totales.citas_canceladas, r.totales.citas)} del total`} />
            <Kpi icono={Scissors} n={r.totales.servicios} l="Servicios" d={`${r.totales.servicios_realizados} realizados`} />
            <Kpi icono={Syringe} n={r.totales.vacunas} l="Vacunas aplicadas" d={`${r.totales.vacunas_por_vencer} por vencer en 30 días`} />
            <Kpi icono={TriangleAlert} n={r.totales.vacunas_vencidas} l="Vacunas vencidas" d="Refuerzos sin aplicar" tono="coral" />
            <Kpi icono={Users} n={r.totales.propietarios} l="Propietarios" d={`${r.totales.mascotas} mascotas registradas`} />
          </div>
          <div className="grid-2 graficas">
            {graficas.map((g) => <Grafica key={g.id} {...g} />)}
          </div>
        </>
      )}
    </>
  );
}

function Kpi({ icono: Icono, n, l, d, tono }) {
  return (
    <div className="stat">
      <span className={`stat-icono ${tono || ''}`}><Icono size={20} aria-hidden="true" /></span>
      <span className="stat-n">{n}</span>
      <span className="stat-l">{l}</span>
      {d && <span className="stat-d">{d}</span>}
    </div>
  );
}

// Tarjeta con una gráfica de una sola serie y la opción de ver los datos en tabla
function Grafica({ titulo, filas, tipo, unidad }) {
  const [tabla, setTabla] = useState(false);
  const total = filas.reduce((s, f) => s + f[1], 0);
  return (
    <section className="card grafica">
      <div className="card-head">
        <h2>{titulo}</h2>
        {filas.length > 0 && (
          <button className="btn-icono no-imprimir" onClick={() => setTabla(!tabla)} title={tabla ? 'Ver gráfica' : 'Ver tabla'} aria-label={tabla ? 'Ver gráfica' : 'Ver tabla'}>
            {tabla ? <ChartColumn size={17} /> : <Table2 size={17} />}
          </button>
        )}
      </div>
      {filas.length === 0 ? <Vacio icono={ChartColumn}>Sin datos en este periodo.</Vacio>
        : tabla ? (
          <table className="tabla compacta">
            <thead><tr><th>{tipo === 'columnas' ? 'Mes' : 'Categoría'}</th><th className="num">Total</th><th className="num">%</th></tr></thead>
            <tbody>
              {filas.map(([k, v]) => <tr key={k}><td>{k}</td><td className="num">{v}</td><td className="num">{pct(v, total)}</td></tr>)}
            </tbody>
          </table>
        ) : tipo === 'columnas' ? <Columnas filas={filas} unidad={unidad} /> : <Barras filas={filas} total={total} unidad={unidad} />}
    </section>
  );
}

// Barras horizontales (comparar categorías)
function Barras({ filas, total, unidad }) {
  const max = Math.max(1, ...filas.map((f) => f[1]));
  return (
    <ul className="barras">
      {filas.map(([k, v]) => (
        <li key={k} tabIndex={0}>
          <span className="barra-k" title={k}>{k}</span>
          <span className="barra-pista"><span className="barra" style={{ width: `${(v / max) * 100}%` }} /></span>
          <span className="barra-v">{v}</span>
          <span className="tip" role="tooltip"><b>{k}</b>{v} {unidad} · {pct(v, total)}</span>
        </li>
      ))}
    </ul>
  );
}

// Columnas verticales (evolución en el tiempo)
function Columnas({ filas, unidad }) {
  const max = Math.max(1, ...filas.map((f) => f[1]));
  const paso = Math.max(1, Math.ceil(max / 4));
  const tope = paso * Math.ceil(max / paso);
  const marcas = [];
  for (let v = tope; v >= 0; v -= paso) marcas.push(v);
  return (
    <div className="columnas">
      <div className="columnas-eje" aria-hidden="true">
        {marcas.map((m) => <span key={m}>{m}</span>)}
      </div>
      <div className="columnas-area">
        {marcas.map((m) => <span key={m} className="columnas-guia" style={{ bottom: `${(m / tope) * 100}%` }} aria-hidden="true" />)}
        {filas.map(([k, v]) => (
          <div key={k} className="columna" tabIndex={0}>
            <span className="columna-barra" style={{ height: `${(v / tope) * 100}%` }} />
            <span className="columna-k">{k}</span>
            <span className="tip" role="tooltip"><b>{k}</b>{v} {unidad}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

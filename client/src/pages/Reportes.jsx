// CU-16 Generar reportes (admin)
import { Alerta, Cargando, Encabezado, useCarga, Vacio } from '../components.jsx';

export default function Reportes() {
  const { datos: r, error } = useCarga('/admin/reportes');

  function exportarCSV() {
    const filas = [
      ['Indicador', 'Valor'],
      ...Object.entries(r.totales),
      [],
      ['Citas por estado', ''], ...r.citasPorEstado.map((x) => [x.estado, x.total]),
      [],
      ['Servicios por tipo', ''], ...r.serviciosPorTipo.map((x) => [x.tipo_servicio, x.total]),
      [],
      ['Mascotas por especie', ''], ...r.mascotasPorEspecie.map((x) => [x.especie, x.total]),
      [],
      ['Citas por mes', ''], ...r.citasPorMes.map((x) => [x.mes, x.total]),
    ];
    const csv = '﻿' + filas.map((f) => f.join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `reporte-petcareapp-${r.generado.slice(0, 10)}.csv`;
    a.click();
  }

  if (error) return <Alerta>{error}</Alerta>;
  if (!r) return <Cargando />;
  const t = r.totales;

  return (
    <>
      <Encabezado titulo="Reportes" sub={`Generado el ${new Date(r.generado).toLocaleString('es-CO')}`}>
        <button className="btn suave" onClick={exportarCSV}>⬇ Exportar CSV</button>
      </Encabezado>
      <div className="stats seis">
        {[
          [t.propietarios, 'Propietarios'], [t.mascotas, 'Mascotas'], [t.citas, 'Citas totales'],
          [t.citas_proximas, 'Citas próximas'], [t.vacunas, 'Vacunas aplicadas'], [t.servicios, 'Servicios'],
        ].map(([n, l]) => (
          <div className="stat" key={l}><span className="stat-n">{n}</span><span className="stat-l">{l}</span></div>
        ))}
      </div>
      <div className="grid-2">
        <Barras titulo="Citas por estado" filas={r.citasPorEstado.map((x) => [x.estado, x.total])} />
        <Barras titulo="Servicios de peluquería por tipo" filas={r.serviciosPorTipo.map((x) => [x.tipo_servicio, x.total])} />
        <Barras titulo="Mascotas por especie" filas={r.mascotasPorEspecie.map((x) => [x.especie, x.total])} />
        <Barras titulo="Citas por mes" filas={r.citasPorMes.map((x) => [x.mes, x.total])} />
      </div>
    </>
  );
}

function Barras({ titulo, filas }) {
  const max = Math.max(1, ...filas.map((f) => f[1]));
  return (
    <section className="card">
      <h2>{titulo}</h2>
      {filas.length === 0 ? <Vacio icono="📊">Sin datos todavía.</Vacio> : (
        <ul className="barras">
          {filas.map(([k, v]) => (
            <li key={k}>
              <span className="barra-k">{k}</span>
              <span className="barra-pista"><span className="barra" style={{ width: `${(v / max) * 100}%` }} /></span>
              <span className="barra-v">{v}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// RF07 Generar recordatorios · CU-10 Recibir recordatorios
// Se generan al consultar: citas en los próximos 7 días, servicios próximos
// y vacunas cuya próxima dosis vence en 30 días o ya está vencida.
import { Router } from 'express';
import { query } from '../db.js';
import { ah, hoy, sumarDias } from '../utils.js';

const r = Router();

r.get('/', ah(async (req, res) => {
  const h = hoy();
  const en7 = sumarDias(h, 7);
  const en30 = sumarDias(h, 30);
  const propio = req.user.rol === 'admin' ? '' : 'AND m.id_propietario = $3';
  const p = req.user.rol === 'admin' ? [] : [req.user.id];

  const [citas, servicios, vacunas] = await Promise.all([
    query(
      `SELECT c.id_cita, c.fecha, to_char(c.hora, 'HH24:MI') AS hora, c.motivo, m.nombre_mascota
       FROM cita c JOIN mascota m ON m.id_mascota = c.id_mascota
       WHERE c.estado = 'Programada' AND c.fecha BETWEEN $1 AND $2 ${propio}
       ORDER BY c.fecha, c.hora`,
      [h, en7, ...p]
    ),
    query(
      `SELECT s.id_servicio, s.fecha_servicio, s.tipo_servicio, s.estado, m.nombre_mascota
       FROM servicio s JOIN mascota m ON m.id_mascota = s.id_mascota
       WHERE s.estado IN ('Solicitado', 'Confirmado') AND s.fecha_servicio BETWEEN $1 AND $2 ${propio}
       ORDER BY s.fecha_servicio`,
      [h, en7, ...p]
    ),
    query(
      `SELECT v.id_vacuna, v.nombre, v.fecha_proxima, m.nombre_mascota
       FROM vacuna v JOIN mascota m ON m.id_mascota = v.id_mascota
       WHERE v.fecha_proxima IS NOT NULL AND v.fecha_proxima <= $2 ${propio}
         AND v.fecha_proxima >= ($1::date - INTERVAL '60 days')
       ORDER BY v.fecha_proxima`,
      [h, en30, ...p]
    ),
  ]);

  const items = [
    ...citas.rows.map((c) => ({
      tipo: 'cita',
      fecha: c.fecha,
      titulo: `Cita veterinaria de ${c.nombre_mascota}`,
      detalle: `${c.fecha} a las ${c.hora}${c.motivo ? ` · ${c.motivo}` : ''}`,
      urgente: c.fecha === h,
    })),
    ...servicios.rows.map((s) => ({
      tipo: 'servicio',
      fecha: s.fecha_servicio,
      titulo: `${s.tipo_servicio} para ${s.nombre_mascota}`,
      detalle: `${s.fecha_servicio} · ${s.estado}`,
      urgente: s.fecha_servicio === h,
    })),
    ...vacunas.rows.map((v) => ({
      tipo: 'vacuna',
      fecha: v.fecha_proxima,
      titulo: `${v.fecha_proxima < h ? 'Vacuna vencida' : 'Próxima vacuna'}: ${v.nombre} (${v.nombre_mascota})`,
      detalle: `Fecha de la dosis: ${v.fecha_proxima}`,
      urgente: v.fecha_proxima <= h,
    })),
  ].sort((a, b) => a.fecha.localeCompare(b.fecha));

  res.json(items);
}));

export default r;

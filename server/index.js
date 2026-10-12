import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initDb } from './db.js';
import { requireAdmin, requireAuth } from './middleware/auth.js';
import auth from './routes/auth.js';
import mascotas from './routes/mascotas.js';
import citas from './routes/citas.js';
import vacunas from './routes/vacunas.js';
import servicios from './routes/servicios.js';
import recordatorios from './routes/recordatorios.js';
import admin from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.get('/api/salud', (_req, res) => res.json({ ok: true, app: 'PetCareApp', hora: new Date().toISOString() }));

app.use('/api/auth', auth);
app.use('/api/mascotas', requireAuth, mascotas);
app.use('/api/citas', requireAuth, citas);
app.use('/api/vacunas', requireAuth, vacunas);
app.use('/api/servicios', requireAuth, servicios);
app.use('/api/recordatorios', requireAuth, recordatorios);
app.use('/api/admin', requireAuth, requireAdmin, admin);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Sirve el frontend compilado (client/dist) en la misma URL
const dist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// Manejador central de errores
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  // Violación de unicidad (PostgreSQL 23505): franja de cita ocupada o correo repetido
  if (err.code === '23505') {
    const msg = err.constraint === 'uq_cita_franja' || String(err.message).includes('uq_cita_franja')
      ? 'Ese horario ya está ocupado, elija otro'
      : 'Ya existe un registro con esos datos';
    return res.status(409).json({ error: msg });
  }
  if (err.code === '22P02' || err.code === '22007' || err.code === '22008') return res.status(400).json({ error: 'Datos con formato inválido' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

initDb()
  .then(() => app.listen(PORT, () => console.log(`PetCareApp escuchando en http://localhost:${PORT}`)))
  .catch((e) => {
    console.error('No se pudo iniciar la base de datos:', e);
    process.exit(1);
  });

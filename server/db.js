import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let driver; // { query(text, params) => { rows }, exec(sql) }

export async function initDb() {
  if (process.env.DATABASE_URL) {
    const pg = (await import('pg')).default;
    // DATE (1082) se devuelve como texto 'YYYY-MM-DD' para evitar desfases de zona horaria
    pg.types.setTypeParser(1082, (v) => v);
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
      max: 5,
      // Neon y otros servicios cierran las conexiones inactivas: se liberan antes de que eso pase
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 15000,
      keepAlive: true,
    });
    // Una conexión inactiva que el servidor corta no debe tumbar el proceso
    pool.on('error', (e) => console.warn('Conexión a la base de datos cerrada:', e.message));
    // Si la conexión se cortó, la consulta se reintenta una vez con una conexión nueva
    const conReintento = async (fn) => {
      try {
        return await fn();
      } catch (e) {
        const cortada = ['ECONNRESET', 'EPIPE', 'ETIMEDOUT', '57P01'].includes(e.code)
          || /Connection terminated|connection timeout/i.test(e.message);
        if (!cortada) throw e;
        return fn();
      }
    };
    driver = {
      query: (text, params) => conReintento(() => pool.query(text, params)),
      exec: (sql) => conReintento(() => pool.query(sql)),
    };
    console.log('Base de datos: PostgreSQL (DATABASE_URL)');
  } else {
    const { PGlite } = await import('@electric-sql/pglite');
    const dataDir = process.env.PGLITE_DIR || path.join(__dirname, '..', 'data');
    fs.mkdirSync(dataDir, { recursive: true });
    const db = new PGlite(dataDir, { parsers: { 1082: (v) => v } });
    await db.waitReady;
    driver = {
      query: (text, params) => db.query(text, params),
      exec: (sql) => db.exec(sql),
    };
    console.log(`Base de datos: PostgreSQL embebido (PGlite) en ${dataDir}`);
  }

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await driver.exec(schema);
  // Impide dos citas programadas en la misma franja (también con solicitudes simultáneas).
  // Va aparte del schema para que el servidor arranque aunque ya existan duplicados antiguos.
  try {
    await driver.exec(`CREATE UNIQUE INDEX IF NOT EXISTS uq_cita_franja ON cita (fecha, hora) WHERE estado = 'Programada'`);
  } catch (e) {
    console.warn('Aviso: hay citas duplicadas en la misma franja; no se creó el índice uq_cita_franja.', e.message);
  }
  await seedAdmin();
}

export function query(text, params = []) {
  return driver.query(text, params);
}

async function seedAdmin() {
  const correo = (process.env.ADMIN_EMAIL || 'admin@petcareapp.com').toLowerCase();
  const pass = process.env.ADMIN_PASSWORD || 'Admin123*';
  const { rows } = await query('SELECT id_propietario FROM propietario WHERE correo = $1', [correo]);
  if (rows.length === 0) {
    const hash = await bcrypt.hash(pass, 10);
    await query(
      `INSERT INTO propietario (nombre, telefono, correo, contrasena, rol)
       VALUES ($1, $2, $3, $4, 'admin')`,
      ['Administrador', '0000000000', correo, hash]
    );
    console.log(`Usuario administrador creado: ${correo}`);
  }
}

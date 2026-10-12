
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
    });
    driver = {
      query: (text, params) => pool.query(text, params),
      exec: (sql) => pool.query(sql),
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

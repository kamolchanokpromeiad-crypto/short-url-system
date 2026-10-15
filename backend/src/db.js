// db.js — เชื่อมต่อ PostgreSQL และสร้างตารางอัตโนมัติตอนเปิด server
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ใช้ DATABASE_URL (เวลา deploy บนโฮสต์) หรือ PGHOST/PGUSER/... (เวลารันในเครื่อง)
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

export const query = (text, params) => pool.query(text, params);

// รัน docs/schema.sql (ใช้ CREATE TABLE IF NOT EXISTS จึงรันซ้ำได้ปลอดภัย)
export async function initDb() {
  const schemaPath = path.join(__dirname, '../../docs/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
}

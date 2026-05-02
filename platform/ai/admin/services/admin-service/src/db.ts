import { Pool } from 'pg';

const connectionString =
  process.env.ADMIN_DATABASE_URL ||
  process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER || 'dos_migrator'}:${process.env.PGPASSWORD || 'dos_migrator_pass_2026'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE || 'shahin_grc'}`;

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
});

export async function q<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const r = await pool.query(sql, params);
  return r.rows as T[];
}

export async function one<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await q<T>(sql, params);
  return rows[0] ?? null;
}

export async function exec(sql: string, params: any[] = []): Promise<number> {
  const r = await pool.query(sql, params);
  return r.rowCount ?? 0;
}

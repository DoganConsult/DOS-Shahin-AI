import { getPool } from './pool';
import { getDbLogger } from './logger';
import { toErrorMessage } from './errors';

export async function masterQuery(
  text: string,
  params?: unknown[],
): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }> {
  const logger = getDbLogger();
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO public`);
    const result = await client.query(text, params);
    return { rows: result.rows, rowCount: result.rowCount };
  } finally {
    await client.query('RESET search_path').catch((err: unknown) => {
      logger.warn({ error: toErrorMessage(err) }, '[DB] RESET search_path failed on master client release');
    });
    client.release();
  }
}

export async function masterGetFirst(
  table: string,
  where: string,
  params?: unknown[],
): Promise<Record<string, unknown> | null> {
  const result = await masterQuery(
    `SELECT * FROM public.${table} WHERE ${where} LIMIT 1`,
    params,
  );
  return result.rows[0] || null;
}

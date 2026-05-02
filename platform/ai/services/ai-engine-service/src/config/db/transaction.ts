/**
 * Database transaction helper — delegates to @dos/db pool.
 */
import { getPool } from '@dos/db';

export async function withTransaction<T>(
  fn: (client: any) => Promise<T>,
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

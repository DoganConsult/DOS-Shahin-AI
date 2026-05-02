export { query as safeQuery, tenantSchema } from '../ports/database.port';
import { getPool } from '../ports/database.port';
export async function getClient(): Promise<any> {
  const pool: any = getPool();
  if (pool && typeof pool.connect === 'function') {
    return pool.connect();
  }
  return pool;
}

import { PoolClient } from 'pg';
import { withTenantClient } from './tenant';

export async function withTransaction<T>(
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  return withTenantClient(tenantId, async (client) => {
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    }
  });
}

export async function withTransactionIsolation<T>(
  tenantId: string,
  isolationLevel: 'SERIALIZABLE' | 'REPEATABLE READ' | 'READ COMMITTED' | 'READ UNCOMMITTED',
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  return withTenantClient(tenantId, async (client) => {
    try {
      // secrets-scan-allow: isolationLevel is a TypeScript union of four literal strings
      await client.query(`BEGIN ISOLATION LEVEL ${isolationLevel}`);
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    }
  });
}

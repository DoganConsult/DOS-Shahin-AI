import { query } from '@dos/db';
import { logger } from '@dos/module-sdk';
import { safeQuery } from "@dos/db";

export async function archiveOldAuditEntries(
  tenantId: string,
  retentionDays: number = 365,
): Promise<{ archived: number }> {
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000).toISOString();

  const countResult = await query(
    `SELECT COUNT(*)::int AS cnt FROM dos.audit_log WHERE tenant_id = $1 AND created_at < $2`,
    [tenantId, cutoff],
  );
  const eligible = (countResult.rows[0] as any)?.cnt ?? 0;
  if (eligible === 0) return { archived: 0 };

  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO dos.audit_log_archive
         (entry_id, tenant_id, actor_id, action, module, entity_type, entity_id,
          before_state, after_state, ip_address, created_at, archived_at)
       SELECT entry_id, tenant_id, actor_id, action, module, entity_type, entity_id,
              before_state, after_state, ip_address, created_at, NOW()
       FROM dos.audit_log
       WHERE tenant_id = $1 AND created_at < $2
       ON CONFLICT (entry_id) DO NOTHING`,
      [tenantId, cutoff],
    );

    await client.query(
      `DELETE FROM dos.audit_log WHERE tenant_id = $1 AND created_at < $2`,
      [tenantId, cutoff],
    );

    await client.query('COMMIT');
    logger.info('[audit-retention] Archived entries', { tenantId, archived: eligible, retentionDays });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }

  return { archived: eligible };
}

export async function getRetentionStats(tenantId: string): Promise<{
  totalEntries: number;
  archivedEntries: number;
  oldestEntry: string | null;
  newestEntry: string | null;
}> {
  const totalResult = await query(
    `SELECT COUNT(*)::int AS total FROM dos.audit_log WHERE tenant_id = $1`,
    [tenantId],
  );

  let archivedCount = 0;
  try {
    const archiveResult = await query(
      `SELECT COUNT(*)::int AS total FROM dos.audit_log_archive WHERE tenant_id = $1`,
      [tenantId],
    );
    archivedCount = (archiveResult.rows[0] as any)?.total ?? 0;
  } catch {
    archivedCount = 0;
  }

  const rangeResult = await query(
    `SELECT MIN(created_at) AS oldest, MAX(created_at) AS newest FROM dos.audit_log WHERE tenant_id = $1`,
    [tenantId],
  );

  return {
    totalEntries: (totalResult.rows[0] as any)?.total ?? 0,
    archivedEntries: archivedCount,
    oldestEntry: (rangeResult.rows[0] as any)?.oldest ?? null,
    newestEntry: (rangeResult.rows[0] as any)?.newest ?? null,
  };
}

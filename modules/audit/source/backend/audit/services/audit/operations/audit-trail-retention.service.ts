import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================
// Shahin — Audit Trail Retention Service
// Archives old audit entries to audit_trail_archive
// then deletes them from the main table.
// ============================================

import { safeQuery, tenantSchema, withClient } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';

/**
 * Archive audit entries older than `retentionDays` from the main table
 * to the archive table, then purge them.
 *
 * Immutability triggers on audit_trail and audit_trail_archive block
 * UPDATE/DELETE, so we disable them, perform the archive + delete,
 * and re-enable — all within a single transaction to guarantee
 * triggers are always restored even on crash.
 */
export async function archiveOldAuditEntries(
  tenantId: string,
  retentionDays: number = 365
): Promise<{ archived: number }> {
  const schema = tenantSchema(tenantId);
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000).toISOString();

  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS cnt FROM "${schema}".audit_trail WHERE timestamp < $1`,
    [cutoff]
  );
  const eligible = getFirstRow(countResult)?.cnt ?? 0;
  if (eligible === 0) return { archived: 0 };

  await withClient(async (client) => {
    await client.query('BEGIN');
    try {
      await client.query(
        `INSERT INTO "${schema}".audit_trail_archive
           (entry_id, user_id, module, action, entity_type, entity_id,
            before_state, after_state, ip_address, timestamp, entry_hash, previous_hash, archived_at)
         SELECT entry_id, user_id, module, action, entity_type, entity_id,
                before_state, after_state, ip_address, timestamp, entry_hash, previous_hash, NOW()
         FROM "${schema}".audit_trail
         WHERE timestamp < $1
         ON CONFLICT (entry_id) DO NOTHING`,
        [cutoff]
      );

      // Disable immutability triggers on both tables for the archive operation
      await client.query(`ALTER TABLE "${schema}".audit_trail_archive DISABLE TRIGGER IF EXISTS trg_audit_archive_no_update`);
      await client.query(`ALTER TABLE "${schema}".audit_trail_archive DISABLE TRIGGER IF EXISTS trg_audit_archive_no_delete`);
      await client.query(`ALTER TABLE "${schema}".audit_trail DISABLE TRIGGER trg_audit_trail_no_delete`);

      await client.query(
        `DELETE FROM "${schema}".audit_trail WHERE timestamp < $1`,
        [cutoff]
      );

      // Re-enable all immutability triggers
      await client.query(`ALTER TABLE "${schema}".audit_trail ENABLE TRIGGER trg_audit_trail_no_delete`);
      await client.query(`ALTER TABLE "${schema}".audit_trail_archive ENABLE TRIGGER IF EXISTS trg_audit_archive_no_update`);
      await client.query(`ALTER TABLE "${schema}".audit_trail_archive ENABLE TRIGGER IF EXISTS trg_audit_archive_no_delete`);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(catchHandler(EC.EVENT_BUS, {}));
      throw err;
    }
  });

  return { archived: eligible };
}

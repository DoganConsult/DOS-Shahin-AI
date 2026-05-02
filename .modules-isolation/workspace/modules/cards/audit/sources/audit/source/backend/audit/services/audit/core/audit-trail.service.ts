// @ts-nocheck
import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================
// Shahin — Audit Trail Service
// Append-only immutable audit log
// NO UPDATE or DELETE operations permitted
// ============================================

import { createHash } from "crypto";
import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema, withClient } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

export interface AuditEntry {
  tenantId: string;
  userId: string;
  module: string;
  action: "create" | "update" | "delete" | "security_violation" | "delegation" | (string & {});
  entityType: string;
  entityId: string;
  beforeState?: any;
  afterState?: any;
  ipAddress?: string;
}

export interface AuditFilters {
  startDate?: string;
  endDate?: string;
  module?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
  offset?: number;
}

/** Compute SHA-256 hash for an audit entry (deterministic canonical form) */
function computeEntryHash(fields: {
  entryId: string; timestamp: string; userId: string; module: string;
  action: string; entityType: string; entityId: string; previousHash: string;
}): string {
  const payload = `${fields.entryId}|${fields.timestamp}|${fields.userId}|${fields.module}|${fields.action}|${fields.entityType}|${fields.entityId}|${fields.previousHash}`;
  return createHash("sha256").update(payload).digest("hex");
}

/** Record an audit trail entry (append-only INSERT with hash chain) */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  const schema = tenantSchema(entry.tenantId);
  const entryId = uuid();
  const timestamp = new Date().toISOString();

  await withClient(async (client) => {
    await client.query('BEGIN');
    try {
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [schema]);

      let previousHash = '';
      try {
        const lastRow = await client.query(
          `SELECT entry_hash FROM "${schema}".audit_trail WHERE entry_hash IS NOT NULL ORDER BY timestamp DESC LIMIT 1`
        );
        previousHash = getFirstRow(lastRow)?.entry_hash || '';
      } catch { /* first entry or column not yet added */ }

      const entryHash = computeEntryHash({
        entryId, timestamp, userId: entry.userId, module: entry.module,
        action: entry.action, entityType: entry.entityType, entityId: entry.entityId,
        previousHash,
      });

      await client.query(
        `INSERT INTO "${schema}".audit_trail
          (entry_id, timestamp, user_id, module, action, entity_type, entity_id, before_state, after_state, ip_address, entry_hash, previous_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          entryId,
          timestamp,
          entry.userId,
          entry.module,
          entry.action,
          entry.entityType,
          entry.entityId,
          entry.beforeState ? JSON.stringify(entry.beforeState) : null,
          entry.afterState ? JSON.stringify(entry.afterState) : null,
          entry.ipAddress || null,
          entryHash,
          previousHash || null,
        ]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(catchHandler(EC.EVENT_BUS, {}));
      throw err;
    }
  });
}

/** Verify audit chain integrity for a tenant — returns first broken link if any */
export async function verifyAuditChain(
  tenantId: string,
  startDate?: string,
  endDate?: string
): Promise<{ valid: boolean; totalChecked: number; brokenAt?: string }> {
  const schema = tenantSchema(tenantId);
  const conditions = ['entry_hash IS NOT NULL'];
  const params: unknown[] = [];
  let idx = 1;
  if (startDate) { conditions.push(`timestamp >= $${idx++}`); params.push(startDate); }
  if (endDate) { conditions.push(`timestamp <= $${idx++}`); params.push(endDate); }

  const result = await safeQuery(
    `SELECT entry_id, timestamp, user_id, module, action, entity_type, entity_id, entry_hash, previous_hash
     FROM "${schema}".audit_trail
     WHERE ${conditions.join(' AND ')}
     ORDER BY timestamp ASC`,
    params
  );

  const rows = result.rows;
  let prevHash = '';
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Verify previous_hash linkage
    if (i > 0 && row.previous_hash !== prevHash) {
      return { valid: false, totalChecked: i, brokenAt: row.entry_id };
    }
    // Verify entry_hash computation
    const expected = computeEntryHash({
      entryId: row.entry_id, timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : row.timestamp,
      userId: row.user_id, module: row.module, action: row.action,
      entityType: row.entity_type, entityId: row.entity_id,
      previousHash: row.previous_hash || '',
    });
    if (row.entry_hash !== expected) {
      return { valid: false, totalChecked: i, brokenAt: row.entry_id };
    }
    prevHash = row.entry_hash;
  }
  return { valid: true, totalChecked: rows.length };
}

/** Shared filter builder — single source of truth for WHERE clauses */
function buildAuditFilters(filters: AuditFilters): { where: string; params: unknown[]; nextIdx: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.startDate) {
    conditions.push(`at.timestamp >= $${idx++}`);
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push(`at.timestamp <= $${idx++}`);
    params.push(filters.endDate);
  }
  if (filters.module) {
    conditions.push(`at.module = $${idx++}`);
    params.push(filters.module);
  }
  if (filters.userId) {
    conditions.push(`at.user_id = $${idx++}`);
    params.push(filters.userId);
  }
  if (filters.action) {
    conditions.push(`at.action = $${idx++}`);
    params.push(filters.action);
  }
  if (filters.entityType) {
    conditions.push(`at.entity_type = $${idx++}`);
    params.push(filters.entityType);
  }
  if (filters.entityId) {
    conditions.push(`at.entity_id = $${idx++}`);
    params.push(filters.entityId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return { where, params, nextIdx: idx };
}

/** Query audit trail with filters — includes user_email via LEFT JOIN */
export async function queryAuditTrail(
  tenantId: string,
  filters: AuditFilters
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const { where, params, nextIdx } = buildAuditFilters(filters);
  let idx = nextIdx;
  const limit = filters.limit || 100;
  const offset = filters.offset || 0;

  const result = await safeQuery(
    `SELECT at.*, u.email AS user_email
     FROM "${schema}".audit_trail at
     LEFT JOIN public.users u ON u.user_id = at.user_id
     ${where}
     ORDER BY at.timestamp DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return result.rows;
}

/** Return total number of audit entries matching filters (for pagination) */
export async function getAuditTrailTotal(tenantId: string, filters: AuditFilters): Promise<number> {
  const schema = tenantSchema(tenantId);
  const { where, params } = buildAuditFilters(filters);

  const result = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".audit_trail at ${where}`,
    params
  );
  return getFirstRow(result)?.total ?? 0;
}

/** Return distinct module names from audit trail (for dynamic filter dropdown) */
export async function getDistinctModules(tenantId: string): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT DISTINCT module FROM "${schema}".audit_trail ORDER BY module`,
    []
  );
  return result.rows.map((r: GenericRow) => r.module);
}

/** RFC 4180 CSV escape with formula injection protection */
export function csvEscape(value: unknown): string {
  const str = String(value ?? "");
  if (str.length === 0) return "";
  // Neutralize CSV formula injection: prefix dangerous leading chars with apostrophe
  const dangerous = /^[=+\-@\t\r]/.test(str);
  const escaped = str.replace(/"/g, '""');
  if (dangerous || escaped.includes(",") || escaped.includes("\n") || escaped.includes("\r") || escaped.includes('"')) {
    return `"${dangerous ? "'" : ""}${escaped}"`;
  }
  return escaped;
}

/** Export audit log as JSON or CSV buffer */
export async function exportAuditLog(
  tenantId: string,
  filters: AuditFilters,
  format: "csv" | "json"
): Promise<Buffer> {
  const entries = await queryAuditTrail(tenantId, { ...filters, limit: 10000 });

  if (format === "json") {
    return Buffer.from(JSON.stringify(entries, null, 2), "utf-8");
  }

  // CSV format — RFC 4180 compliant with CRLF line endings
  const fields = ["entry_id", "timestamp", "user_id", "user_email", "module", "action", "entity_type", "entity_id", "ip_address"];
  const headers = fields.join(",") + "\r\n";
  const rows = entries.map((e: GenericRow) =>
    fields.map(f => csvEscape(e[f])).join(",")
  ).join("\r\n");

  return Buffer.from(headers + rows, "utf-8");
}

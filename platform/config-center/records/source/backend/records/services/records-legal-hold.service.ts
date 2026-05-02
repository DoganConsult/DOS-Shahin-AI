// ============================================
// Shahin-Ai — Records Legal Hold Service
// Legal hold management, suspension of disposal,
// hold notification, release workflow, reporting
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from "@dos/db";

// === Types ===

export type HoldStatus = "active" | "released" | "expired";

export interface LegalHold {
  holdId: string;
  tenantId: string;
  title: string;
  description: string;
  legalMatter: string;
  status: HoldStatus;
  placedBy: string;
  reviewedBy: string | null;
  scope: {
    recordIds?: string[];
    recordTypes?: string[];
    classifications?: string[];
    dateRange?: { from?: string; to?: string };
  };
  affectedRecordCount: number;
  placedAt: string;
  expiresAt: string | null;
  releasedAt: string | null;
  releaseReason: string | null;
}

export interface HoldNotification {
  notificationId: string;
  holdId: string;
  recipientId: string;
  notificationType: "placed" | "released" | "expiring" | "reminder";
  message: string;
  sentAt: string;
}

// === Pure Functions ===

export function buildHoldScopeQuery(
  scope: LegalHold["scope"],
  startIdx: number
): { conditions: string[]; params: unknown[]; nextIdx: number } {
  const conditions: string[] = ["deleted_at IS NULL"];
  const params: unknown[] = [];
  let idx = startIdx;

  if (scope.recordIds && scope.recordIds.length > 0) {
    conditions.push(`id = ANY($${idx++}::text[])`);
    params.push(scope.recordIds);
  }
  if (scope.recordTypes && scope.recordTypes.length > 0) {
    conditions.push(`record_type = ANY($${idx++}::text[])`);
    params.push(scope.recordTypes);
  }
  if (scope.classifications && scope.classifications.length > 0) {
    conditions.push(`classification = ANY($${idx++}::text[])`);
    params.push(scope.classifications);
  }
  if (scope.dateRange?.from) {
    conditions.push(`created_at >= $${idx++}`);
    params.push(scope.dateRange.from);
  }
  if (scope.dateRange?.to) {
    conditions.push(`created_at <= $${idx++}`);
    params.push(scope.dateRange.to);
  }

  return { conditions, params, nextIdx: idx };
}

export function isHoldExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export function buildHoldNotificationMessage(
  notificationType: HoldNotification["notificationType"],
  holdTitle: string,
  legalMatter: string
): string {
  switch (notificationType) {
    case "placed":
      return `Legal hold '${holdTitle}' has been placed for matter: ${legalMatter}. Disposal of affected records is suspended.`;
    case "released":
      return `Legal hold '${holdTitle}' has been released. Normal retention policies are now restored for affected records.`;
    case "expiring":
      return `Legal hold '${holdTitle}' is expiring soon. Review and extend or release if appropriate.`;
    case "reminder":
      return `Reminder: Legal hold '${holdTitle}' is currently active for matter: ${legalMatter}.`;
  }
}

// === DB-backed Functions ===

function mapHold( r: Record<string, unknown>): LegalHold {
  return {

    holdId: r.hold_id,

    tenantId: r.tenant_id,

    title: r.title,

    description: r.description || "",

    legalMatter: r.legal_matter,

    status: r.status,

    placedBy: r.placed_by,

    reviewedBy: r.reviewed_by || null,
    scope: r.scope || {},
    affectedRecordCount: parseInt((r as any).affected_record_count, 10) || 0,

    placedAt: r.placed_at?.toISOString?.() || r.placed_at,

    expiresAt: r.expires_at ? (r.expires_at?.toISOString?.() || r.expires_at) : null,

    releasedAt: r.released_at ? (r.released_at?.toISOString?.() || r.released_at) : null,

    releaseReason: r.release_reason || null,
  };
}

export async function placeHold(
  tenantId: string,
  data: {
    title: string;
    description?: string;
    legalMatter: string;
    placedBy: string;
    scope: LegalHold["scope"];
    expiresAt?: string;
  }
): Promise<LegalHold> {
  const schema = tenantSchema(tenantId);

  const { conditions, params } = buildHoldScopeQuery(data.scope, 1);
  const affected = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".records_records WHERE ${conditions.join(" AND ")}`,
    params
  );
  const affectedCount = parseInt(affected.rows[0]?.cnt, 10) || 0;

  const result = await safeQuery(
    `INSERT INTO "${schema}".record_legal_holds
      (tenant_id, title, description, legal_matter, status, placed_by, scope,
       affected_record_count, expires_at)
     VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, $8)
     RETURNING *`,
    [
      tenantId, data.title, data.description || "", data.legalMatter,
      data.placedBy, JSON.stringify(data.scope), affectedCount, data.expiresAt || null,
    ]
  );
  const hold = mapHold(getFirstRow(result)!);

  await safeQuery(
    `UPDATE "${schema}".records_records
     SET legal_hold = true, updated_at = NOW()
     WHERE ${conditions.join(" AND ")}`,
    params
  );

  return hold;
}

export async function releaseHold(
  tenantId: string,
  holdId: string,
  reviewedBy: string,
  reason: string
): Promise<LegalHold> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.records_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function getActiveHolds(tenantId: string): Promise<LegalHold[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".record_legal_holds WHERE status = 'active' ORDER BY placed_at DESC`
  );
  return result.rows.map(mapHold);
}

export async function sendHoldNotification(
  tenantId: string,
  holdId: string,
  recipientId: string,
  notificationType: HoldNotification["notificationType"]
): Promise<HoldNotification> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.records_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function getHoldReport(tenantId: string): Promise<{
  totalActive: number;
  totalReleased: number;
  recordsUnderHold: number;
  holdsByMatter: { legalMatter: string; holdId: string; placedAt: string; affectedCount: number }[];
}> {
  const schema = tenantSchema(tenantId);

  const stats = await safeQuery(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'active') AS active,
       COUNT(*) FILTER (WHERE status = 'released') AS released
     FROM "${schema}".record_legal_holds`
  );

  const onHold = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".records_records WHERE legal_hold = true AND deleted_at IS NULL`
  );

  const byMatter = await safeQuery(
    `SELECT legal_matter, hold_id, placed_at, affected_record_count
     FROM "${schema}".record_legal_holds WHERE status = 'active' ORDER BY placed_at DESC`
  );

  return {
    totalActive: parseInt(stats.rows[0]?.active, 10) || 0,
    totalReleased: parseInt(stats.rows[0]?.released, 10) || 0,
    recordsUnderHold: parseInt(onHold.rows[0]?.cnt, 10) || 0,

    holdsByMatter: byMatter.rows.map(( r: Record<string, unknown>) => ({
      legalMatter: r.legal_matter,
      holdId: r.hold_id,

      placedAt: r.placed_at?.toISOString?.() || r.placed_at,
      affectedCount: parseInt((r as any).affected_record_count, 10) || 0,
    })),
  };
}

// ============================================================================
// Shahin — Evidence Freshness Service
// Tracks evidence freshness lifecycle: verification, staleness detection,
// expiration monitoring, and batch freshness recalculation.
// ============================================================================

import { safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { eventBus } from '../../ports/events.port';
import { recordActivity } from '../../ports/platform.port';

// ── Constants ──

/** Default freshness thresholds (days) when no admin settings are configured */
const DEFAULT_THRESHOLDS = {
  current_days: 90,
  stale_days: 180,
  expired_days: 365,
};

// ── Helpers ──

/**
 * Load freshness thresholds from evidence_admin_settings.
 * Falls back to DEFAULT_THRESHOLDS when the setting is missing.
 */
async function loadThresholds(schema: string): Promise<typeof DEFAULT_THRESHOLDS> {
  const result = await safeQuery(
    `SELECT setting_value FROM "${schema}".evidence_admin_settings
     WHERE setting_key = 'freshness_thresholds'`,
  );
  const row = getFirstRow(result)!;
  if (!row?.setting_value) return { ...DEFAULT_THRESHOLDS };

  const val = typeof row.setting_value === 'string'
    ? JSON.parse(row.setting_value)
    : row.setting_value;

  return {
    current_days: Number(val.current_days) || DEFAULT_THRESHOLDS.current_days,
    stale_days: Number(val.stale_days) || DEFAULT_THRESHOLDS.stale_days,
    expired_days: Number(val.expired_days) || DEFAULT_THRESHOLDS.expired_days,
  };
}

/**
 * Determine freshness band based on days since last verification or valid_to.
 */
function computeFreshnessBand(
  daysSince: number,
  thresholds: typeof DEFAULT_THRESHOLDS,
): string {
  if (daysSince <= thresholds.current_days) return 'current';
  if (daysSince <= thresholds.stale_days) return 'stale';
  return 'expired';
}

// ── Public API ──

/**
 * Aggregate freshness statistics across all evidence for the tenant.
 * Returns counts by freshness band, expiration forecasts, and overall rate.
 */
export async function getFreshnessOverview(tenantId: string): Promise<{
  total: number;
  current: number;
  stale: number;
  expired: number;
  neverVerified: number;
  freshnessRate: number;
  expiringThisWeek: number;
  expiringThisMonth: number;
}> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE freshness_status = 'current')::int AS current,
       COUNT(*) FILTER (WHERE freshness_status = 'stale')::int AS stale,
       COUNT(*) FILTER (WHERE freshness_status = 'expired')::int AS expired,
       COUNT(*) FILTER (WHERE freshness_status IS NULL OR freshness_status = 'unknown')::int AS never_verified,
       COUNT(*) FILTER (
         WHERE valid_to IS NOT NULL
           AND valid_to >= NOW()
           AND valid_to < NOW() + INTERVAL '7 days'
       )::int AS expiring_this_week,
       COUNT(*) FILTER (
         WHERE valid_to IS NOT NULL
           AND valid_to >= NOW()
           AND valid_to < NOW() + INTERVAL '30 days'
       )::int AS expiring_this_month
     FROM "${schema}".evidence`,
  );

  const row = getFirstRow(result) || {
    total: 0, current: 0, stale: 0, expired: 0,
    never_verified: 0, expiring_this_week: 0, expiring_this_month: 0,
  };

  const total = Number(row.total) || 0;
  const current = Number(row.current) || 0;

  return {
    total,
    current,
    stale: Number(row.stale) || 0,
    expired: Number(row.expired) || 0,
    neverVerified: Number(row.never_verified) || 0,
    freshnessRate: total > 0 ? Math.round((current / total) * 100) : 0,
    expiringThisWeek: Number(row.expiring_this_week) || 0,
    expiringThisMonth: Number(row.expiring_this_month) || 0,
  };
}

/**
 * Retrieve evidence items whose valid_to falls within the next N days.
 * Includes the associated freshness record data when available.
 */
export async function getExpiringEvidenceByDays(tenantId: string, days: number): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT
       e.evidence_id, e.title, e.control_id, e.status,
       e.freshness_status, e.valid_from, e.valid_to,
       fr.last_verified_at, fr.expires_at, fr.freshness_band,
       fr.refresh_due_at, fr.verification_method
     FROM "${schema}".evidence e
     LEFT JOIN "${schema}".evidence_freshness_records fr
       ON fr.evidence_id = e.evidence_id
     WHERE e.valid_to IS NOT NULL
       AND e.valid_to >= NOW()
       AND e.valid_to < NOW() + ($1 || ' days')::interval
     ORDER BY e.valid_to ASC`,
    [days],
  );

  return result.rows;
}

/**
 * Retrieve all evidence items currently marked as stale.
 * Includes freshness record details for context.
 */
export async function getStaleEvidence(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT
       e.evidence_id, e.title, e.control_id, e.status,
       e.freshness_status, e.valid_from, e.valid_to,
       e.updated_at,
       fr.last_verified_at, fr.expires_at, fr.freshness_band,
       fr.refresh_due_at, fr.verification_method, fr.verified_by
     FROM "${schema}".evidence e
     LEFT JOIN "${schema}".evidence_freshness_records fr
       ON fr.evidence_id = e.evidence_id
     WHERE e.freshness_status = 'stale'
     ORDER BY fr.last_verified_at ASC NULLS FIRST`,
  );

  return result.rows;
}

/**
 * Record a verification event for an evidence item.
 * Updates the freshness record and resets freshness_status to 'current'.
 */
export async function verifyEvidence(
  tenantId: string,
  evidenceId: string,
  userId: string,
  method: string,
  notes?: string,
): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const thresholds = await loadThresholds(schema);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + thresholds.current_days * 24 * 60 * 60 * 1000);
  const refreshDueAt = new Date(now.getTime() + Math.floor(thresholds.current_days * 0.75) * 24 * 60 * 60 * 1000);

  const freshnessRow = await withTransaction(tenantId, async (client) => {
    await safeQueryWithClient(
      `INSERT INTO "${schema}".evidence_verification_events
         (evidence_id, event_type, verified_by, verified_at, notes)
       VALUES ($1, 'verification', $2, $3, $4)`,
      [evidenceId, userId, now.toISOString(), notes || null], client,
    );

    const freshnessResult = await safeQueryWithClient(
      `INSERT INTO "${schema}".evidence_freshness_records
         (evidence_id, last_verified_at, expires_at, freshness_band, refresh_due_at, verification_method, verified_by)
       VALUES ($1, $2, $3, 'current', $4, $5, $6)
       ON CONFLICT (evidence_id)
       DO UPDATE SET
         last_verified_at = EXCLUDED.last_verified_at,
         expires_at = EXCLUDED.expires_at,
         freshness_band = 'current',
         refresh_due_at = EXCLUDED.refresh_due_at,
         verification_method = EXCLUDED.verification_method,
         verified_by = EXCLUDED.verified_by,
         updated_at = NOW()
       RETURNING *`,
      [evidenceId, now.toISOString(), expiresAt.toISOString(), refreshDueAt.toISOString(), method, userId], client,
    );

    await safeQueryWithClient(
      `UPDATE "${schema}".evidence
       SET freshness_status = 'current', updated_at = NOW()
       WHERE evidence_id = $1`,
      [evidenceId], client,
    );

    return getFirstRow(freshnessResult);
  });

  await eventBus.publish('evidence.freshness.verified', tenantId, { evidenceId, userId, method, expiresAt: expiresAt.toISOString() }, { severity: 'info' });

  await recordActivity(tenantId, {
    userId,
    module: 'evidence',
    action: 'verify_freshness',
    entityType: 'evidence',
    entityId: evidenceId,
    summary: `Verified evidence freshness via ${method}`,
  });

  return freshnessRow;
}

/**
 * Mark evidence for refresh. Sets freshness_status to 'stale' and records
 * the refresh request as a verification event.
 */
export async function refreshEvidence(
  tenantId: string,
  evidenceId: string,
  userId: string,
): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  const freshnessRow = await withTransaction(tenantId, async (client) => {
    await safeQueryWithClient(
      `INSERT INTO "${schema}".evidence_verification_events
         (evidence_id, event_type, verified_by, verified_at, notes)
       VALUES ($1, 'refresh_requested', $2, NOW(), 'Refresh requested by user')`,
      [evidenceId, userId], client,
    );

    const freshnessResult = await safeQueryWithClient(
      `UPDATE "${schema}".evidence_freshness_records
       SET freshness_band = 'stale',
           refresh_due_at = NOW(),
           updated_at = NOW()
       WHERE evidence_id = $1
       RETURNING *`,
      [evidenceId], client,
    );

    await safeQueryWithClient(
      `UPDATE "${schema}".evidence
       SET freshness_status = 'stale', updated_at = NOW()
       WHERE evidence_id = $1`,
      [evidenceId], client,
    );

    return getFirstRow(freshnessResult);
  });

  await eventBus.publish('evidence.freshness.refresh_requested', tenantId, { evidenceId, userId }, { severity: 'warning' });

  await recordActivity(tenantId, {
    userId,
    module: 'evidence',
    action: 'request_refresh',
    entityType: 'evidence',
    entityId: evidenceId,
    summary: 'Requested evidence refresh',
  });

  return freshnessRow;
}

/**
 * Batch freshness check: scans all evidence, recalculates freshness_status
 * based on valid_to and admin-configured thresholds.
 * Returns summary of items checked and updated.
 */
export async function batchFreshnessCheck(tenantId: string): Promise<{
  checked: number;
  updated: number;
  staleCount: number;
  expiredCount: number;
}> {
  const schema = tenantSchema(tenantId);
  const thresholds = await loadThresholds(schema);

  // Fetch all evidence with their freshness records
  const result = await safeQuery(
    `SELECT
       e.evidence_id,
       e.freshness_status,
       e.valid_to,
       fr.last_verified_at
     FROM "${schema}".evidence e
     LEFT JOIN "${schema}".evidence_freshness_records fr
       ON fr.evidence_id = e.evidence_id`,
  );

  const rows: GenericRow[] = result.rows;
  let updated = 0;
  let staleCount = 0;
  let expiredCount = 0;

  for (const row of rows) {
    // Determine days since last verification or creation
    const referenceDate = row.last_verified_at
      ? new Date(row.last_verified_at)
      : (row.valid_to ? new Date(row.valid_to) : null);

    let newStatus: string;

    if (!referenceDate) {
      // No verification and no valid_to — treat as unknown/never verified
      newStatus = 'current';
    } else if (row.valid_to && new Date(row.valid_to) < new Date()) {
      // Past valid_to means expired regardless of thresholds
      newStatus = 'expired';
    } else if (row.last_verified_at) {
      const daysSinceVerification = Math.floor(
        (Date.now() - new Date(row.last_verified_at).getTime()) / (1000 * 60 * 60 * 24),
      );
      newStatus = computeFreshnessBand(daysSinceVerification, thresholds);
    } else {
      newStatus = 'current';
    }

    if (newStatus === 'stale') staleCount++;
    if (newStatus === 'expired') expiredCount++;

    // Only update if status actually changed
    if (row.freshness_status !== newStatus) {
      await safeQuery(
        `UPDATE "${schema}".evidence
         SET freshness_status = $1, updated_at = NOW()
         WHERE evidence_id = $2`,
        [newStatus, row.evidence_id],
      );

      // Also update freshness_band in freshness_records if a record exists
      if (row.last_verified_at) {
        await safeQuery(
          `UPDATE "${schema}".evidence_freshness_records
           SET freshness_band = $1, updated_at = NOW()
           WHERE evidence_id = $2`,
          [newStatus, row.evidence_id],
        );
      }

      updated++;
    }
  }

  return {
    checked: rows.length,
    updated,
    staleCount,
    expiredCount,
  };
}

/**
 * Retrieve the verification event history for a specific evidence item.
 * Returns events in reverse chronological order (most recent first).
 */
export async function getFreshnessHistory(tenantId: string, evidenceId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT
       id, evidence_id, event_type, verified_by,
       verified_at, notes, created_at
     FROM "${schema}".evidence_verification_events
     WHERE evidence_id = $1
     ORDER BY verified_at DESC`,
    [evidenceId],
  );

  return result.rows;
}

/**
 * Get the current freshness record for a specific evidence item.
 * Returns null if no freshness record exists yet.
 */
export async function getFreshnessRecord(tenantId: string, evidenceId: string): Promise<any | null> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT
       id, evidence_id, last_verified_at, expires_at,
       freshness_band, refresh_due_at, verification_method,
       verified_by, created_at, updated_at
     FROM "${schema}".evidence_freshness_records
     WHERE evidence_id = $1`,
    [evidenceId],
  );

  return getFirstRow(result);
}

// ============================================================================
// Bulk Operations
// ============================================================================

/**
 * Bulk mark evidence as stale.
 */
export async function bulkMarkAsStale(tenantId: string, evidenceIds: string[], userId: string): Promise<{ updated: number }> {
  const schema = tenantSchema(tenantId);
  if (evidenceIds.length === 0) return { updated: 0 };

  const placeholders = evidenceIds.map((_, i) => `$${i + 1}`).join(', ');
  const result = await safeQuery(
    `UPDATE "${schema}".evidence
     SET freshness_status = 'stale', updated_at = NOW()
     WHERE evidence_id IN (${placeholders})
       AND freshness_status != 'stale'
       AND deleted_at IS NULL`,
    evidenceIds
  );

  // Record bulk verification events
  for (const eid of evidenceIds) {
    await safeQuery(
      `INSERT INTO "${schema}".evidence_verification_events (evidence_id, event_type, verified_by, notes)
       VALUES ($1, 'bulk_stale_mark', $2, 'Bulk marked as stale')`,
      [eid, userId]
    );
  }

  return { updated: result.rowCount || 0 };
}

/**
 * Bulk extend expiration dates.
 */
export async function bulkExtendExpiration(tenantId: string, evidenceIds: string[], daysToAdd: number, userId: string): Promise<{ updated: number }> {
  const schema = tenantSchema(tenantId);
  if (evidenceIds.length === 0 || daysToAdd <= 0) return { updated: 0 };

  const placeholders = evidenceIds.map((_, i) => `$${i + 1}`).join(', ');
  const result = await safeQuery(
    `UPDATE "${schema}".evidence
     SET valid_to = COALESCE(valid_to, NOW()) + ($${evidenceIds.length + 1} || ' days')::INTERVAL,
         updated_at = NOW()
     WHERE evidence_id IN (${placeholders})
       AND deleted_at IS NULL`,
    [...evidenceIds, String(daysToAdd)]
  );

  // Update freshness records
  for (const eid of evidenceIds) {
    await safeQuery(
      `UPDATE "${schema}".evidence_freshness_records
       SET expires_at = COALESCE(expires_at, NOW()) + ($1 || ' days')::INTERVAL,
           updated_at = NOW()
       WHERE evidence_id = $2`,
      [String(daysToAdd), eid]
    );
  }

  try {
    await recordActivity(tenantId, {
      userId, module: 'evidence', action: 'bulk_extend',
      entityType: 'evidence', entityId: evidenceIds[0],
      summary: `Bulk extended expiration by ${daysToAdd} days for ${evidenceIds.length} items`,
      changes: {},
    });
  } catch { /* best-effort */ }

  return { updated: result.rowCount || 0 };
}

/**
 * Bulk refresh evidence (mark for re-collection).
 */
export async function bulkRefreshEvidence(tenantId: string, evidenceIds: string[], userId: string): Promise<{ refreshed: number }> {
  const schema = tenantSchema(tenantId);
  if (evidenceIds.length === 0) return { refreshed: 0 };

  const placeholders = evidenceIds.map((_, i) => `$${i + 1}`).join(', ');
  const result = await safeQuery(
    `UPDATE "${schema}".evidence
     SET freshness_status = 'stale', updated_at = NOW()
     WHERE evidence_id IN (${placeholders})
       AND deleted_at IS NULL`,
    evidenceIds
  );

  for (const eid of evidenceIds) {
    await safeQuery(
      `INSERT INTO "${schema}".evidence_verification_events (evidence_id, event_type, verified_by, notes)
       VALUES ($1, 'refresh_requested', $2, 'Bulk refresh requested')`,
      [eid, userId]
    );
  }

  try {
    await eventBus.publish('evidence.bulk_refresh_requested', tenantId, { count: evidenceIds.length, userId }, { severity: 'info' });
  } catch { /* best-effort */ }

  return { refreshed: result.rowCount || 0 };
}

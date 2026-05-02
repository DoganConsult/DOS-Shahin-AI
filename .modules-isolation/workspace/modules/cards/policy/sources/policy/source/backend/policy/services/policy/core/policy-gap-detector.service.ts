// ============================================================================
// Policy Gap Detector Service
//
// Automated detection of policy governance gaps:
//   - no_controls: policy has no linked controls
//   - no_risks: policy has no linked risks
//   - low_ack: acknowledgment rate below thresholds
//   - stale_evidence: policy not updated in 6+ months
//   - no_owner: policy has no assigned owner
//
// Gaps are upserted into policy_gaps and auto-resolved when fixed.
// Events emitted for new/changed gaps to drive notifications and dashboards.
// ============================================================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { eventBus } from '../../../ports/events.port';
import { v4 as uuid } from 'uuid';

// ── Types ──────────────────────────────────────────────────────────────────

export type GapType = 'no_controls' | 'no_risks' | 'low_ack' | 'stale_evidence' | 'no_owner';

export type GapSeverity = 'red' | 'yellow' | 'green';

export interface PolicyGap {
  gapId: string;
  policyId: string;
  policyTitle: string;
  gapType: GapType;
  severity: GapSeverity;
  description: string;
  detectedAt: string;
  resolvedAt: string | null;
}

export interface GapDetectionResult {
  totalPolicies: number;
  gapsDetected: number;
  gapsResolved: number;
}

export interface GapSummary {
  bySeverity: Record<GapSeverity, number>;
  byType: Record<string, number>;
  unresolvedGaps: PolicyGap[];
}

// ── Gap Detection ──────────────────────────────────────────────────────────

/**
 * Detect governance gaps across all active policies for a tenant.
 * For each policy, checks five dimensions and upserts findings into policy_gaps.
 * Previously-detected gaps that are now resolved are marked with resolved_at.
 * Emits `policy.gap_detected` events for new or changed gaps.
 *
 * @param tenantId - Tenant identifier
 * @returns Summary with total policies scanned, gaps detected, and gaps resolved
 */
export async function detectPolicyGaps(tenantId: string): Promise<GapDetectionResult> {
  const schema = tenantSchema(tenantId);

  // Get all active (non-deleted, non-retired) policies
  const policiesResult = await safeQuery(
    `SELECT p.policy_id, p.title, p.owner, p.updated_at, p.status
     FROM "${schema}".policies p
     WHERE p.deleted_at IS NULL
       AND p.status NOT IN ('retired', 'archived')`,
  );

  const policies = policiesResult.rows;
  let gapsDetected = 0;
  let gapsResolved = 0;

  for (const policy of policies) {
    const policyId = policy.policy_id as string;
    const policyTitle = (policy.title ?? 'Untitled') as string;
    const detectedGapTypes = new Set<GapType>();

    // ── Check 1: no_controls ──────────────────────────────────────────────
    const controlsResult = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".policy_control_links WHERE policy_id = $1`,
      [policyId],
    );
    const controlCount = (getFirstRow(controlsResult)?.cnt ?? 0) as number;
    if (controlCount === 0) {
      const upserted = await upsertGap(schema, policyId, 'no_controls', 'red',
        `Policy "${policyTitle}" has no linked controls.`);
      if (upserted) {
        emitGapEvent(tenantId, policyId, 'no_controls', 'red');
        gapsDetected++;
      }
      detectedGapTypes.add('no_controls');
    }

    // ── Check 2: no_risks ─────────────────────────────────────────────────
    const risksResult = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".policy_risk_links WHERE policy_id = $1`,
      [policyId],
    );
    const riskCount = (getFirstRow(risksResult)?.cnt ?? 0) as number;
    if (riskCount === 0) {
      const upserted = await upsertGap(schema, policyId, 'no_risks', 'yellow',
        `Policy "${policyTitle}" has no linked risks.`);
      if (upserted) {
        emitGapEvent(tenantId, policyId, 'no_risks', 'yellow');
        gapsDetected++;
      }
      detectedGapTypes.add('no_risks');
    }

    // ── Check 3: low_ack ──────────────────────────────────────────────────
    const ackResult = await safeQuery(
      `SELECT
         COUNT(ar.record_id)::int AS total_records,
         COUNT(ar.record_id) FILTER (WHERE ar.status = 'attested')::int AS attested_count
       FROM "${schema}".attestation_campaigns ac
       JOIN "${schema}".attestation_records ar ON ar.campaign_id = ac.campaign_id
       WHERE ac.policy_id = $1 AND ac.status = 'active'`,
      [policyId],
    );
    const ackStats = getFirstRow(ackResult) ?? { total_records: 0, attested_count: 0 };
    const totalRecords = ackStats.total_records as number;
    const attestedCount = ackStats.attested_count as number;

    if (totalRecords > 0) {
      const ackRate = (attestedCount / totalRecords) * 100;
      if (ackRate < 50) {
        const upserted = await upsertGap(schema, policyId, 'low_ack', 'red',
          `Policy "${policyTitle}" has a critically low acknowledgment rate of ${ackRate.toFixed(1)}%.`);
        if (upserted) {
          emitGapEvent(tenantId, policyId, 'low_ack', 'red');
          gapsDetected++;
        }
        detectedGapTypes.add('low_ack');
      } else if (ackRate < 80) {
        const upserted = await upsertGap(schema, policyId, 'low_ack', 'yellow',
          `Policy "${policyTitle}" has an acknowledgment rate of ${ackRate.toFixed(1)}%, below the 80% target.`);
        if (upserted) {
          emitGapEvent(tenantId, policyId, 'low_ack', 'yellow');
          gapsDetected++;
        }
        detectedGapTypes.add('low_ack');
      }
      // ack >= 80% is green -- no gap
    }

    // ── Check 4: stale_evidence ───────────────────────────────────────────
    const updatedAt = policy.updated_at ? new Date(policy.updated_at as string) : null;
    if (updatedAt) {
      const monthsSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSinceUpdate > 12) {
        const upserted = await upsertGap(schema, policyId, 'stale_evidence', 'red',
          `Policy "${policyTitle}" has not been updated in over ${Math.floor(monthsSinceUpdate)} months.`);
        if (upserted) {
          emitGapEvent(tenantId, policyId, 'stale_evidence', 'red');
          gapsDetected++;
        }
        detectedGapTypes.add('stale_evidence');
      } else if (monthsSinceUpdate > 6) {
        const upserted = await upsertGap(schema, policyId, 'stale_evidence', 'yellow',
          `Policy "${policyTitle}" has not been updated in ${Math.floor(monthsSinceUpdate)} months.`);
        if (upserted) {
          emitGapEvent(tenantId, policyId, 'stale_evidence', 'yellow');
          gapsDetected++;
        }
        detectedGapTypes.add('stale_evidence');
      }
    }

    // ── Check 5: no_owner ─────────────────────────────────────────────────
    const owner = policy.owner as string | null;
    if (!owner || owner.trim() === '') {
      const upserted = await upsertGap(schema, policyId, 'no_owner', 'red',
        `Policy "${policyTitle}" has no assigned owner.`);
      if (upserted) {
        emitGapEvent(tenantId, policyId, 'no_owner', 'red');
        gapsDetected++;
      }
      detectedGapTypes.add('no_owner');
    }

    // ── Auto-resolve gaps that are no longer present ──────────────────────
    const allGapTypes: GapType[] = ['no_controls', 'no_risks', 'low_ack', 'stale_evidence', 'no_owner'];
    for (const gapType of allGapTypes) {
      if (!detectedGapTypes.has(gapType)) {
        const resolved = await resolveGapIfExists(schema, policyId, gapType);
        if (resolved) gapsResolved++;
      }
    }
  }

  return { totalPolicies: policies.length, gapsDetected, gapsResolved };
}

// ── Gap Summary ────────────────────────────────────────────────────────────

/**
 * Aggregate gap summary for a tenant: counts by severity and type,
 * plus a list of all unresolved gaps with policy titles.
 *
 * @param tenantId - Tenant identifier
 * @returns Aggregated gap summary
 */
export async function getPolicyGapSummary(tenantId: string): Promise<GapSummary> {
  const schema = tenantSchema(tenantId);

  // Count by severity
  const severityResult = await safeQuery(
    `SELECT severity, COUNT(*)::int AS cnt
     FROM "${schema}".policy_gaps
     WHERE resolved_at IS NULL
     GROUP BY severity`,
  );
  const bySeverity: Record<GapSeverity, number> = { red: 0, yellow: 0, green: 0 };
  for (const row of severityResult.rows) {
    bySeverity[row.severity as GapSeverity] = row.cnt as number;
  }

  // Count by type
  const typeResult = await safeQuery(
    `SELECT gap_type, COUNT(*)::int AS cnt
     FROM "${schema}".policy_gaps
     WHERE resolved_at IS NULL
     GROUP BY gap_type`,
  );
  const byType: Record<string, number> = {};
  for (const row of typeResult.rows) {
    byType[row.gap_type as string] = row.cnt as number;
  }

  // Unresolved gaps with policy title
  const unresolvedResult = await safeQuery(
    `SELECT g.gap_id, g.policy_id, g.gap_type, g.severity, g.description,
            g.detected_at, g.resolved_at, p.title AS policy_title
     FROM "${schema}".policy_gaps g
     LEFT JOIN "${schema}".policies p ON p.policy_id = g.policy_id
     WHERE g.resolved_at IS NULL
     ORDER BY
       CASE g.severity WHEN 'red' THEN 1 WHEN 'yellow' THEN 2 ELSE 3 END,
       g.detected_at DESC`,
  );
  const unresolvedGaps: PolicyGap[] = unresolvedResult.rows.map((row: Record<string, unknown>) => ({
    gapId: row.gap_id as string,
    policyId: row.policy_id as string,
    policyTitle: (row.policy_title as string) ?? 'Untitled',
    gapType: row.gap_type as GapType,
    severity: row.severity as GapSeverity,
    description: row.description as string,
    detectedAt: row.detected_at as string,
    resolvedAt: (row.resolved_at as string | null),
  }));

  return { bySeverity, byType, unresolvedGaps };
}

// ── Resolve Gap Manually ───────────────────────────────────────────────────

/**
 * Manually resolve a specific gap by ID.
 *
 * @param tenantId - Tenant identifier
 * @param gapId - Gap UUID to resolve
 */
export async function resolveGap(tenantId: string, gapId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".policy_gaps SET resolved_at = NOW() WHERE gap_id = $1 AND resolved_at IS NULL`,
    [gapId],
  );
}

// ── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Upsert a gap row. Returns true if a new gap was inserted or severity changed
 * (indicating a state change worth emitting an event for).
 */
async function upsertGap(
  schema: string,
  policyId: string,
  gapType: GapType,
  severity: GapSeverity,
  description: string,
): Promise<boolean> {
  // Check if an unresolved gap already exists with same severity
  const existing = await safeQuery(
    `SELECT gap_id, severity FROM "${schema}".policy_gaps
     WHERE policy_id = $1 AND gap_type = $2 AND resolved_at IS NULL`,
    [policyId, gapType],
  );

  if (existing.rows.length > 0) {
    const current = existing.rows[0];
    if (current.severity === severity) {
      // No change -- skip
      return false;
    }
    // Severity changed -- update
    await safeQuery(
      `UPDATE "${schema}".policy_gaps
       SET severity = $3, description = $4, updated_at = NOW()
       WHERE gap_id = $1`,
      [current.gap_id, policyId, severity, description],
    );
    return true;
  }

  // Insert new gap
  await safeQuery(
    `INSERT INTO "${schema}".policy_gaps
       (gap_id, policy_id, gap_type, severity, description, detected_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (policy_id, gap_type) WHERE resolved_at IS NULL
     DO UPDATE SET severity = EXCLUDED.severity, description = EXCLUDED.description, updated_at = NOW()`,
    [uuid(), policyId, gapType, severity, description],
  );
  return true;
}

/**
 * Mark a gap as resolved if it exists and is currently unresolved.
 * Returns true if a gap was actually resolved.
 */
async function resolveGapIfExists(
  schema: string,
  policyId: string,
  gapType: GapType,
): Promise<boolean> {
  const result = await safeQuery(
    `UPDATE "${schema}".policy_gaps
     SET resolved_at = NOW()
     WHERE policy_id = $1 AND gap_type = $2 AND resolved_at IS NULL`,
    [policyId, gapType],
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Emit a gap-detected event via the platform event bus.
 */
function emitGapEvent(tenantId: string, policyId: string, gapType: GapType, severity: GapSeverity): void {
  eventBus.publish(({
      eventType: 'policy.gap_detected',
      tenantId,
      sourceService: 'PolicyGapDetectorService',
      severity: severity === 'red' ? 'warning' : 'info',
      payload: { policyId, gapType, severity },
    } as any));
}

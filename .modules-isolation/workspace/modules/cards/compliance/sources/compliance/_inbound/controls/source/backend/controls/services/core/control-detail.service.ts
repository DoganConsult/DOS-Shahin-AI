// ============================================
// AGRC-OS — Control Detail Service
// Multi-query aggregation for a single control:
// record, owners, mappings, tests, deficiencies,
// effectiveness, evidence, and activity log.
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ControlRecord {
  control_id: string;
  title: string;
  description: string;
  status: string;
  control_type: string;
  owner: string;
  owner_team_id: string | null;
  test_status: string | null;
  last_tested_at: string | null;
  effectiveness_rating: string | null;
  is_sox: boolean;
  frequency: string | null;
  created_at: string;
  updated_at: string;
}

export interface ControlOwner {
  id: string;
  user_id: string;
  ownership_type: string;
  is_primary: boolean;
}

export interface ControlTestRecord {
  test_id: string;
  control_id: string;
  test_result: string;
  tester: string;
  notes: string | null;
  evidence_ref: string | null;
  tested_at: string;
}

export interface EffectivenessScore {
  id: string;
  design_score: number;
  operating_score: number;
  overall_score: number;
}

export interface StatusHistoryEntry {
  id: string;
  previous_status: string;
  new_status: string;
  changed_by: string;
  reason: string | null;
  created_at: string;
}

/** Aggregated detail returned by getControlDetail */
export interface ControlAggregatedDetail {
  control: ControlRecord | null;
  owners: ControlOwner[];
  mappedRiskCount: number;
  mappedObligationCount: number;
  mappedPolicyCount: number;
  testHistory: ControlTestRecord[];
  openDeficiencyCount: number;
  effectivenessScores: EffectivenessScore | null;
  activityLog: StatusHistoryEntry[];
  evidenceSourceCount: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class ControlDetailService {
  /**
   * Returns aggregated detail for a single control.
   * Returns null for the control field if the control_id is not found.
   */
  async getControlDetail(
    tenantId: string,
    controlId: string
  ): Promise<ControlAggregatedDetail> {
    const schema = tenantSchema(tenantId);

    const [
      controlResult,
      ownersResult,
      riskCountResult,
      obligationCountResult,
      policyCountResult,
      testsResult,
      deficiencyCountResult,
      effectivenessResult,
      activityResult,
      evidenceCountResult,
    ] = await Promise.all([
      // Control record
      safeQuery(
        `SELECT control_id, title, description, status, control_type,
                owner, owner_team_id, test_status, last_tested_at,
                effectiveness_rating, is_sox, frequency, created_at, updated_at
           FROM ${schema}.controls
          WHERE control_id = $1 AND deleted_at IS NULL`,
        [controlId]
      ),

      // Owners
      safeQuery(
        `SELECT id, user_id, ownership_type, is_primary
           FROM ${schema}.control_owners
          WHERE control_id = $1
          ORDER BY is_primary DESC, ownership_type`,
        [controlId]
      ),

      // Mapped risk count
      safeQuery(
        `SELECT COUNT(*)::int AS count
           FROM ${schema}.control_risk_links
          WHERE control_id = $1`,
        [controlId]
      ),

      // Mapped obligation count
      safeQuery(
        `SELECT COUNT(*)::int AS count
           FROM ${schema}.control_obligation_mappings
          WHERE control_id = $1`,
        [controlId]
      ),

      // Mapped policy count
      safeQuery(
        `SELECT COUNT(*)::int AS count
           FROM ${schema}.control_policy_links
          WHERE control_id = $1`,
        [controlId]
      ),

      // Test history (last 10)
      safeQuery(
        `SELECT test_id, control_id, test_result, tester, notes,
                evidence_ref, tested_at
           FROM ${schema}.control_tests
          WHERE control_id = $1
          ORDER BY tested_at DESC
          LIMIT 10`,
        [controlId]
      ),

      // Open deficiency count
      safeQuery(
        `SELECT COUNT(*)::int AS count
           FROM ${schema}.control_issues
          WHERE control_id = $1
            AND status NOT IN ('closed', 'resolved')`,
        [controlId]
      ),

      // Latest effectiveness scores
      safeQuery(
        `SELECT id, design_score, operating_score, overall_score
           FROM ${schema}.control_effectiveness_scores
          WHERE control_id = $1
          ORDER BY created_at DESC
          LIMIT 1`,
        [controlId]
      ),

      // Activity log (last 20 status changes)
      safeQuery(
        `SELECT id, previous_status, new_status, changed_by, reason, created_at
           FROM ${schema}.control_status_history
          WHERE control_id = $1
          ORDER BY created_at DESC
          LIMIT 20`,
        [controlId]
      ),

      // Evidence source count
      safeQuery(
        `SELECT COUNT(*)::int AS count
           FROM ${schema}.control_evidence_requirements
          WHERE control_id = $1`,
        [controlId]
      ),
    ]);

    const controlRow = controlResult.rows[0] ?? null;

    return {
      control: controlRow
        ? {
            control_id: controlRow.control_id,
            title: controlRow.title,
            description: controlRow.description,
            status: controlRow.status,
            control_type: controlRow.control_type,
            owner: controlRow.owner,
            owner_team_id: controlRow.owner_team_id,
            test_status: controlRow.test_status,
            last_tested_at: controlRow.last_tested_at,
            effectiveness_rating: controlRow.effectiveness_rating,
            is_sox: controlRow.is_sox,
            frequency: controlRow.frequency,
            created_at: controlRow.created_at,
            updated_at: controlRow.updated_at,
          }
        : null,

      owners: ownersResult.rows.map(( r: Record<string, unknown>) => ({
        id: r.id,
        user_id: r.user_id,
        ownership_type: r.ownership_type,
        is_primary: r.is_primary,
      })),
      mappedRiskCount: riskCountResult.rows[0]?.count ?? 0,
      mappedObligationCount: obligationCountResult.rows[0]?.count ?? 0,
      mappedPolicyCount: policyCountResult.rows[0]?.count ?? 0,

      testHistory: testsResult.rows.map(( r: Record<string, unknown>) => ({
        test_id: r.test_id,
        control_id: r.control_id,
        test_result: r.test_result,
        tester: r.tester,
        notes: r.notes,
        evidence_ref: r.evidence_ref,
        tested_at: r.tested_at,
      })),
      openDeficiencyCount: deficiencyCountResult.rows[0]?.count ?? 0,
      effectivenessScores: effectivenessResult.rows[0]
        ? {
            id: effectivenessResult.rows[0].id,
            design_score: effectivenessResult.rows[0].design_score,
            operating_score: effectivenessResult.rows[0].operating_score,
            overall_score: effectivenessResult.rows[0].overall_score,
          }
        : null,

      activityLog: activityResult.rows.map(( r: Record<string, unknown>) => ({
        id: r.id,
        previous_status: r.previous_status,
        new_status: r.new_status,
        changed_by: r.changed_by,
        reason: r.reason,
        created_at: r.created_at,
      })),
      evidenceSourceCount: evidenceCountResult.rows[0]?.count ?? 0,
    };
  }
}

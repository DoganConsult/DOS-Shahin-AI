// ============================================================================
// Shahin — Governance Baseline Seeders: Health Thresholds & Signal Rules
// Seeds governance health dimension weights/thresholds and automated signal rules.
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';

export async function seedGovernanceHealthThresholds(
  tenantId: string,
): Promise<{ seeded: number }> {
  const schema = tenantSchema(tenantId);

  const existing = await safeQuery(
    `SELECT COUNT(*)::int AS cnt FROM "${schema}".governance_health_thresholds WHERE tenant_id = $1`,
    [tenantId],
  );
  if (getFirstRow(existing)?.cnt > 0) return { seeded: 0 };

  const DIMENSION_WEIGHTS: Record<string, number> = {
    policy_health: 1.5,
    accountability: 1.2,
    committee_effectiveness: 1.0,
    decision_execution: 1.0,
    exception_exposure: 1.3,
    action_timeliness: 1.0,
    mandate_validity: 0.8,
    review_discipline: 0.8,
  };

  const res = await safeQuery(
    `INSERT INTO "${schema}".governance_health_thresholds
       (tenant_id, green_min, yellow_min, dimension_weights)
     VALUES ($1, 80, 60, $2)
     ON CONFLICT DO NOTHING`,
    [tenantId, JSON.stringify(DIMENSION_WEIGHTS)],
  );

  return { seeded: (res.rowCount && res.rowCount > 0) ? 1 : 0 };
}

export async function seedGovernanceSignalRules(
  tenantId: string,
): Promise<{ seeded: number }> {
  const schema = tenantSchema(tenantId);
  let seeded = 0;

  const SIGNAL_RULES = [
    { signal_type: 'policy_overdue_review', threshold_json: { days_overdue: 30 }, description: 'Policy past review date by 30+ days' },
    { signal_type: 'committee_inactive', threshold_json: { days_no_meeting: 90 }, description: 'Committee with no meetings in 90 days' },
    { signal_type: 'control_no_evidence', threshold_json: { days_since_evidence: 90 }, description: 'Control with no evidence collected in 90 days' },
    { signal_type: 'action_item_overdue', threshold_json: { days_overdue: 14 }, description: 'Governance action item overdue by 14+ days' },
    { signal_type: 'mandate_expiring', threshold_json: { days_until_expiry: 60 }, description: 'Mandate expiring within 60 days' },
    { signal_type: 'delegation_expiring', threshold_json: { days_until_expiry: 30 }, description: 'Delegation expiring within 30 days' },
    { signal_type: 'charter_expiring', threshold_json: { days_until_expiry: 60 }, description: 'Committee charter expiring within 60 days' },
    { signal_type: 'exception_expired', threshold_json: { days_past_expiry: 0 }, description: 'Control exception past its valid_to date' },
    { signal_type: 'objective_at_risk', threshold_json: { progress_below: 50, days_to_target_under: 90 }, description: 'Objective under 50% progress with less than 90 days to target' },
    { signal_type: 'sod_conflict', threshold_json: { auto_detect: true }, description: 'Segregation of duties conflict detected in RACI' },
    { signal_type: 'accountability_gap', threshold_json: { auto_detect: true }, description: 'Activity missing an Accountable role in RACI' },
    { signal_type: 'obligation_overdue', threshold_json: { days_overdue: 7 }, description: 'Regulatory obligation past due date' },
    { signal_type: 'health_score_red', threshold_json: { score_below: 60 }, description: 'Governance health dimension score below 60' },
    { signal_type: 'board_pack_stale', threshold_json: { days_before_meeting: 14, status: 'draft' }, description: 'Board pack still in draft within 14 days of meeting' },
    { signal_type: 'responsibility_unassigned', threshold_json: { criticality: ['critical', 'high'] }, description: 'Critical/high responsibility with no team assignment' },
  ];

  for (const rule of SIGNAL_RULES) {
    const res = await safeQuery(
      `INSERT INTO "${schema}".governance_signal_rules
         (tenant_id, signal_type, enabled, threshold_json, severity_mapping_json)
       SELECT $1, $2, TRUE, $3, $4
       WHERE NOT EXISTS (
         SELECT 1 FROM "${schema}".governance_signal_rules
         WHERE signal_type = $2 AND (tenant_id = $1 OR tenant_id IS NULL)
       )`,
      [tenantId, rule.signal_type, JSON.stringify(rule.threshold_json), JSON.stringify({ description: rule.description })],
    );
    if (res.rowCount && res.rowCount > 0) seeded++;
  }

  return { seeded };
}

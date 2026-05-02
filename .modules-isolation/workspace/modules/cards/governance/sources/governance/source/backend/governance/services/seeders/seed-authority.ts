// ============================================================================
// Shahin — Governance Baseline Seeders: Authority Matrix & Authority Levels
// Seeds governance authority matrix rules and authority level definitions.
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { uuid } from './_shared';
import { catchHandler, EC } from '@dos/platform-core/resilience';

/**
 * Seed authority matrix rules for a tenant.
 * Defines who can approve what at which criticality level.
 */
export async function seedAuthorityMatrix(
  tenantId: string,
  _userId?: string,
): Promise<{ seeded: number }> {
  const schema = tenantSchema(tenantId);
  const rules = [
    { decisionType: 'risk_acceptance', minCriticality: 'low', requiredApproverRole: 'risk_manager', escalationTimeoutHours: 48 },
    { decisionType: 'risk_acceptance', minCriticality: 'high', requiredApproverRole: 'owner', escalationTimeoutHours: 24 },
    { decisionType: 'exception_approval', minCriticality: 'low', requiredApproverRole: 'compliance_officer', escalationTimeoutHours: 48 },
    { decisionType: 'exception_approval', minCriticality: 'critical', requiredApproverRole: 'owner', escalationTimeoutHours: 12 },
    { decisionType: 'policy_change', minCriticality: 'medium', requiredApproverRole: 'compliance_officer', escalationTimeoutHours: 48 },
    { decisionType: 'vendor_onboarding', minCriticality: 'high', requiredApproverRole: 'risk_manager', escalationTimeoutHours: 48 },
  ];

  let seeded = 0;
  for (const rule of rules) {
    await safeQuery(
      `INSERT INTO "${schema}".authority_matrix (rule_id, decision_type, min_criticality, required_approver_role, escalation_timeout_hours)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [uuid(), rule.decisionType, rule.minCriticality, rule.requiredApproverRole, rule.escalationTimeoutHours],
    ).catch(catchHandler(EC.EVENT_BUS));
    seeded++;
  }
  return { seeded };
}

/**
 * Seed governance authority levels (role hierarchy tiers).
 */
export async function seedGovernanceAuthorityLevels(
  tenantId: string,
  _userId?: string,
): Promise<{ seeded: number }> {
  const schema = tenantSchema(tenantId);
  const levels = [
    { levelCode: 'view', levelName: 'Viewer', rank: 1 },
    { levelCode: 'contribute', levelName: 'Contributor', rank: 2 },
    { levelCode: 'approve', levelName: 'Approver', rank: 3 },
    { levelCode: 'administer', levelName: 'Administrator', rank: 4 },
    { levelCode: 'govern', levelName: 'Governor', rank: 5 },
  ];

  let seeded = 0;
  for (const lvl of levels) {
    await safeQuery(
      `INSERT INTO "${schema}".governance_authority_levels (level_code, level_name, rank)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [lvl.levelCode, lvl.levelName, lvl.rank],
    ).catch(catchHandler(EC.EVENT_BUS));
    seeded++;
  }
  return { seeded };
}

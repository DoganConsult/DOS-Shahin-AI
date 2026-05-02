// ============================================================================
// Shahin — Governance Baseline Seeders: RACI Assignments
// Seeds team-level RACI assignments for 13 governance process domains.
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';

/** Maps the 13 DOMAIN_SCOPE_MAP entries to team codes for all 4 RACI roles */
const RACI_MATRIX: Array<{
  scopeType: string; scopeId: string;
  responsible: string; accountable: string; consulted: string; informed: string;
}> = [
  { scopeType: 'process', scopeId: 'risk_management',       responsible: 'ERM',         accountable: 'EXEC_STRATEGY', consulted: 'CYBER_GOV',    informed: 'AUDIT' },
  { scopeType: 'process', scopeId: 'compliance_monitoring', responsible: 'CYBER_GOV',    accountable: 'EXEC_STRATEGY', consulted: 'QUALITY',      informed: 'AUDIT' },
  { scopeType: 'process', scopeId: 'audit_assurance',       responsible: 'AUDIT',        accountable: 'EXEC_STRATEGY', consulted: 'CYBER_GOV',    informed: 'ERM' },
  { scopeType: 'process', scopeId: 'vendor_risk_assessment', responsible: 'VENDOR_RISK', accountable: 'ERM',           consulted: 'CYBER_GOV',    informed: 'AUDIT' },
  { scopeType: 'process', scopeId: 'incident_response',     responsible: 'SOC_OPS',      accountable: 'CYBER_GOV',     consulted: 'ERM',          informed: 'EXEC_STRATEGY' },
  { scopeType: 'process', scopeId: 'data_protection',       responsible: 'PRIVACY',      accountable: 'CYBER_GOV',     consulted: 'IAM_GOV',      informed: 'EXEC_STRATEGY' },
  { scopeType: 'process', scopeId: 'bcm_disaster_recovery', responsible: 'BCM_DR',       accountable: 'EXEC_STRATEGY', consulted: 'SOC_OPS',      informed: 'ERM' },
  { scopeType: 'process', scopeId: 'change_management',     responsible: 'SVC_OPS',      accountable: 'CYBER_GOV',     consulted: 'QUALITY',      informed: 'AUDIT' },
  { scopeType: 'process', scopeId: 'governance_oversight',  responsible: 'EXEC_STRATEGY', accountable: 'EXEC_STRATEGY', consulted: 'AUDIT',       informed: 'CYBER_GOV' },
  { scopeType: 'process', scopeId: 'policy_lifecycle',      responsible: 'QUALITY',      accountable: 'CYBER_GOV',     consulted: 'EXEC_STRATEGY', informed: 'AUDIT' },
  { scopeType: 'process', scopeId: 'evidence_management',   responsible: 'AUDIT',        accountable: 'CYBER_GOV',     consulted: 'ERM',          informed: 'QUALITY' },
  { scopeType: 'process', scopeId: 'iam_governance',        responsible: 'IAM_GOV',      accountable: 'CYBER_GOV',     consulted: 'PRIVACY',      informed: 'AUDIT' },
  { scopeType: 'process', scopeId: 'security_operations',   responsible: 'SOC_OPS',      accountable: 'CYBER_GOV',     consulted: 'ERM',          informed: 'EXEC_STRATEGY' },
  { scopeType: 'module',  scopeId: 'asset_management',     responsible: 'SOC_OPS',      accountable: 'CYBER_GOV',     consulted: 'ERM',          informed: 'AUDIT' },
  { scopeType: 'module',  scopeId: 'remediation_tracking', responsible: 'ERM',          accountable: 'CYBER_GOV',     consulted: 'AUDIT',        informed: 'EXEC_STRATEGY' },
  { scopeType: 'module',  scopeId: 'action_management',    responsible: 'ERM',          accountable: 'CYBER_GOV',     consulted: 'QUALITY',      informed: 'AUDIT' },
  { scopeType: 'module',  scopeId: 'exception_management', responsible: 'ERM',          accountable: 'EXEC_STRATEGY', consulted: 'CYBER_GOV',    informed: 'AUDIT' },
  { scopeType: 'module',  scopeId: 'training_management',  responsible: 'QUALITY',      accountable: 'EXEC_STRATEGY', consulted: 'CYBER_GOV',    informed: 'AUDIT' },
  { scopeType: 'module',  scopeId: 'qiyas_assessment',     responsible: 'CYBER_GOV',    accountable: 'EXEC_STRATEGY', consulted: 'ERM',          informed: 'AUDIT' },
  { scopeType: 'module',  scopeId: 'ai_governance',        responsible: 'CYBER_GOV',    accountable: 'EXEC_STRATEGY', consulted: 'ERM',          informed: 'AUDIT' },
  { scopeType: 'module',  scopeId: 'issues_management',    responsible: 'SVC_OPS',      accountable: 'CYBER_GOV',     consulted: 'ERM',          informed: 'EXEC_STRATEGY' },
  { scopeType: 'module',  scopeId: 'portals_management',   responsible: 'IAM_GOV',      accountable: 'CYBER_GOV',     consulted: 'PRIVACY',      informed: 'EXEC_STRATEGY' },
  { scopeType: 'module',  scopeId: 'records_management',   responsible: 'QUALITY',      accountable: 'CYBER_GOV',     consulted: 'PRIVACY',      informed: 'AUDIT' },
  { scopeType: 'module',  scopeId: 'privacy_management',   responsible: 'PRIVACY',      accountable: 'EXEC_STRATEGY', consulted: 'CYBER_GOV',    informed: 'AUDIT' },
  { scopeType: 'module',  scopeId: 'governance_management', responsible: 'EXEC_STRATEGY', accountable: 'EXEC_STRATEGY', consulted: 'CYBER_GOV', informed: 'AUDIT' },
];

export async function seedRACIAssignments(
  tenantId: string,
): Promise<{ seeded: number }> {
  const schema = tenantSchema(tenantId);
  let seeded = 0;

  // Load all active teams into a code->id map
  const teamsRes = await safeQuery(
    `SELECT team_id, team_code FROM "${schema}".teams WHERE active = TRUE`,
  );
  const teamMap = new Map<string, string>();
  for (const t of teamsRes.rows) {
    teamMap.set(t.team_code, t.team_id);
  }

  for (const entry of RACI_MATRIX) {
    const roles: Array<{ code: string; role: string }> = [
      { code: entry.responsible, role: 'responsible' },
      { code: entry.accountable, role: 'accountable' },
      { code: entry.consulted, role: 'consulted' },
      { code: entry.informed, role: 'informed' },
    ];

    for (const r of roles) {
      const teamId = teamMap.get(r.code);
      if (!teamId) continue;

      const res = await safeQuery(
        `INSERT INTO "${schema}".team_raci_assignments
           (scope_type, scope_id, team_id, raci_role, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT DO NOTHING`,
        [entry.scopeType, entry.scopeId, teamId, r.role, `Auto-seeded: ${r.code} is ${r.role} for ${entry.scopeId}`],
      );
      if (res.rowCount && res.rowCount > 0) seeded++;
    }
  }

  return { seeded };
}

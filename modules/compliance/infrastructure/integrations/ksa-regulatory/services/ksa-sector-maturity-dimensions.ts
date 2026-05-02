import { emptyResult, safeQuery } from '../ports/database.port';
import type { MaturityDimension } from './ksa-sector-maturity.types';
import { MATURITY_LABELS, scoreToLevel } from './ksa-sector-maturity.types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

export async function assessGovernanceMaturity(schema: string): Promise<MaturityDimension> {
  const [policyRes, raciRes, orgRes, workflowRes] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, approved: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'approved' OR status = 'active')::int AS approved
       FROM "${schema}".policies`,
      []
    ), { operation: 'query policies' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, complete: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE responsible IS NOT NULL AND accountable IS NOT NULL)::int AS complete
       FROM "${schema}".raci_matrix`,
      []
    ), { operation: 'query policies' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ teams: 0, members: 0 }]), safeQuery(
      `SELECT COUNT(DISTINCT t.team_id)::int AS teams,
              COUNT(DISTINCT tm.user_id)::int AS members
       FROM "${schema}".teams t
       LEFT JOIN "${schema}".team_members tm ON tm.team_id = t.team_id AND tm.status = 'active'
       WHERE t.status = 'active'`,
      []
    ), { operation: 'query raci_matrix' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, active: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'active')::int AS active
       FROM "${schema}".workflows`,
      []
    ), { operation: 'query teams' }),
  ]);

  const policy = policyRes.rows[0] || { total: 0, approved: 0 };
  const raci = raciRes.rows[0] || { total: 0, complete: 0 };
  const org = orgRes.rows[0] || { teams: 0, members: 0 };
  const workflow = workflowRes.rows[0] || { total: 0, active: 0 };

  const indicators = {
    policyCount: Number(policy.total),
    policyApprovalRate: policy.total > 0 ? Math.round((policy.approved / policy.total) * 100) : 0,
    raciCoverage: raci.total > 0 ? Math.round((raci.complete / raci.total) * 100) : 0,
    teamCount: Number(org.teams),
    memberCount: Number(org.members),
    workflowAutomation: workflow.total > 0 ? Math.round((workflow.active / workflow.total) * 100) : 0,
  };

  const score = Math.min(100, Math.round(
    (indicators.policyCount > 0 ? 20 : 0) +
    (indicators.policyApprovalRate * 0.2) +
    (indicators.raciCoverage * 0.2) +
    (indicators.teamCount >= 5 ? 15 : indicators.teamCount * 3) +
    (indicators.memberCount >= 10 ? 10 : indicators.memberCount) +
    (indicators.workflowAutomation * 0.15)
  ));

  const level = scoreToLevel(score);
  return {
    key: 'governance',
    name: 'Governance Maturity',
    nameAr: 'نضج الحوكمة',
    score,
    level,
    levelLabel: MATURITY_LABELS[level],
    indicators,
    maxScore: 100,
  };
}

export async function assessRiskMaturity(schema: string): Promise<MaturityDimension> {
  const [riskRes, treatmentRes, assessmentRes] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, scored: 0, owned: 0, active: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE risk_score IS NOT NULL)::int AS scored,
              COUNT(*) FILTER (WHERE owner IS NOT NULL)::int AS owned,
              COUNT(*) FILTER (WHERE status = 'open' OR status = 'mitigating')::int AS active
       FROM "${schema}".risks`,
      []
    ), { operation: 'query risks' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, addressed: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE treatment_status = 'treated' OR treatment_status = 'accepted')::int AS addressed
       FROM "${schema}".risks
       WHERE treatment_status IS NOT NULL`,
      []
    ), { operation: 'query risks' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ recent_updates: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS recent_updates
       FROM "${schema}".risks
       WHERE updated_at > NOW() - INTERVAL '90 days'`,
      []
    ), { operation: 'query risks' }),
  ]);

  const risk = riskRes.rows[0] || { total: 0, scored: 0, owned: 0, active: 0 };
  const treatment = treatmentRes.rows[0] || { total: 0, addressed: 0 };
  const assessment = assessmentRes.rows[0] || { recent_updates: 0 };

  const indicators = {
    riskCount: Number(risk.total),
    scoredRate: risk.total > 0 ? Math.round((risk.scored / risk.total) * 100) : 0,
    ownershipRate: risk.total > 0 ? Math.round((risk.owned / risk.total) * 100) : 0,
    treatmentRate: treatment.total > 0 ? Math.round((treatment.addressed / treatment.total) * 100) : 0,
    recentAssessments: Number(assessment.recent_updates),
  };

  const score = Math.min(100, Math.round(
    (indicators.riskCount > 0 ? 20 : 0) +
    (indicators.scoredRate * 0.2) +
    (indicators.ownershipRate * 0.2) +
    (indicators.treatmentRate * 0.2) +
    (Math.min(indicators.recentAssessments, 20) * 1)
  ));

  const level = scoreToLevel(score);
  return {
    key: 'risk',
    name: 'Risk Maturity',
    nameAr: 'نضج إدارة المخاطر',
    score,
    level,
    levelLabel: MATURITY_LABELS[level],
    indicators,
    maxScore: 100,
  };
}

export async function assessComplianceMaturity(schema: string): Promise<MaturityDimension> {
  const [controlRes, evidenceRes, fwRes] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, compliant: 0, partial: 0, critical_gaps: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE compliance_status = 'compliant')::int AS compliant,
              COUNT(*) FILTER (WHERE compliance_status = 'partially_compliant')::int AS partial,
              COUNT(*) FILTER (WHERE criticality = 'critical' AND compliance_status <> 'compliant')::int AS critical_gaps
       FROM "${schema}".controls
       WHERE status = 'active'`,
      []
    ), { operation: 'query controls' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, collected: 0, fresh: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'completed' OR status = 'approved')::int AS collected,
              COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '60 days')::int AS fresh
       FROM "${schema}".evidence_tasks`,
      []
    ), { operation: 'query controls' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS total
       FROM "${schema}".frameworks
       WHERE status = 'active'`,
      []
    ), { operation: 'query evidence_tasks' }),
  ]);

  const control = controlRes.rows[0] || { total: 0, compliant: 0, partial: 0, critical_gaps: 0 };
  const evidence = evidenceRes.rows[0] || { total: 0, collected: 0, fresh: 0 };
  const framework = fwRes.rows[0] || { total: 0 };

  const indicators = {
    controlCount: Number(control.total),
    complianceRate: control.total > 0 ? Math.round((control.compliant / control.total) * 100) : 0,
    partialRate: control.total > 0 ? Math.round((control.partial / control.total) * 100) : 0,
    criticalGaps: Number(control.critical_gaps),
    evidenceCoverage: evidence.total > 0 ? Math.round((evidence.collected / evidence.total) * 100) : 0,
    evidenceFreshness: evidence.total > 0 ? Math.round((evidence.fresh / evidence.total) * 100) : 0,
    frameworkCount: Number(framework.total),
  };

  const score = Math.min(100, Math.round(
    (indicators.frameworkCount > 0 ? 10 : 0) +
    (indicators.complianceRate * 0.35) +
    (indicators.partialRate * 0.1) +
    (indicators.evidenceCoverage * 0.2) +
    (indicators.evidenceFreshness * 0.15) +
    (indicators.criticalGaps === 0 ? 10 : Math.max(0, 10 - indicators.criticalGaps))
  ));

  const level = scoreToLevel(score);
  return {
    key: 'compliance',
    name: 'Compliance Maturity',
    nameAr: 'نضج الامتثال',
    score,
    level,
    levelLabel: MATURITY_LABELS[level],
    indicators,
    maxScore: 100,
  };
}

export async function assessTechnologyMaturity(schema: string): Promise<MaturityDimension> {
  const [automationRes, integrationRes, monitorRes] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ active_workflows: 0, active_schedules: 0, report_schedules: 0 }]), safeQuery(
      `SELECT
         (SELECT COUNT(*)::int FROM "${schema}".workflows WHERE status = 'active') AS active_workflows,
         (SELECT COUNT(*)::int FROM "${schema}".evidence_schedules WHERE enabled = true) AS active_schedules,
         (SELECT COUNT(*)::int FROM "${schema}".report_schedules WHERE enabled = true) AS report_schedules`,
      []
    ), { operation: 'query workflows' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS total
       FROM "${schema}".integrations
       WHERE status = 'active'`,
      []
    ), { operation: 'query evidence_schedules' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ dashboards: 0, recent_alerts: 0 }]), safeQuery(
      `SELECT
         (SELECT COUNT(*)::int FROM "${schema}".dashboards WHERE status = 'active') AS dashboards,
         (SELECT COUNT(*)::int FROM "${schema}".notification_queue WHERE created_at > NOW() - INTERVAL '30 days') AS recent_alerts`,
      []
    ), { operation: 'query integrations' }),
  ]);

  const automation = automationRes.rows[0] || { active_workflows: 0, active_schedules: 0, report_schedules: 0 };
  const integration = integrationRes.rows[0] || { total: 0 };
  const monitoring = monitorRes.rows[0] || { dashboards: 0, recent_alerts: 0 };

  const indicators = {
    activeWorkflows: Number(automation.active_workflows),
    activeSchedules: Number(automation.active_schedules),
    reportSchedules: Number(automation.report_schedules),
    integrationCount: Number(integration.total),
    dashboardCount: Number(monitoring.dashboards),
    recentAlerts: Number(monitoring.recent_alerts),
  };

  const automationScore = Math.min(40,
    indicators.activeWorkflows * 4 + indicators.activeSchedules * 2 + indicators.reportSchedules * 3
  );
  const integrationScore = Math.min(25, indicators.integrationCount * 5);
  const monitoringScore = Math.min(35,
    indicators.dashboardCount * 5 + Math.min(indicators.recentAlerts, 10) * 1
  );

  const score = Math.min(100, automationScore + integrationScore + monitoringScore);
  const level = scoreToLevel(score);

  return {
    key: 'technology',
    name: 'Technology Maturity',
    nameAr: 'النضج التقني',
    score,
    level,
    levelLabel: MATURITY_LABELS[level],
    indicators,
    maxScore: 100,
  };
}

export async function assessPeopleMaturity(schema: string): Promise<MaturityDimension> {
  const [roleRes, teamRes, activityRes] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total_users: 0, distinct_roles: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS total_users,
              COUNT(DISTINCT role)::int AS distinct_roles
       FROM "${schema}".user_roles
       WHERE status = 'active'`,
      []
    ), { operation: 'query user_roles' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ teams_with_members: 0, active_members: 0 }]), safeQuery(
      `SELECT COUNT(DISTINCT t.team_id)::int AS teams_with_members,
              COUNT(DISTINCT tm.user_id)::int AS active_members
       FROM "${schema}".teams t
       JOIN "${schema}".team_members tm ON tm.team_id = t.team_id AND tm.status = 'active'
       WHERE t.status = 'active'`,
      []
    ), { operation: 'query user_roles' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ active_assignees: 0 }]), safeQuery(
      `SELECT COUNT(DISTINCT assignee)::int AS active_assignees
       FROM "${schema}".process_tasks
       WHERE status = 'completed' AND updated_at > NOW() - INTERVAL '30 days'`,
      []
    ), { operation: 'query teams' }),
  ]);

  const role = roleRes.rows[0] || { total_users: 0, distinct_roles: 0 };
  const team = teamRes.rows[0] || { teams_with_members: 0, active_members: 0 };
  const activity = activityRes.rows[0] || { active_assignees: 0 };

  const indicators = {
    totalUsers: Number(role.total_users),
    distinctRoles: Number(role.distinct_roles),
    teamsWithMembers: Number(team.teams_with_members),
    activeMembers: Number(team.active_members),
    activeAssignees: Number(activity.active_assignees),
  };

  const roleCoverageScore = Math.min(30,
    indicators.distinctRoles * 5 + (indicators.totalUsers >= 5 ? 10 : indicators.totalUsers * 2)
  );
  const teamScore = Math.min(35,
    indicators.teamsWithMembers * 5 + Math.min(indicators.activeMembers, 10) * 2
  );
  const activityScore = Math.min(35,
    indicators.activeAssignees * 5
  );

  const score = Math.min(100, roleCoverageScore + teamScore + activityScore);
  const level = scoreToLevel(score);

  return {
    key: 'people',
    name: 'People Maturity',
    nameAr: 'نضج الموارد البشرية',
    score,
    level,
    levelLabel: MATURITY_LABELS[level],
    indicators,
    maxScore: 100,
  };
}

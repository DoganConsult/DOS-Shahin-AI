/**
 * Agent Context Builder Service
 *
 * Builds per-domain DB context for each AI agent (A01-A12).
 * Includes shared loaders for org profile, governance context,
 * module operating state checks, and playbook assignments.
 *
 * Split from agent-runner.service.ts for modularity.
 */

import { query, safeQuery } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '../../ports/platform.port';

/** Extract .value from a PromiseSettledResult, returning fallback on rejection */
function settledValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === 'fulfilled' ? result.value : fallback;
}

/** Extract count from a settled query result row */
function settledCount(result: PromiseSettledResult<{ rows: GenericRow[] }>, field = 'n'): number {
  if (result.status !== 'fulfilled') return 0;
  const row = getFirstRow(result.value);
  return Number(row?.[field] ?? 0);
}

// ── Shared org profile loader for all agents ───────────────────────────────

export async function loadAgentOrgContext(tenantId: string): Promise<object> {
  try {
    const result = await safeQuery(
      `SELECT org_type, legal_form, listing_status, org_size, employee_count,
              sector_ids, primary_sector_id, critical_infrastructure,
              data_classification_level, cloud_providers, uses_ai_ml,
              processes_payment_cards, has_ot_scada, has_ciso, has_dpo,
              grc_maturity_level, settings
       FROM tenants WHERE tenant_id = $1`, [tenantId]
    );
    if (result.rows.length === 0) return {};
    const t = getFirstRow(result);
    return {
      orgType: t.org_type, legalForm: t.legal_form, listingStatus: t.listing_status,
      orgSize: t.org_size, employeeCount: t.employee_count,
      sectorIds: t.sector_ids, primarySectorId: t.primary_sector_id,
      criticalInfrastructure: t.critical_infrastructure,
      dataClassification: t.data_classification_level,
      cloudProviders: t.cloud_providers, usesAiMl: t.uses_ai_ml,
      processesPaymentCards: t.processes_payment_cards, hasOtScada: t.has_ot_scada,
      hasCiso: t.has_ciso, hasDpo: t.has_dpo,
      grcMaturity: t.grc_maturity_level,
      riskAppetite: t.settings?.profileResolution?.riskAppetite,
      reportingCadence: t.settings?.profileResolution?.reportingCadence,
      controlFlags: t.settings?.profileResolution?.controlFlags,
      complianceComplexity: t.settings?.profileResolution?.complianceComplexity,
    };
  } catch { return {}; }
}

// ── Governance context loader (Phase D: canonical context engine bridge) ────

export async function loadGovernanceContext(tenantId: string): Promise<Record<string, unknown> | null> {
  try {
    const result = await safeQuery(
      `SELECT business_profile, regulatory_profile, framework_profile,
              module_profile, ownership_profile, persona_profile,
              pain_profile, automation_profile, agent_profile,
              complexity, context_version
       FROM public.tenant_governance_context
       WHERE tenant_id = $1 AND is_active = true LIMIT 1`,
      [tenantId],
    );
    return getFirstRow(result) ?? null;
  } catch { return null; }
}

// ── Module operating state check for agent gating ──────────────────────────

export const AGENT_MODULE_MAP: Record<string, string[]> = {
  A01: ['governance'],
  A02: ['governance'],
  A03: ['compliance', 'frameworks'],
  A04: ['compliance', 'controls'],
  A05: ['evidence'],
  A06: ['compliance', 'remediation'],
  A07: ['risk'],
  A08: ['governance', 'compliance'],
  A09: ['vendor_governance'],
  A10: ['audit'],
  A11: ['governance'],
  A12: ['governance'],
};

export async function isAgentModuleActive(tenantId: string, agentId: string): Promise<{ active: boolean; reason: string }> {
  const requiredModules = AGENT_MODULE_MAP[agentId];
  if (!requiredModules || requiredModules.length === 0) return { active: true, reason: 'no module requirement' };

  try {
    const result = await safeQuery(
      `SELECT module_code, state, trial_expiry_at
       FROM public.module_operating_states
       WHERE tenant_id = $1 AND is_active = true AND module_code = ANY($2)`,
      [tenantId, requiredModules],
    );
    if (result.rows.length === 0) return { active: true, reason: 'no operating state rows — default active' };

    for (const row of result.rows) {
      if (row.state === 'on') return { active: true, reason: `module ${row.module_code} is on` };
      if (row.state === 'trial') {
        if (!row.trial_expiry_at || new Date(row.trial_expiry_at) >= new Date()) {
          return { active: true, reason: `module ${row.module_code} is in trial` };
        }
      }
    }
    return { active: false, reason: `all required modules (${requiredModules.join(',')}) are off` };
  } catch { return { active: true, reason: 'module check failed — default active' }; }
}

// ── Playbook loader for agent context enrichment ───────────────────────────

export async function loadAgentPlaybooks(agentCode: string): Promise<GenericRow[]> {
  try {
    const result = await safeQuery(
      `SELECT trigger_event, playbook_action, description_en, output_entity_type, priority
       FROM public.agent_playbook_assignments
       WHERE agent_code = $1 AND is_active = true ORDER BY priority`,
      [agentCode],
    );
    return result.rows;
  } catch { return []; }
}

// ── Context builders (one per agent domain) ────────────────────────────────

async function buildContextA01(tenantId: string, schema: string): Promise<object> {
  const [orgCtx, frameworks, controls, policies, risks, evidence] = await Promise.allSettled([
    loadAgentOrgContext(tenantId),
    query(`SELECT COUNT(*) AS n FROM "${schema}".frameworks`),
    query(`SELECT COUNT(*) AS n FROM "${schema}".ucf_controls`),
    query(`SELECT COUNT(*) AS n FROM "${schema}".policies`),
    query(`SELECT COUNT(*) AS n FROM "${schema}".risks`),
    query(`SELECT COUNT(*) AS n FROM "${schema}".evidence`),
  ]);
  const profile = settledValue(orgCtx, {}) as Record<string, unknown>;
  return {
    agent: 'A01 — Onboarding & Health Monitor',
    orgProfile: profile,
    profileComplete: Object.keys(profile).length > 5,
    frameworkCount: settledCount(frameworks),
    controlCount: settledCount(controls),
    policyCount: settledCount(policies),
    riskCount: settledCount(risks),
    evidenceCount: settledCount(evidence),
    hasCiso: profile.hasCiso ?? false,
    hasDpo: profile.hasDpo ?? false,
    grcMaturity: profile.grcMaturity ?? 'any',
  };
}

async function buildContextA02(tenantId: string, _schema: string): Promise<object> {
  const [orgCtx, users, overPriv] = await Promise.allSettled([
    loadAgentOrgContext(tenantId),
    query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE last_login_at < NOW() - INTERVAL '90 days') AS inactive FROM users WHERE tenant_id = $1`, [tenantId]),
    query(`SELECT COUNT(*) AS n FROM users WHERE tenant_id = $1 AND role = 'admin'`, [tenantId]),
  ]);
  return {
    agent: 'A02 — Identity Provisioning',
    orgProfile: settledValue(orgCtx, {}),
    totalUsers: settledCount(users, 'total'),
    inactiveUsers: settledCount(users, 'inactive'),
    adminCount: settledCount(overPriv),
  };
}

async function buildContextA03(tenantId: string, schema: string): Promise<object> {
  const [orgCtx, frameworks, unmapped] = await Promise.allSettled([
    loadAgentOrgContext(tenantId),
    query(`SELECT COUNT(*) AS n FROM "${schema}".frameworks`),
    query(`SELECT COUNT(*) AS n FROM "${schema}".ucf_controls WHERE mapped_frameworks IS NULL OR mapped_frameworks = '[]'::jsonb`),
  ]);
  return {
    agent: 'A03 — Framework Mapping',
    orgProfile: settledValue(orgCtx, {}),
    frameworkCount: settledCount(frameworks),
    unmappedControls: settledCount(unmapped),
  };
}

async function buildContextA04(tenantId: string, schema: string): Promise<object> {
  const [orgCtx, noDocs, policies] = await Promise.allSettled([
    loadAgentOrgContext(tenantId),
    query(`SELECT COUNT(*) AS n FROM "${schema}".ucf_controls WHERE implementation_notes IS NULL OR implementation_notes = ''`),
    query(`SELECT COUNT(*) AS n FROM "${schema}".policies WHERE status = 'draft'`),
  ]);
  return {
    agent: 'A04 — Control Authoring',
    orgProfile: settledValue(orgCtx, {}),
    controlsWithoutDocs: settledCount(noDocs),
    draftPolicies: settledCount(policies),
  };
}

async function buildContextA05(tenantId: string, schema: string): Promise<object> {
  const [orgCtx, expired, missing, schedules] = await Promise.allSettled([
    loadAgentOrgContext(tenantId),
    query(`SELECT COUNT(*) AS n FROM "${schema}".evidence WHERE expires_at < NOW() AND status != 'archived'`),
    query(`SELECT COUNT(*) AS n FROM "${schema}".ucf_controls c WHERE NOT EXISTS (SELECT 1 FROM "${schema}".evidence e WHERE e.linked_entity_id = c.id)`),
    query(`SELECT COUNT(*) AS n FROM "${schema}".evidence_schedules WHERE last_reminded_at IS NULL OR last_reminded_at < NOW() - INTERVAL '7 days'`),
  ]);
  return {
    agent: 'A05 — Evidence Collection',
    orgProfile: settledValue(orgCtx, {}),
    expiredEvidence: settledCount(expired),
    controlsWithoutEvidence: settledCount(missing),
    overdueSchedules: settledCount(schedules),
  };
}

async function buildContextA06(tenantId: string, schema: string): Promise<object> {
  const [orgCtx, gaps, overdueTasks, complianceScore, failedControls] = await Promise.allSettled([
    loadAgentOrgContext(tenantId),
    query(`SELECT COUNT(*) AS n FROM "${schema}".compliance_gaps WHERE status = 'open'`),
    query(`SELECT COUNT(*) AS n FROM "${schema}".remediation_tasks WHERE status = 'open' AND due_date < NOW()`),
    query(`SELECT AVG(score) AS avg FROM "${schema}".compliance_assessments WHERE created_at > NOW() - INTERVAL '30 days'`),
    query(`SELECT COUNT(*) AS n FROM "${schema}".ucf_controls WHERE test_status = 'failed'`),
  ]);
  return {
    agent: 'A06 — Gap Remediation & Compliance Watch',
    orgProfile: settledValue(orgCtx, {}),
    openGaps: settledCount(gaps),
    overdueRemediations: settledCount(overdueTasks),
    avgComplianceScore: settledCount(complianceScore, 'avg').toFixed(1),
    failedControls: settledCount(failedControls),
  };
}

async function buildContextA07(tenantId: string, schema: string): Promise<object> {
  const [orgCtx, highRisks, unscored, appetite] = await Promise.allSettled([
    loadAgentOrgContext(tenantId),
    query(`SELECT COUNT(*) AS n, MAX(risk_score) AS max_score FROM "${schema}".risks WHERE risk_score > 15 AND status != 'closed'`),
    query(`SELECT COUNT(*) AS n FROM "${schema}".risks WHERE risk_score IS NULL AND status != 'closed'`),
    query(`SELECT COUNT(*) AS n FROM "${schema}".risks r INNER JOIN "${schema}".risk_appetite a ON r.category = a.category WHERE r.risk_score > a.max_acceptable_score`),
  ]);
  return {
    agent: 'A07 — Risk Register',
    orgProfile: settledValue(orgCtx, {}),
    highRisks: settledCount(highRisks),
    maxRiskScore: settledCount(highRisks, 'max_score'),
    unscoredRisks: settledCount(unscored),
    risksExceedingAppetite: settledCount(appetite),
  };
}

async function buildContextA08(tenantId: string, schema: string): Promise<object> {
  const [orgCtx, expiring, pendingApproval, overdueReview] = await Promise.allSettled([
    loadAgentOrgContext(tenantId),
    query(`SELECT COUNT(*) AS n FROM "${schema}".policies WHERE review_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'`),
    query(`SELECT COUNT(*) AS n FROM "${schema}".policies WHERE status = 'pending_approval'`),
    query(`SELECT COUNT(*) AS n FROM "${schema}".policies WHERE review_date < NOW() AND status = 'published'`),
  ]);
  return {
    agent: 'A08 — Policy Lifecycle',
    orgProfile: settledValue(orgCtx, {}),
    policiesExpiringIn30Days: settledCount(expiring),
    pendingApproval: settledCount(pendingApproval),
    overdueReview: settledCount(overdueReview),
  };
}

async function buildContextA09(tenantId: string, schema: string): Promise<object> {
  const [orgCtx, highRisk, dueAssessment, noAssessment, slaBreach, openFindings, unpropagatedRisks, vendorGaps] = await Promise.allSettled([
    loadAgentOrgContext(tenantId),
    query(`SELECT COUNT(*) AS n FROM "${schema}".vendors WHERE risk_rating IN ('high', 'critical') AND status = 'active'`),
    query(`SELECT COUNT(*) AS n FROM "${schema}".vendors WHERE next_assessment_date < NOW() + INTERVAL '14 days' AND status = 'active'`),
    query(`SELECT COUNT(*) AS n FROM "${schema}".vendors WHERE next_assessment_date IS NULL AND status = 'active'`),
    safeQuery(`SELECT COUNT(*) AS n FROM "${schema}".vendor_sla_measurements WHERE is_breached = true AND period_end > NOW() - INTERVAL '30 days'`),
    safeQuery(`SELECT COUNT(*) AS n FROM "${schema}".vendor_findings WHERE status = 'open'`),
    // Count high/critical vendors without corresponding enterprise risk
    safeQuery(`SELECT COUNT(*) AS n FROM "${schema}".vendors v
       WHERE v.risk_rating IN ('high', 'critical') AND v.status = 'active'
         AND NOT EXISTS (SELECT 1 FROM "${schema}".risks r WHERE r.source_type = 'vendor' AND r.source_id = v.vendor_id AND r.status != 'closed')`),
    // Count vendor compliance gaps not yet propagated
    safeQuery(`SELECT COUNT(*) AS n FROM "${schema}".vendor_findings vf
       WHERE vf.status = 'open'
         AND NOT EXISTS (SELECT 1 FROM "${schema}".findings f WHERE f.source_type = 'vendor_assessment' AND f.source_id = vf.vendor_id)`),
  ]);
  return {
    agent: 'A09 — Third-Party Risk (Cross-Agent Enabled)',
    orgProfile: settledValue(orgCtx, {}),
    highRiskVendors: settledCount(highRisk),
    vendorsDueForAssessment: settledCount(dueAssessment),
    vendorsWithNoAssessmentDate: settledCount(noAssessment),
    // Cross-agent propagation context
    recentSlaBreaches: settledCount(slaBreach),
    openVendorFindings: settledCount(openFindings),
    vendorsNeedingRiskPropagation: settledCount(unpropagatedRisks),
    vendorFindingsNeedingAuditPropagation: settledCount(vendorGaps),
    crossAgentActions: [
      'propagate_vendor_risk — Push vendor risk to enterprise risk register (A09->A07)',
      'propagate_vendor_gap — Create remediation task from vendor compliance gap (A09->A06)',
      'propagate_vendor_evidence — Auto-satisfy control evidence from vendor certs (A09->A05)',
      'propagate_vendor_finding — Create audit finding from vendor assessment (A09->A10)',
    ],
  };
}

async function buildContextA10(tenantId: string, schema: string): Promise<object> {
  const [orgCtx, pendingFindings, openAuditItems, reportsDue] = await Promise.allSettled([
    loadAgentOrgContext(tenantId),
    query(`SELECT COUNT(*) AS n FROM "${schema}".findings WHERE status = 'open'`),
    query(`SELECT COUNT(*) AS n FROM "${schema}".assessment_items WHERE status IN ('in_progress', 'not_started') AND assessment_id IN (SELECT assessment_id FROM "${schema}".compliance_assessments WHERE created_at > NOW() - INTERVAL '90 days')`),
    query(`SELECT COUNT(*) AS n FROM "${schema}".report_schedules WHERE enabled = TRUE AND (last_run_at IS NULL OR last_run_at < NOW() - INTERVAL '7 days')`),
  ]);
  return {
    agent: 'A10 — Audit Reporting',
    orgProfile: settledValue(orgCtx, {}),
    openFindings: settledCount(pendingFindings),
    openAuditItems: settledCount(openAuditItems),
    overdueReportSchedules: settledCount(reportsDue),
  };
}

async function buildContextA11(tenantId: string, schema: string): Promise<object> {
  // Feature flag gate: skip if bcp_proactive_enabled is not set
  try {
    const { isFeatureEnabled } = await import('../../agrc-engine/helpers/feature-flag.helper');
    const enabled = await isFeatureEnabled(schema, 'bcp_proactive_enabled');
    if (!enabled) {
      return { agent: 'A11 — BCP Continuity', skipped: true, reason: 'bcp_proactive_enabled flag not set' };
    }
  } catch { /* if flag table doesn't exist, proceed anyway */ }

  const [orgCtx, stalePlans, overdueExercises, untestedPlans, staleBIAs,
         untestedCrisisComms, unlinkedStrategies, exercisePassRate, maturityScores] = await Promise.allSettled([
    loadAgentOrgContext(tenantId),
    safeQuery(`SELECT COUNT(*) AS n FROM "${schema}".bcp_plans
      WHERE status IN ('approved','active') AND deleted_at IS NULL
        AND (next_review_date IS NOT NULL AND next_review_date < NOW()
             OR (next_review_date IS NULL AND created_at < NOW() - INTERVAL '180 days'))`),
    safeQuery(`SELECT COUNT(*) AS n FROM "${schema}".bcp_plans
      WHERE next_exercise_date IS NOT NULL AND next_exercise_date < NOW()
        AND status IN ('approved','active') AND deleted_at IS NULL`),
    safeQuery(`SELECT COUNT(*) AS n FROM "${schema}".bcp_plans
      WHERE last_exercise_at IS NULL AND status IN ('approved','active') AND deleted_at IS NULL`),
    safeQuery(`SELECT COUNT(*) AS n FROM "${schema}".bia_assessments
      WHERE status = 'approved' AND deleted_at IS NULL
        AND created_at < NOW() - INTERVAL '365 days'`),
    safeQuery(`SELECT COUNT(*) AS n FROM "${schema}".crisis_comm_plans
      WHERE status = 'active' AND deleted_at IS NULL
        AND (last_reviewed_at IS NULL OR last_reviewed_at < NOW() - INTERVAL '365 days')`),
    safeQuery(`SELECT COUNT(*) AS n FROM "${schema}".bcm_recovery_strategies
      WHERE bia_id IS NULL AND deleted_at IS NULL`),
    safeQuery(`SELECT ROUND(AVG(CASE WHEN er.passed = TRUE THEN 100 ELSE 0 END))::int AS rate,
                      COUNT(*)::int AS total
      FROM "${schema}".bcp_exercise_results er
      JOIN "${schema}".bcp_exercises ex ON ex.exercise_id = er.exercise_id
      WHERE ex.status = 'completed' AND ex.deleted_at IS NULL`),
    safeQuery(`SELECT overall_score, assessment_date FROM "${schema}".bcm_maturity_assessments
      WHERE deleted_at IS NULL ORDER BY assessment_date DESC LIMIT 2`),
  ]);

  const maturityRows = (maturityScores.status === 'fulfilled' ? maturityScores.value?.rows : null) || [];
  const maturityRegressed = maturityRows.length >= 2
    ? Number(maturityRows[0].overall_score) < Number(maturityRows[1].overall_score)
    : false;

  return {
    agent: 'A11 — BCP Continuity',
    orgProfile: settledValue(orgCtx, {}),
    stalePlans: settledCount(stalePlans),
    overdueExercises: settledCount(overdueExercises),
    untestedPlans: settledCount(untestedPlans),
    staleBIAs: settledCount(staleBIAs),
    untestedCrisisComms: settledCount(untestedCrisisComms),
    unlinkedStrategies: settledCount(unlinkedStrategies),
    exercisePassRate: settledCount(exercisePassRate, 'rate'),
    totalExercises: settledCount(exercisePassRate, 'total'),
    maturityRegressed,
    latestMaturityScore: maturityRows[0] ? Number(maturityRows[0].overall_score) : null,
  };
}

async function buildContextA12(tenantId: string, schema: string): Promise<object> {
  const [orgCtx, totalPrograms, overdueAssignments, completionRate, gapCount] = await Promise.allSettled([
    loadAgentOrgContext(tenantId),
    safeQuery(`SELECT COUNT(*) AS n FROM "${schema}".training_programs WHERE deleted_at IS NULL`),
    safeQuery(`SELECT COUNT(*) AS n FROM "${schema}".training_assignments WHERE status = 'assigned' AND due_date < NOW() AND deleted_at IS NULL`),
    safeQuery(`SELECT ROUND(AVG(CASE WHEN status = 'completed' THEN 100 ELSE 0 END))::int AS rate FROM "${schema}".training_assignments WHERE deleted_at IS NULL`),
    safeQuery(`SELECT COUNT(DISTINCT user_id) AS n FROM users WHERE tenant_id = $1 AND user_id NOT IN (SELECT DISTINCT user_id FROM "${schema}".training_assignments WHERE status = 'completed')`, [tenantId]),
  ]);
  return {
    agent: 'A12 — Security Awareness & Training',
    orgProfile: settledValue(orgCtx, {}),
    totalPrograms: settledCount(totalPrograms),
    overdueAssignments: settledCount(overdueAssignments),
    completionRate: settledCount(completionRate, 'rate'),
    usersWithoutTraining: settledCount(gapCount),
  };
}

// ── Context builder dispatch map ────────────────────────────────────────────

// ── A13: Policy Review Agent ─────────────────────────────────────────────────

async function buildA13PolicyReviewContext(tenantId: string, schema: string): Promise<Record<string, unknown>> {
  const [orgCtx, overdueReviews, approachingReviews, stalePolicies, ownerlessPolicies, totalPublished] = await Promise.allSettled([
    loadAgentOrgContext(tenantId),
    safeQuery(
      `SELECT COUNT(*) AS n FROM "${schema}".policies
       WHERE status = 'published' AND review_date IS NOT NULL AND review_date < NOW()`,
    ),
    safeQuery(
      `SELECT COUNT(*) AS n FROM "${schema}".policies
       WHERE status = 'published' AND review_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'`,
    ),
    safeQuery(
      `SELECT COUNT(*) AS n FROM "${schema}".policies
       WHERE status = 'published' AND updated_at < NOW() - INTERVAL '12 months'`,
    ),
    safeQuery(
      `SELECT COUNT(*) AS n FROM "${schema}".policies
       WHERE status = 'published' AND (owner IS NULL OR owner = '')`,
    ),
    safeQuery(
      `SELECT COUNT(*) AS n FROM "${schema}".policies WHERE status = 'published'`,
    ),
  ]);
  return {
    agent: 'A13 — Policy Review',
    orgProfile: settledValue(orgCtx, {}),
    overdueReviews: settledCount(overdueReviews),
    approachingReviews: settledCount(approachingReviews),
    stalePolicies: settledCount(stalePolicies),
    ownerlessPolicies: settledCount(ownerlessPolicies),
    totalPublished: settledCount(totalPublished),
  };
}

// ── A14: Policy Gap Filler Agent ─────────────────────────────────────────────

async function buildA14PolicyGapContext(tenantId: string, schema: string): Promise<Record<string, unknown>> {
  const [orgCtx, policiesWithoutControls, policiesWithoutRisks, orphanControls, openGaps] = await Promise.allSettled([
    loadAgentOrgContext(tenantId),
    safeQuery(
      `SELECT COUNT(*) AS n FROM "${schema}".policies p
       WHERE p.status = 'published'
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".policy_control_links pcl WHERE pcl.policy_id = p.id
         )`,
    ),
    safeQuery(
      `SELECT COUNT(*) AS n FROM "${schema}".policies p
       WHERE p.status = 'published'
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".policy_risk_links prl WHERE prl.policy_id = p.id
         )`,
    ),
    safeQuery(
      `SELECT COUNT(*) AS n FROM "${schema}".ucf_controls c
       WHERE NOT EXISTS (
         SELECT 1 FROM "${schema}".policy_control_links pcl WHERE pcl.control_id = c.id
       )`,
    ),
    safeQuery(
      `SELECT COUNT(*) AS n FROM "${schema}".policy_gaps
       WHERE resolved_at IS NULL`,
    ),
  ]);
  return {
    agent: 'A14 — Policy Gap Filler',
    orgProfile: settledValue(orgCtx, {}),
    policiesWithoutControls: settledCount(policiesWithoutControls),
    policiesWithoutRisks: settledCount(policiesWithoutRisks),
    orphanControls: settledCount(orphanControls),
    openGaps: settledCount(openGaps),
  };
}

// ── A15: Policy Attestation Coordinator Agent ────────────────────────────────

async function buildA15PolicyAttestationContext(tenantId: string, schema: string): Promise<Record<string, unknown>> {
  const [orgCtx, activeCampaigns, overdueAttestations, uncoveredPolicies, overallAckRate] = await Promise.allSettled([
    loadAgentOrgContext(tenantId),
    safeQuery(
      `SELECT campaign_id, title, status,
              COUNT(*) FILTER (WHERE ar.status = 'accepted') AS acked,
              COUNT(*) AS total
       FROM "${schema}".attestation_campaigns ac
       LEFT JOIN "${schema}".attestation_records ar ON ar.campaign_id = ac.campaign_id
       WHERE ac.status = 'active'
       GROUP BY ac.campaign_id, ac.title, ac.status`,
    ),
    safeQuery(
      `SELECT COUNT(*) AS n FROM "${schema}".attestation_records
       WHERE status = 'pending' AND due_date < NOW()`,
    ),
    safeQuery(
      `SELECT COUNT(*) AS n FROM "${schema}".policies p
       WHERE p.status = 'published'
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".attestation_campaigns ac WHERE ac.policy_id = p.id
         )`,
    ),
    safeQuery(
      `SELECT CASE WHEN COUNT(*) = 0 THEN 0
              ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'accepted') / COUNT(*))
              END AS rate
       FROM "${schema}".attestation_records`,
    ),
  ]);

  // Format active campaigns as summary objects
  const campaigns = activeCampaigns.status === 'fulfilled'
    ? activeCampaigns.value.rows.map((r: GenericRow) => ({
        campaignId: r.campaign_id,
        title: r.title,
        status: r.status,
        acked: Number(r.acked ?? 0),
        total: Number(r.total ?? 0),
      }))
    : [];

  return {
    agent: 'A15 — Policy Attestation Coordinator',
    orgProfile: settledValue(orgCtx, {}),
    activeCampaigns: campaigns,
    overdueAttestations: settledCount(overdueAttestations),
    uncoveredPolicies: settledCount(uncoveredPolicies),
    overallAckRate: settledCount(overallAckRate, 'rate'),
  };
}

// ── Context builder dispatch map ────────────────────────────────────────────

export const CONTEXT_BUILDERS: Record<string, (tenantId: string, schema: string) => Promise<object>> = {
  A01: buildContextA01,
  A02: buildContextA02,
  A03: buildContextA03,
  A04: buildContextA04,
  A05: buildContextA05,
  A06: buildContextA06,
  A07: buildContextA07,
  A08: buildContextA08,
  A09: buildContextA09,
  A10: buildContextA10,
  A11: buildContextA11,
  A12: buildContextA12,
  A13: buildA13PolicyReviewContext,
  A14: buildA14PolicyGapContext,
  A15: buildA15PolicyAttestationContext,
};

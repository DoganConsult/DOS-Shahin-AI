/**
 * Compliance Workspace — Overview, Audit Readiness, Allowed Actions, Health Check
 *
 * Extracted from compliance-workspace.service.ts for modularity.
 */

import { safeQuery } from '../../../ports/database.port';
import { pct, computeMaturity, ctx, cadenceToDays } from "../../misc/compliance.utils.js";
import type { ComplianceScope } from "../../misc/compliance.utils.js";
import { getComplianceSettings } from "../core/compliance-settings.service";
import { getFirstRow as _getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// ═══════════════════════════════════════════════════════════════════
// 1. OVERVIEW
// ═══════════════════════════════════════════════════════════════════

export async function getComplianceOverview(tenantId: string, options?: {
  light?: boolean;
  includeDomainHealth?: boolean;
  scope?: ComplianceScope;
  userId?: string;
}) {
  const { schema } = ctx(tenantId);
  const settings = await getComplianceSettings(tenantId);
  const wantDomainHealth = options?.includeDomainHealth !== false && (options?.includeDomainHealth === true || settings.overviewIncludeDomainHealth);
  const light = options?.light === true || !wantDomainHealth;
  const scopeMy = options?.scope === "my" && options?.userId;

  const limCtrl = Math.max(1, settings.overviewControlsLimit);
  const limEv = Math.max(1, settings.overviewEvidenceLimit);
  const limFind = Math.max(1, settings.overviewFindingsLimit);
  const limRem = Math.max(1, settings.overviewRemediationLimit);

  const ctrlWhere = scopeMy ? `deleted_at IS NULL AND owner = $1` : `deleted_at IS NULL`;
  const ctrlParams = scopeMy ? [options.userId!, limCtrl] : [limCtrl];
  const ctrlLimitParam = scopeMy ? 2 : 1;

  const findWhere = scopeMy ? `f.deleted_at IS NULL AND f.assigned_to = $1` : `f.deleted_at IS NULL`;
  const findParams = scopeMy ? [options.userId!, limFind] : [limFind];
  const findLimitParam = scopeMy ? 2 : 1;

  const remWhere = scopeMy ? `deleted_at IS NULL AND assigned_to = $1` : `deleted_at IS NULL`;
  const remParams = scopeMy ? [options.userId!, limRem] : [limRem];
  const remLimitParam = scopeMy ? 2 : 1;

  // Parallel queries with DB-driven limits (optionally scoped to current user)
  const [fwRes, ctrlRes, evRes, findRes, remRes, assessRes] = await Promise.all([
    safeQuery(`SELECT framework_id, name, category, total_controls, implemented_controls,
                  completion_percent, status, target_date
           FROM "${schema}".frameworks
           WHERE (removed_by_admin IS NULL OR removed_by_admin = FALSE) AND deleted_at IS NULL
           ORDER BY created_at`),
    safeQuery(
      `SELECT control_id, title, status, test_status, frameworks, mapped_registry_nodes,
                  evidence_ids, owner, last_tested_at
       FROM "${schema}".controls WHERE ${ctrlWhere} ORDER BY created_at DESC LIMIT $${ctrlLimitParam}`,
      ctrlParams
    ),
    safeQuery(`SELECT e.evidence_id, e.control_id, e.title, e.verified, e.expiry_date, e.submitted_at,
              COALESCE(e.quality_tier, 'B') AS quality_tier,
              COALESCE(cer.required_cadence, ctp.frequency, NULL) AS expected_cadence,
              COALESCE(cer.freshness_days, NULL) AS freshness_days
           FROM "${schema}".evidence e
           LEFT JOIN "${schema}".control_evidence_requirements cer
             ON cer.control_id = e.control_id AND cer.deleted_at IS NULL
           LEFT JOIN "${schema}".control_test_procedures ctp
             ON ctp.control_id = e.control_id AND ctp.is_active = true AND ctp.deleted_at IS NULL
           WHERE e.deleted_at IS NULL LIMIT $1`, [limEv]),
    safeQuery(
      `SELECT finding_id, severity, status, source_type, source_id, created_at
       FROM "${schema}".findings f WHERE ${findWhere} LIMIT $${findLimitParam}`,
      findParams
    ),
    safeQuery(
      `SELECT task_id, title, status, priority, due_date, assigned_to, linked_entity_type, linked_entity_id
       FROM "${schema}".remediation_tasks WHERE ${remWhere} LIMIT $${remLimitParam}`,
      remParams
    ),
    safeQuery(`SELECT assessment_id, framework_id, title, status, score, created_at
           FROM "${schema}".assessments WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 20`),
  ]);

  const frameworks = fwRes.rows;
  const controls = ctrlRes.rows;
  const evidence = evRes.rows;
  const findings = findRes.rows;
  const remTasks = remRes.rows;
  const assessments = assessRes.rows;

  const totalControls = controls.length;
  const implemented = controls.filter((c: GenericRow) => c.status === 'implemented').length;
  const overallScore = pct(implemented, totalControls);
  const tested = controls.filter((c: GenericRow) => c.test_status === 'passed').length;
  const pctTested = pct(tested, totalControls);

  // Open gaps = findings with status != 'closed' + 'resolved'
  const openFindings = findings.filter((f: GenericRow) => !['closed', 'resolved'].includes(f.status));
  const criticalGaps = openFindings.filter((f: GenericRow) => f.severity === 'critical').length;

  // Overdue remediation
  const now = new Date();
  const overdueRem = remTasks.filter((t: GenericRow) => t.due_date && new Date(t.due_date) < now && !['completed', 'closed'].includes(t.status));

  // Evidence with controls
  const controlsWithEvidence = controls.filter((c: GenericRow) => (c.evidence_ids || []).length > 0).length;
  const evidenceCoverage = pct(controlsWithEvidence, totalControls);

  // Overall maturity (based on overall score, evidence coverage, and test coverage)
  const { maturityScore: overallMaturityScore, maturityLevel: overallMaturityLevel } = computeMaturity(overallScore, evidenceCoverage, pctTested);

  // Evidence quality by tier (A/B/C) and freshness (% within window: not expired, submitted within expected cadence)
  const tierA = evidence.filter((e: GenericRow) => (e.quality_tier || 'B').toUpperCase() === 'A').length;
  const tierB = evidence.filter((e: GenericRow) => (e.quality_tier || 'B').toUpperCase() === 'B').length;
  const tierC = evidence.filter((e: GenericRow) => (e.quality_tier || 'B').toUpperCase() === 'C').length;
  const evidenceCoverageByTier = { tierA, tierB, tierC, total: evidence.length };

  // Enhanced freshness calculation: compare evidence age vs expected cadence
  const freshCount = evidence.filter((e: GenericRow) => {
    const notExpired = !e.expiry_date || new Date(e.expiry_date) > now;
    if (!e.submitted_at) return false;

    // Determine expected freshness window (days)
    let expectedWindowDays: number;
    if (e.freshness_days && e.freshness_days > 0) {
      // Use explicit freshness_days from control_evidence_requirements if available
      expectedWindowDays = e.freshness_days;
    } else if (e.expected_cadence) {
      // Convert cadence to days
      expectedWindowDays = cadenceToDays(e.expected_cadence);
    } else {
      // Fallback to default 90 days if no cadence specified
      expectedWindowDays = 90;
    }

    const submittedDate = new Date(e.submitted_at);
    const ageDays = Math.floor((now.getTime() - submittedDate.getTime()) / (24 * 60 * 60 * 1000));
    const isFresh = ageDays <= expectedWindowDays;

    return notExpired && isFresh;
  }).length;
  const evidenceFreshnessScore = evidence.length > 0 ? pct(freshCount, evidence.length) : 0;

  // Audit readiness = controls implemented AND with evidence AND tested passed
  const auditReady = controls.filter((c: GenericRow) =>
    c.status === 'implemented' && (c.evidence_ids || []).length > 0 && c.test_status === 'passed'
  ).length;
  const auditReadiness = pct(auditReady, totalControls);

  // Framework posture (with maturity)
  const frameworkSummaries = frameworks.map((f: GenericRow) => {
    const fwControls = controls.filter((c: GenericRow) => (c.frameworks || []).includes(f.framework_id));
    const n = fwControls.length;
    const fwImpl = fwControls.filter((c: GenericRow) => c.status === 'implemented').length;
    const fwWithEv = fwControls.filter((c: GenericRow) => (c.evidence_ids || []).length > 0).length;
    const fwTested = fwControls.filter((c: GenericRow) => c.test_status === 'passed').length;
    const fwEvCov = n > 0 ? pct(fwWithEv, n) : 0;
    const fwGaps = openFindings.filter((fi: GenericRow) => fi.source_id === f.framework_id || fwControls.some((c: GenericRow) => c.control_id === fi.source_id)).length;
    const pctImpl = n > 0 ? pct(fwImpl, n) : 0;
    const pctTested = n > 0 ? pct(fwTested, n) : 0;
    const { maturityScore, maturityLevel } = computeMaturity(pctImpl, fwEvCov, pctTested);
    return {
      frameworkId: f.framework_id,
      frameworkName: f.name,
      category: f.category,
      status: f.status || 'active',
      score: f.completion_percent || pctImpl,
      totalControls: f.total_controls || n,
      implementedControls: f.implemented_controls || fwImpl,
      evidenceCoverage: fwEvCov,
      openGaps: fwGaps,
      targetDate: f.target_date,
      maturityLevel,
      maturityScore,
    };
  });

  // Domain health — single batched path when not light
  const activeIds = frameworks.map((f: GenericRow) => f.framework_id);
  let domainSummaries: Array<Record<string, unknown>> = [];
  if (!light && activeIds.length > 0) {
    const domRes = await safeQuery(
      `SELECT ist.node_id, ist.instrument_id, ist.code, ist.title_en, ist.title_ar, ist.level,
              i.name_en AS fw_name
       FROM instrument_structure ist
       JOIN instruments i ON i.instrument_id = ist.instrument_id
       WHERE ist.instrument_id = ANY($1) AND ist.level = 1
       ORDER BY ist.sort_order`, [activeIds]);
    // One batched query: obligation counts per (instrument_id, domain node_id) via level-4 -> L3 -> L2 -> L1
    const oblCountRes = await safeQuery(
      `SELECT ist_l1.instrument_id, ist_l1.node_id AS domain_node_id,
              COUNT(ist_l4.node_id)::int AS obligations_count
       FROM instrument_structure ist_l4
       JOIN instrument_structure ist_l3 ON ist_l3.node_id = ist_l4.parent_node_id AND ist_l3.instrument_id = ist_l4.instrument_id
       JOIN instrument_structure ist_l2 ON ist_l2.node_id = ist_l3.parent_node_id AND ist_l2.instrument_id = ist_l4.instrument_id
       JOIN instrument_structure ist_l1 ON ist_l1.node_id = ist_l2.parent_node_id AND ist_l1.instrument_id = ist_l4.instrument_id
       WHERE ist_l4.instrument_id = ANY($1) AND ist_l4.level = 4
       GROUP BY ist_l1.instrument_id, ist_l1.node_id`, [activeIds]);
    const oblCountByDomain = new Map<string, number>();
    for (const r of oblCountRes.rows as GenericRow[]) {
      oblCountByDomain.set(`${r.instrument_id}:${r.domain_node_id}`, r.obligations_count || 0);
    }
    // Obligation node_ids per domain (for mapping controls) — one query per domain would be N+1; use same L4->L1 join to get all obl ids per domain
    const oblIdsByDomainRes = await safeQuery(
      `SELECT ist_l1.instrument_id, ist_l1.node_id AS domain_node_id, ist_l4.node_id AS obl_id
       FROM instrument_structure ist_l4
       JOIN instrument_structure ist_l3 ON ist_l3.node_id = ist_l4.parent_node_id AND ist_l3.instrument_id = ist_l4.instrument_id
       JOIN instrument_structure ist_l2 ON ist_l2.node_id = ist_l3.parent_node_id AND ist_l2.instrument_id = ist_l4.instrument_id
       JOIN instrument_structure ist_l1 ON ist_l1.node_id = ist_l2.parent_node_id AND ist_l1.instrument_id = ist_l4.instrument_id
       WHERE ist_l4.instrument_id = ANY($1) AND ist_l4.level = 4`, [activeIds]);
    const oblIdsByDomain = new Map<string, string[]>();
    for (const r of oblIdsByDomainRes.rows as GenericRow[]) {
      const k = `${r.instrument_id}:${r.domain_node_id}`;
      if (!oblIdsByDomain.has(k)) oblIdsByDomain.set(k, []);
      oblIdsByDomain.get(k)!.push(r.obl_id);
    }
    // Batched control counts per domain (full control set, not capped overview list)
    const domainControlRes = await safeQuery(
      `WITH domain_obligations AS (
         SELECT ist_l1.instrument_id, ist_l1.node_id AS domain_node_id, ist_l4.node_id AS obl_id
         FROM instrument_structure ist_l4
         JOIN instrument_structure ist_l3 ON ist_l3.node_id = ist_l4.parent_node_id AND ist_l3.instrument_id = ist_l4.instrument_id
         JOIN instrument_structure ist_l2 ON ist_l2.node_id = ist_l3.parent_node_id AND ist_l2.instrument_id = ist_l4.instrument_id
         JOIN instrument_structure ist_l1 ON ist_l1.node_id = ist_l2.parent_node_id AND ist_l1.instrument_id = ist_l4.instrument_id
         WHERE ist_l4.instrument_id = ANY($1) AND ist_l4.level = 4
       ),
       control_nodes AS (
         SELECT c.control_id, c.status, unnest(c.mapped_registry_nodes) AS node_id
         FROM "${schema}".controls c
         WHERE c.deleted_at IS NULL AND c.mapped_registry_nodes IS NOT NULL AND array_length(c.mapped_registry_nodes, 1) > 0
       )
       SELECT do.instrument_id, do.domain_node_id,
              COUNT(DISTINCT cn.control_id)::int AS controls_mapped,
              COUNT(DISTINCT CASE WHEN cn.status = 'implemented' THEN cn.control_id END)::int AS implemented
       FROM domain_obligations do
       JOIN control_nodes cn ON do.obl_id::text = cn.node_id
       GROUP BY do.instrument_id, do.domain_node_id`,
      [activeIds]
    );
    const domainControlByKey = new Map<string, { controlsMapped: number; implemented: number }>();
    for (const r of domainControlRes.rows as GenericRow[]) {
      domainControlByKey.set(`${r.instrument_id}:${r.domain_node_id}`, {
        controlsMapped: r.controls_mapped || 0,
        implemented: r.implemented || 0,
      });
    }
    for (const d of domRes.rows as GenericRow[]) {
      const key = `${d.instrument_id}:${d.node_id}`;
      const obligationsCount = oblCountByDomain.get(key) ?? (oblIdsByDomain.get(key) || []).length;
      const agg = domainControlByKey.get(key) || { controlsMapped: 0, implemented: 0 };
      const score = pct(agg.implemented, obligationsCount > 0 ? obligationsCount : agg.controlsMapped || 1);
      const { maturityScore, maturityLevel } = computeMaturity(score, score, score);
      domainSummaries.push({
        nodeId: d.node_id,
        code: d.code,
        titleEn: d.title_en,
        titleAr: d.title_ar,
        frameworkId: d.instrument_id,
        frameworkName: d.fw_name,
        obligationsCount,
        controlsMapped: agg.controlsMapped,
        score,
        maturityLevel,
        maturityScore,
      });
    }
    domainSummaries.sort((a: GenericRow, b: GenericRow) => a.score - b.score);
    domainSummaries = domainSummaries.slice(0, 20);
  }

  // Priority issues
  const priorityIssues: Array<Record<string, unknown>> = [];
  // Missing controls (obligations with no mapped control)
  // Overdue remediation
  for (const t of overdueRem.slice(0, 5)) {
    priorityIssues.push({
      type: 'overdue_remediation',
      severity: t.priority || 'medium',
      title: t.title,
      dueDate: t.due_date,
      owner: t.assigned_to,
      entityId: t.task_id,
    });
  }
  // Critical findings
  for (const f of openFindings.filter((fi: GenericRow) => fi.severity === 'critical').slice(0, 5)) {
    priorityIssues.push({
      type: 'critical_finding',
      severity: 'critical',
      title: f.title || `Finding ${f.finding_id?.slice(0, 8)}`,
      entityId: f.finding_id,
    });
  }
  // Stale evidence
  const staleEv = evidence.filter((e: GenericRow) => e.expiry_date && new Date(e.expiry_date) < now);
  for (const e of staleEv.slice(0, 3)) {
    priorityIssues.push({
      type: 'stale_evidence',
      severity: 'medium',
      title: e.title,
      entityId: e.evidence_id,
    });
  }

  // Trends (simple: current month vs previous — use assessments if available)
  const trends = assessments.slice(0, 6).map((a: GenericRow) => ({
    date: a.created_at,
    score: Number(a.score) || 0,
    frameworkId: a.framework_id,
  }));

  return {
    summary: {
      overallScore,
      activeFrameworks: frameworks.length,
      openGaps: openFindings.length,
      criticalGaps,
      obligationsCovered: implemented, // approximation
      controlsMapped: totalControls,
      evidenceCoverage,
      evidenceCoverageByTier,
      evidenceFreshnessScore,
      auditReadiness,
      overdueActions: overdueRem.length,
      maturityLevel: overallMaturityLevel,
      maturityScore: overallMaturityScore,
    },
    frameworks: frameworkSummaries,
    domains: domainSummaries,
    priorityIssues,
    trends,
    recentAssessments: assessments.slice(0, 5).map((a: GenericRow) => ({
      assessmentId: a.assessment_id,
      frameworkId: a.framework_id,
      title: a.title,
      status: a.status || 'draft',
      score: a.score,
      createdAt: a.created_at,
      runBy: a.created_by,
      scope: a.scope,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════════
// 7. AUDIT READINESS
// ═══════════════════════════════════════════════════════════════════

export async function getAuditReadiness(tenantId: string, options?: { scope?: ComplianceScope; userId?: string }) {
  const { schema } = ctx(tenantId);
  const scopeMy = options?.scope === "my" && options?.userId;
  const ctrlWhere = scopeMy ? `deleted_at IS NULL AND owner = $1` : `deleted_at IS NULL`;
  const ctrlParams = scopeMy ? [options!.userId!] : [];

  const [ctrlRes, evRes] = await Promise.all([
    safeQuery(
      `SELECT control_id, title, status, test_status, evidence_ids, frameworks
       FROM "${schema}".controls WHERE ${ctrlWhere}`,
      ctrlParams
    ),
    safeQuery(
      `SELECT e.evidence_id, e.control_id, COALESCE(e.quality_tier, 'B') AS quality_tier,
              e.expiry_date, e.submitted_at,
              COALESCE(cer.required_cadence, ctp.frequency, NULL) AS expected_cadence,
              COALESCE(cer.freshness_days, NULL) AS freshness_days
       FROM "${schema}".evidence e
       LEFT JOIN "${schema}".control_evidence_requirements cer
         ON cer.control_id = e.control_id AND cer.deleted_at IS NULL
       LEFT JOIN "${schema}".control_test_procedures ctp
         ON ctp.control_id = e.control_id AND ctp.is_active = true AND ctp.deleted_at IS NULL
       WHERE e.deleted_at IS NULL`),
  ]);
  const controls = ctrlRes.rows;
  const evidence = evRes.rows as GenericRow[];
  const total = controls.length;
  const implemented = controls.filter((c: GenericRow) => c.status === 'implemented').length;
  const tested = controls.filter((c: GenericRow) => c.test_status === 'passed').length;
  const withEvidence = controls.filter((c: GenericRow) => (c.evidence_ids || []).length > 0).length;
  const fullyReady = controls.filter((c: GenericRow) =>
    c.status === 'implemented' && c.test_status === 'passed' && (c.evidence_ids || []).length > 0
  ).length;

  const tierA = evidence.filter((e: GenericRow) => (e.quality_tier || 'B').toUpperCase() === 'A').length;
  const tierB = evidence.filter((e: GenericRow) => (e.quality_tier || 'B').toUpperCase() === 'B').length;
  const tierC = evidence.filter((e: GenericRow) => (e.quality_tier || 'B').toUpperCase() === 'C').length;
  const evidenceCoverageByTier = { tierA, tierB, tierC, total: evidence.length };

  // Enhanced freshness calculation: compare evidence age vs expected cadence
  const now = new Date();
  const freshCount = evidence.filter((e: GenericRow) => {
    const notExpired = !e.expiry_date || new Date(e.expiry_date) > now;
    if (!e.submitted_at) return false;

    // Determine expected freshness window (days)
    let expectedWindowDays: number;
    if (e.freshness_days && e.freshness_days > 0) {
      // Use explicit freshness_days from control_evidence_requirements if available
      expectedWindowDays = e.freshness_days;
    } else if (e.expected_cadence) {
      // Convert cadence to days
      expectedWindowDays = cadenceToDays(e.expected_cadence);
    } else {
      // Fallback to default 90 days if no cadence specified
      expectedWindowDays = 90;
    }

    const submittedDate = new Date(e.submitted_at);
    const ageDays = Math.floor((now.getTime() - submittedDate.getTime()) / (24 * 60 * 60 * 1000));
    const isFresh = ageDays <= expectedWindowDays;

    return notExpired && isFresh;
  }).length;
  const evidenceFreshnessScore = evidence.length > 0 ? pct(freshCount, evidence.length) : 0;

  return {
    totalControls: total,
    implemented,
    tested,
    withEvidence,
    fullyReady,
    readinessScore: pct(fullyReady, total),
    implementedPct: pct(implemented, total),
    testedPct: pct(tested, total),
    evidencePct: pct(withEvidence, total),
    evidenceCoverageByTier,
    evidenceFreshnessScore,
  };
}

// ═══════════════════════════════════════════════════════════════════
// ALLOWED ACTIONS
// ═══════════════════════════════════════════════════════════════════

export type AllowedActions = {
  canSubmitEvidence: boolean;
  canAttest: boolean;
  canApprove: boolean;
  canStartAssessment: boolean;
  canExport: boolean;
  canManageFrameworks: boolean;
};

export function getAllowedActions(_tenantId: string, _userId: string, role: string): AllowedActions {
  const r = (role || "").toLowerCase();
  const admin = r === "tenantadmin" || r === "compliancemanager";
  const controlOwner = r === "controlowner";
  const evidenceCustodian = r === "evidencecustodian";
  const auditor = r === "auditor";
  const viewer = r === "viewer";
  const riskManager = r === "riskmanager";

  return {
    canSubmitEvidence: admin || controlOwner || evidenceCustodian,
    canAttest: admin || controlOwner,
    canApprove: admin,
    canStartAssessment: admin,
    canExport: admin || auditor || controlOwner || riskManager || viewer,
    canManageFrameworks: admin,
  };
}

// ═══════════════════════════════════════════════════════════════════
// COMPLIANCE HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════

const COMPLIANCE_HEALTH_TIMEOUT_MS = 3000;

/**
 * Health check for compliance module: settings + light overview within timeout.
 * Used by GET /health/compliance for tenant-scoped readiness.
 */
export async function checkComplianceHealth(tenantId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const timeout = (ms: number) =>
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
  try {
    await Promise.race([
      (async () => {
        await getComplianceSettings(tenantId);
        await getComplianceOverview(tenantId, { light: true });
      })(),
      timeout(COMPLIANCE_HEALTH_TIMEOUT_MS),
    ]);
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, reason: err instanceof Error ? err.message : "compliance check failed" };
  }
}

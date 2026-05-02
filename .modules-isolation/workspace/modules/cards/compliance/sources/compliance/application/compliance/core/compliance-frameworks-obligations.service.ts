/**
 * Compliance Workspace — Frameworks, Domains, Obligations
 *
 * Extracted from compliance-workspace.service.ts for modularity.
 */

import { query as _query, safeQuery, tenantSchema } from '../../../ports/database.port';
import { pct, computeMaturity, ctx } from "../../misc/compliance.utils.js";
import { eventBus } from '../../../ports/events.port';
import { getFirstRow } from '@dos/db';
import { toErrorMessage } from '@dos/module-sdk';
import type { GenericRow } from '@dos/types';

// ═══════════════════════════════════════════════════════════════════
// 2. FRAMEWORKS
// ═══════════════════════════════════════════════════════════════════

/** KSA regulator IDs (short and REG-KSA-* form) for preset=ksa filter */
const KSA_REGULATOR_IDS = [
  "NCA", "SAMA", "SDAIA", "PDPL", "CST", "MOH", "CMA", "NDMO", "SFDA",
  "REG-KSA-NCA", "REG-KSA-SAMA", "REG-KSA-SDAIA", "REG-KSA-CST", "REG-KSA-MOH",
  "REG-KSA-CMA", "REG-KSA-NDMO", "REG-KSA-SFDA",
];

export interface FrameworksRegisterOptions {
  regulator?: string;
  preset?: string;
}

export async function getFrameworksRegister(tenantId: string, options?: FrameworksRegisterOptions) {
  const { schema } = ctx(tenantId);
  const regulator = options?.regulator?.trim();
  const preset = (options?.preset || "").toLowerCase();
  const useKsaPreset = preset === "ksa";
  const useRegulatorFilter = !useKsaPreset && regulator;

  let fwSql = `SELECT f.framework_id, f.name, f.description, f.category, f.status,
              f.total_controls, f.implemented_controls, f.completion_percent,
              f.target_date, f.created_at,
              i.name_en, i.name_ar, i.type AS instrument_type, i.version, i.regulator_id,
              i.summary_en, i.summary_ar
       FROM "${schema}".frameworks f
       LEFT JOIN instruments i ON i.instrument_id = f.framework_id
       WHERE (f.removed_by_admin IS NULL OR f.removed_by_admin = FALSE) AND f.deleted_at IS NULL`;
  const fwParams: unknown[] = [];

  if (useKsaPreset) {
    fwSql += ` AND i.regulator_id = ANY($1::text[])`;
    fwParams.push(KSA_REGULATOR_IDS);
  } else if (useRegulatorFilter) {
    fwSql += ` AND (i.regulator_id = $1 OR i.regulator_id = $2)`;
    fwParams.push(regulator, `REG-KSA-${regulator!.toUpperCase()}`);
  }

  fwSql += ` ORDER BY f.created_at`;

  const [fwRes, aggRes] = await Promise.all([
    safeQuery(fwSql, fwParams),
    safeQuery(
      `SELECT fw_id AS framework_id,
              COUNT(*)::int AS controls_mapped,
              COUNT(*) FILTER (WHERE c.status = 'implemented')::int AS implemented,
              COUNT(*) FILTER (WHERE c.evidence_ids IS NOT NULL AND array_length(c.evidence_ids, 1) > 0)::int AS with_evidence,
              COUNT(*) FILTER (WHERE c.test_status = 'passed')::int AS tested
       FROM "${schema}".controls c, unnest(COALESCE(c.frameworks, ARRAY[]::text[])) AS fw_id
       WHERE c.deleted_at IS NULL
       GROUP BY fw_id`),
  ]);

  const aggByFw = new Map<string, { controlsMapped: number; implemented: number; withEvidence: number; tested: number }>();
  for (const r of aggRes.rows as Record<string, unknown>[][]) {

    aggByFw.set(r.framework_id, {

      controlsMapped: r.controls_mapped || 0,

      implemented: r.implemented || 0,

      withEvidence: r.with_evidence || 0,

      tested: r.tested || 0,
    });
  }

  return fwRes.rows.map((f: GenericRow) => {
    const agg = aggByFw.get(f.framework_id) || { controlsMapped: 0, implemented: 0, withEvidence: 0, tested: 0 };
    const n = agg.controlsMapped || 1;
    const evCov = agg.controlsMapped > 0 ? pct(agg.withEvidence, agg.controlsMapped) : 0;
    const pctImpl = pct(agg.implemented, n);
    const pctTested = pct(agg.tested, n);
    const { maturityScore, maturityLevel } = computeMaturity(pctImpl, evCov, pctTested);
    return {
      frameworkId: f.framework_id,
      frameworkCode: f.framework_id,
      frameworkName: f.name || f.name_en || '—',
      nameEn: f.name_en || f.name,
      nameAr: f.name_ar || f.name,
      description: f.description || f.summary_en || '',
      descriptionAr: f.summary_ar || '',
      category: f.category,
      instrumentType: f.instrument_type,
      version: f.version,
      regulatorId: f.regulator_id,
      status: f.status || 'active',
      score: f.completion_percent ?? pctImpl,
      totalControls: f.total_controls ?? agg.controlsMapped,
      implementedControls: f.implemented_controls ?? agg.implemented,
      controlsMapped: agg.controlsMapped,
      evidenceCoverage: evCov,
      targetDate: f.target_date,
      createdAt: f.created_at,
      maturityLevel,
      maturityScore,
    };
  });
}

export async function getFrameworkDetail(tenantId: string, frameworkCode: string) {
  const { schema } = ctx(tenantId);
  // Framework row
  const fwRes = await safeQuery(
    `SELECT f.*, i.name_en, i.name_ar, i.summary_en, i.summary_ar, i.type, i.version,
            i.regulator_id, i.publication_date, i.effective_date, i.sectors, i.mandatory
     FROM "${schema}".frameworks f
     LEFT JOIN instruments i ON i.instrument_id = f.framework_id
     WHERE f.framework_id = $1`, [frameworkCode]);
  if (fwRes.rows.length === 0) return null;
  const fw = getFirstRow(fwRes)!;

  // Domains (level 1)
  const domRes = await safeQuery(
    `SELECT node_id, code, title_en, title_ar, description_en, description_ar, sort_order
     FROM instrument_structure WHERE instrument_id = $1 AND level = 1
     ORDER BY sort_order`, [frameworkCode]);

  // Obligations (level 4)
  const oblRes = await safeQuery(
    `SELECT node_id, parent_node_id, code, title_en, title_ar, priority, evidence_types
     FROM instrument_structure WHERE instrument_id = $1 AND level = 4
     ORDER BY sort_order`, [frameworkCode]);

  // Controls
  const ctrlRes = await safeQuery(
    `SELECT control_id, title, status, test_status, evidence_ids, mapped_registry_nodes
     FROM "${schema}".controls
     WHERE $1 = ANY(frameworks) AND deleted_at IS NULL`, [frameworkCode]);

  // Findings
  const findRes = await safeQuery(
    `SELECT finding_id, severity, status FROM "${schema}".findings
     WHERE source_id = $1 AND deleted_at IS NULL`, [frameworkCode]);

  const controls = ctrlRes.rows;
  const n = controls.length;
  const impl = controls.filter((c: GenericRow) => c.status === 'implemented').length;
  const withEv = controls.filter((c: GenericRow) => (c.evidence_ids || []).length > 0).length;
  const tested = controls.filter((c: GenericRow) => c.test_status === 'passed').length;
  const pctImpl = pct(impl, n || 1);
  const evCov = pct(withEv, n || 1);
  const pctTested = pct(tested, n || 1);
  const { maturityScore, maturityLevel } = computeMaturity(pctImpl, evCov, pctTested);

  return {
    ...fw,
    nameEn: fw.name_en || fw.name,
    nameAr: fw.name_ar || fw.name,
    summaryEn: fw.summary_en || fw.description,
    summaryAr: fw.summary_ar || '',
    score: fw.completion_percent || pctImpl,
    domainsCount: domRes.rows.length,
    obligationsCount: oblRes.rows.length,
    controlsMapped: n,
    implementedControls: impl,
    evidenceCoverage: evCov,
    openGaps: findRes.rows.filter((f: GenericRow) => f.status !== 'closed').length,
    maturityLevel,
    maturityScore,
    domains: domRes.rows,
    obligations: oblRes.rows.slice(0, 50),
    findings: findRes.rows,
  };
}

export async function getFrameworkComparison(tenantId: string) {
  const frameworks = await getFrameworksRegister(tenantId);
  return frameworks.map((f: GenericRow) => ({
    frameworkId: f.frameworkId,
    frameworkName: f.frameworkName,
    score: f.score,
    totalControls: f.totalControls,
    implementedControls: f.implementedControls,
    controlsMapped: f.controlsMapped,
    evidenceCoverage: f.evidenceCoverage,
    maturityLevel: f.maturityLevel,
    maturityScore: f.maturityScore,
  }));
}

export async function updateFramework(tenantId: string, frameworkCode: string, data: {
  status?: string; owner?: string; scope?: string; targetDate?: string;
}) {
  const { schema } = ctx(tenantId);
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (data.status) { sets.push(`status = $${idx}`); params.push(data.status); idx++; }
  if (data.owner) { sets.push(`owner = $${idx}`); params.push(data.owner); idx++; }
  if (data.targetDate) { sets.push(`target_date = $${idx}`); params.push(data.targetDate); idx++; }
  if (sets.length === 0) return null;
  sets.push(`updated_at = NOW()`);
  params.push(frameworkCode);
  const res = await safeQuery(
    `UPDATE "${schema}".frameworks SET ${sets.join(', ')} WHERE framework_id = $${idx} RETURNING *`, params);
  return getFirstRow(res) || null;
}

// ═══════════════════════════════════════════════════════════════════
// 3. DOMAINS
// ═══════════════════════════════════════════════════════════════════

export async function getDomainsRegister(tenantId: string, frameworkId?: string) {
  const { schema } = ctx(tenantId);

  // Get active framework IDs
  let activeIds: string[];
  if (frameworkId) {
    activeIds = [frameworkId];
  } else {
    const fwRes = await safeQuery(
      `SELECT framework_id FROM "${schema}".frameworks
       WHERE (removed_by_admin IS NULL OR removed_by_admin = FALSE) AND deleted_at IS NULL`);
    activeIds = fwRes.rows.map((r: GenericRow) => r.framework_id);
  }
  if (activeIds.length === 0) return [];

  // Level 1 domains
  const domRes = await safeQuery(
    `SELECT ist.node_id, ist.instrument_id, ist.code, ist.title_en, ist.title_ar,
            ist.description_en, ist.description_ar, ist.sort_order,
            i.name_en AS fw_name
     FROM instrument_structure ist
     JOIN instruments i ON i.instrument_id = ist.instrument_id
     WHERE ist.instrument_id = ANY($1) AND ist.level = 1
     ORDER BY ist.instrument_id, ist.sort_order`, [activeIds]);

  // All controls for counting
  const ctrlRes = await safeQuery(
    `SELECT control_id, status, test_status, mapped_registry_nodes, evidence_ids
     FROM "${schema}".controls WHERE deleted_at IS NULL`);
  const controls = ctrlRes.rows;

  // Findings
  const findRes = await safeQuery(
    `SELECT finding_id, severity, status, source_id FROM "${schema}".findings WHERE deleted_at IS NULL AND status != 'closed'`);
  const findings = findRes.rows;

  // Remediation tasks
  const remRes = await safeQuery(
    `SELECT task_id, status, due_date FROM "${schema}".remediation_tasks WHERE deleted_at IS NULL AND status NOT IN ('completed','closed')`);
  const now = new Date();
  const _overdueTaskIds = new Set(remRes.rows.filter((t: GenericRow) => t.due_date && new Date(t.due_date) < now).map((t: GenericRow) => t.task_id));

  const result: unknown[] = [];
  for (const d of domRes.rows) {
    // Get level-4 obligations under this domain
    const oblRes = await safeQuery(
      `SELECT node_id FROM instrument_structure
       WHERE instrument_id = $1 AND level = 4
         AND (parent_node_id = $2 OR parent_node_id IN (
           SELECT node_id FROM instrument_structure WHERE parent_node_id = $2 AND level = 2
         ))`, [d.instrument_id, d.node_id]);
    const oblIds = oblRes.rows.map((o: Record<string, unknown>) => o.node_id);

    const mappedCtrls = controls.filter((c: GenericRow) =>
      (c.mapped_registry_nodes || []).some((n: string) => oblIds.includes(n)));
    const implCtrls = mappedCtrls.filter((c: GenericRow) => c.status === 'implemented').length;
    const evCov = mappedCtrls.length > 0
      ? pct(mappedCtrls.filter((c: GenericRow) => (c.evidence_ids || []).length > 0).length, mappedCtrls.length) : 0;
    const testedCtrls = mappedCtrls.filter((c: GenericRow) => c.test_status === 'passed').length;
    const pctImpl = pct(implCtrls, oblIds.length > 0 ? oblIds.length : 1);
    const pctTested = mappedCtrls.length > 0 ? pct(testedCtrls, mappedCtrls.length) : 0;
    const { maturityScore, maturityLevel } = computeMaturity(pctImpl, evCov, pctTested);

    const domGaps = findings.filter((f: GenericRow) => oblIds.includes(f.source_id)).length;
    const critGaps = findings.filter((f: GenericRow) => oblIds.includes(f.source_id) && f.severity === 'critical').length;

    result.push({
      nodeId: d.node_id,
      code: d.code,
      titleEn: d.title_en,
      titleAr: d.title_ar,
      descriptionEn: d.description_en,
      descriptionAr: d.description_ar,
      frameworkId: d.instrument_id,
      frameworkName: d.fw_name,
      obligationsCount: oblIds.length,
      controlsMapped: mappedCtrls.length,
      score: pctImpl,
      evidenceCoverage: evCov,
      openGaps: domGaps,
      criticalGaps: critGaps,
      overdueActions: 0,
      maturityLevel,
      maturityScore,
    });
  }
  return result;
}

/**
 * Get a lightweight summary for a single domain by nodeId.
 * Returns the same structure as getDomainsRegister but for one domain only.
 * Used for lazy loading when a domain is expanded/clicked.
 */
export async function getDomainSummary(tenantId: string, domainId: string) {
  const { schema } = ctx(tenantId);

  // Get domain info
  const domRes = await safeQuery(
    `SELECT ist.node_id, ist.instrument_id, ist.code, ist.title_en, ist.title_ar,
            ist.description_en, ist.description_ar, ist.sort_order,
            i.name_en AS fw_name
     FROM instrument_structure ist
     JOIN instruments i ON i.instrument_id = ist.instrument_id
     WHERE ist.node_id = $1 AND ist.level = 1`, [domainId]);
  if (domRes.rows.length === 0) return null;
  const d = getFirstRow(domRes)!;

  // Get level-4 obligations under this domain
  const oblRes = await safeQuery(
    `SELECT node_id FROM instrument_structure
     WHERE instrument_id = $1 AND level = 4
       AND (parent_node_id = $2 OR parent_node_id IN (
         SELECT node_id FROM instrument_structure WHERE parent_node_id = $2 AND level = 2
       ))`, [d.instrument_id, d.node_id]);
  const oblIds = oblRes.rows.map((o: Record<string, unknown>) => o.node_id);

  // All controls for counting
  const ctrlRes = await safeQuery(
    `SELECT control_id, status, test_status, mapped_registry_nodes, evidence_ids
     FROM "${schema}".controls WHERE deleted_at IS NULL`);
  const controls = ctrlRes.rows;

  // Findings
  const findRes = await safeQuery(
    `SELECT finding_id, severity, status, source_id FROM "${schema}".findings WHERE deleted_at IS NULL AND status != 'closed'`);
  const findings = findRes.rows;

  const mappedCtrls = controls.filter((c: GenericRow) =>
    (c.mapped_registry_nodes || []).some((n: string) => oblIds.includes(n)));
  const implCtrls = mappedCtrls.filter((c: GenericRow) => c.status === 'implemented').length;
  const evCov = mappedCtrls.length > 0
    ? pct(mappedCtrls.filter((c: GenericRow) => (c.evidence_ids || []).length > 0).length, mappedCtrls.length) : 0;
  const testedCtrls = mappedCtrls.filter((c: GenericRow) => c.test_status === 'passed').length;
  const pctImpl = pct(implCtrls, oblIds.length > 0 ? oblIds.length : 1);
  const pctTested = mappedCtrls.length > 0 ? pct(testedCtrls, mappedCtrls.length) : 0;
  const { maturityScore, maturityLevel } = computeMaturity(pctImpl, evCov, pctTested);

  const domGaps = findings.filter((f: GenericRow) => oblIds.includes(f.source_id)).length;
  const critGaps = findings.filter((f: GenericRow) => oblIds.includes(f.source_id) && f.severity === 'critical').length;

  return {
    nodeId: d.node_id,
    code: d.code,
    titleEn: d.title_en,
    titleAr: d.title_ar,
    descriptionEn: d.description_en,
    descriptionAr: d.description_ar,
    frameworkId: d.instrument_id,
    frameworkName: d.fw_name,
    obligationsCount: oblIds.length,
    controlsMapped: mappedCtrls.length,
    score: pctImpl,
    evidenceCoverage: evCov,
    openGaps: domGaps,
    criticalGaps: critGaps,
    overdueActions: 0,
    maturityLevel,
    maturityScore,
  };
}

export async function getDomainDetail(tenantId: string, nodeId: string) {
  const { schema } = ctx(tenantId);

  // Domain info
  const domRes = await safeQuery(
    `SELECT ist.*, i.name_en AS fw_name, i.name_ar AS fw_name_ar
     FROM instrument_structure ist
     JOIN instruments i ON i.instrument_id = ist.instrument_id
     WHERE ist.node_id = $1`, [nodeId]);
  if (domRes.rows.length === 0) return null;
  const domain = getFirstRow(domRes)!;

  // Subdomains (level 2)
  const subRes = await safeQuery(
    `SELECT node_id, code, title_en, title_ar FROM instrument_structure
     WHERE parent_node_id = $1 AND level = 2 ORDER BY sort_order`, [nodeId]);

  // Obligations (level 4) under this domain
  const subIds = [nodeId, ...subRes.rows.map((s: GenericRow) => s.node_id)];
  const oblRes = await safeQuery(
    `SELECT node_id, parent_node_id, code, title_en, title_ar, priority, evidence_types, description_en, description_ar
     FROM instrument_structure
     WHERE instrument_id = $1 AND level = 4 AND parent_node_id = ANY($2)
     ORDER BY sort_order`, [domain.instrument_id, subIds]);

  const oblIds = oblRes.rows.map((o: Record<string, unknown>) => o.node_id);

  // Controls mapped to these obligations
  const ctrlRes = await safeQuery(
    `SELECT control_id, title, status, test_status, evidence_ids, mapped_registry_nodes, owner
     FROM "${schema}".controls WHERE deleted_at IS NULL`);
  const mappedCtrls = ctrlRes.rows.filter((c: GenericRow) =>
    (c.mapped_registry_nodes || []).some((n: string) => oblIds.includes(n)));

  // Evidence for these controls
  const ctrlIds = mappedCtrls.map((c: GenericRow) => c.control_id);
  let evidenceRows: unknown[] = [];
  if (ctrlIds.length > 0) {
    const evRes = await safeQuery(
      `SELECT evidence_id, control_id, title, verified, expiry_date
       FROM "${schema}".evidence WHERE control_id = ANY($1) AND deleted_at IS NULL`, [ctrlIds]);
    evidenceRows = evRes.rows;
  }

  // Findings linked to obligations
  const findRes = await safeQuery(
    `SELECT finding_id, title, severity, status, source_id, created_at
     FROM "${schema}".findings WHERE source_id = ANY($1) AND deleted_at IS NULL`, [oblIds]);

  // Remediation
  const remRes = await safeQuery(
    `SELECT task_id, title, status, priority, due_date, assigned_to
     FROM "${schema}".remediation_tasks
     WHERE linked_entity_id = ANY($1) AND deleted_at IS NULL`, [oblIds]);

  const implCount = mappedCtrls.filter((c: GenericRow) => c.status === 'implemented').length;

  return {
    domain: {
      nodeId: domain.node_id,
      code: domain.code,
      titleEn: domain.title_en,
      titleAr: domain.title_ar,
      descriptionEn: domain.description_en,
      descriptionAr: domain.description_ar,
      frameworkId: domain.instrument_id,
      frameworkName: domain.fw_name,
    },
    score: pct(implCount, oblIds.length > 0 ? oblIds.length : 1),
    subdomains: subRes.rows,
    obligations: oblRes.rows.map((o: Record<string, unknown>) => {
      const oCtrl = mappedCtrls.filter((c: GenericRow) => (c.mapped_registry_nodes || []).includes(o.node_id));
      const oImpl = oCtrl.filter((c: GenericRow) => c.status === 'implemented').length;
      return {
        ...o,
        controlsMapped: oCtrl.length,
        controlsImplemented: oImpl,
        covered: oImpl > 0,
      };
    }),
    controls: mappedCtrls,
    evidence: evidenceRows,
    findings: findRes.rows,
    remediationTasks: remRes.rows,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 4. OBLIGATIONS
// ═══════════════════════════════════════════════════════════════════

export async function getObligationsRegister(tenantId: string, frameworkId?: string) {
  const { schema } = ctx(tenantId);

  let activeIds: string[];
  if (frameworkId) {
    activeIds = [frameworkId];
  } else {
    const fwRes = await safeQuery(
      `SELECT framework_id FROM "${schema}".frameworks
       WHERE (removed_by_admin IS NULL OR removed_by_admin = FALSE) AND deleted_at IS NULL`);
    activeIds = fwRes.rows.map((r: GenericRow) => r.framework_id);
  }
  if (activeIds.length === 0) return [];

  // All level-4 obligations for active frameworks
  const oblRes = await safeQuery(
    `SELECT ist.node_id, ist.instrument_id, ist.parent_node_id, ist.code,
            ist.title_en, ist.title_ar, ist.description_en, ist.description_ar,
            ist.priority, ist.evidence_types,
            i.name_en AS fw_name,
            pd.title_en AS domain_name, pd.title_ar AS domain_name_ar
     FROM instrument_structure ist
     JOIN instruments i ON i.instrument_id = ist.instrument_id
     LEFT JOIN instrument_structure pd ON pd.node_id = ist.parent_node_id
     WHERE ist.instrument_id = ANY($1) AND ist.level = 4
     ORDER BY ist.instrument_id, ist.sort_order
     LIMIT 500`, [activeIds]);

  // All controls
  const ctrlRes = await safeQuery(
    `SELECT control_id, status, mapped_registry_nodes, evidence_ids
     FROM "${schema}".controls WHERE deleted_at IS NULL`);
  const controls = ctrlRes.rows;

  return oblRes.rows.map((o: Record<string, unknown>) => {
    const oCtrl = controls.filter((c: GenericRow) => (c.mapped_registry_nodes || []).includes(o.node_id));
    const oImpl = oCtrl.filter((c: GenericRow) => c.status === 'implemented').length;
    const oEvCov = oCtrl.length > 0
      ? pct(oCtrl.filter((c: GenericRow) => (c.evidence_ids || []).length > 0).length, oCtrl.length) : 0;
    let status = 'not_assessed';
    if (oImpl > 0 && oImpl >= oCtrl.length) status = 'covered';
    else if (oImpl > 0) status = 'partially_covered';
    else if (oCtrl.length > 0) status = 'uncovered';

    return {
      nodeId: o.node_id,
      code: o.code,
      titleEn: o.title_en,
      titleAr: o.title_ar,
      descriptionEn: o.description_en,
      descriptionAr: o.description_ar,
      frameworkId: o.instrument_id,
      frameworkName: o.fw_name,
      domainName: o.domain_name,
      domainNameAr: o.domain_name_ar,
      priority: o.priority,
      evidenceTypes: o.evidence_types,
      status,
      controlCoverage: oCtrl.length,
      controlsImplemented: oImpl,
      evidenceCoverage: oEvCov,
    };
  });
}

export async function getObligationDetail(tenantId: string, nodeId: string) {
  const { schema } = ctx(tenantId);

  const oblRes = await safeQuery(
    `SELECT ist.*, i.name_en AS fw_name, i.name_ar AS fw_name_ar,
            pd.title_en AS domain_name, pd.title_ar AS domain_name_ar
     FROM instrument_structure ist
     JOIN instruments i ON i.instrument_id = ist.instrument_id
     LEFT JOIN instrument_structure pd ON pd.node_id = ist.parent_node_id
     WHERE ist.node_id = $1`, [nodeId]);
  if (oblRes.rows.length === 0) return null;
  const obl = getFirstRow(oblRes)!;

  // Controls mapped
  const ctrlRes = await safeQuery(
    `SELECT control_id, title, status, test_status, evidence_ids, owner
     FROM "${schema}".controls
     WHERE $1 = ANY(mapped_registry_nodes) AND deleted_at IS NULL`, [nodeId]);

  // Evidence
  const ctrlIds = ctrlRes.rows.map((c: GenericRow) => c.control_id);
  let evidenceRows: unknown[] = [];
  if (ctrlIds.length > 0) {
    const evRes = await safeQuery(
      `SELECT evidence_id, control_id, title, verified, expiry_date, submitted_at
       FROM "${schema}".evidence WHERE control_id = ANY($1) AND deleted_at IS NULL`, [ctrlIds]);
    evidenceRows = evRes.rows;
  }

  // Findings
  const findRes = await safeQuery(
    `SELECT finding_id, title, severity, status, created_at
     FROM "${schema}".findings WHERE source_id = $1 AND deleted_at IS NULL`, [nodeId]);

  // Remediation tasks
  const remRes = await safeQuery(
    `SELECT task_id, title, status, priority, due_date, assigned_to
     FROM "${schema}".remediation_tasks WHERE linked_entity_id = $1 AND deleted_at IS NULL`, [nodeId]);

  return {
    obligation: {
      nodeId: obl.node_id,
      code: obl.code,
      titleEn: obl.title_en,
      titleAr: obl.title_ar,
      descriptionEn: obl.description_en,
      descriptionAr: obl.description_ar,
      frameworkId: obl.instrument_id,
      frameworkName: obl.fw_name,
      domainName: obl.domain_name,
      domainNameAr: obl.domain_name_ar,
      priority: obl.priority,
      evidenceTypes: obl.evidence_types,
    },
    controls: ctrlRes.rows,
    evidence: evidenceRows,
    findings: findRes.rows,
    remediationTasks: remRes.rows,
  };
}

export async function mapControlToObligation(tenantId: string, nodeId: string, controlId: string) {
  const { schema } = ctx(tenantId);
  const res = await safeQuery(
    `UPDATE "${schema}".controls
     SET mapped_registry_nodes = array_append(
       COALESCE(mapped_registry_nodes, ARRAY[]::text[]),
       $1
     )
     WHERE control_id = $2 AND NOT ($1 = ANY(COALESCE(mapped_registry_nodes, ARRAY[]::text[])))
     RETURNING *`, [nodeId, controlId]);
  return getFirstRow(res) || null;
}

export async function mapEvidenceToObligation(tenantId: string, nodeId: string, evidenceId: string) {
  const { schema } = ctx(tenantId);
  // Find a control mapped to this obligation and add evidence
  const ctrlRes = await safeQuery(
    `SELECT control_id, evidence_ids FROM "${schema}".controls
     WHERE $1 = ANY(mapped_registry_nodes) AND deleted_at IS NULL
     LIMIT 1`, [nodeId]);
  if (ctrlRes.rows.length === 0) return null;
  const ctrl = getFirstRow(ctrlRes)!;
  const evIds = ctrl.evidence_ids || [];
  if (!evIds.includes(evidenceId)) {
    evIds.push(evidenceId);
    await safeQuery(
      `UPDATE "${schema}".controls SET evidence_ids = $1 WHERE control_id = $2`,
      [evIds, ctrl.control_id]);
  }
  eventBus.publish(({ eventType: 'compliance.evidence_linked', tenantId, sourceService: 'ComplianceWorkspaceService', severity: 'info', payload: { nodeId, evidenceId, controlId: ctrl.control_id } } as any));
  return { controlId: ctrl.control_id, evidenceIds: evIds };
}

// ═══════════════════════════════════════════════════════════════════
// 10. UPDATE OBLIGATION
// ═══════════════════════════════════════════════════════════════════

export async function updateObligation(tenantId: string, nodeId: string, data: { owner?: string; status?: string }) {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (data.owner) { sets.push(`owner = $${idx}`); params.push(data.owner); idx++; }
  if (data.status) { sets.push(`status = $${idx}`); params.push(data.status); idx++; }
  if (sets.length === 0) return null;
  params.push(nodeId);
  const res = await safeQuery(
    `UPDATE instrument_structure SET ${sets.join(', ')} WHERE node_id = $${idx} RETURNING *`, params);
  const row = getFirstRow(res) || null;
  if (row) {
    if (data.owner) eventBus.publish(({ eventType: 'compliance.owner_assigned', tenantId, sourceService: 'ComplianceWorkspaceService', severity: 'info', payload: { nodeId, owner: data.owner } } as any));
    if (data.status) eventBus.publish(({ eventType: 'compliance.obligation_updated', tenantId, sourceService: 'ComplianceWorkspaceService', severity: 'info', payload: { nodeId, status: data.status } } as any));
  }
  return row;
}

// ═══════════════════════════════════════════════════════════════════
// BULK IMPORT OBLIGATIONS
// ═══════════════════════════════════════════════════════════════════

export async function importObligations(tenantId: string, obligations: Array<{
  title_en: string;
  title_ar?: string;
  description?: string;
  obligation_type?: string;
  mandate_id?: string;
  owner_id?: string;
  review_date?: string;
}>): Promise<{ imported: number; errors: string[] }> {
  const schema = tenantSchema(tenantId);
  const errors: string[] = [];
  let imported = 0;

  // Phase 1: validate all items
  for (let i = 0; i < obligations.length; i++) {
    const o = obligations[i];
    if (!o.title_en || o.title_en.trim().length === 0) {
      errors.push(`Item ${i + 1}: title_en is required`);
    }
    if (o.obligation_type && !['regulatory', 'contractual', 'internal', 'industry'].includes(o.obligation_type)) {
      errors.push(`Item ${i + 1}: obligation_type must be regulatory, contractual, internal, or industry`);
    }
  }
  if (errors.length > 0) return { imported: 0, errors };

  // Phase 2: insert into governance_obligations (canonical obligation store)
  for (const o of obligations) {
    try {
      await safeQuery(
        `INSERT INTO "${schema}".governance_obligations
         (tenant_id, title_en, title_ar, description, obligation_type, mandate_id, owner_id, review_date, status, created_by)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, 'draft', 'bulk_import')`,
        [
          tenantId, o.title_en, o.title_ar || null, o.description || null,
          o.obligation_type || 'regulatory', o.mandate_id || null,
          o.owner_id || null, o.review_date || null,
        ],
      );
      imported++;
    } catch (err: unknown) {
      errors.push(`Item "${o.title_en}": ${toErrorMessage(err)}`);
    }
  }
  if (imported > 0) {
    eventBus.publish(({ eventType: 'compliance.obligation_created', tenantId, sourceService: 'ComplianceWorkspaceService', severity: 'info', payload: { importedCount: imported, source: 'bulk_import' } } as any));
  }
  return { imported, errors };
}

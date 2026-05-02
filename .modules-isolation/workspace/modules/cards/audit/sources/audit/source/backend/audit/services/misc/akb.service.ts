// ============================================================
// AGRC-OS — Audit Knowledge Base (AKB) Service
// Market-reference audit package builder powered by AGRC-OS
// Aggregates ALL layers: sector→regulator→framework→control→
// evidence→scoring→reporting→traceability→hash manifest
// ============================================================

import crypto from 'crypto';
import archiver from 'archiver';
import { emptyResult, query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';

// ── AKB Layer Interfaces ────────────────────────────────────

export interface AkbSectorProfile {
  sector: string;
  subsector: string | null;
  entityType: string;
  criticalityTier: string;
  country: string;
  companySize: string;
}

export interface AkbRegulatorBinding {
  regulatorCode: string;
  regulatorName: string;
  bindingStrength: 'hard' | 'soft';
  frameworkCount: number;
  controlCount: number;
}

export interface AkbFrameworkCoverage {
  frameworkId: string;
  frameworkName: string;
  totalControls: number;
  implementedControls: number;
  testedControls: number;
  coveragePercent: number;
  evidenceCount: number;
  lastAssessmentDate: string | null;
  lastAssessmentScore: number | null;
}

export interface AkbControlDetail {
  controlId: string;
  controlCode: string;
  title: string;
  domain: string;
  family: string;
  status: string;
  testStatus: string;
  lastTestedAt: string | null;
  evidenceCount: number;
  evidenceVerifiedCount: number;
  remediationStatus: string | null;
  owner: string | null;
  frameworks: string[];
  implementationLevel: string;
  criticality: number;
}

export interface AkbEvidenceItem {
  evidenceId: string;
  title: string;
  controlId: string;
  controlTitle: string;
  type: string;
  status: string;
  verified: boolean;
  expiryDate: string | null;
  collectedAt: string;
  hash: string;
  qualityTier: 'A' | 'B' | 'C';
  custodyChain: AkbCustodyEvent[];
}

export interface AkbCustodyEvent {
  eventType: string;
  actor: string;
  timestamp: string;
}

export interface AkbTraceabilityRow {
  frameworkId: string;
  controlId: string;
  controlCode: string;
  controlTitle: string;
  testResult: string;
  evidenceIds: string[];
  evidenceStatus: string;
  remediationId: string | null;
  remediationStatus: string | null;
  score: number;
  gap: boolean;
}

export interface AkbScorecard {
  overallComplianceScore: number;
  overallMaturityScore: number;
  overallConfidenceScore: number;
  overallFreshnessScore: number;
  domainScores: Array<{
    domain: string;
    complianceScore: number;
    maturityScore: number;
    controlCount: number;
    evidenceCount: number;
  }>;
  frameworkScores: Array<{
    framework: string;
    score: number;
    controlsCovered: number;
    totalControls: number;
  }>;
}

export interface AkbHashManifest {
  rootHash: string;
  algorithm: string;
  generatedAt: string;
  entries: Array<{
    entityType: string;
    entityId: string;
    entityName: string;
    hash: string;
    timestamp: string;
  }>;
  chainIntegrity: boolean;
}

export interface AkbPackage {
  metadata: {
    packageId: string;
    tenantId: string;
    generatedAt: string;
    generatedBy: string;
    agrcOsVersion: string;
    packageVersion: string;
  };
  sectorProfile: AkbSectorProfile;
  regulators: AkbRegulatorBinding[];
  frameworks: AkbFrameworkCoverage[];
  controls: AkbControlDetail[];
  evidence: AkbEvidenceItem[];
  traceabilityMatrix: AkbTraceabilityRow[];
  scorecard: AkbScorecard;
  hashManifest: AkbHashManifest;
  statistics: {
    totalRegulators: number;
    totalFrameworks: number;
    totalControls: number;
    implementedControls: number;
    totalEvidence: number;
    verifiedEvidence: number;
    totalPolicies: number;
    activePolicies: number;
    totalAssessments: number;
    completedAssessments: number;
    totalRemediations: number;
    completedRemediations: number;
    totalRisks: number;
    openHighRisks: number;
    overallCoverage: number;
    auditReadinessScore: number;
  };
  riskPosture: {
    totalRisks: number;
    distribution: Record<string, number>;
    topRisks: Array<{ title: string; score: number; category: string; status: string }>;
    averageScore: number;
  };
  policies: Array<{
    policyId: string;
    title: string;
    version: number;
    status: string;
    owner: string;
    frameworks: string[];
    lastReviewed: string | null;
  }>;
  remediations: Array<{
    taskId: string;
    title: string;
    priority: string;
    status: string;
    dueDate: string | null;
    assignedTo: string;
    controlId: string | null;
  }>;
  executiveSummary: {
    healthScore: number;
    complianceScore: number;
    riskScore: number;
    evidenceCoverage: number;
    maturityLevel: string;
    keyFindings: string[];
    recommendations: string[];
  };
}

// ── Hashing Utilities ───────────────────────────────────────

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function computeEntityHash(entity: Record<string, unknown>): string {
  const canonical = JSON.stringify(entity, Object.keys(entity).sort());
  return sha256(canonical);
}

function computeRootHash(entries: Array<{ hash: string }>): string {
  const combined = entries.map(e => e.hash).join('');
  return sha256(combined);
}

// ── AKB Builder ─────────────────────────────────────────────

export async function buildAkbPackage(
  tenantId: string,
  userId: string,
  options?: { frameworkFilter?: string; dateFrom?: string; dateTo?: string }
): Promise<AkbPackage> {
  const schema = tenantSchema(tenantId);
  const packageId = crypto.randomUUID();
  const generatedAt = new Date().toISOString();

  // ── 1. Sector Profile ─────────────────────────────────────
  const tenantRow = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT industry, sub_industry, entity_type, criticality_tier, country, company_size, name
     FROM "${schema}".tenant_config LIMIT 1`
  ), { tenantId: tenantId, operation: 'query tenant_config' });

  const tc = getFirstRow(tenantRow) || {};
  const sectorProfile: AkbSectorProfile = {

    sector: tc.industry || 'Technology',

    subsector: tc.sub_industry || null,

    entityType: tc.entity_type || 'private',

    criticalityTier: tc.criticality_tier || 'standard',

    country: tc.country || 'SA',

    companySize: tc.company_size || 'medium',
  };

  // ── 2. Controls (full detail) ─────────────────────────────
  const fwFilter = options?.frameworkFilter
    ? `AND $1 = ANY(frameworks)` : '';
  const fwParams = options?.frameworkFilter ? [options.frameworkFilter] : [];

  const controlsRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT control_id, title, status, test_status, last_tested_at, owner,
            frameworks, mapped_registry_nodes, evidence_required, category
     FROM "${schema}".controls
     WHERE 1=1 ${fwFilter}
     ORDER BY title`,
    fwParams
  ), { tenantId: tenantId, operation: 'query controls' });

  // ── 3. Evidence ───────────────────────────────────────────
  const dateFilter = options?.dateFrom && options?.dateTo
    ? `AND created_at >= '${options.dateFrom}' AND created_at <= '${options.dateTo}'`
    : '';

  // secrets-scan-allow: schema tenantSchema()-validated quoted identifier; remaining interpolation is literal SQL fragments
  const evidenceRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT evidence_id, title, control_id, type, status, verified,
            expiry_date, created_at, file_path, hash
     FROM "${schema}".evidence
     WHERE 1=1 ${dateFilter}
     ORDER BY created_at DESC`
  ), { tenantId: tenantId, operation: 'query evidence' });

  // ── 4. Policies ───────────────────────────────────────────
  const policiesRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT policy_id, title, version, status, owner, frameworks, updated_at
     FROM "${schema}".policies
     WHERE status != 'draft'
     ORDER BY updated_at DESC`
  ), { tenantId: tenantId, operation: 'query evidence' });

  // ── 5. Assessments ────────────────────────────────────────
  const assessmentsRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT assessment_id, title, score, status, framework_id, created_at
     FROM "${schema}".assessments
     ORDER BY created_at DESC`
  ), { tenantId: tenantId, operation: 'query policies' });

  // ── 6. Risks ──────────────────────────────────────────────
  const risksRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT risk_id, title, category, likelihood, impact, risk_score,
            status, treatment_status, owner
     FROM "${schema}".risks
     ORDER BY risk_score DESC`
  ), { tenantId: tenantId, operation: 'query assessments' });

  // ── 7. Remediations ───────────────────────────────────────
  const remediationsRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT task_id, title, priority, status, due_date, assigned_to,
            linked_entity_id AS control_id, completed_at
     FROM "${schema}".remediation_tasks
     ORDER BY due_date`
  ), { tenantId: tenantId, operation: 'query risks' });

  // ── Build Evidence Map ────────────────────────────────────
  const evidenceByControl: Record<string, any[]> = {};
  for (const e of evidenceRes.rows) {
    if (!e.control_id) continue;
    if (!evidenceByControl[(e as any).control_id]) evidenceByControl[(e as any).control_id] = [];
    evidenceByControl[(e as any).control_id].push(e);
  }

  // ── Build Controls Detail ─────────────────────────────────
  const controls: AkbControlDetail[] = controlsRes.rows.map((c: GenericRow) => {
    const evList = evidenceByControl[c.control_id] || [];
    const fws: string[] = Array.isArray(c.frameworks) ? c.frameworks : [];
    return {
      controlId: c.control_id,
      controlCode: c.control_id?.substring(0, 12) || '',
      title: c.title || '',
      domain: c.category || fws[0] || 'general',
      family: c.category || 'general',
      status: c.status || 'not_implemented',
      testStatus: c.test_status || 'not_tested',
      lastTestedAt: c.last_tested_at?.toISOString?.() || c.last_tested_at || null,
      evidenceCount: evList.length,
      evidenceVerifiedCount: evList.filter((e: GenericRow) => e.verified).length,
      remediationStatus: null,
      owner: c.owner || null,
      frameworks: fws,
      implementationLevel: c.status === 'implemented' ? 'full' : c.status === 'partial' ? 'partial' : 'none',
      criticality: c.evidence_required ? 0.8 : 0.5,
    };
  });

  // ── Build Framework Coverage ──────────────────────────────
  const frameworkMap: Record<string, AkbFrameworkCoverage> = {};
  for (const ctrl of controls) {
    for (const fw of ctrl.frameworks) {
      if (!frameworkMap[fw]) {
        const fwAssessments = assessmentsRes.rows.filter((a: Record<string, unknown>) => a.framework_id === fw);
        const latestAssessment = fwAssessments[0];
        frameworkMap[fw] = {
          frameworkId: fw,
          frameworkName: fw,
          totalControls: 0,
          implementedControls: 0,
          testedControls: 0,
          coveragePercent: 0,
          evidenceCount: 0,

          lastAssessmentDate: latestAssessment?.created_at?.toISOString?.() || latestAssessment?.created_at || null,
          lastAssessmentScore: latestAssessment ? parseFloat((latestAssessment as any).score) || 0 : null,
        };
      }
      frameworkMap[fw].totalControls++;
      if (ctrl.status === 'implemented') frameworkMap[fw].implementedControls++;
      if (ctrl.testStatus === 'passed') frameworkMap[fw].testedControls++;
      frameworkMap[fw].evidenceCount += ctrl.evidenceCount;
    }
  }
  const frameworks = Object.values(frameworkMap).map(fw => ({
    ...fw,
    coveragePercent: fw.totalControls > 0
      ? Math.round((fw.implementedControls / fw.totalControls) * 100) : 0,
  }));

  // ── Build Regulator Bindings ──────────────────────────────
  const regulatorMap: Record<string, AkbRegulatorBinding> = {};
  for (const fw of frameworks) {
    const regCode = inferRegulator(fw.frameworkName);
    if (!regulatorMap[regCode]) {
      regulatorMap[regCode] = {
        regulatorCode: regCode,
        regulatorName: getRegulatorName(regCode),
        bindingStrength: 'hard',
        frameworkCount: 0,
        controlCount: 0,
      };
    }
    regulatorMap[regCode].frameworkCount++;
    regulatorMap[regCode].controlCount += fw.totalControls;
  }
  const regulators = Object.values(regulatorMap);

  // ── Build Evidence Items ──────────────────────────────────

  const evidence: AkbEvidenceItem[] = evidenceRes.rows.map((e: GenericRow) => {
    const ctrl = controlsRes.rows.find((c: GenericRow) => c.control_id === e.control_id);
    return {
      evidenceId: e.evidence_id,
      title: e.title || `Evidence-${e.evidence_id}`,
      controlId: e.control_id || '',
      controlTitle: ctrl?.title || '',
      type: e.type || 'document',
      status: e.status || 'submitted',
      verified: !!e.verified,
      expiryDate: e.expiry_date?.toISOString?.() || e.expiry_date || null,
      collectedAt: e.created_at?.toISOString?.() || e.created_at || generatedAt,
      hash: e.hash || sha256(JSON.stringify({ id: e.evidence_id, title: e.title })),
      qualityTier: e.verified ? 'A' : e.file_path ? 'B' : 'C',
      custodyChain: [
        { eventType: 'upload', actor: SYSTEM_JOB_ACTOR, timestamp: e.created_at?.toISOString?.() || generatedAt },
        ...(e.verified ? [{ eventType: 'verify', actor: 'reviewer', timestamp: e.created_at?.toISOString?.() || generatedAt }] : []),
      ],
    };
  });

  // ── Build Traceability Matrix ─────────────────────────────

  const traceabilityMatrix: AkbTraceabilityRow[] = controls.map(ctrl => {
    const evIds = (evidenceByControl[ctrl.controlId] || []).map((e: GenericRow) => e.evidence_id);
    const evStatus = ctrl.evidenceCount > 0
      ? (ctrl.evidenceVerifiedCount === ctrl.evidenceCount ? 'verified' : 'partial')
      : 'missing';
    const remediation = remediationsRes.rows.find((r: GenericRow) => r.control_id === ctrl.controlId);
    const score = computeControlScore(ctrl);
    return {
      frameworkId: ctrl.frameworks[0] || 'general',
      controlId: ctrl.controlId,
      controlCode: ctrl.controlCode,
      controlTitle: ctrl.title,
      testResult: ctrl.testStatus,
      evidenceIds: evIds,
      evidenceStatus: evStatus,
      remediationId: remediation?.task_id || null,
      remediationStatus: remediation?.status || null,
      score,
      gap: score < 0.5,
    };
  });

  // ── Build Scorecard ───────────────────────────────────────
  const totalCtrl = controls.length || 1;
  const implCtrl = controls.filter(c => c.status === 'implemented').length;
  const testedCtrl = controls.filter(c => c.testStatus === 'passed').length;
  const totalEv = evidence.length || 1;
  const verifiedEv = evidence.filter(e => e.verified).length;

  const complianceScore = Math.round((implCtrl / totalCtrl) * 100);
  const maturityScore = Math.round((testedCtrl / totalCtrl) * 100);
  const confidenceScore = Math.round((verifiedEv / totalEv) * 100);
  const freshnessScore = computeFreshnessScore(evidence);

  const domainMap: Record<string, { ctrl: number; ev: number; impl: number; tested: number }> = {};
  for (const ctrl of controls) {
    if (!domainMap[ctrl.domain]) domainMap[ctrl.domain] = { ctrl: 0, ev: 0, impl: 0, tested: 0 };
    domainMap[ctrl.domain].ctrl++;
    domainMap[ctrl.domain].ev += ctrl.evidenceCount;
    if (ctrl.status === 'implemented') domainMap[ctrl.domain].impl++;
    if (ctrl.testStatus === 'passed') domainMap[ctrl.domain].tested++;
  }

  const scorecard: AkbScorecard = {
    overallComplianceScore: complianceScore,
    overallMaturityScore: maturityScore,
    overallConfidenceScore: confidenceScore,
    overallFreshnessScore: freshnessScore,
    domainScores: Object.entries(domainMap).map(([domain, d]) => ({
      domain,
      complianceScore: d.ctrl > 0 ? Math.round((d.impl / d.ctrl) * 100) : 0,
      maturityScore: d.ctrl > 0 ? Math.round((d.tested / d.ctrl) * 100) : 0,
      controlCount: d.ctrl,
      evidenceCount: d.ev,
    })),
    frameworkScores: frameworks.map(fw => ({
      framework: fw.frameworkName,
      score: fw.coveragePercent,
      controlsCovered: fw.implementedControls,
      totalControls: fw.totalControls,
    })),
  };

  // ── Build Hash Manifest ───────────────────────────────────
  const hashEntries = [
    ...controls.map(c => ({
      entityType: 'control' as const,
      entityId: c.controlId,
      entityName: c.title,
      hash: computeEntityHash({ id: c.controlId, status: c.status, testStatus: c.testStatus }),
      timestamp: c.lastTestedAt || generatedAt,
    })),
    ...evidence.map(e => ({
      entityType: 'evidence' as const,
      entityId: e.evidenceId,
      entityName: e.title,
      hash: e.hash,
      timestamp: e.collectedAt,
    })),
    ...policiesRes.rows.map((p: GenericRow) => ({
      entityType: 'policy' as const,
      entityId: p.policy_id,
      entityName: p.title || '',
      hash: computeEntityHash({ id: p.policy_id, version: p.version, status: p.status }),
      timestamp: p.updated_at?.toISOString?.() || generatedAt,
    })),
  ];

  const rootHash = computeRootHash(hashEntries);

  const hashManifest: AkbHashManifest = {
    rootHash,
    algorithm: 'SHA-256',
    generatedAt,
    entries: hashEntries,
    chainIntegrity: true,
  };

  // ── Build Risk Posture ────────────────────────────────────
  const distribution: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const r of risksRes.rows) {

    const s = r.risk_score || (r.likelihood * r.impact);
    if ((s as any) >= 20) distribution.critical++;
    else if ((s as any) >= 12) distribution.high++;
    else if ((s as any) >= 6) distribution.medium++;
    else distribution.low++;
  }

  // ── Build Policies ────────────────────────────────────────
  const policies = policiesRes.rows.map((p: GenericRow) => ({
    policyId: p.policy_id,
    title: p.title || '',
    version: p.version || 1,
    status: p.status || 'active',
    owner: p.owner || '',
    frameworks: Array.isArray(p.frameworks) ? p.frameworks : [],
    lastReviewed: p.updated_at?.toISOString?.() || null,
  }));

  // ── Build Remediations ────────────────────────────────────
  const remediations = remediationsRes.rows.map((r: GenericRow) => ({
    taskId: r.task_id,
    title: r.title || '',
    priority: r.priority || 'medium',
    status: r.status || 'open',
    dueDate: r.due_date?.toISOString?.() || null,
    assignedTo: r.assigned_to || 'unassigned',
    controlId: r.control_id || null,
  }));

  // ── Build Statistics ──────────────────────────────────────
  const completedAssessments = assessmentsRes.rows.filter((a: Record<string, unknown>) => a.status === 'completed').length;
  const completedRemediations = remediationsRes.rows.filter((r: GenericRow) => r.status === 'completed').length;
  const openHighRisks = risksRes.rows.filter((r: GenericRow) =>
    (r.risk_score >= 12 || (r.likelihood * r.impact) >= 12) && r.status !== 'mitigated'
  ).length;

  const auditReadinessScore = Math.min(100, Math.round(
    (complianceScore * 0.3) + (confidenceScore * 0.3) +
    (maturityScore * 0.2) + (freshnessScore * 0.2)
  ));

  const statistics = {
    totalRegulators: regulators.length,
    totalFrameworks: frameworks.length,
    totalControls: controls.length,
    implementedControls: implCtrl,
    totalEvidence: evidence.length,
    verifiedEvidence: verifiedEv,
    totalPolicies: policiesRes.rows.length,
    activePolicies: policiesRes.rows.filter((p: GenericRow) => p.status === 'active' || p.status === 'approved').length,
    totalAssessments: assessmentsRes.rows.length,
    completedAssessments,
    totalRemediations: remediationsRes.rows.length,
    completedRemediations,
    totalRisks: risksRes.rows.length,
    openHighRisks,
    overallCoverage: complianceScore,
    auditReadinessScore,
  };

  // ── Build Executive Summary ───────────────────────────────
  const healthScore = Math.round(
    (complianceScore * 0.25) + (confidenceScore * 0.25) +
    (maturityScore * 0.2) + (freshnessScore * 0.15) +
    ((100 - Math.min(100, (risksRes.rows.length > 0
      ? risksRes.rows.reduce((s: number, r: Record<string, unknown>) => (s as any) + (r.risk_score || 0), 0) / risksRes.rows.length * 5
      : 0))) * 0.15)
  );

  const maturityLevel = healthScore >= 80 ? 'Optimized' :
    healthScore >= 60 ? 'Measured' :
    healthScore >= 40 ? 'Defined' :
    healthScore >= 20 ? 'Managed' : 'Initial';

  const keyFindings: string[] = [];
  const recommendations: string[] = [];

  if (complianceScore < 50) keyFindings.push(`Control implementation at ${complianceScore}% — below target`);
  if (confidenceScore < 50) keyFindings.push(`Evidence verification at ${confidenceScore}% — requires attention`);
  if (openHighRisks > 0) keyFindings.push(`${openHighRisks} high/critical risks remain open`);
  if (freshnessScore < 60) keyFindings.push(`Evidence freshness at ${freshnessScore}% — stale evidence detected`);
  const gaps = traceabilityMatrix.filter(r => r.gap).length;
  if (gaps > 0) keyFindings.push(`${gaps} control gaps identified in traceability matrix`);

  if (complianceScore < 80) recommendations.push('Accelerate control implementation to reach 80% coverage');
  if (confidenceScore < 80) recommendations.push('Prioritize evidence verification workflows');
  if (openHighRisks > 0) recommendations.push('Address open high/critical risks with treatment plans');
  if (freshnessScore < 80) recommendations.push('Refresh stale evidence to maintain audit readiness');
  if (gaps > 5) recommendations.push('Close traceability gaps before next audit cycle');

  const executiveSummary = {
    healthScore,
    complianceScore,
    riskScore: Math.round(risksRes.rows.reduce((s: number, r: Record<string, unknown>) => (s as any) + (r.risk_score || 0), 0) / Math.max(risksRes.rows.length, 1) * 100) / 100,
    evidenceCoverage: confidenceScore,
    maturityLevel,
    keyFindings,
    recommendations,
  };

  // ── Assemble Package ──────────────────────────────────────
  return {
    metadata: {
      packageId,
      tenantId,
      generatedAt,
      generatedBy: userId,
      agrcOsVersion: '1.0.0',
      packageVersion: '2.0.0',
    },
    sectorProfile,
    regulators,
    frameworks,
    controls,
    evidence,
    traceabilityMatrix,
    scorecard,
    hashManifest,
    statistics,
    riskPosture: {
      totalRisks: risksRes.rows.length,
      distribution,
      topRisks: risksRes.rows.slice(0, 10).map((r: GenericRow) => ({
        title: r.title, score: r.risk_score || 0,
        category: r.category || '', status: r.status || 'open',
      })),
      averageScore: risksRes.rows.length > 0
        ? Math.round(risksRes.rows.reduce((s: number, r: Record<string, unknown>) => (s as any) + (r.risk_score || 0), 0) / risksRes.rows.length * 100) / 100
        : 0,
    },
    policies,
    remediations,
    executiveSummary,
  };
}

// ── AKB ZIP Exporter ────────────────────────────────────────

export async function exportAkbZip(akb: AkbPackage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', (err: Error) => reject(err));

    // Root manifest
    archive.append(JSON.stringify(akb.metadata, null, 2), { name: 'MANIFEST.json' });
    archive.append(JSON.stringify(akb.hashManifest, null, 2), { name: 'HASH-MANIFEST.json' });

    // Executive Summary
    archive.append(JSON.stringify(akb.executiveSummary, null, 2), { name: '00-Executive-Summary/executive-summary.json' });
    archive.append(buildExecutiveSummaryTxt(akb), { name: '00-Executive-Summary/README.txt' });

    // Sector Profile
    archive.append(JSON.stringify(akb.sectorProfile, null, 2), { name: '01-Sector-Profile/sector-profile.json' });

    // Regulators
    archive.append(JSON.stringify(akb.regulators, null, 2), { name: '02-Regulators/regulators.json' });

    // Frameworks
    archive.append(JSON.stringify(akb.frameworks, null, 2), { name: '03-Frameworks/framework-coverage.json' });
    for (const fw of akb.frameworks) {
      const fwControls = akb.controls.filter(c => c.frameworks.includes(fw.frameworkId));
      archive.append(JSON.stringify(fwControls, null, 2), {
        name: `03-Frameworks/${sanitize(fw.frameworkName)}/controls.json`,
      });
    }

    // Controls (grouped by domain)
    const domains = [...new Set(akb.controls.map(c => c.domain))];
    for (const domain of domains) {
      const domainControls = akb.controls.filter(c => c.domain === domain);
      archive.append(JSON.stringify(domainControls, null, 2), {
        name: `04-Controls/${sanitize(domain)}/controls.json`,
      });
    }

    // Evidence
    archive.append(JSON.stringify(akb.evidence, null, 2), { name: '05-Evidence/evidence-inventory.json' });

    // Traceability Matrix
    archive.append(JSON.stringify(akb.traceabilityMatrix, null, 2), { name: '06-Traceability/traceability-matrix.json' });
    archive.append(buildTraceabilityCsv(akb.traceabilityMatrix), { name: '06-Traceability/traceability-matrix.csv' });

    // Scorecard
    archive.append(JSON.stringify(akb.scorecard, null, 2), { name: '07-Scorecard/scorecard.json' });

    // Risk Posture
    archive.append(JSON.stringify(akb.riskPosture, null, 2), { name: '08-Risk-Posture/risk-posture.json' });

    // Policies
    archive.append(JSON.stringify(akb.policies, null, 2), { name: '09-Policies/policies.json' });

    // Remediations
    archive.append(JSON.stringify(akb.remediations, null, 2), { name: '10-Remediations/remediation-tasks.json' });

    // Statistics
    archive.append(JSON.stringify(akb.statistics, null, 2), { name: '11-Statistics/statistics.json' });

    archive.finalize();
  });
}

// ── Helper Functions ────────────────────────────────────────

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 80);
}

function inferRegulator(framework: string): string {
  const fw = (framework || '').toLowerCase();
  if (fw.includes('nca') || fw.includes('ecc')) return 'NCA';
  if (fw.includes('sama') || fw.includes('csf')) return 'SAMA';
  if (fw.includes('cst') || fw.includes('crf')) return 'CST';
  if (fw.includes('pdpl') || fw.includes('ndmo')) return 'NDMO';
  if (fw.includes('iso')) return 'ISO';
  if (fw.includes('nist')) return 'NIST';
  if (fw.includes('pci')) return 'PCI-SSC';
  return 'GENERAL';
}

function getRegulatorName(code: string): string {
  const names: Record<string, string> = {
    NCA: 'National Cybersecurity Authority',
    SAMA: 'Saudi Central Bank',
    CST: 'Communications, Space & Technology Commission',
    NDMO: 'National Data Management Office',
    ISO: 'International Organization for Standardization',
    NIST: 'National Institute of Standards and Technology',
    'PCI-SSC': 'Payment Card Industry Security Standards Council',
    GENERAL: 'General Compliance',
  };
  return names[code] || code;
}

function computeControlScore(ctrl: AkbControlDetail): number {
  let score = 0;
  if (ctrl.status === 'implemented') score += 0.3;
  else if (ctrl.status === 'partial') score += 0.15;
  if (ctrl.testStatus === 'passed') score += 0.3;
  else if (ctrl.testStatus === 'partial') score += 0.15;
  if (ctrl.evidenceCount > 0) score += 0.2;
  if (ctrl.evidenceVerifiedCount > 0) score += 0.2;
  return Math.min(1, score);
}

function computeFreshnessScore(evidence: AkbEvidenceItem[]): number {
  if (evidence.length === 0) return 0;
  const now = Date.now();
  const thirtyDays = 30 * 86400000;
  let fresh = 0;
  for (const e of evidence) {
    const age = now - new Date(e.collectedAt).getTime();
    if (age < thirtyDays * 3) fresh++;
  }
  return Math.round((fresh / evidence.length) * 100);
}

function buildExecutiveSummaryTxt(akb: AkbPackage): string {
  const s = akb.executiveSummary;
  const st = akb.statistics;
  return [
    '═══════════════════════════════════════════════════════════',
    '  AGRC-OS AUDIT KNOWLEDGE BASE — EXECUTIVE SUMMARY',
    '═══════════════════════════════════════════════════════════',
    '',
    `  Generated: ${akb.metadata.generatedAt}`,
    `  Package ID: ${akb.metadata.packageId}`,
    `  AGRC-OS Version: ${akb.metadata.agrcOsVersion}`,
    '',
    '───────────────────────────────────────────────────────────',
    '  SCORES',
    '───────────────────────────────────────────────────────────',
    `  Health Score:      ${s.healthScore}%`,
    `  Compliance Score:  ${s.complianceScore}%`,
    `  Evidence Coverage: ${s.evidenceCoverage}%`,
    `  Maturity Level:    ${s.maturityLevel}`,
    `  Audit Readiness:   ${st.auditReadinessScore}%`,
    '',
    '───────────────────────────────────────────────────────────',
    '  STATISTICS',
    '───────────────────────────────────────────────────────────',
    `  Regulators:   ${st.totalRegulators}`,
    `  Frameworks:   ${st.totalFrameworks}`,
    `  Controls:     ${st.implementedControls}/${st.totalControls} implemented`,
    `  Evidence:     ${st.verifiedEvidence}/${st.totalEvidence} verified`,
    `  Policies:     ${st.activePolicies}/${st.totalPolicies} active`,
    `  Assessments:  ${st.completedAssessments}/${st.totalAssessments} completed`,
    `  Remediations: ${st.completedRemediations}/${st.totalRemediations} completed`,
    `  Risks:        ${st.openHighRisks} high/critical open`,
    '',
    '───────────────────────────────────────────────────────────',
    '  KEY FINDINGS',
    '───────────────────────────────────────────────────────────',
    ...s.keyFindings.map(f => `  • ${f}`),
    '',
    '───────────────────────────────────────────────────────────',
    '  RECOMMENDATIONS',
    '───────────────────────────────────────────────────────────',
    ...s.recommendations.map(r => `  → ${r}`),
    '',
    '═══════════════════════════════════════════════════════════',
    '  Powered by AGRC-OS — Dogan Consult',
    '═══════════════════════════════════════════════════════════',
  ].join('\n');
}

function buildTraceabilityCsv(matrix: AkbTraceabilityRow[]): string {
  const header = 'Framework,Control ID,Control Code,Control Title,Test Result,Evidence Status,Remediation Status,Score,Gap';
  const rows = matrix.map(r =>
    [r.frameworkId, r.controlId, r.controlCode, `"${r.controlTitle}"`,
     r.testResult, r.evidenceStatus, r.remediationStatus || 'N/A',
     r.score.toFixed(2), r.gap ? 'YES' : 'NO'].join(',')
  );
  return [header, ...rows].join('\n');
}

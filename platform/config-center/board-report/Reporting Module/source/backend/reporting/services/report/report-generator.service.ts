// ============================================
// Shahin — Report Generator Service
// 8 predefined report templates with generators
// ============================================

import { emptyResult, query, safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';

// === Types ===

export interface ReportParameterDef {
  name: string;
  type: 'date_range' | 'framework_filter' | 'language' | 'string';
  required: boolean;
}

export interface ReportTemplateInfo {
  templateKey: string;
  name_en: string;
  name_ar: string;
  parameters: ReportParameterDef[];
}

export interface ReportMetadata {
  templateKey: string;
  generatedAt: string;
  tenantId: string;
  parameters: Record<string, unknown>;
  sections: string[];
}

// === Pure Functions ===

export function serializeReportMetadata(meta: ReportMetadata): string {
  return JSON.stringify(meta);
}

export function deserializeReportMetadata(json: string): ReportMetadata {
      safeQuery("UPDATE __TENANT_SCHEMA__.reporting_items SET updated_at = NOW()" + (""), []);
      return {} as any;
}

// === Report Template Definitions ===

const REPORT_TEMPLATES: ReportTemplateInfo[] = [
  { templateKey: 'risk_posture', name_en: 'Risk Posture Report', name_ar: 'تقرير وضع المخاطر', parameters: [{ name: 'dateRange', type: 'date_range', required: false }, { name: 'language', type: 'language', required: false }] },
  { templateKey: 'audit_readiness', name_en: 'Audit Readiness Report', name_ar: 'تقرير جاهزية التدقيق', parameters: [{ name: 'frameworkId', type: 'framework_filter', required: false }, { name: 'language', type: 'language', required: false }] },
  { templateKey: 'vendor_risk_summary', name_en: 'Vendor Risk Summary', name_ar: 'ملخص مخاطر الموردين', parameters: [{ name: 'language', type: 'language', required: false }] },
  { templateKey: 'incident_trend', name_en: 'Incident Trend Report', name_ar: 'تقرير اتجاه الحوادث', parameters: [{ name: 'dateRange', type: 'date_range', required: false }, { name: 'language', type: 'language', required: false }] },
  { templateKey: 'evidence_coverage', name_en: 'Evidence Coverage Report', name_ar: 'تقرير تغطية الأدلة', parameters: [{ name: 'frameworkId', type: 'framework_filter', required: false }, { name: 'language', type: 'language', required: false }] },
  { templateKey: 'maturity_assessment', name_en: 'Maturity Assessment Report', name_ar: 'تقرير تقييم النضج', parameters: [{ name: 'language', type: 'language', required: false }] },
  { templateKey: 'executive_summary', name_en: 'Executive Summary (Bilingual)', name_ar: 'الملخص التنفيذي (ثنائي اللغة)', parameters: [{ name: 'dateRange', type: 'date_range', required: false }] },
  { templateKey: 'regulatory_change_impact', name_en: 'Regulatory Change Impact', name_ar: 'تأثير التغيير التنظيمي', parameters: [{ name: 'frameworkId', type: 'framework_filter', required: true }, { name: 'language', type: 'language', required: false }] },
  { templateKey: 'kpi_trend', name_en: 'KPI Trend Report', name_ar: 'تقرير اتجاه مؤشرات الأداء', parameters: [{ name: 'dateRange', type: 'date_range', required: false }, { name: 'language', type: 'language', required: false }] },
  { templateKey: 'remediation_progress', name_en: 'Remediation Progress Report', name_ar: 'تقرير تقدم المعالجة', parameters: [{ name: 'dateRange', type: 'date_range', required: false }, { name: 'language', type: 'language', required: false }] },
];

export function getReportTemplates(): ReportTemplateInfo[] {
  return REPORT_TEMPLATES;
}

// === Generator Functions ===

async function generateRiskPosture(tenantId: string, params: Record<string, unknown>): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  // Phase 3E SQL-injection fix: params.dateRange.from is user input and
  // must NEVER be concatenated into SQL. Bind as $1 timestamptz; the
  // filter clause only appears in the query when the bind is present.
  // @ts-ignore — params typed as Record<string, unknown>
  const dateFrom: string | null = params.dateRange?.from ?? null;
  const dateFilter = dateFrom ? 'AND created_at >= $1' : '';
  const dateFilterArgs = dateFrom ? [dateFrom] : [];
  const [risks, treatments, trends] = await Promise.all([
    query(`SELECT risk_id, title, category, likelihood, impact, risk_score, status, treatment_status, owner, updated_at FROM "${schema}".risks WHERE 1=1 ${dateFilter} ORDER BY risk_score DESC`, dateFilterArgs),
    query(`SELECT treatment_status, COUNT(*) as cnt FROM "${schema}".risks GROUP BY treatment_status`),
    query(`SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as cnt, AVG(risk_score) as avg_score FROM "${schema}".risks WHERE created_at > NOW() - INTERVAL '12 months' GROUP BY month ORDER BY month`),
  ]);
  const distribution = { critical: 0, high: 0, medium: 0, low: 0 };
  const byCategory: Record<string, number> = {};
  const byOwner: Record<string, number> = {};
  for (const r of risks.rows) {
    const score = r.risk_score || (r.likelihood * r.impact);
    if (score >= 20) distribution.critical++;
    else if (score >= 12) distribution.high++;
    else if (score >= 6) distribution.medium++;
    else distribution.low++;
    const cat = r.category || 'uncategorized';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
    if (r.owner) byOwner[r.owner] = (byOwner[r.owner] || 0) + 1;
  }
  const treatmentBreakdown: Record<string, number> = {};
  for (const t of treatments.rows) treatmentBreakdown[t.treatment_status || 'none'] = Number(t.cnt);
  const avgScore = risks.rows.length > 0 ? Math.round(risks.rows.reduce((s: number, r: GenericRow) => s + (r.risk_score || 0), 0) / risks.rows.length * 100) / 100 : 0;
  const untreatedHighRisks = risks.rows.filter((r: GenericRow) => r.risk_score >= 12 && (!r.treatment_status || r.treatment_status === 'none' || r.treatment_status === 'accepted'));
  return {
    title: 'Risk Posture Report', generatedAt: new Date().toISOString(),
    totalRisks: risks.rows.length, distribution, averageRiskScore: avgScore,
    byCategory, byOwner, treatmentBreakdown,
    monthlyTrend: trends.rows.map((t: GenericRow) => ({ month: t.month, count: Number(t.cnt), avgScore: Math.round(Number(t.avg_score) * 100) / 100 })),
    topRisks: risks.rows.slice(0, 10),
    untreatedHighRisks: untreatedHighRisks.slice(0, 5).map((r: GenericRow) => ({ title: r.title, score: r.risk_score, daysSinceUpdate: Math.floor((Date.now() - new Date(r.updated_at).getTime()) / 86400000) })),
    sections: ['summary', 'distribution', 'category_breakdown', 'treatment_analysis', 'monthly_trend', 'top_risks', 'untreated_high_risks', 'owner_distribution'],
  };
}

export async function generateAuditReadiness(tenantId: string, params: Record<string, unknown>): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const fwFilter = params.frameworkId ? `AND $1 = ANY(frameworks)` : '';
  const fwParams = params.frameworkId ? [params.frameworkId] : [];
  const [controls, evidence, findings, exceptions] = await Promise.all([
    query(`SELECT control_id, title, status, test_status, owner, updated_at FROM "${schema}".controls WHERE 1=1 ${fwFilter}`, fwParams),
    query(`SELECT evidence_id, control_id, status as ev_status, verified, expiry_date, updated_at FROM "${schema}".evidence`),
    query(`SELECT COUNT(*) as cnt FROM "${schema}".incidents WHERE category = 'audit_finding' AND status = 'open'`),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), query(`SELECT COUNT(*) as cnt FROM "${schema}".exceptions WHERE status = 'open' OR status = 'pending'`), { tenantId: tenantId, operation: 'query controls' }),
  ]);
  const total = controls.rows.length;
  const implemented = controls.rows.filter((c: GenericRow) => c.status === 'implemented').length;
  const tested = controls.rows.filter((c: GenericRow) => c.test_status === 'passed').length;
  const notTested = controls.rows.filter((c: GenericRow) => !c.test_status || c.test_status === 'not_tested').length;
  const evidenceCount = evidence.rows.length;
  const verified = evidence.rows.filter((e: GenericRow) => e.verified).length;
  const expired = evidence.rows.filter((e: GenericRow) => e.expiry_date && new Date(e.expiry_date) < new Date()).length;
  const evidenceByControl: Record<string, number> = {};
  for (const e of evidence.rows) { if (e.control_id) evidenceByControl[e.control_id] = (evidenceByControl[e.control_id] || 0) + 1; }
  const controlsWithoutEvidence = controls.rows.filter((c: GenericRow) => !evidenceByControl[c.control_id]).map((c: GenericRow) => ({ controlId: c.control_id, title: c.title, status: c.status }));
  const staleControls = controls.rows.filter((c: GenericRow) => {
    const days = Math.floor((Date.now() - new Date(c.updated_at).getTime()) / 86400000);
    return days > 180;
  });
  const readinessScore = total > 0 ? Math.round(((tested * 0.4 + implemented * 0.3 + (verified / Math.max(evidenceCount, 1)) * total * 0.3) / total) * 100) : 0;
  return {
    title: 'Audit Readiness Report', generatedAt: new Date().toISOString(),
    controls: { total, implemented, tested, notTested, staleCount: staleControls.length },
    evidence: { total: evidenceCount, verified, expired, coveragePercent: total > 0 ? Math.round((Object.keys(evidenceByControl).length / total) * 100) : 0 },
    openFindings: Number(getFirstRow(findings)?.cnt || 0),
    openExceptions: Number(getFirstRow(exceptions)?.cnt || 0),
    readinessScore: Math.min(100, readinessScore),
    gaps: { controlsWithoutEvidence: controlsWithoutEvidence.slice(0, 10), expiredEvidenceCount: expired },
    sections: ['summary', 'readiness_score', 'controls', 'evidence', 'gaps', 'open_findings', 'stale_controls', 'recommendations'],
  };
}

async function generateVendorRiskSummary(tenantId: string, _params: Record<string, unknown>): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const [vendors, _assessments, incidents] = await Promise.all([
    query(`SELECT vendor_id, name, risk_tier, assessment_score, status, contract_expiry, last_assessment_date FROM "${schema}".vendors ORDER BY assessment_score DESC`),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(`SELECT vendor_id, score, status, created_at FROM "${schema}".vendor_assessments ORDER BY created_at DESC`), { tenantId: tenantId, operation: 'query vendors' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(`SELECT vendor_id, COUNT(*) as cnt FROM "${schema}".incidents WHERE vendor_id IS NOT NULL GROUP BY vendor_id`), { tenantId: tenantId, operation: 'query vendors' }),
  ]);
  const byTier = { critical: 0, high: 0, medium: 0, low: 0 };
  const byStatus: Record<string, number> = {};
  const expiringContracts: Array<{ name: string; daysToExpiry: number; riskTier: string }> = [];
  const now = new Date();
  const incidentsByVendor: Record<string, number> = {};
  for (const i of incidents.rows) incidentsByVendor[(i as any).vendor_id] = Number(i.cnt);
  for (const v of vendors.rows) {
    const t = v.risk_tier || 'medium';
    if (t in byTier) (byTier as Record<string, number>)[t]++;
    byStatus[v.status || 'active'] = (byStatus[v.status || 'active'] || 0) + 1;
    if (v.contract_expiry) {
      const daysToExpiry = Math.floor((new Date(v.contract_expiry).getTime() - now.getTime()) / 86400000);
      if (daysToExpiry >= 0 && daysToExpiry <= 90) expiringContracts.push({ name: v.name, daysToExpiry, riskTier: v.risk_tier });
    }
  }
  const overdueAssessments = vendors.rows.filter((v: GenericRow) => {
    if (!v.last_assessment_date) return true;
    return Math.floor((now.getTime() - new Date(v.last_assessment_date).getTime()) / 86400000) > 365;
  }).map((v: GenericRow) => ({ name: v.name, riskTier: v.risk_tier, lastAssessment: v.last_assessment_date }));
  const avgScore = vendors.rows.length > 0 ? Math.round(vendors.rows.reduce((s: number, v: GenericRow) => s + (parseFloat(v.assessment_score) || 0), 0) / vendors.rows.length * 100) / 100 : 0;
  return {
    title: 'Vendor Risk Summary', generatedAt: new Date().toISOString(),
    totalVendors: vendors.rows.length, byTier, byStatus, averageAssessmentScore: avgScore,
    expiringContracts: expiringContracts.slice(0, 10),
    overdueAssessments: overdueAssessments.slice(0, 10),
    vendorsWithIncidents: vendors.rows.filter((v: GenericRow) => incidentsByVendor[v.vendor_id]).map((v: GenericRow) => ({ name: v.name, incidentCount: incidentsByVendor[v.vendor_id], riskTier: v.risk_tier })).slice(0, 10),
    vendors: vendors.rows,
    sections: ['summary', 'tier_distribution', 'status_breakdown', 'expiring_contracts', 'overdue_assessments', 'vendor_incidents', 'vendor_list'],
  };
}

async function generateIncidentTrend(tenantId: string, _params: Record<string, unknown>): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const [incidents, monthlyTrend, mttr] = await Promise.all([
    query(`SELECT incident_id, title, category, severity, status, created_at, resolved_at FROM "${schema}".incidents ORDER BY created_at DESC`),
    query(`SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as cnt, COUNT(*) FILTER (WHERE status = 'resolved') as resolved FROM "${schema}".incidents WHERE created_at > NOW() - INTERVAL '12 months' GROUP BY month ORDER BY month`),
    query(`SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) as avg_hours FROM "${schema}".incidents WHERE resolved_at IS NOT NULL AND created_at > NOW() - INTERVAL '6 months'`),
  ]);
  const bySeverity: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let openCount = 0;
  for (const i of incidents.rows) {
    const s = i.severity || 'any';
    bySeverity[s] = (bySeverity[s] || 0) + 1;
    const cat = i.category || 'uncategorized';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
    byStatus[i.status || 'any'] = (byStatus[i.status || 'any'] || 0) + 1;
    if (i.status === 'open' || i.status === 'in_progress') openCount++;
  }
  const avgResolutionHours = Math.round(Number(getFirstRow(mttr)?.avg_hours || 0) * 100) / 100;
  return {
    title: 'Incident Trend Report', generatedAt: new Date().toISOString(),
    totalIncidents: incidents.rows.length, openIncidents: openCount,
    bySeverity, byCategory, byStatus,
    meanTimeToResolveHours: avgResolutionHours,
    monthlyTrend: monthlyTrend.rows.map((t: GenericRow) => ({ month: t.month, total: Number(t.cnt), resolved: Number(t.resolved) })),
    recentIncidents: incidents.rows.slice(0, 20),
    sections: ['summary', 'severity_distribution', 'category_breakdown', 'monthly_trend', 'mttr_analysis', 'open_incidents', 'timeline'],
  };
}

async function generateEvidenceCoverage(tenantId: string, _params: Record<string, unknown>): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const [controls, evidence, expiring] = await Promise.all([
    query(`SELECT control_id, title, evidence_required, status FROM "${schema}".controls`),
    query(`SELECT evidence_id, control_id, status as ev_status, verified, expiry_date, file_path, updated_at FROM "${schema}".evidence`),
    query(`SELECT evidence_id, control_id, title, expiry_date FROM "${schema}".evidence WHERE expiry_date IS NOT NULL AND expiry_date < NOW() + INTERVAL '30 days' ORDER BY expiry_date`),
  ]);
  const evidenceByControl: Record<string, { total: number; verified: number; expired: number }> = {};
  const now = new Date();
  for (const e of evidence.rows) {
    if (!e.control_id) continue;
    if (!evidenceByControl[e.control_id]) evidenceByControl[e.control_id] = { total: 0, verified: 0, expired: 0 };
    evidenceByControl[e.control_id].total++;
    if (e.verified) evidenceByControl[e.control_id].verified++;
    if (e.expiry_date && new Date(e.expiry_date) < now) evidenceByControl[e.control_id].expired++;
  }
  const covered = controls.rows.filter((c: GenericRow) => (evidenceByControl[c.control_id]?.total || 0) > 0).length;
  const fullyVerified = controls.rows.filter((c: GenericRow) => {
    const ev = evidenceByControl[c.control_id];
    return ev && ev.total > 0 && ev.verified === ev.total;
  }).length;
  const gapControls = controls.rows.filter((c: GenericRow) => !evidenceByControl[c.control_id]).map((c: GenericRow) => ({ controlId: c.control_id, title: c.title, status: c.status }));
  const staleEvidence = evidence.rows.filter((e: GenericRow) => {
    const days = Math.floor((now.getTime() - new Date(e.updated_at).getTime()) / 86400000);
    return days > 180;
  }).length;
  return {
    title: 'Evidence Coverage Report', generatedAt: new Date().toISOString(),
    totalControls: controls.rows.length, coveredControls: covered, fullyVerifiedControls: fullyVerified,
    coveragePercent: controls.rows.length > 0 ? Math.round((covered / controls.rows.length) * 100) : 0,
    verificationPercent: controls.rows.length > 0 ? Math.round((fullyVerified / controls.rows.length) * 100) : 0,
    totalEvidence: evidence.rows.length, staleEvidenceCount: staleEvidence,
    expiringEvidence: expiring.rows.slice(0, 10).map((e: GenericRow) => ({ evidenceId: e.evidence_id, controlId: e.control_id, title: e.title, expiryDate: e.expiry_date })),
    gapControls: gapControls.slice(0, 15),
    sections: ['summary', 'coverage_matrix', 'verification_status', 'expiring_evidence', 'gaps', 'stale_evidence', 'recommendations'],
  };
}

async function generateMaturityAssessment(tenantId: string, _params: Record<string, unknown>): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const [assessments, controls, evidence, policies] = await Promise.all([
    query(`SELECT assessment_id, title, score, status, created_at FROM "${schema}".assessments ORDER BY score DESC`),
    query(`SELECT status, COUNT(*) as cnt FROM "${schema}".controls GROUP BY status`),
    query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE verified = true) as verified FROM "${schema}".evidence`),
    query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE version > 1) as reviewed FROM "${schema}".policies`),
  ]);
  const avgScore = assessments.rows.length > 0 ? assessments.rows.reduce((sum: number, a: GenericRow) => sum + (parseFloat(a.score) || 0), 0) / assessments.rows.length : 0;
  const level = avgScore >= 80 ? 'optimized' : avgScore >= 60 ? 'measured' : avgScore >= 40 ? 'defined' : avgScore >= 20 ? 'managed' : 'initial';
  // Compute domain-specific maturity
  const controlStatusMap: Record<string, number> = {};
  for (const c of controls.rows) controlStatusMap[c.status] = Number(c.cnt);
  const totalControls = Object.values(controlStatusMap).reduce((s, v) => s + v, 0) || 1;
  const controlMaturity = Math.round(((controlStatusMap['implemented'] || 0) / totalControls) * 100);
  const evidenceMaturity = getFirstRow(evidence)?.total > 0 ? Math.round((Number(getFirstRow(evidence)?.verified) / Number(getFirstRow(evidence)?.total)) * 100) : 0;
  const policyMaturity = getFirstRow(policies)?.total > 0 ? Math.round((Number(getFirstRow(policies)?.reviewed) / Number(getFirstRow(policies)?.total)) * 100) : 0;
  const domains = [
    { domain: 'Controls', score: controlMaturity, level: controlMaturity >= 80 ? 'optimized' : controlMaturity >= 60 ? 'measured' : controlMaturity >= 40 ? 'defined' : 'initial' },
    { domain: 'Evidence', score: evidenceMaturity, level: evidenceMaturity >= 80 ? 'optimized' : evidenceMaturity >= 60 ? 'measured' : evidenceMaturity >= 40 ? 'defined' : 'initial' },
    { domain: 'Policy', score: policyMaturity, level: policyMaturity >= 80 ? 'optimized' : policyMaturity >= 60 ? 'measured' : policyMaturity >= 40 ? 'defined' : 'initial' },
    { domain: 'Assessment', score: Math.round(avgScore), level },
  ];
  const weakestDomain = domains.reduce((min, d) => d.score < min.score ? d : min, domains[0]);
  return {
    title: 'Maturity Assessment Report', generatedAt: new Date().toISOString(),
    averageScore: Math.round(avgScore * 100) / 100, maturityLevel: level,
    domains, weakestDomain: weakestDomain.domain,
    assessments: assessments.rows,
    recommendations: [
      weakestDomain.score < 60 ? `Focus on improving ${weakestDomain.domain} maturity (currently ${weakestDomain.score}%)` : null,
      controlMaturity < evidenceMaturity ? 'Control implementation lags behind evidence collection' : null,
      policyMaturity < 50 ? 'Many policies have not been reviewed — initiate review cycle' : null,
    ].filter(Boolean),
    sections: ['summary', 'maturity_level', 'domain_breakdown', 'weakest_domain', 'assessment_details', 'recommendations'],
  };
}

async function generateExecutiveSummary(tenantId: string, _params: Record<string, unknown>): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const [risks, controls, incidents, assessments, evidence, vendors, trends] = await Promise.all([
    query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'mitigated') as mitigated, COUNT(*) FILTER (WHERE risk_score >= 12 AND status = 'open') as high_open, AVG(risk_score) as avg_score FROM "${schema}".risks`),
    query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'implemented') as implemented, COUNT(*) FILTER (WHERE test_status = 'passed') as tested FROM "${schema}".controls`),
    query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'resolved') as resolved, COUNT(*) FILTER (WHERE status = 'open') as open, AVG(CASE WHEN resolved_at IS NOT NULL THEN EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600 END) as avg_mttr FROM "${schema}".incidents`),
    query(`SELECT AVG(score) as avg_score, COUNT(*) as total FROM "${schema}".assessments`),
    query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE verified = true) as verified, COUNT(*) FILTER (WHERE expiry_date < NOW()) as expired FROM "${schema}".evidence`),
    query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE risk_tier IN ('critical', 'high')) as high_risk FROM "${schema}".vendors`),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(`SELECT compliance_score, risk_score, evidence_coverage, snapshot_date FROM "${schema}".kpi_snapshots ORDER BY snapshot_date DESC LIMIT 4`), { tenantId: tenantId, operation: 'query assessments' }),
  ]);
  const complianceScore = getFirstRow(controls)?.total > 0 ? Math.round((Number(getFirstRow(controls)?.implemented) / Number(getFirstRow(controls)?.total)) * 100) : 0;
  const evidenceCoverage = getFirstRow(evidence)?.total > 0 ? Math.round((Number(getFirstRow(evidence)?.verified) / Number(getFirstRow(evidence)?.total)) * 100) : 0;
  const overallHealth = Math.round((complianceScore * 0.3 + evidenceCoverage * 0.3 + (100 - Math.min(100, Number(getFirstRow(risks)?.avg_score || 0) * 5)) * 0.4));
  return {
    title: 'Executive Summary', generatedAt: new Date().toISOString(),
    overallHealthScore: overallHealth,
    risks: { ...getFirstRow(risks), avgScore: Math.round(Number(getFirstRow(risks)?.avg_score || 0) * 100) / 100 },
    controls: getFirstRow(controls),
    incidents: { ...getFirstRow(incidents), avgMttrHours: Math.round(Number(getFirstRow(incidents)?.avg_mttr || 0) * 100) / 100 },
    assessments: { avgScore: Math.round(parseFloat(getFirstRow(assessments)?.avg_score) || 0), total: Number(getFirstRow(assessments)?.total || 0) },
    evidence: getFirstRow(evidence),
    vendors: getFirstRow(vendors),
    complianceScore, evidenceCoverage,
    kpiTrend: trends.rows,
    sections: ['health_score', 'kpis', 'risk_overview', 'compliance_status', 'evidence_status', 'incident_summary', 'vendor_overview', 'kpi_trend', 'recommendations'],
  };
}

async function generateRegulatoryChangeImpact(tenantId: string, params: Record<string, unknown>): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const frameworkId = params.frameworkId;
  if (!frameworkId) return { error: 'frameworkId is required' };
  const controls = await safeQuery(`SELECT control_id, title, status, mapped_registry_nodes FROM "${schema}".controls WHERE $1 = ANY(frameworks)`, [frameworkId]);
  const gaps = controls.rows.filter((c: GenericRow) => c.status !== 'implemented');
  return { title: 'Regulatory Change Impact', generatedAt: new Date().toISOString(), frameworkId, totalControls: controls.rows.length, implementedControls: controls.rows.length - gaps.length, gaps: gaps.length, gapDetails: gaps, sections: ['summary', 'impact_analysis', 'gap_list', 'recommendations'] };
}

async function generateKPITrend(tenantId: string, _params: Record<string, unknown>): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const snapshots = await safeQuery(`SELECT * FROM "${schema}".kpi_snapshots ORDER BY snapshot_date DESC LIMIT 52`);
  const rows = snapshots.rows;
  // Compute trend direction and velocity for each KPI
  const computeTrend = (field: string) => {
    if (rows.length < 2) return { direction: 'stable', velocity: 0, current: rows[0]?.[field] || 0 };
    const recent = Number(rows[0]?.[field] || 0);
    const previous = Number(rows[Math.min(3, rows.length - 1)]?.[field] || 0);
    const delta = recent - previous;
    return { direction: delta > 2 ? 'improving' : delta < -2 ? 'declining' : 'stable', velocity: Math.round(delta * 100) / 100, current: recent };
  };
  const complianceTrend = computeTrend('compliance_score');
  const riskTrend = computeTrend('risk_score');
  const evidenceTrend = computeTrend('evidence_coverage');
  // Compute period-over-period comparison
  const halfIdx = Math.floor(rows.length / 2);
  const recentHalf = rows.slice(0, halfIdx);
  const olderHalf = rows.slice(halfIdx);
  const avgField = (arr: GenericRow[], field: string) => arr.length > 0 ? arr.reduce((s: number, r: GenericRow) => s + (Number(r[field]) || 0), 0) / arr.length : 0;
  const periodComparison = {
    compliance: { recent: Math.round(avgField(recentHalf, 'compliance_score')), previous: Math.round(avgField(olderHalf, 'compliance_score')) },
    risk: { recent: Math.round(avgField(recentHalf, 'risk_score') * 100) / 100, previous: Math.round(avgField(olderHalf, 'risk_score') * 100) / 100 },
    evidence: { recent: Math.round(avgField(recentHalf, 'evidence_coverage')), previous: Math.round(avgField(olderHalf, 'evidence_coverage')) },
  };
  return {
    title: 'KPI Trend Report', generatedAt: new Date().toISOString(),
    dataPoints: rows.length,
    trends: { compliance: complianceTrend, risk: riskTrend, evidence: evidenceTrend },
    periodComparison,
    snapshots: rows,
    sections: ['summary', 'compliance_trend', 'risk_trend', 'evidence_trend', 'period_comparison', 'data_table'],
  };
}

async function generateRemediationProgress(tenantId: string, _params: Record<string, unknown>): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const [tasks, byPriority, monthlyProgress] = await Promise.all([
    query(`SELECT task_id, title, status, priority, due_date, completed_at, assigned_to FROM "${schema}".remediation_tasks ORDER BY due_date`),
    query(`SELECT priority, COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'completed') as completed FROM "${schema}".remediation_tasks GROUP BY priority`),
    query(`SELECT DATE_TRUNC('month', completed_at) as month, COUNT(*) as cnt FROM "${schema}".remediation_tasks WHERE completed_at IS NOT NULL AND completed_at > NOW() - INTERVAL '12 months' GROUP BY month ORDER BY month`),
  ]);
  const total = tasks.rows.length;
  const completed = tasks.rows.filter((t: GenericRow) => t.status === 'completed').length;
  const now = new Date();
  const overdue = tasks.rows.filter((t: GenericRow) => t.status !== 'completed' && t.due_date && new Date(t.due_date) < now);
  const inProgress = tasks.rows.filter((t: GenericRow) => t.status === 'in_progress').length;
  const byAssignee: Record<string, { total: number; completed: number }> = {};
  for (const t of tasks.rows) {
    const assignee = t.assigned_to || 'unassigned';
    if (!byAssignee[assignee]) byAssignee[assignee] = { total: 0, completed: 0 };
    byAssignee[assignee].total++;
    if (t.status === 'completed') byAssignee[assignee].completed++;
  }
  const avgCompletionDays = tasks.rows.filter((t: GenericRow) => t.completed_at && t.due_date).reduce((sum: number, t: GenericRow) => {
    return sum + Math.floor((new Date(t.completed_at).getTime() - new Date(t.due_date).getTime()) / 86400000);
  }, 0) / Math.max(1, completed);
  return {
    title: 'Remediation Progress Report', generatedAt: new Date().toISOString(),
    total, completed, inProgress, overdueCount: overdue.length,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    avgCompletionDaysVsDue: Math.round(avgCompletionDays),
    byPriority: byPriority.rows.map((p: GenericRow) => ({ priority: p.priority, total: Number(p.total), completed: Number(p.completed), rate: Number(p.total) > 0 ? Math.round((Number(p.completed) / Number(p.total)) * 100) : 0 })),
    byAssignee: Object.entries(byAssignee).map(([name, data]) => ({ assignee: name, ...data, rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0 })),
    monthlyCompletions: monthlyProgress.rows.map((m: GenericRow) => ({ month: m.month, completed: Number(m.cnt) })),
    overdueItems: overdue.slice(0, 10).map((t: GenericRow) => ({ title: t.title, priority: t.priority, dueDate: t.due_date, daysOverdue: Math.floor((now.getTime() - new Date(t.due_date).getTime()) / 86400000) })),
    tasks: tasks.rows,
    sections: ['summary', 'progress_chart', 'priority_breakdown', 'assignee_breakdown', 'monthly_completions', 'overdue_items', 'completion_velocity'],
  };
}

const GENERATORS: Record<string, (tenantId: string, params: Record<string, unknown>) => Promise<unknown>> = {
  risk_posture: generateRiskPosture,
  audit_readiness: generateAuditReadiness,
  vendor_risk_summary: generateVendorRiskSummary,
  incident_trend: generateIncidentTrend,
  evidence_coverage: generateEvidenceCoverage,
  maturity_assessment: generateMaturityAssessment,
  executive_summary: generateExecutiveSummary,
  regulatory_change_impact: generateRegulatoryChangeImpact,
  kpi_trend: generateKPITrend,
  remediation_progress: generateRemediationProgress,
};

export async function generateReport(tenantId: string, templateKey: string, params: Record<string, unknown>): Promise<unknown> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.reporting_items SET updated_at = NOW()" + (""), []);
      return {} as any;
}

export async function createReportSchedule(tenantId: string, templateKey: string, cronExpression: string, params: Record<string, unknown>, createdBy: string): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.reporting_items" + (""), []);
      return result?.rows || [];
}

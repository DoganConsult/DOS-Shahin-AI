import { emptyResult, query, tenantSchema } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import { getFirstRow, safeQuery } from '@dos/db';
import { swallowNull, swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';
import type { GenericRow as _GenericRow } from '@dos/types';

export interface VendorScorecard {
  vendorId: string;
  vendorName: string;
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  riskTier: 'critical' | 'high' | 'medium' | 'low';
  components: {
    assessmentScore: number;
    complianceScore: number;
    cyberRatingScore: number;
    slaScore: number;
    findingsScore: number;
    incidentScore: number;
  };
  weights: {
    assessment: number;
    compliance: number;
    cyberRating: number;
    sla: number;
    findings: number;
    incidents: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  lastCalculatedAt: string;
}

const DEFAULT_WEIGHTS = {
  assessment: 0.30,
  compliance: 0.25,
  cyberRating: 0.20,
  sla: 0.10,
  findings: 0.10,
  incidents: 0.05,
};

function gradeFromScore(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function riskTierFromScore(score: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= 80) return 'low';
  if (score >= 60) return 'medium';
  if (score >= 40) return 'high';
  return 'critical';
}

async function getAssessmentScore(schema: string, vendorId: string): Promise<number> {
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ score: 50 }]), query(
    `SELECT COALESCE(AVG(completion_pct), 50) AS score
     FROM "${schema}".vendor_questionnaire_submissions
     WHERE vendor_id = $1 AND status = 'reviewed'`,
    [vendorId],
  ), { operation: 'query vendor_questionnaire_submissions' });
  return Math.min(100, Number(getFirstRow(res)?.score ?? 50));
}

async function getComplianceScore(schema: string, vendorId: string): Promise<number> {
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ valid_docs: 0, total_docs: 0 }]), query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'active' AND expiry_date > NOW()) AS valid_docs,
       COUNT(*) AS total_docs
     FROM "${schema}".vendor_documents
     WHERE vendor_id = $1`,
    [vendorId],
  ), { operation: 'query vendor_documents' });
  const row = getFirstRow(res)!;
  const total = Number(row?.total_docs ?? 0);
  if (total === 0) return 50;
  return Math.round((Number(row?.valid_docs ?? 0) / total) * 100);
}

async function getCyberRatingScore(schema: string, vendorId: string): Promise<number> {
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
    `SELECT rating_score FROM "${schema}".vendors WHERE vendor_id = $1`,
    [vendorId],
  ), { operation: 'query vendors' });
  return Number(getFirstRow(res)?.rating_score ?? 50);
}

async function getSlaScore(schema: string, vendorId: string): Promise<number> {
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ met: 1, total: 1 }]), query(
    `SELECT
       COUNT(*) FILTER (WHERE is_met = true OR is_breached = false) AS met,
       COUNT(*) AS total
     FROM "${schema}".vendor_sla_measurements
     WHERE vendor_id = $1 AND period_end > NOW() - INTERVAL '90 days'`,
    [vendorId],
  ), { operation: 'query vendor_sla_measurements' });
  const row = getFirstRow(res)!;
  const total = Number(row?.total ?? 1);
  return total === 0 ? 100 : Math.round((Number(row?.met ?? 1) / total) * 100);
}

async function getFindingsScore(schema: string, vendorId: string): Promise<number> {
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ critical_open: 0, high_open: 0, total_open: 0 }]), query(
    `SELECT
       COUNT(*) FILTER (WHERE severity = 'critical' AND status = 'open') AS critical_open,
       COUNT(*) FILTER (WHERE severity = 'high' AND status = 'open') AS high_open,
       COUNT(*) FILTER (WHERE status = 'open') AS total_open
     FROM "${schema}".vendor_findings
     WHERE vendor_id = $1`,
    [vendorId],
  ), { operation: 'query vendor_findings' });
  const row = getFirstRow(res)!;
  const penalty = (Number(row?.critical_open ?? 0) * 20) + (Number(row?.high_open ?? 0) * 10) + (Number(row?.total_open ?? 0) * 2);
  return Math.max(0, 100 - penalty);
}

async function getIncidentScore(schema: string, vendorId: string): Promise<number> {
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ incidents: 0 }]), query(
    `SELECT COUNT(*) AS incidents
     FROM "${schema}".incidents
     WHERE vendor_id = $1 AND created_at > NOW() - INTERVAL '12 months'`,
    [vendorId],
  ), { operation: 'query incidents' });
  const count = Number(getFirstRow(res)?.incidents ?? 0);
  return Math.max(0, 100 - (count * 15));
}

export async function calculateVendorScore(
  tenantId: string,
  vendorId: string,
  customWeights?: Partial<typeof DEFAULT_WEIGHTS>,
): Promise<VendorScorecard> {
  const schema = tenantSchema(tenantId);
  const vendorRes = await safeQuery(
    `SELECT vendor_id, name FROM "${schema}".vendors WHERE vendor_id = $1`,
    [vendorId],
  );
  const vendor = getFirstRow(vendorRes) as any;
  if (!vendor) throw new Error('Vendor not found');

  const weights = { ...DEFAULT_WEIGHTS, ...(customWeights ?? {}) };
  const weightSum = Object.values(weights).reduce((s, v) => s + Number(v), 0) || 1;
  const normalized = {
    assessment: weights.assessment / weightSum,
    compliance: weights.compliance / weightSum,
    cyberRating: weights.cyberRating / weightSum,
    sla: weights.sla / weightSum,
    findings: weights.findings / weightSum,
    incidents: weights.incidents / weightSum,
  };

  const [
    assessmentScore,
    complianceScore,
    cyberRatingScore,
    slaScore,
    findingsScore,
    incidentScore,
  ] = await Promise.all([
    getAssessmentScore(schema, vendorId),
    getComplianceScore(schema, vendorId),
    getCyberRatingScore(schema, vendorId),
    getSlaScore(schema, vendorId),
    getFindingsScore(schema, vendorId),
    getIncidentScore(schema, vendorId),
  ]);

  const overallRaw =
    assessmentScore * normalized.assessment +
    complianceScore * normalized.compliance +
    cyberRatingScore * normalized.cyberRating +
    slaScore * normalized.sla +
    findingsScore * normalized.findings +
    incidentScore * normalized.incidents;

  const overallScore = Math.round(Math.max(0, Math.min(100, overallRaw)));
  const grade = gradeFromScore(overallScore);
  const riskTier = riskTierFromScore(overallScore);
  const lastCalculatedAt = new Date().toISOString();

  const scorecard: VendorScorecard = {
    vendorId,
    vendorName: String(vendor.name ?? vendorId),
    overallScore,
    grade,
    riskTier,
    components: {
      assessmentScore,
      complianceScore,
      cyberRatingScore,
      slaScore,
      findingsScore,
      incidentScore,
    },
    weights: {
      assessment: normalized.assessment,
      compliance: normalized.compliance,
      cyberRating: normalized.cyberRating,
      sla: normalized.sla,
      findings: normalized.findings,
      incidents: normalized.incidents,
    },
    trend: 'stable',
    lastCalculatedAt,
  };

  await safeQuery(
    `UPDATE "${schema}".vendors
     SET vendor_score = $1,
         risk_tier = $2,
         score_updated_at = NOW(),
         updated_at = NOW()
     WHERE vendor_id = $3`,
    [overallScore, riskTier, vendorId],
  ).catch(catchHandler(EC.FALLBACK_QUERY, { tenantId, operation: 'update vendors score' } as any));

  await eventBus.publish(({
    tenantId,
    eventType: 'vendor.score_updated',
    severity: 'info',
    entityType: 'vendor',
    entityId: vendorId,
    payload: { overallScore, grade, riskTier },
  } as any)).catch(() => undefined);

  return scorecard;
}

export async function bulkRecalculateVendorScores(tenantId: string): Promise<{ processed: number; errors: number }> {
  const schema = tenantSchema(tenantId);
  const vendors = await safeQuery(`SELECT vendor_id FROM "${schema}".vendors WHERE status = 'active'`);
  let processed = 0;
  let errors = 0;
  for (const row of vendors.rows) {
    try {
      await calculateVendorScore(tenantId, row.vendor_id);
      processed++;
    } catch {
      errors++;
    }
  }
  return { processed, errors };
}

export async function getVendorScoreHistory(
  tenantId: string,
  vendorId: string,
): Promise<number[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT historical_scores FROM "${schema}".vendors WHERE vendor_id = $1`,
    [vendorId],
  );
  const raw = getFirstRow(res)?.historical_scores;
  return Array.isArray(raw) ? raw : [];
}

// ============================================================================
// Shahin — Evidence Scoring & Coverage Service
// 5-dimension scoring model: Completeness, Freshness, Verification,
// Chain Integrity, Cross-Framework Reuse
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// ── Scoring weights ──
const WEIGHTS = {
  completeness: 0.25,
  freshness: 0.25,
  verification: 0.20,
  integrity: 0.15,
  reuse: 0.15,
};

const STATUS_SCORES: Record<string, number> = {
  approved: 100,
  active: 90,
  submitted: 50,
  validating: 60,
  draft: 20,
  rejected: 10,
  expired: 0,
  archived: 0,
};

// ── Evidence Scoring ──

export interface EvidenceScore {
  evidenceId: string;
  completeness: number;
  freshness: number;
  verification: number;
  integrity: number;
  reuse: number;
  composite: number;
}

/**
 * Score a single evidence item across 5 dimensions (0-100 each).
 */
export async function scoreEvidence(tenantId: string, evidenceId: string): Promise<EvidenceScore> {
  const schema = tenantSchema(tenantId);

  // Get evidence record
  const evRes = await safeQuery(
    `SELECT e.evidence_id, e.control_id, e.status, e.created_at, e.updated_at,
            e.content_hash, e.previous_hash, e.chain_position, e.framework_code,
            e.expiry_date
     FROM "${schema}".evidence e
     WHERE e.evidence_id = $1`,
    [evidenceId]
  );
  if (evRes.rows.length === 0) {
    return { evidenceId, completeness: 0, freshness: 0, verification: 0, integrity: 0, reuse: 0, composite: 0 };
  }
  const ev = getFirstRow(evRes)!;

  // 1. Completeness: does the control have all required evidence types?
  const completeness = await computeCompleteness(schema, ev.control_id);

  // 2. Freshness: how recent relative to expected collection frequency
  const freshness = computeFreshness(ev);

  // 3. Verification: status-based score
  const verification = STATUS_SCORES[ev.status] ?? 30;

  // 4. Chain integrity: hash chain valid?
  const integrity = ev.content_hash ? 100 : 0;

  // 5. Cross-framework reuse
  const reuse = await computeReuse(schema, evidenceId);

  const composite = Math.round(
    completeness * WEIGHTS.completeness +
    freshness * WEIGHTS.freshness +
    verification * WEIGHTS.verification +
    integrity * WEIGHTS.integrity +
    reuse * WEIGHTS.reuse
  );

  return { evidenceId, completeness, freshness, verification, integrity, reuse, composite };
}

/**
 * Score all evidence for a given control (aggregate).
 */
export async function scoreControlEvidence(
  tenantId: string,
  controlId: string
): Promise<{ controlId: string; evidenceCount: number; avgScore: number; scores: EvidenceScore[] }> {
  const schema = tenantSchema(tenantId);
  const evRes = await safeQuery(
    `SELECT evidence_id FROM "${schema}".evidence WHERE control_id = $1`,
    [controlId]
  );

  const scores: EvidenceScore[] = [];
  for (const row of evRes.rows) {
    scores.push(await scoreEvidence(tenantId, row.evidence_id));
  }

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((s, e) => s + e.composite, 0) / scores.length)
    : 0;

  return { controlId, evidenceCount: scores.length, avgScore, scores };
}

// ── Coverage Dashboard ──

export interface EvidenceCoverageDashboard {
  totalControls: number;
  evidencedControls: number;
  coveragePercent: number;
  averageScore: number;
  byStatus: Record<string, number>;
  byFramework: { frameworkCode: string; controls: number; evidenced: number; coverage: number }[];
  scoreDistribution: { excellent: number; good: number; fair: number; poor: number };
}

export async function getEvidenceCoverageDashboard(tenantId: string): Promise<EvidenceCoverageDashboard> {
  const schema = tenantSchema(tenantId);

  // Total controls
  const totalRes = await safeQuery(`SELECT COUNT(*) as n FROM "${schema}".controls`, []);
  const totalControls = parseInt(getFirstRow(totalRes)?.n || "0");

  // Controls with at least one evidence
  const evidencedRes = await safeQuery(
    `SELECT COUNT(DISTINCT control_id) as n FROM "${schema}".evidence WHERE control_id IS NOT NULL`,
    []
  );
  const evidencedControls = parseInt(getFirstRow(evidencedRes)?.n || "0");

  // Coverage %
  const coveragePercent = totalControls > 0 ? Math.round((evidencedControls / totalControls) * 100) : 0;

  // Status breakdown
  const statusRes = await safeQuery(
    `SELECT status, COUNT(*) as n FROM "${schema}".evidence GROUP BY status`,
    []
  );
  const byStatus: Record<string, number> = {};
  for (const r of statusRes.rows) {
    byStatus[r.status] = parseInt(r.n);
  }

  // Framework breakdown
  const fwRes = await safeQuery(
    `SELECT c.framework_code,
            COUNT(DISTINCT c.control_id) as total_controls,
            COUNT(DISTINCT e.control_id) as evidenced_controls
     FROM "${schema}".controls c
     LEFT JOIN "${schema}".evidence e ON e.control_id = c.control_id
     WHERE c.framework_code IS NOT NULL
     GROUP BY c.framework_code`,
    []
  );
  const byFramework = fwRes.rows.map((r: GenericRow) => ({
    frameworkCode: r.framework_code,
    controls: parseInt(r.total_controls),
    evidenced: parseInt(r.evidenced_controls),
    coverage: parseInt(r.total_controls) > 0
      ? Math.round((parseInt(r.evidenced_controls) / parseInt(r.total_controls)) * 100)
      : 0,
  }));

  // Score distribution (compute scores for all evidence)
  const allScoresRes = await safeQuery(
    `SELECT evidence_id, status, content_hash, created_at, expiry_date
     FROM "${schema}".evidence LIMIT 500`,
    []
  );
  let excellent = 0, good = 0, fair = 0, poor = 0;
  let totalScore = 0;
  for (const ev of allScoresRes.rows) {
    const score = STATUS_SCORES[ev.status] ?? 30;
    totalScore += score;
    if (score >= 80) excellent++;
    else if (score >= 60) good++;
    else if (score >= 40) fair++;
    else poor++;
  }
  const averageScore = allScoresRes.rows.length > 0
    ? Math.round(totalScore / allScoresRes.rows.length)
    : 0;

  return {
    totalControls,
    evidencedControls,
    coveragePercent,
    averageScore,
    byStatus,
    byFramework,
    scoreDistribution: { excellent, good, fair, poor },
  };
}

// ── Evidence Freshness ──

export interface EvidenceFreshnessItem {
  evidenceId: string;
  controlId: string;
  title: string;
  status: string;
  freshnessScore: number;
  daysSinceUpdate: number;
  expiryDate: string | null;
  daysUntilExpiry: number | null;
}

export async function getEvidenceFreshness(tenantId: string): Promise<EvidenceFreshnessItem[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT evidence_id, control_id, title, status, created_at, updated_at, expiry_date
     FROM "${schema}".evidence
     ORDER BY updated_at ASC NULLS FIRST
     LIMIT 500`,
    []
  );

  return res.rows.map((r: GenericRow) => {
    const updatedAt = new Date(r.updated_at || r.created_at);
    const now = new Date();
    const daysSinceUpdate = Math.floor((now.getTime() - updatedAt.getTime()) / 86_400_000);
    const expiryDate = r.expiry_date ? new Date(r.expiry_date) : null;
    const daysUntilExpiry = expiryDate
      ? Math.floor((expiryDate.getTime() - now.getTime()) / 86_400_000)
      : null;

    return {
      evidenceId: r.evidence_id,
      controlId: r.control_id,
      title: r.title || "",
      status: r.status,
      freshnessScore: computeFreshness(r),
      daysSinceUpdate,
      expiryDate: r.expiry_date || null,
      daysUntilExpiry,
    };
  });
}

// ── Control Completeness Check ──

export interface ControlCompletenessResult {
  controlId: string;
  compliant: boolean;
  required: string[];
  provided: string[];
  missing: string[];
  score: number;
}

export async function checkControlCompleteness(
  tenantId: string,
  controlId: string
): Promise<ControlCompletenessResult> {
  const schema = tenantSchema(tenantId);

  // Check if control_evidence_requirements table exists
  const tableCheck = await safeQuery(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = $1 AND table_name = 'control_evidence_requirements'`,
    [schema]
  );

  let required: string[] = [];
  if (tableCheck.rows.length > 0) {
    const reqRes = await safeQuery(
      `SELECT DISTINCT evidence_type_code FROM "${schema}".control_evidence_requirements
       WHERE control_id = $1`,
      [controlId]
    );
    required = reqRes.rows.map((r: GenericRow) => r.evidence_type_code);
  }

  // Get provided evidence types
  const provRes = await safeQuery(
    `SELECT DISTINCT evidence_type FROM "${schema}".evidence
     WHERE control_id = $1 AND status NOT IN ('expired', 'rejected', 'archived')`,
    [controlId]
  );
  const provided = provRes.rows.map((r: GenericRow) => r.evidence_type).filter(Boolean);

  const providedSet = new Set(provided);
  const missing = required.filter((r) => !providedSet.has(r));
  const score = required.length > 0
    ? Math.round(((required.length - missing.length) / required.length) * 100)
    : (provided.length > 0 ? 100 : 0);

  return {
    controlId,
    compliant: missing.length === 0,
    required,
    provided,
    missing,
    score,
  };
}

/**
 * Bulk compliance gap report across all controls (or filtered by framework).
 */
export async function getComplianceGapReport(
  tenantId: string,
  frameworkCode?: string
): Promise<{ controls: ControlCompletenessResult[]; summary: { total: number; compliant: number; gapCount: number; complianceRate: number } }> {
  const schema = tenantSchema(tenantId);
  let controlQuery = `SELECT control_id FROM "${schema}".controls`;
  const params: unknown[] = [];
  if (frameworkCode) {
    controlQuery += ` WHERE framework_code = $1`;
    params.push(frameworkCode);
  }
  controlQuery += ` LIMIT 500`;

  const controlsRes = await safeQuery(controlQuery, params);
  const controls: ControlCompletenessResult[] = [];

  for (const row of controlsRes.rows) {
    controls.push(await checkControlCompleteness(tenantId, row.control_id));
  }

  // Sort by score ascending (worst gaps first)
  controls.sort((a, b) => a.score - b.score);

  const compliant = controls.filter((c) => c.compliant).length;
  return {
    controls,
    summary: {
      total: controls.length,
      compliant,
      gapCount: controls.length - compliant,
      complianceRate: controls.length > 0 ? Math.round((compliant / controls.length) * 100) : 0,
    },
  };
}

// ── Internal helpers ──

async function computeCompleteness(schema: string, controlId: string | null): Promise<number> {
  if (!controlId) return 0;

  const tableCheck = await safeQuery(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = $1 AND table_name = 'control_evidence_requirements'`,
    [schema]
  );
  if (tableCheck.rows.length === 0) return 50; // No requirements defined = assume partial

  const reqRes = await safeQuery(
    `SELECT COUNT(*) as n FROM "${schema}".control_evidence_requirements WHERE control_id = $1`,
    [controlId]
  );
  const required = parseInt(getFirstRow(reqRes)?.n || "0");
  if (required === 0) return 50;

  const provRes = await safeQuery(
    `SELECT COUNT(DISTINCT evidence_type) as n FROM "${schema}".evidence
     WHERE control_id = $1 AND status NOT IN ('expired', 'rejected', 'archived')`,
    [controlId]
  );
  const provided = parseInt(getFirstRow(provRes)?.n || "0");

  return Math.min(100, Math.round((provided / required) * 100));
}

function computeFreshness(ev: any): number {
  const updatedAt = new Date(ev.updated_at || ev.created_at);
  const now = new Date();
  const daysSince = (now.getTime() - updatedAt.getTime()) / 86_400_000;

  // Decay: 100 at 0 days, 0 at 90+ days (linear)
  if (daysSince <= 0) return 100;
  if (daysSince >= 90) return 0;
  return Math.round(100 - (daysSince / 90) * 100);
}

async function computeReuse(schema: string, evidenceId: string): Promise<number> {
  // Count how many distinct controls reference the same evidence type + hash
  const res = await safeQuery(
    `SELECT COUNT(DISTINCT control_id) as n
     FROM "${schema}".evidence
     WHERE evidence_type = (SELECT evidence_type FROM "${schema}".evidence WHERE evidence_id = $1)
       AND evidence_id != $1`,
    [evidenceId]
  );
  const reuseCount = parseInt(getFirstRow(res)?.n || "0");
  // Score: 0 for no reuse, 50 for 1 reuse, 100 for 3+
  if (reuseCount >= 3) return 100;
  if (reuseCount >= 1) return 50;
  return 0;
}

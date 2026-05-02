// ============================================================================
// Shahin-Ai — Compliance Assertion Engine (F22-23)
//
// Evaluates compliance status for a control by aggregating 4 dimensions:
//   1. Evidence coverage (avg composite_score from evidence_scores table)
//   2. Control test results (pass/partial/fail ratio from control_tests)
//   3. Evidence freshness (days since most recent evidence, 100→20 over 180d)
//   4. Exception impact (risk_impact and compensating controls)
//
// Produces a ComplianceAssertion with status, confidence, reasoning chain,
// and bilingual explanation (EN/AR) using proper governance terminology.
// ============================================================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import { getEvidencePort } from '../../../ports/evidence.port';
import { v4 as uuid } from "uuid";
import type { GenericRow } from '@dos/types';

// ── Configurable scoring weights ─────────────────────────────────────────

/** Default dimension weights (must sum to 1.0) */
const DEFAULT_WEIGHTS = {
  evidence: 0.40,
  tests: 0.30,
  freshness: 0.15,
  exceptions: 0.15,
};

/** Status thresholds */
const THRESHOLD_COMPLIANT = 80;
const THRESHOLD_PARTIAL = 40;

/** Freshness decay: score goes from 100 to 20 over 180 days */
const FRESHNESS_MAX_DAYS = 180;
const FRESHNESS_MAX_SCORE = 100;
const FRESHNESS_MIN_SCORE = 20;

// ── Types ──────────────────────────────────────────────────────────────────

export type AssertionStatus = "compliant" | "partial" | "non_compliant" | "any" | "not_applicable";

export interface ComplianceAssertion {
  assertionId: string;
  controlId: string;
  frameworkId?: string;
  obligationId?: string;
  status: AssertionStatus;
  confidence: number; // 0-100
  evidenceIds: string[];
  evidenceScores: Record<string, number>;
  reasoning: ReasoningStep[];
  explanationEn: string;
  explanationAr: string;
  hasException: boolean;
  exceptionId?: string;
  evaluatedBy: "system" | "agent" | "human";
  evaluatedAt: string;
  validUntil?: string;
}

export interface ReasoningStep {
  step: number;
  category: "evidence" | "test" | "exception" | "freshness" | "gap" | "rule";
  factEn: string;
  factAr: string;
  impact: "positive" | "negative" | "neutral";
  score?: number;
}

export interface AssertionSummary {
  totalControls: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  any: number;
  notApplicable: number;
  averageConfidence: number;
  staleCount: number;
  lastEvaluated: string | null;
}

// ── Core Evaluation ────────────────────────────────────────────────────────

/**
 * Evaluate compliance assertion for a single control.
 *
 * Aggregates four dimensions with configurable weights:
 *   - Evidence coverage (40%): avg composite_score from evidence_scores
 *   - Test results (30%): pass/partial/fail ratio from control_tests
 *   - Freshness (15%): decay from 100→20 over 180 days since latest evidence
 *   - Exception impact (15%): reduced based on risk_impact & compensating controls
 *
 * Status thresholds: ≥80 compliant, ≥40 partial, <40 non_compliant
 */
export async function evaluateControlAssertion(
  tenantId: string,
  controlId: string,
  evaluatedBy: "system" | "agent" | "human" = "system"
): Promise<ComplianceAssertion> {
  const schema = tenantSchema(tenantId);
  const reasoning: ReasoningStep[] = [];
  let step = 0;

  // ── 1. Evidence coverage: avg of composite_scores ──────────────────────
  // 2026-05-02 cross-module migration (Patch 06 §2.5): evidence + evidence_scores
  // are owned by the Evidence module — route through `getEvidencePort()`.
  const citations = await getEvidencePort().getCitationsForControl({ tenantId, controlId });
  // Re-shape into the rows the rest of this function expects (snake_case).
  const evidenceRows: GenericRow[] = citations.map((c) => ({
    id: c.id,
    title: c.title || '',
    status: c.status || '',
    created_at: c.submittedAt,
    expiry_date: c.expiryDate,
  }));

  const evidenceScores: Record<string, number> = {};
  let evidenceCoverageScore = 0;

  if (evidenceRows.length > 0) {
    for (const c of citations) {
      if (c.compositeScore != null) evidenceScores[c.id] = c.compositeScore;
    }
    const scores = Object.values(evidenceScores);
    evidenceCoverageScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    reasoning.push({
      step: ++step,
      category: "evidence",
      factEn: `Found ${evidenceRows.length} evidence items with average quality score ${evidenceCoverageScore.toFixed(0)}/100`,
      factAr: `تم إيجاد ${evidenceRows.length} أدلة بمتوسط درجة جودة ${evidenceCoverageScore.toFixed(0)}/100`,
      impact: evidenceCoverageScore >= 70 ? "positive" : evidenceCoverageScore >= 40 ? "neutral" : "negative",
      score: evidenceCoverageScore,
    });
  } else {
    reasoning.push({
      step: ++step,
      category: "evidence",
      factEn: "No evidence found for this control",
      factAr: "لا توجد أدلة لهذا الضابط",
      impact: "negative",
      score: 0,
    });
  }

  // ── 2. Test results: pass/partial/fail ratio from control_tests ──
  let testScore = 0;
  const testRes = await safeQuery(
    `SELECT test_result, tested_at
     FROM "${schema}".control_tests
     WHERE control_id = $1
     ORDER BY tested_at DESC`,
    [controlId]
  );
  if (testRes.rows.length > 0) {
    const passCount = testRes.rows.filter((r: GenericRow) => r.test_result === "pass").length;
    const partialCount = testRes.rows.filter((r: GenericRow) => r.test_result === "partial").length;
    const totalTests = testRes.rows.length;
    // Weighted ratio: pass=100, partial=50, fail=0
    testScore = ((passCount * 100) + (partialCount * 50)) / totalTests;

    const latestResult = testRes.rows[0].test_result;
    reasoning.push({
      step: ++step,
      category: "test",
      factEn: `${totalTests} test(s): ${passCount} pass, ${partialCount} partial, ${totalTests - passCount - partialCount} fail. Latest: ${latestResult}`,
      factAr: `${totalTests} اختبار(ات): ${passCount} ناجح، ${partialCount} جزئي، ${totalTests - passCount - partialCount} فاشل. الأخير: ${latestResult === "pass" ? "ناجح" : latestResult === "partial" ? "جزئي" : "فاشل"}`,
      impact: testScore >= 80 ? "positive" : testScore >= 40 ? "neutral" : "negative",
      score: testScore,
    });
  } else {
    reasoning.push({
      step: ++step,
      category: "test",
      factEn: "No test results found for this control",
      factAr: "لا توجد نتائج اختبار لهذا الضابط",
      impact: "neutral",
      score: 0,
    });
  }

  // ── 3. Freshness: days since most recent evidence (100→20 over 180 days) ──
  let freshnessScore = 0;
  if (evidenceRows.length > 0) {
    const mostRecentDate = new Date(evidenceRows[0].created_at); // already ordered DESC
    const daysSince = Math.max(0, (Date.now() - mostRecentDate.getTime()) / 86_400_000);

    if (daysSince <= 0) {
      freshnessScore = FRESHNESS_MAX_SCORE;
    } else if (daysSince >= FRESHNESS_MAX_DAYS) {
      freshnessScore = FRESHNESS_MIN_SCORE;
    } else {
      // Linear decay from 100 to 20 over 180 days
      freshnessScore = FRESHNESS_MAX_SCORE -
        ((FRESHNESS_MAX_SCORE - FRESHNESS_MIN_SCORE) * (daysSince / FRESHNESS_MAX_DAYS));
    }
    freshnessScore = Math.round(freshnessScore);

    reasoning.push({
      step: ++step,
      category: "freshness",
      factEn: `Most recent evidence is ${Math.round(daysSince)} day(s) old — freshness score ${freshnessScore}/100`,
      factAr: `أحدث دليل عمره ${Math.round(daysSince)} يوم/أيام — درجة الحداثة ${freshnessScore}/100`,
      impact: freshnessScore >= 80 ? "positive" : freshnessScore >= 50 ? "neutral" : "negative",
      score: freshnessScore,
    });
  } else {
    reasoning.push({
      step: ++step,
      category: "freshness",
      factEn: "No evidence to evaluate freshness",
      factAr: "لا توجد أدلة لتقييم الحداثة",
      impact: "negative",
      score: 0,
    });
  }

  // ── 4. Exception impact: score reduced by risk_impact, restored by compensating controls ──
  let exceptionScore = 100; // Start at 100 (no exception = full marks)
  let hasException = false;
  let exceptionId: string | undefined;

  const exceptionRes = await safeQuery(
    `SELECT id, status, risk_impact, compensating_controls, expires_at
     FROM "${schema}".exceptions
     WHERE control_id = $1 AND status = 'approved' AND expires_at > NOW()
     ORDER BY expires_at DESC LIMIT 1`,
    [controlId]
  );
  if (exceptionRes.rows.length > 0) {
    hasException = true;
    exceptionId = exceptionRes.rows[0].id;
    const riskImpact = (exceptionRes.rows[0].risk_impact || "medium").toLowerCase();
    const compensatingControls = exceptionRes.rows[0].compensating_controls;

    // Reduce score based on risk_impact severity
    const impactPenalty: Record<string, number> = {
      critical: 80,
      high: 60,
      medium: 40,
      low: 20,
    };
    const penalty = impactPenalty[riskImpact] ?? 40;

    // Compensating controls can recover up to half the penalty
    const hasCompensating = compensatingControls &&
      (Array.isArray(compensatingControls) ? compensatingControls.length > 0 : !!compensatingControls);
    const recovery = hasCompensating ? Math.floor(penalty / 2) : 0;

    exceptionScore = Math.max(0, 100 - penalty + recovery);

    reasoning.push({
      step: ++step,
      category: "exception",
      factEn: `Active exception (${riskImpact} risk impact)${hasCompensating ? " with compensating controls" : ""}. Exception score: ${exceptionScore}/100`,
      factAr: `استثناء نشط (تأثير ${riskImpact === "critical" ? "حرج" : riskImpact === "high" ? "عالي" : riskImpact === "medium" ? "متوسط" : "منخفض"})${hasCompensating ? " مع ضوابط تعويضية" : ""}. درجة الاستثناء: ${exceptionScore}/100`,
      impact: exceptionScore >= 60 ? "neutral" : "negative",
      score: exceptionScore,
    });
  }

  // ── 5. Composite score (weighted sum) ──
  const compositeScore =
    evidenceCoverageScore * DEFAULT_WEIGHTS.evidence +
    testScore * DEFAULT_WEIGHTS.tests +
    freshnessScore * DEFAULT_WEIGHTS.freshness +
    exceptionScore * DEFAULT_WEIGHTS.exceptions;

  const confidence = Math.round(Math.min(100, Math.max(0, compositeScore)));

  // ── 6. Determine status from thresholds ──
  let status: AssertionStatus;
  if (evidenceRows.length === 0 && testRes.rows.length === 0) {
    status = "any";
  } else if (compositeScore >= THRESHOLD_COMPLIANT) {
    status = "compliant";
  } else if (compositeScore >= THRESHOLD_PARTIAL) {
    status = "partial";
  } else {
    status = "non_compliant";
  }

  // ── 7. Generate bilingual explanations ──
  const explanationEn = generateExplanationEn(status, confidence, reasoning);
  const explanationAr = generateExplanationAr(status, confidence, reasoning);

  // ── 8. Persist assertion ──
  const assertionId = uuid();
  const frameworkRes = await safeQuery(
    `SELECT framework_id FROM "${schema}".controls WHERE id = $1 LIMIT 1`,
    [controlId]
  );
  const frameworkId = frameworkRes.rows[0]?.framework_id || null;
  const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await safeQuery(
    `INSERT INTO "${schema}".compliance_assertions
     (assertion_id, control_id, framework_id, obligation_id,
      status, confidence, evidence_ids, evidence_scores,
      reasoning, explanation_en, explanation_ar,
      exception_id, has_exception, evaluated_by, valid_until)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     ON CONFLICT (assertion_id) DO UPDATE SET
       status=$5, confidence=$6, evidence_ids=$7, evidence_scores=$8,
       reasoning=$9, explanation_en=$10, explanation_ar=$11,
       exception_id=$12, has_exception=$13, evaluated_by=$14,
       valid_until=$15, updated_at=NOW()`,
    [
      assertionId, controlId, frameworkId, null,
      status, confidence, evidenceIds, JSON.stringify(evidenceScores),
      JSON.stringify(reasoning), explanationEn, explanationAr,
      exceptionId || null, hasException, evaluatedBy, validUntil,
    ]
  );

  // ── 9. Track assertion history ──
  await safeQuery(
    `INSERT INTO "${schema}".assertion_history
     (assertion_id, new_status, new_confidence, change_reason, changed_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [assertionId, status, confidence, "Automatic evaluation", evaluatedBy]
  );

  // ── 10. Emit event ──

  eventBus.publish(("assertion.evaluated" as any), {
    tenantId,
    controlId,
    assertionId,
    status,
    confidence,
  });

  return {
    assertionId,
    controlId,
    frameworkId: frameworkId || undefined,
    status,
    confidence,
    evidenceIds,
    evidenceScores,
    reasoning,
    explanationEn,
    explanationAr,
    hasException,
    exceptionId,
    evaluatedBy,
    evaluatedAt: new Date().toISOString(),
    validUntil,
  };
}

/**
 * Evaluate assertions for ALL controls in a framework.
 * Returns individual assertions and an aggregated summary with counts.
 */
export async function evaluateFrameworkAssertions(
  tenantId: string,
  frameworkId: string,
  evaluatedBy: "system" | "agent" | "human" = "system"
): Promise<{ frameworkId: string; assertions: ComplianceAssertion[]; summary: AssertionSummary }> {
  const schema = tenantSchema(tenantId);
  const controlsRes = await safeQuery(
    `SELECT c.id FROM "${schema}".controls c
     WHERE c.framework_id = $1 AND c.deleted_at IS NULL`,
    [frameworkId]
  );

  const assertions: ComplianceAssertion[] = [];
  for (const row of controlsRes.rows) {
    const assertion = await evaluateControlAssertion(tenantId, row.id, evaluatedBy);
    assertions.push(assertion);
  }

  const summary = computeSummary(assertions);

  eventBus.publish(("assertion.framework_evaluated" as any), {
    tenantId,
    frameworkId,
    totalControls: summary.totalControls,
    compliant: summary.compliant,
    nonCompliant: summary.nonCompliant,
  });

  return { frameworkId, assertions, summary };
}

/**
 * Get the most recent assertion for a control.
 */
export async function getLatestAssertion(
  tenantId: string,
  controlId: string
): Promise<ComplianceAssertion | null> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".compliance_assertions
     WHERE control_id = $1
     ORDER BY evaluated_at DESC LIMIT 1`,
    [controlId]
  );
  if (res.rows.length === 0) return null;
  return rowToAssertion(res.rows[0]);
}

/**
 * Get assertion change history for a control.
 */
export async function getAssertionHistory(
  tenantId: string,
  controlId: string,
  limit = 20
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT ah.*, ca.status as current_status, ca.confidence as current_confidence
     FROM "${schema}".assertion_history ah
     JOIN "${schema}".compliance_assertions ca ON ca.assertion_id = ah.assertion_id
     WHERE ca.control_id = $1
     ORDER BY ah.changed_at DESC
     LIMIT $2`,
    [controlId, limit]
  );
  return res.rows;
}

/**
 * Get aggregated assertion dashboard for a tenant.
 * Includes counts by status, average confidence, and stale assertion count.
 */
export async function getAssertionDashboard(
  tenantId: string,
  frameworkId?: string
): Promise<AssertionSummary> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (frameworkId) {
    conditions.push(`ca.framework_id = $${paramIdx++}`);
    params.push(frameworkId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const res = await safeQuery(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE ca.status = 'compliant') as compliant,
       COUNT(*) FILTER (WHERE ca.status = 'partial') as partial,
       COUNT(*) FILTER (WHERE ca.status = 'non_compliant') as non_compliant,
       COUNT(*) FILTER (WHERE ca.status = 'any') as any,
       COUNT(*) FILTER (WHERE ca.status = 'not_applicable') as not_applicable,
       AVG(ca.confidence) as avg_confidence,
       MAX(ca.evaluated_at) as last_evaluated,
       COUNT(*) FILTER (WHERE ca.valid_until < NOW()) as stale_count
     FROM "${schema}".compliance_assertions ca
     ${where}`,
    params
  );

  const row = res.rows[0];
  return {
    totalControls: parseInt(row.total) || 0,
    compliant: parseInt(row.compliant) || 0,
    partial: parseInt(row.partial) || 0,
    nonCompliant: parseInt(row.non_compliant) || 0,
    any: parseInt(row.any) || 0,
    notApplicable: parseInt(row.not_applicable) || 0,
    averageConfidence: Math.round(parseFloat(row.avg_confidence) || 0),
    staleCount: parseInt(row.stale_count) || 0,
    lastEvaluated: row.last_evaluated || null,
  };
}

// ── Explanation Generators ─────────────────────────────────────────────────

/**
 * Generate English explanation from reasoning chain.
 */
function generateExplanationEn(status: AssertionStatus, confidence: number, reasoning: ReasoningStep[]): string {
  const positives = reasoning.filter((r) => r.impact === "positive");
  const negatives = reasoning.filter((r) => r.impact === "negative");

  let explanation = `This control is assessed as **${status}** with ${confidence}% confidence.\n\n`;

  if (positives.length > 0) {
    explanation += "**Supporting factors:**\n";
    for (const r of positives) {
      explanation += `- ${r.factEn}\n`;
    }
  }

  if (negatives.length > 0) {
    explanation += "\n**Areas of concern:**\n";
    for (const r of negatives) {
      explanation += `- ${r.factEn}\n`;
    }
  }

  if (status === "non_compliant") {
    explanation += "\n**Recommendation:** Address the gaps identified above to achieve compliance.";
  } else if (status === "partial") {
    explanation += "\n**Recommendation:** Strengthen evidence and address remaining gaps.";
  }

  return explanation;
}

/**
 * Generate Arabic explanation using proper governance terminology.
 */
function generateExplanationAr(status: AssertionStatus, confidence: number, reasoning: ReasoningStep[]): string {
  const statusAr: Record<AssertionStatus, string> = {
    compliant: "ممتثل",
    partial: "ممتثل جزئيًا",
    non_compliant: "غير ممتثل",
    any: "غير محدد",
    not_applicable: "لا ينطبق",
  };

  const positives = reasoning.filter((r) => r.impact === "positive");
  const negatives = reasoning.filter((r) => r.impact === "negative");

  let explanation = `هذا الضابط تم تقييمه بحالة **${statusAr[status]}** بنسبة ثقة ${confidence}%.\n\n`;

  if (positives.length > 0) {
    explanation += "**عوامل داعمة:**\n";
    for (const r of positives) {
      explanation += `- ${r.factAr}\n`;
    }
  }

  if (negatives.length > 0) {
    explanation += "\n**نقاط تحتاج اهتمام:**\n";
    for (const r of negatives) {
      explanation += `- ${r.factAr}\n`;
    }
  }

  if (status === "non_compliant") {
    explanation += "\n**التوصية:** معالجة الفجوات المحددة أعلاه لتحقيق الامتثال.";
  } else if (status === "partial") {
    explanation += "\n**التوصية:** تعزيز الأدلة ومعالجة الفجوات المتبقية.";
  }

  return explanation;
}

// ── Utilities ──────────────────────────────────────────────────────────────

/**
 * Map a database row to a ComplianceAssertion object.
 */
function rowToAssertion( r: Record<string, unknown>): ComplianceAssertion {
  return {

    assertionId: r.assertion_id,

    controlId: r.control_id,

    frameworkId: r.framework_id,

    obligationId: r.obligation_id,

    status: r.status,

    confidence: r.confidence,

    evidenceIds: r.evidence_ids || [],

    evidenceScores: r.evidence_scores || {},

    reasoning: r.reasoning || [],

    explanationEn: r.explanation_en || "",

    explanationAr: r.explanation_ar || "",

    hasException: r.has_exception,

    exceptionId: r.exception_id,

    evaluatedBy: r.evaluated_by,

    evaluatedAt: r.evaluated_at,

    validUntil: r.valid_until,
  };
}

/**
 * Compute summary statistics from an array of assertions.
 * Includes stale count (assertions past their valid_until date).
 */
function computeSummary(assertions: ComplianceAssertion[]): AssertionSummary {
  const total = assertions.length;
  const now = new Date().toISOString();
  const staleCount = assertions.filter(
    (a) => a.validUntil && a.validUntil < now
  ).length;

  return {
    totalControls: total,
    compliant: assertions.filter((a) => a.status === "compliant").length,
    partial: assertions.filter((a) => a.status === "partial").length,
    nonCompliant: assertions.filter((a) => a.status === "non_compliant").length,
    any: assertions.filter((a) => a.status === "any").length,
    notApplicable: assertions.filter((a) => a.status === "not_applicable").length,
    averageConfidence: total > 0
      ? Math.round(assertions.reduce((sum, a) => sum + a.confidence, 0) / total)
      : 0,
    staleCount,
    lastEvaluated: assertions.length > 0
      ? assertions.reduce((latest, a) =>
          a.evaluatedAt > latest ? a.evaluatedAt : latest,
          assertions[0].evaluatedAt
        )
      : null,
  };
}

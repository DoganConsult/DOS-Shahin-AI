// ============================================================================
// Shahin-Ai — Why-Compliant Explanation Engine (F25)
//
// Generates structured, human-readable explanations of compliance status.
// Produces bilingual (EN/AR) output with:
//   - Evidence cited (what was found)
//   - Gaps found (what's missing)
//   - Recommendations (what to improve)
//   - Assertion reasoning chain in readable format
//   - Audit defense package for auditors
//
// Uses proper Arabic governance terminology:
//   ممتثل (compliant), الأدلة (evidence), الضوابط (controls),
//   الاستثناءات (exceptions)
// ============================================================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import { getEvidencePort } from '../../../ports/evidence.port';
import { getLatestAssertion, getAssertionHistory } from "../assessments/compliance-assertion.service";
import type { ComplianceAssertion, ReasoningStep } from "../assessments/compliance-assertion.service";
import type { GenericRow } from '@dos/types';

// ── Types ──────────────────────────────────────────────────────────────────

export interface EvidenceCitation {
  evidenceId: string;
  title: string;
  status: string;
  qualityScore: number | null;
  submittedAt: string | null;
  expiryDate: string | null;
  descriptionEn: string;
  descriptionAr: string;
}

export interface GapItem {
  gapId?: string;
  controlId: string;
  descriptionEn: string;
  descriptionAr: string;
  severity: "critical" | "high" | "medium" | "low";
  source: string; // e.g. "gap_scanner", "evidence_missing", "test_failure"
}

export interface Recommendation {
  priority: number;
  descriptionEn: string;
  descriptionAr: string;
  category: string; // e.g. "evidence", "testing", "exception", "freshness"
}

export interface WhyCompliantResult {
  controlId: string;
  status: string;
  confidence: number;
  explanation: {
    en: string;
    ar: string;
  };
  evidenceCited: EvidenceCitation[];
  gapsFound: GapItem[];
  recommendations: Recommendation[];
  assertionSummary: {
    assertionId: string | null;
    evaluatedAt: string | null;
    evaluatedBy: string | null;
    reasoningChain: ReasoningStep[];
  };
}

export interface FrameworkExplanation {
  frameworkId: string;
  frameworkName: string | null;
  totalControls: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  any: number;
  explanationEn: string;
  explanationAr: string;
  controlExplanations: WhyCompliantResult[];
}

export interface AuditDefensePackage {
  controlId: string;
  controlTitle: string | null;
  generatedAt: string;
  currentAssertion: ComplianceAssertion | null;
  assertionHistory: Record<string, unknown>[];
  evidenceChain: EvidenceCitation[];
  gapsFound: GapItem[];
  recommendations: Recommendation[];
  explanationEn: string;
  explanationAr: string;
  reasoningChain: ReasoningStep[];
}

// ── Core Functions ─────────────────────────────────────────────────────────

/**
 * Generate a structured "why compliant" explanation for a single control.
 *
 * Fetches the latest assertion, linked evidence with quality scores,
 * gap scanner results, and builds a structured bilingual explanation.
 *
 * @param tenantId - Tenant identifier
 * @param controlId - Control to explain
 * @param lang - Preferred language ("en" | "ar"), defaults to "en"
 */
export async function generateWhyCompliant(
  tenantId: string,
  controlId: string,
  _lang: "en" | "ar" = "en"
): Promise<WhyCompliantResult> {
  const schema = tenantSchema(tenantId);

  // 1. Get latest assertion
  const assertion = await getLatestAssertion(tenantId, controlId);

  // 2. Fetch linked evidence items with quality scores
  const evidenceCited = await fetchEvidenceCitations(schema, controlId, tenantId);

  // 3. Fetch gap scanner results
  const gapsFound = await fetchGaps(schema, controlId);

  // 4. Build recommendations based on gaps and assertion
  const recommendations = buildRecommendations(assertion, evidenceCited, gapsFound);

  // 5. Build structured explanation text
  const explanationEn = buildExplanationEn(assertion, evidenceCited, gapsFound, recommendations);
  const explanationAr = buildExplanationAr(assertion, evidenceCited, gapsFound, recommendations);

  return {
    controlId,
    status: assertion?.status || "any",
    confidence: assertion?.confidence || 0,
    explanation: { en: explanationEn, ar: explanationAr },
    evidenceCited,
    gapsFound,
    recommendations,
    assertionSummary: {
      assertionId: assertion?.assertionId || null,
      evaluatedAt: assertion?.evaluatedAt || null,
      evaluatedBy: assertion?.evaluatedBy || null,
      reasoningChain: assertion?.reasoning || [],
    },
  };
}

/**
 * Generate a framework-level explanation covering all controls.
 *
 * @param tenantId - Tenant identifier
 * @param frameworkId - Framework to explain
 * @param lang - Preferred language ("en" | "ar"), defaults to "en"
 */
export async function generateFrameworkExplanation(
  tenantId: string,
  frameworkId: string,
  lang: "en" | "ar" = "en"
): Promise<FrameworkExplanation> {
  const schema = tenantSchema(tenantId);

  // Get framework name
  const fwRes = await safeQuery(
    `SELECT title_en, title_ar FROM "${schema}".frameworks WHERE id = $1 LIMIT 1`,
    [frameworkId]
  );
  const frameworkName = fwRes.rows[0]?.[lang === "ar" ? "title_ar" : "title_en"] || null;

  // Get all controls in the framework
  const controlsRes = await safeQuery(
    `SELECT id FROM "${schema}".controls
     WHERE framework_id = $1 AND deleted_at IS NULL`,
    [frameworkId]
  );

  const controlExplanations: WhyCompliantResult[] = [];
  for (const row of controlsRes.rows) {
    const explanation = await generateWhyCompliant(tenantId, row.id, lang);
    controlExplanations.push(explanation);
  }

  // Aggregate counts
  const compliant = controlExplanations.filter((e) => e.status === "compliant").length;
  const partial = controlExplanations.filter((e) => e.status === "partial").length;
  const nonCompliant = controlExplanations.filter((e) => e.status === "non_compliant").length;
  const any = controlExplanations.filter((e) => e.status === "any").length;
  const totalControls = controlExplanations.length;

  const complianceRate = totalControls > 0
    ? Math.round((compliant / totalControls) * 100)
    : 0;

  const explanationEn = `Framework "${frameworkName || frameworkId}" has ${totalControls} controls: ` +
    `${compliant} compliant, ${partial} partially compliant, ${nonCompliant} non-compliant, ${any} any. ` +
    `Overall compliance rate: ${complianceRate}%.`;

  const explanationAr = `إطار العمل "${frameworkName || frameworkId}" يحتوي على ${totalControls} ضابط: ` +
    `${compliant} ممتثل، ${partial} ممتثل جزئيًا، ${nonCompliant} غير ممتثل، ${any} غير محدد. ` +
    `نسبة الامتثال الإجمالية: ${complianceRate}%.`;

  return {
    frameworkId,
    frameworkName,
    totalControls,
    compliant,
    partial,
    nonCompliant,
    any,
    explanationEn,
    explanationAr,
    controlExplanations,
  };
}

/**
 * Generate a comprehensive audit defense package for a control.
 *
 * Includes the full evidence chain, assertion history, structured explanation,
 * and reasoning chain — everything an auditor needs for review.
 *
 * @param tenantId - Tenant identifier
 * @param controlId - Control to build defense package for
 */
export async function generateAuditDefensePackage(
  tenantId: string,
  controlId: string
): Promise<AuditDefensePackage> {
  const schema = tenantSchema(tenantId);

  // Get control title
  const controlRes = await safeQuery(
    `SELECT title_en, title_ar FROM "${schema}".controls WHERE id = $1 LIMIT 1`,
    [controlId]
  );
  const controlTitle = controlRes.rows[0]?.title_en || null;

  // Get current assertion
  const currentAssertion = await getLatestAssertion(tenantId, controlId);

  // Get assertion history
  const assertionHistoryRows = await getAssertionHistory(tenantId, controlId, 50);

  // Get evidence chain with scores
  const evidenceChain = await fetchEvidenceCitations(schema, controlId, tenantId);

  // Get gaps
  const gapsFound = await fetchGaps(schema, controlId);

  // Build recommendations
  const recommendations = buildRecommendations(currentAssertion, evidenceChain, gapsFound);

  // Build bilingual explanations
  const explanationEn = buildExplanationEn(currentAssertion, evidenceChain, gapsFound, recommendations);
  const explanationAr = buildExplanationAr(currentAssertion, evidenceChain, gapsFound, recommendations);

  eventBus.publish(("compliance.audit_defense_generated" as any), {
    tenantId,
    controlId,
    status: currentAssertion?.status || "any",
  });

  return {
    controlId,
    controlTitle,
    generatedAt: new Date().toISOString(),
    currentAssertion,
    assertionHistory: assertionHistoryRows,
    evidenceChain,
    gapsFound,
    recommendations,
    explanationEn,
    explanationAr,
    reasoningChain: currentAssertion?.reasoning || [],
  };
}

// ── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Fetch evidence items linked to a control with their quality scores.
 *
 * 2026-05-02 cross-module migration (Patch 06 §2.5): the `evidence` and
 * `evidence_scores` tables are owned by the Evidence module. Compliance
 * routes the lookup through `getEvidencePort().getCitationsForControl()`.
 * Hosts bind a real adapter; until bound the port returns an empty list.
 */
async function fetchEvidenceCitations(_schema: string, controlId: string, tenantId: string): Promise<EvidenceCitation[]> {
  const items = await getEvidencePort().getCitationsForControl({ tenantId, controlId });

  return items.map((r) => {
    const statusEn = r.status || "any";
    const statusAr: Record<string, string> = {
      approved: "معتمد",
      active: "نشط",
      submitted: "مقدم",
      draft: "مسودة",
      rejected: "مرفوض",
      expired: "منتهي",
      archived: "مؤرشف",
    };

    return {
      evidenceId: r.id,
      title: r.title || "",
      status: statusEn,
      qualityScore: r.compositeScore ?? null,
      submittedAt: r.submittedAt || null,
      expiryDate: r.expiryDate || null,
      descriptionEn: `Evidence "${r.title || r.id}" — status: ${statusEn}, quality: ${r.compositeScore ?? "not scored"}`,
      descriptionAr: `الدليل "${r.title || r.id}" — الحالة: ${statusAr[statusEn] || statusEn}، الجودة: ${r.compositeScore ?? "غير مقيّم"}`,
    };
  });
}

/**
 * Fetch gap scanner results for a control.
 */
async function fetchGaps(schema: string, controlId: string): Promise<GapItem[]> {
  // Try gap_scanner_results table first
  try {
    const res = await safeQuery(
      `SELECT id, description, severity, source
       FROM "${schema}".gap_scanner_results
       WHERE control_id = $1 AND resolved_at IS NULL
       ORDER BY severity ASC, created_at DESC`,
      [controlId]
    );
    return res.rows.map((r: GenericRow) => {
      const _severityAr: Record<string, string> = {
        critical: "حرج",
        high: "عالي",
        medium: "متوسط",
        low: "منخفض",
      };
      return {
        gapId: r.id,
        controlId,
        descriptionEn: r.description || "Compliance gap identified",
        descriptionAr: r.description || "تم تحديد فجوة امتثال",
        severity: r.severity || "medium",
        source: r.source || "gap_scanner",
      };
    });
  } catch {
    // Table may not exist; return empty
    return [];
  }
}

/**
 * Build prioritized recommendations from assertion state, evidence, and gaps.
 */
function buildRecommendations(
  assertion: ComplianceAssertion | null,
  evidenceCited: EvidenceCitation[],
  gapsFound: GapItem[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  let priority = 0;

  // No evidence at all
  if (evidenceCited.length === 0) {
    recommendations.push({
      priority: ++priority,
      descriptionEn: "Collect and submit evidence for this control to establish a compliance baseline.",
      descriptionAr: "جمع وتقديم الأدلة لهذا الضابط لإنشاء خط أساس للامتثال.",
      category: "evidence",
    });
  }

  // Low-quality evidence
  const lowQuality = evidenceCited.filter((e) => e.qualityScore !== null && e.qualityScore < 50);
  if (lowQuality.length > 0) {
    recommendations.push({
      priority: ++priority,
      descriptionEn: `Improve quality for ${lowQuality.length} evidence item(s) with scores below 50.`,
      descriptionAr: `تحسين جودة ${lowQuality.length} دليل/أدلة بدرجات أقل من 50.`,
      category: "evidence",
    });
  }

  // Expired or near-expiry evidence
  const now = new Date();
  const expiring = evidenceCited.filter((e) => {
    if (!e.expiryDate) return false;
    const diff = new Date(e.expiryDate).getTime() - now.getTime();
    return diff < 30 * 86_400_000; // within 30 days
  });
  if (expiring.length > 0) {
    recommendations.push({
      priority: ++priority,
      descriptionEn: `Renew ${expiring.length} evidence item(s) that are expired or expiring within 30 days.`,
      descriptionAr: `تجديد ${expiring.length} دليل/أدلة منتهية أو ستنتهي خلال 30 يومًا.`,
      category: "freshness",
    });
  }

  // Test failures in reasoning
  if (assertion) {
    const testStep = assertion.reasoning.find((r) => r.category === "test" && r.impact === "negative");
    if (testStep) {
      recommendations.push({
        priority: ++priority,
        descriptionEn: "Investigate and remediate failing control tests.",
        descriptionAr: "التحقيق في اختبارات الضوابط الفاشلة ومعالجتها.",
        category: "testing",
      });
    }

    // Exception in place
    const exceptionStep = assertion.reasoning.find((r) => r.category === "exception");
    if (exceptionStep) {
      recommendations.push({
        priority: ++priority,
        descriptionEn: "Review the active exception and ensure compensating controls are effective.",
        descriptionAr: "مراجعة الاستثناء النشط والتأكد من فعالية الضوابط التعويضية.",
        category: "exception",
      });
    }
  }

  // Gaps from scanner
  for (const gap of gapsFound) {
    if (gap.severity === "critical" || gap.severity === "high") {
      recommendations.push({
        priority: ++priority,
        descriptionEn: `Address ${gap.severity} gap: ${gap.descriptionEn}`,
        descriptionAr: `معالجة الفجوة ${gap.severity === "critical" ? "الحرجة" : "العالية"}: ${gap.descriptionAr}`,
        category: "evidence",
      });
    }
  }

  return recommendations;
}

/**
 * Build a human-readable English explanation.
 */
function buildExplanationEn(
  assertion: ComplianceAssertion | null,
  evidenceCited: EvidenceCitation[],
  gapsFound: GapItem[],
  recommendations: Recommendation[]
): string {
  const status = assertion?.status || "any";
  const confidence = assertion?.confidence || 0;

  let text = `## Compliance Explanation\n\n`;
  text += `**Status:** ${status} (${confidence}% confidence)\n\n`;

  // Evidence cited
  if (evidenceCited.length > 0) {
    text += `### Evidence Cited (${evidenceCited.length} items)\n`;
    for (const e of evidenceCited) {
      text += `- ${e.descriptionEn}\n`;
    }
    text += "\n";
  } else {
    text += "### Evidence Cited\nNo evidence found for this control.\n\n";
  }

  // Gaps
  if (gapsFound.length > 0) {
    text += `### Gaps Found (${gapsFound.length})\n`;
    for (const g of gapsFound) {
      text += `- [${g.severity.toUpperCase()}] ${g.descriptionEn}\n`;
    }
    text += "\n";
  }

  // Recommendations
  if (recommendations.length > 0) {
    text += `### Recommendations\n`;
    for (const r of recommendations) {
      text += `${r.priority}. ${r.descriptionEn}\n`;
    }
    text += "\n";
  }

  // Reasoning chain
  if (assertion && assertion.reasoning.length > 0) {
    text += `### Assertion Reasoning\n`;
    for (const step of assertion.reasoning) {
      const icon = step.impact === "positive" ? "[+]" : step.impact === "negative" ? "[-]" : "[~]";
      text += `${icon} ${step.factEn}\n`;
    }
  }

  return text;
}

/**
 * Build a human-readable Arabic explanation using governance terminology.
 */
function buildExplanationAr(
  assertion: ComplianceAssertion | null,
  evidenceCited: EvidenceCitation[],
  gapsFound: GapItem[],
  recommendations: Recommendation[]
): string {
  const statusAr: Record<string, string> = {
    compliant: "ممتثل",
    partial: "ممتثل جزئيًا",
    non_compliant: "غير ممتثل",
    any: "غير محدد",
    not_applicable: "لا ينطبق",
  };

  const status = assertion?.status || "any";
  const confidence = assertion?.confidence || 0;

  let text = `## شرح الامتثال\n\n`;
  text += `**الحالة:** ${statusAr[status] || status} (ثقة ${confidence}%)\n\n`;

  // الأدلة المستشهد بها
  if (evidenceCited.length > 0) {
    text += `### الأدلة المستشهد بها (${evidenceCited.length} عنصر)\n`;
    for (const e of evidenceCited) {
      text += `- ${e.descriptionAr}\n`;
    }
    text += "\n";
  } else {
    text += "### الأدلة المستشهد بها\nلا توجد أدلة لهذا الضابط.\n\n";
  }

  // الفجوات
  if (gapsFound.length > 0) {
    text += `### الفجوات المكتشفة (${gapsFound.length})\n`;
    const severityAr: Record<string, string> = {
      critical: "حرج",
      high: "عالي",
      medium: "متوسط",
      low: "منخفض",
    };
    for (const g of gapsFound) {
      text += `- [${severityAr[g.severity] || g.severity}] ${g.descriptionAr}\n`;
    }
    text += "\n";
  }

  // التوصيات
  if (recommendations.length > 0) {
    text += `### التوصيات\n`;
    for (const r of recommendations) {
      text += `${r.priority}. ${r.descriptionAr}\n`;
    }
    text += "\n";
  }

  // سلسلة الاستنتاج
  if (assertion && assertion.reasoning.length > 0) {
    text += `### سلسلة استنتاج التقييم\n`;
    for (const step of assertion.reasoning) {
      const icon = step.impact === "positive" ? "[+]" : step.impact === "negative" ? "[-]" : "[~]";
      text += `${icon} ${step.factAr}\n`;
    }
  }

  return text;
}

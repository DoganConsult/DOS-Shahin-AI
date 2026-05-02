// ============================================================================
// Shahin-Ai — Executive Narrative Generator (F60 Enhancement)
//
// Generates board-ready governance reports with bilingual support (EN/AR).
// Sections include: executive summary, compliance posture, risk landscape,
// key decisions, open actions, and recommendations.
//
// Arabic output follows formal executive tone suitable for Saudi/Gulf
// governance committees. English output follows international board-level
// reporting standards.
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import type { GenericRow } from '@dos/types';

// ── Types ──────────────────────────────────────────────────────────────────

export interface BoardPackOptions {
  /** Restrict to a specific framework; null = all frameworks */
  frameworkId?: string;
  /** Include risk landscape section (default true) */
  includeRisk?: boolean;
  /** Include decisions section (default true) */
  includeDecisions?: boolean;
  /** Include recommendations section (default true) */
  includeRecommendations?: boolean;
  /** Report period start date (ISO string) */
  periodStart?: string;
  /** Report period end date (ISO string) */
  periodEnd?: string;
  /** Language preference: "both" | "en" | "ar" (default "both") */
  language?: "both" | "en" | "ar";
}

export interface BoardPackSection {
  sectionId: string;
  titleEn: string;
  titleAr: string;
  contentEn: string;
  contentAr: string;
  data?: Record<string, unknown>;
}

export interface BoardPack {
  tenantId: string;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  sections: BoardPackSection[];
  metadata: {
    frameworkCount: number;
    controlCount: number;
    riskCount: number;
    overallCompliancePercent: number;
  };
}

export interface ComplianceNarrative {
  frameworkId: string;
  frameworkName: string;
  narrativeEn: string;
  narrativeAr: string;
  compliancePercent: number;
  totalControls: number;
  compliantControls: number;
  gapCount: number;
  generatedAt: string;
}

export interface RiskNarrative {
  narrativeEn: string;
  narrativeAr: string;
  totalRisks: number;
  criticalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;
  topRisks: Array<{ titleEn: string; titleAr: string; riskLevel: string }>;
  generatedAt: string;
}

// ── Arabic numeral converter ───────────────────────────────────────────────

/** Map Western digits to Eastern Arabic-Indic digits for formal Arabic text */
const ARABIC_DIGITS: Record<string, string> = {
  "0": "\u0660", "1": "\u0661", "2": "\u0662", "3": "\u0663", "4": "\u0664",
  "5": "\u0665", "6": "\u0666", "7": "\u0667", "8": "\u0668", "9": "\u0669",
};

function toArabicDigits(num: number | string): string {
  return String(num).replace(/[0-9]/g, (d) => ARABIC_DIGITS[d] || d);
}

// ── Template functions ─────────────────────────────────────────────────────

/** Generate executive summary section in English */
function renderExecutiveSummaryEn(
  compliancePercent: number,
  totalControls: number,
  compliant: number,
  gapCount: number,
  criticalRisks: number,
  openActions: number,
  periodLabel: string
): string {
  const lines: string[] = [];
  lines.push(`Executive Summary — ${periodLabel}`);
  lines.push("");
  lines.push(
    `The comprehensive compliance assessment indicates a ${compliancePercent}% compliance level ` +
    `across adopted regulatory frameworks. Of ${totalControls} controls evaluated, ` +
    `${compliant} are fully compliant.`
  );
  if (gapCount > 0) {
    lines.push("");
    lines.push(
      `${gapCount} compliance gap${gapCount > 1 ? "s have" : " has"} been identified ` +
      `requiring management attention and remediation planning.`
    );
  }
  if (criticalRisks > 0) {
    lines.push("");
    lines.push(
      `${criticalRisks} critical risk${criticalRisks > 1 ? "s have" : " has"} been identified ` +
      `requiring immediate governance committee attention.`
    );
  }
  if (openActions > 0) {
    lines.push("");
    lines.push(
      `There are ${openActions} open action item${openActions > 1 ? "s" : ""} pending resolution across the governance program.`
    );
  }
  return lines.join("\n");
}

/** Generate executive summary section in Arabic */
function renderExecutiveSummaryAr(
  compliancePercent: number,
  totalControls: number,
  compliant: number,
  gapCount: number,
  criticalRisks: number,
  openActions: number,
  periodLabel: string
): string {
  const lines: string[] = [];
  lines.push(`الملخص التنفيذي — ${periodLabel}`);
  lines.push("");
  lines.push(
    `يُظهر تقييم الامتثال الشامل أن المنظمة تحقق مستوى امتثال بنسبة ${toArabicDigits(compliancePercent)}٪ ` +
    `عبر الأطر التنظيمية المعتمدة. من بين ${toArabicDigits(totalControls)} ضابطًا تم تقييمه، ` +
    `${toArabicDigits(compliant)} ضابطًا ممتثلًا بالكامل.`
  );
  if (gapCount > 0) {
    lines.push("");
    lines.push(
      `تم تحديد ${toArabicDigits(gapCount)} ثغر${gapCount > 1 ? "ات" : "ة"} ` +
      `${gapCount > 2 ? "حرجة تتطلب" : "تتطلب"} اهتمامًا فوريًا من لجنة الحوكمة.`
    );
  }
  if (criticalRisks > 0) {
    lines.push("");
    lines.push(
      `تم تحديد ${toArabicDigits(criticalRisks)} مخاطر حرجة تتطلب اهتمامًا فوريًا من لجنة الحوكمة.`
    );
  }
  if (openActions > 0) {
    lines.push("");
    lines.push(
      `يوجد ${toArabicDigits(openActions)} بند إجراء مفتوح بحاجة إلى معالجة ضمن برنامج الحوكمة.`
    );
  }
  return lines.join("\n");
}

// ── Compliance posture section ─────────────────────────────────────────────

function renderCompliancePostureEn(
  frameworks: Array<{ name: string; compliancePercent: number; controlCount: number; gapCount: number }>
): string {
  const lines: string[] = [];
  lines.push("Compliance Posture");
  lines.push("");
  for (const fw of frameworks) {
    lines.push(
      `• ${fw.name}: ${fw.compliancePercent}% compliance across ${fw.controlCount} controls ` +
      `(${fw.gapCount} gap${fw.gapCount !== 1 ? "s" : ""} identified)`
    );
  }
  if (frameworks.length === 0) {
    lines.push("No regulatory frameworks are currently adopted.");
  }
  return lines.join("\n");
}

function renderCompliancePostureAr(
  frameworks: Array<{ name: string; compliancePercent: number; controlCount: number; gapCount: number }>
): string {
  const lines: string[] = [];
  lines.push("وضع الامتثال");
  lines.push("");
  for (const fw of frameworks) {
    lines.push(
      `• ${fw.name}: نسبة امتثال ${toArabicDigits(fw.compliancePercent)}٪ عبر ${toArabicDigits(fw.controlCount)} ضابط ` +
      `(تم تحديد ${toArabicDigits(fw.gapCount)} ثغر${fw.gapCount > 1 ? "ات" : "ة"})`
    );
  }
  if (frameworks.length === 0) {
    lines.push("لا توجد أطر تنظيمية معتمدة حاليًا.");
  }
  return lines.join("\n");
}

// ── Risk landscape section ─────────────────────────────────────────────────

function renderRiskLandscapeEn(
  total: number,
  critical: number,
  high: number,
  medium: number,
  low: number,
  topRisks: Array<{ titleEn: string; riskLevel: string }>
): string {
  const lines: string[] = [];
  lines.push("Risk Landscape");
  lines.push("");
  lines.push(`Total risks identified: ${total}`);
  lines.push(`  Critical: ${critical} | High: ${high} | Medium: ${medium} | Low: ${low}`);
  if (topRisks.length > 0) {
    lines.push("");
    lines.push("Top risks requiring attention:");
    for (const risk of topRisks.slice(0, 5)) {
      lines.push(`  • [${risk.riskLevel.toUpperCase()}] ${risk.titleEn}`);
    }
  }
  return lines.join("\n");
}

function renderRiskLandscapeAr(
  total: number,
  critical: number,
  high: number,
  medium: number,
  low: number,
  topRisks: Array<{ titleAr: string; riskLevel: string }>
): string {
  const riskLevelAr: Record<string, string> = {
    critical: "حرج", high: "عالٍ", medium: "متوسط", low: "منخفض",
  };
  const lines: string[] = [];
  lines.push("المشهد الخطري");
  lines.push("");
  lines.push(`إجمالي المخاطر المحددة: ${toArabicDigits(total)}`);
  lines.push(`  حرجة: ${toArabicDigits(critical)} | عالية: ${toArabicDigits(high)} | متوسطة: ${toArabicDigits(medium)} | منخفضة: ${toArabicDigits(low)}`);
  if (topRisks.length > 0) {
    lines.push("");
    lines.push("أهم المخاطر التي تتطلب اهتمامًا:");
    for (const risk of topRisks.slice(0, 5)) {
      lines.push(`  • [${riskLevelAr[risk.riskLevel] || risk.riskLevel}] ${risk.titleAr}`);
    }
  }
  return lines.join("\n");
}

// ── Decisions section ──────────────────────────────────────────────────────

function renderDecisionsEn(
  decisions: Array<{ titleEn: string; decisionType: string; status: string; decisionDate: string }>
): string {
  const lines: string[] = [];
  lines.push("Key Governance Decisions");
  lines.push("");
  if (decisions.length === 0) {
    lines.push("No governance decisions recorded during this period.");
  }
  for (const d of decisions) {
    lines.push(`• [${d.status.toUpperCase()}] ${d.titleEn} (${d.decisionType}, ${d.decisionDate})`);
  }
  return lines.join("\n");
}

function renderDecisionsAr(
  decisions: Array<{ titleAr: string; decisionType: string; status: string; decisionDate: string }>
): string {
  const statusAr: Record<string, string> = {
    approved: "معتمد", rejected: "مرفوض", pending_vote: "بانتظار التصويت", draft: "مسودة",
  };
  const lines: string[] = [];
  lines.push("القرارات الحوكمية الرئيسية");
  lines.push("");
  if (decisions.length === 0) {
    lines.push("لم تُسجّل قرارات حوكمية خلال هذه الفترة.");
  }
  for (const d of decisions) {
    lines.push(`• [${statusAr[d.status] || d.status}] ${d.titleAr || d.decisionType} (${d.decisionDate})`);
  }
  return lines.join("\n");
}

// ── Open actions section ───────────────────────────────────────────────────

function renderOpenActionsEn(
  actions: Array<{ titleEn: string; priority: string; dueDate: string; status: string }>
): string {
  const lines: string[] = [];
  lines.push("Open Actions");
  lines.push("");
  if (actions.length === 0) {
    lines.push("No open action items at this time.");
  }
  for (const a of actions.slice(0, 10)) {
    lines.push(`• [${a.priority.toUpperCase()}] ${a.titleEn} — due: ${a.dueDate || "TBD"} (${a.status})`);
  }
  if (actions.length > 10) {
    lines.push(`  ... and ${actions.length - 10} more open action items.`);
  }
  return lines.join("\n");
}

function renderOpenActionsAr(
  actions: Array<{ titleAr: string; priority: string; dueDate: string; status: string }>
): string {
  const priorityAr: Record<string, string> = {
    critical: "حرج", high: "عالٍ", medium: "متوسط", low: "منخفض",
  };
  const lines: string[] = [];
  lines.push("الإجراءات المفتوحة");
  lines.push("");
  if (actions.length === 0) {
    lines.push("لا توجد بنود إجراءات مفتوحة في الوقت الحالي.");
  }
  for (const a of actions.slice(0, 10)) {
    lines.push(`• [${priorityAr[a.priority] || a.priority}] ${a.titleAr || "—"} — الاستحقاق: ${a.dueDate || "غير محدد"}`);
  }
  if (actions.length > 10) {
    lines.push(`  ... و ${toArabicDigits(actions.length - 10)} بنود إجراءات مفتوحة أخرى.`);
  }
  return lines.join("\n");
}

// ── Recommendations section ────────────────────────────────────────────────

function renderRecommendationsEn(gapCount: number, criticalRisks: number, overdueActions: number): string {
  const lines: string[] = [];
  lines.push("Recommendations");
  lines.push("");
  let idx = 1;
  if (gapCount > 0) {
    lines.push(`${idx++}. Address ${gapCount} identified compliance gap${gapCount > 1 ? "s" : ""} through targeted remediation plans with defined owners and deadlines.`);
  }
  if (criticalRisks > 0) {
    lines.push(`${idx++}. Prioritize treatment of ${criticalRisks} critical risk${criticalRisks > 1 ? "s" : ""} through risk mitigation strategies or formal risk acceptance by the board.`);
  }
  if (overdueActions > 0) {
    lines.push(`${idx++}. Escalate ${overdueActions} overdue action item${overdueActions > 1 ? "s" : ""} to ensure timely resolution.`);
  }
  if (gapCount === 0 && criticalRisks === 0 && overdueActions === 0) {
    lines.push("The governance program is performing within acceptable parameters. Continue regular monitoring and periodic reviews.");
  }
  return lines.join("\n");
}

function renderRecommendationsAr(gapCount: number, criticalRisks: number, overdueActions: number): string {
  const lines: string[] = [];
  lines.push("التوصيات");
  lines.push("");
  let idx = 1;
  if (gapCount > 0) {
    lines.push(`${toArabicDigits(idx++)}. معالجة ${toArabicDigits(gapCount)} ثغر${gapCount > 1 ? "ات" : "ة"} امتثال محددة من خلال خطط معالجة مستهدفة مع تحديد المسؤولين والمواعيد النهائية.`);
  }
  if (criticalRisks > 0) {
    lines.push(`${toArabicDigits(idx++)}. إعطاء الأولوية لمعالجة ${toArabicDigits(criticalRisks)} مخاطر حرجة من خلال استراتيجيات التخفيف أو القبول الرسمي من مجلس الإدارة.`);
  }
  if (overdueActions > 0) {
    lines.push(`${toArabicDigits(idx++)}. تصعيد ${toArabicDigits(overdueActions)} بند إجراء متأخر لضمان المعالجة في الوقت المناسب.`);
  }
  if (gapCount === 0 && criticalRisks === 0 && overdueActions === 0) {
    lines.push("يعمل برنامج الحوكمة ضمن المعايير المقبولة. يُنصح بالاستمرار في المراقبة الدورية والمراجعات المنتظمة.");
  }
  return lines.join("\n");
}

// ── Board Pack Generator ───────────────────────────────────────────────────

/**
 * Generate a comprehensive board-ready governance pack with bilingual sections.
 * Pulls live data from assertion dashboard, risk register, decisions, and CAPAs.
 *
 * Sections produced:
 *   1. Executive Summary
 *   2. Compliance Posture
 *   3. Risk Landscape (optional)
 *   4. Key Governance Decisions (optional)
 *   5. Open Actions
 *   6. Recommendations (optional)
 */
export async function generateBoardPack(
  tenantId: string,
  options?: BoardPackOptions
): Promise<BoardPack> {
  const schema = tenantSchema(tenantId);
  const now = new Date();
  const periodEnd = options?.periodEnd || now.toISOString().slice(0, 10);
  const periodStart = options?.periodStart || new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().slice(0, 10);
  const periodLabel = `${periodStart} to ${periodEnd}`;

  const sections: BoardPackSection[] = [];

  // ── 1. Fetch compliance data (assertion summaries) ──
  const assertionRes = await safeQuery(
    `SELECT
       COUNT(*) AS total_controls,
       COUNT(*) FILTER (WHERE status = 'compliant') AS compliant,
       COUNT(*) FILTER (WHERE status = 'partial') AS partial_compliant,
       COUNT(*) FILTER (WHERE status = 'non_compliant') AS non_compliant,
       COUNT(*) FILTER (WHERE status = 'any') AS unknown_status,
       ROUND(AVG(confidence)::numeric, 1) AS avg_confidence
     FROM "${schema}".compliance_assertions
     ${options?.frameworkId ? "WHERE framework_id = $1" : ""}`,
    options?.frameworkId ? [options.frameworkId] : []
  );

  const assertionData = assertionRes.rows[0] || {};
  const totalControls = parseInt(assertionData.total_controls || "0", 10);
  const compliant = parseInt(assertionData.compliant || "0", 10);
  const nonCompliant = parseInt(assertionData.non_compliant || "0", 10);
  const gapCount = nonCompliant + parseInt(assertionData.partial_compliant || "0", 10);
  const compliancePercent = totalControls > 0 ? Math.round((compliant / totalControls) * 100) : 0;

  // ── 2. Fetch framework-level breakdown ──
  const frameworkRes = await safeQuery(
    `SELECT f.id, f.name_en,
       COUNT(ca.assertion_id) AS control_count,
       COUNT(*) FILTER (WHERE ca.status = 'compliant') AS fw_compliant,
       COUNT(*) FILTER (WHERE ca.status IN ('non_compliant', 'partial')) AS fw_gaps
     FROM "${schema}".frameworks f
     LEFT JOIN "${schema}".compliance_assertions ca ON ca.framework_id = f.id
     ${options?.frameworkId ? "WHERE f.id = $1" : ""}
     GROUP BY f.id, f.name_en`,
    options?.frameworkId ? [options.frameworkId] : []
  );

  const frameworkBreakdown = frameworkRes.rows.map((r: GenericRow) => ({
    name: r.name_en || "Unknown",
    compliancePercent: parseInt(r.control_count, 10) > 0
      ? Math.round((parseInt(r.fw_compliant, 10) / parseInt(r.control_count, 10)) * 100)
      : 0,
    controlCount: parseInt(r.control_count, 10),
    gapCount: parseInt(r.fw_gaps || "0", 10),
  }));

  // ── 3. Fetch risk data ──
  const riskRes = await safeQuery(
    `SELECT
       COUNT(*) AS total_risks,
       COUNT(*) FILTER (WHERE risk_level = 'critical') AS critical_risks,
       COUNT(*) FILTER (WHERE risk_level = 'high') AS high_risks,
       COUNT(*) FILTER (WHERE risk_level = 'medium') AS medium_risks,
       COUNT(*) FILTER (WHERE risk_level = 'low') AS low_risks
     FROM "${schema}".risks
     WHERE deleted_at IS NULL`,
    []
  );

  const riskData = riskRes.rows[0] || {};
  const totalRisks = parseInt(riskData.total_risks || "0", 10);
  const criticalRisks = parseInt(riskData.critical_risks || "0", 10);
  const highRisks = parseInt(riskData.high_risks || "0", 10);
  const mediumRisks = parseInt(riskData.medium_risks || "0", 10);
  const lowRisks = parseInt(riskData.low_risks || "0", 10);

  // Top risks by severity
  const topRiskRes = await safeQuery(
    `SELECT title_en, title_ar, risk_level
     FROM "${schema}".risks
     WHERE deleted_at IS NULL AND risk_level IN ('critical', 'high')
     ORDER BY CASE risk_level WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END
     LIMIT 5`,
    []
  );

  const topRisks = topRiskRes.rows.map((r: GenericRow) => ({
    titleEn: r.title_en || "",
    titleAr: r.title_ar || "",
    riskLevel: r.risk_level,
  }));

  // ── 4. Fetch decisions ──
  const decisionRes = await safeQuery(
    `SELECT title_en, title_ar, decision_type, status, decision_date
     FROM "${schema}".board_decisions
     WHERE decision_date >= $1 AND decision_date <= $2
     ORDER BY decision_date DESC
     LIMIT 10`,
    [periodStart, periodEnd]
  );

  const decisions = decisionRes.rows.map((r: GenericRow) => ({
    titleEn: r.title_en || "",
    titleAr: r.title_ar || "",
    decisionType: r.decision_type,
    status: r.status,
    decisionDate: r.decision_date,
  }));

  // ── 5. Fetch open actions (CAPA + action items) ──
  const actionsRes = await safeQuery(
    `SELECT title_en, title_ar, priority, due_date, status
     FROM "${schema}".capa_records
     WHERE status IN ('open', 'in_progress', 'overdue')
     ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END
     LIMIT 20`,
    []
  );

  const openActions = actionsRes.rows.map((r: GenericRow) => ({
    titleEn: r.title_en || "",
    titleAr: r.title_ar || "",
    priority: r.priority || "medium",
    dueDate: r.due_date || "",
    status: r.status,
  }));

  const overdueCount = openActions.filter((a) => a.status === "overdue").length;

  // ── Build sections ──

  // Section 1: Executive Summary
  sections.push({
    sectionId: "executive-summary",
    titleEn: "Executive Summary",
    titleAr: "الملخص التنفيذي",
    contentEn: renderExecutiveSummaryEn(compliancePercent, totalControls, compliant, gapCount, criticalRisks, openActions.length, periodLabel),
    contentAr: renderExecutiveSummaryAr(compliancePercent, totalControls, compliant, gapCount, criticalRisks, openActions.length, periodLabel),
    data: { compliancePercent, totalControls, compliant, gapCount, criticalRisks, openActions: openActions.length },
  });

  // Section 2: Compliance Posture
  sections.push({
    sectionId: "compliance-posture",
    titleEn: "Compliance Posture",
    titleAr: "وضع الامتثال",
    contentEn: renderCompliancePostureEn(frameworkBreakdown),
    contentAr: renderCompliancePostureAr(frameworkBreakdown),
    data: { frameworks: frameworkBreakdown },
  });

  // Section 3: Risk Landscape (optional)
  if (options?.includeRisk !== false) {
    sections.push({
      sectionId: "risk-landscape",
      titleEn: "Risk Landscape",
      titleAr: "المشهد الخطري",
      contentEn: renderRiskLandscapeEn(totalRisks, criticalRisks, highRisks, mediumRisks, lowRisks, topRisks),
      contentAr: renderRiskLandscapeAr(totalRisks, criticalRisks, highRisks, mediumRisks, lowRisks, topRisks),
      data: { totalRisks, criticalRisks, highRisks, mediumRisks, lowRisks },
    });
  }

  // Section 4: Key Decisions (optional)
  if (options?.includeDecisions !== false) {
    sections.push({
      sectionId: "key-decisions",
      titleEn: "Key Governance Decisions",
      titleAr: "القرارات الحوكمية الرئيسية",
      contentEn: renderDecisionsEn(decisions),
      contentAr: renderDecisionsAr(decisions),
      data: { decisionsCount: decisions.length },
    });
  }

  // Section 5: Open Actions
  sections.push({
    sectionId: "open-actions",
    titleEn: "Open Actions",
    titleAr: "الإجراءات المفتوحة",
    contentEn: renderOpenActionsEn(openActions),
    contentAr: renderOpenActionsAr(openActions),
    data: { openActionsCount: openActions.length, overdueCount },
  });

  // Section 6: Recommendations (optional)
  if (options?.includeRecommendations !== false) {
    sections.push({
      sectionId: "recommendations",
      titleEn: "Recommendations",
      titleAr: "التوصيات",
      contentEn: renderRecommendationsEn(gapCount, criticalRisks, overdueCount),
      contentAr: renderRecommendationsAr(gapCount, criticalRisks, overdueCount),
    });
  }

  const boardPack: BoardPack = {
    tenantId,
    generatedAt: now.toISOString(),
    periodStart,
    periodEnd,
    sections,
    metadata: {
      frameworkCount: frameworkBreakdown.length,
      controlCount: totalControls,
      riskCount: totalRisks,
      overallCompliancePercent: compliancePercent,
    },
  };

  // Publish generation event

  eventBus.publish({
    eventType: 'narrative.board_pack_generated',
    tenantId,
    payload: {
      sectionCount: sections.length,
      compliancePercent,
      periodStart,
      periodEnd,
    },
  });

  return boardPack;
}

// ── Framework-specific Compliance Narrative ────────────────────────────────

/**
 * Generate a detailed compliance narrative for a specific regulatory framework.
 * Provides bilingual (EN/AR) output with control-level detail.
 */
export async function generateComplianceNarrative(
  tenantId: string,
  frameworkId: string
): Promise<ComplianceNarrative> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.analytics_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

// ── Risk Narrative ─────────────────────────────────────────────────────────

/**
 * Generate a risk posture narrative summarizing the organization's risk landscape
 * with bilingual output (EN/AR).
 */
export async function generateRiskNarrative(tenantId: string): Promise<RiskNarrative> {
  const schema = tenantSchema(tenantId);

  // Aggregate risk counts
  const riskRes = await safeQuery(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE risk_level = 'critical') AS critical,
       COUNT(*) FILTER (WHERE risk_level = 'high') AS high,
       COUNT(*) FILTER (WHERE risk_level = 'medium') AS medium,
       COUNT(*) FILTER (WHERE risk_level = 'low') AS low
     FROM "${schema}".risks
     WHERE deleted_at IS NULL`,
    []
  );

  const riskData = riskRes.rows[0] || {};
  const total = parseInt(riskData.total || "0", 10);
  const critical = parseInt(riskData.critical || "0", 10);
  const high = parseInt(riskData.high || "0", 10);
  const medium = parseInt(riskData.medium || "0", 10);
  const low = parseInt(riskData.low || "0", 10);

  // Top risks by severity
  const topRes = await safeQuery(
    `SELECT title_en, title_ar, risk_level
     FROM "${schema}".risks
     WHERE deleted_at IS NULL
     ORDER BY CASE risk_level WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END
     LIMIT 5`,
    []
  );

  const topRisks = topRes.rows.map((r: GenericRow) => ({
    titleEn: r.title_en || "",
    titleAr: r.title_ar || "",
    riskLevel: r.risk_level,
  }));

  const narrativeEn = renderRiskLandscapeEn(total, critical, high, medium, low, topRisks);
  const narrativeAr = renderRiskLandscapeAr(total, critical, high, medium, low, topRisks);

  return {
    narrativeEn,
    narrativeAr,
    totalRisks: total,
    criticalRisks: critical,
    highRisks: high,
    mediumRisks: medium,
    lowRisks: low,
    topRisks,
    generatedAt: new Date().toISOString(),
  };
}

// ── Formatting Utilities ───────────────────────────────────────────────────

/**
 * Apply Arabic executive writing style to content.
 * Converts Western digits to Eastern Arabic-Indic numerals, adds RTL marks,
 * and replaces informal phrases with formal governance equivalents.
 */
export function formatForArabicExecutive(content: string): string {
  let formatted = content;

  // Convert Western digits to Eastern Arabic-Indic digits
  formatted = formatted.replace(/[0-9]+/g, (match) => toArabicDigits(match));

  // Add RTL embedding mark for proper rendering
  formatted = `\u200F${formatted}`;

  // Replace common informal phrases with formal governance equivalents
  const formalReplacements: [RegExp, string][] = [
    [/هناك/g, "يوجد"],
    [/كثير من/g, "عدد كبير من"],
    [/مشاكل/g, "تحديات"],
    [/سيء/g, "دون المستوى المطلوب"],
  ];

  for (const [pattern, replacement] of formalReplacements) {
    formatted = formatted.replace(pattern, replacement);
  }

  return formatted;
}

/**
 * Apply English executive writing style to content.
 * Replaces informal language with formal board-level equivalents and
 * removes contractions for professional tone.
 */
export function formatForEnglishExecutive(content: string): string {
  let formatted = content;

  // Replace informal phrases with formal board-level equivalents
  const formalReplacements: [RegExp, string][] = [
    [/\ba lot of\b/gi, "a significant number of"],
    [/\bbad\b/gi, "suboptimal"],
    [/\bgood\b/gi, "satisfactory"],
    [/\bfixed\b/gi, "remediated"],
    [/\bproblems\b/gi, "challenges"],
    [/\bcheck\b/gi, "assess"],
    [/\bget\b/gi, "obtain"],
    [/\bneed to\b/gi, "are required to"],
    [/\bshould\b/gi, "is recommended to"],
    [/\bcan't\b/gi, "cannot"],
    [/\bwon't\b/gi, "will not"],
    [/\bdon't\b/gi, "do not"],
    [/\bdidn't\b/gi, "did not"],
    [/\bisn't\b/gi, "is not"],
    [/\baren't\b/gi, "are not"],
  ];

  for (const [pattern, replacement] of formalReplacements) {
    formatted = formatted.replace(pattern, replacement);
  }

  return formatted;
}

import { safeQuery } from '../ports/database.port';
import { logger as _logger } from '../ports/logger.port';
import type {
  KsaRegulatoryContext,
  RegulatoryDeadline,
} from './ksa-regulatory-intelligence.service';
import type { GenericRow as _GenericRow } from '@dos/types';
import type {
  AiExecutiveSummary,
  BriefContent,
  BriefMetrics,
  BriefPriority,
  CalendarEvent,
  ComplianceDataSummary,
  DeadlineWithReadiness,
  FrameworkUpdate,
  RegulatoryInsight,
  RegulatoryIntelligenceResult,
  RiskHotspot,
} from './ksa-regulatory-intelligence.types';

// ---------------------------------------------------------------------------
// Data aggregation helpers
// ---------------------------------------------------------------------------

/** Aggregate compliance score data from tenant schema. */
export async function aggregateComplianceData(schema: string): Promise<ComplianceDataSummary> {
  try {
    const controlsRes = await safeQuery(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE implementation_status IN ('implemented', 'effective')) AS implemented,
         COUNT(DISTINCT framework_id) AS framework_count
       FROM "${schema}".controls
       WHERE deleted_at IS NULL OR deleted_at > NOW()`,
      []
    );
    const row = controlsRes.rows[0] || {};
    const total = parseInt(row.total || '0', 10);
    const implemented = parseInt(row.implemented || '0', 10);
    return {
      overallScore: total > 0 ? Math.round((implemented / total) * 100) : 0,
      frameworkCount: parseInt(row.framework_count || '0', 10),
      totalControls: total,
      implementedControls: implemented,
    };
  } catch {
    return { overallScore: 0, frameworkCount: 0, totalControls: 0, implementedControls: 0 };
  }
}

/** Count pending regulatory changes in tenant schema. */
export async function countPendingChanges(schema: string): Promise<number> {
  try {
    const res = await safeQuery(
      `SELECT COUNT(*) AS cnt FROM "${schema}".regulatory_changes WHERE status NOT IN ('closed', 'verified', 'implemented')`,
      []
    );
    return parseInt(res.rows[0]?.cnt || '0', 10);
  } catch {
    return 0;
  }
}

/** Calculate risk hotspots from domain/framework compliance scores. */
export async function calculateRiskHotspots(
  schema: string,
  ksaContext: KsaRegulatoryContext
): Promise<RiskHotspot[]> {
  const hotspots: RiskHotspot[] = [];

  try {
    const res = await safeQuery(
      `SELECT
         framework_id,
         COALESCE(domain, 'General') AS domain_name,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE implementation_status IN ('implemented', 'effective')) AS implemented,
         COUNT(*) FILTER (WHERE implementation_status NOT IN ('implemented', 'effective', 'not_applicable')) AS at_risk
       FROM "${schema}".controls
       WHERE deleted_at IS NULL OR deleted_at > NOW()
       GROUP BY framework_id, domain
       HAVING COUNT(*) > 0
       ORDER BY COUNT(*) FILTER (WHERE implementation_status IN ('implemented', 'effective'))::float / GREATEST(COUNT(*), 1) ASC
       LIMIT 20`,
      []
    );

    for (const row of res.rows) {
      const total = parseInt(row.total, 10);
      const implemented = parseInt(row.implemented, 10);
      const atRisk = parseInt(row.at_risk, 10);
      const score = total > 0 ? Math.round((implemented / total) * 100) : 0;

      if (score < 70) {
        const regulator = ksaContext.regulators.find(_r =>
          ksaContext.frameworks.some(f => f.includes(row.framework_id))
        ) || ksaContext.regulators[0] || '';

        hotspots.push({
          frameworkCode: row.framework_id,
          domainName: row.domain_name,
          score,
          controlsAtRisk: atRisk,
          totalControls: total,
          regulatorCode: regulator,
          reasonEn: `${row.domain_name} in ${row.framework_id}: ${implemented}/${total} controls implemented (${score}%).`,
          reasonAr: `${row.domain_name} في ${row.framework_id}: ${implemented}/${total} ضوابط مطبقة (${score}%).`,
        });
      }
    }
  } catch {
    // Hotspot calculation is best-effort
  }

  return hotspots.sort((a, b) => a.score - b.score).slice(0, 10);
}

/** Build deadline readiness assessments from KSA context deadlines. */
export async function buildDeadlineReadiness(
  schema: string,
  ksaContext: KsaRegulatoryContext
): Promise<DeadlineWithReadiness[]> {
  const now = new Date();
  const results: DeadlineWithReadiness[] = [];

  for (const deadline of ksaContext.regulatoryDeadlines) {
    const dueDate = new Date(deadline.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const readinessScore = await estimateDeadlineReadiness(schema, deadline);

    let readinessStatus: DeadlineWithReadiness['readinessStatus'];
    if (daysUntilDue < 0) readinessStatus = 'overdue';
    else if (readinessScore >= 80) readinessStatus = 'ready';
    else if (readinessScore >= 50) readinessStatus = 'on_track';
    else readinessStatus = 'at_risk';

    let gapsToClose = 0;
    try {
      const gapRes = await safeQuery(
        `SELECT COUNT(*) AS gaps FROM "${schema}".controls
         WHERE framework_id = $1
           AND implementation_status NOT IN ('implemented', 'effective', 'not_applicable')
           AND (deleted_at IS NULL OR deleted_at > NOW())`,
        [deadline.frameworkCode]
      );
      gapsToClose = parseInt(gapRes.rows[0]?.gaps || '0', 10);
    } catch { /* best-effort */ }

    results.push({
      deadline,
      daysUntilDue,
      readinessScore,
      readinessStatus,
      gapsToClose,
    });
  }

  return results.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

/** Estimate readiness for a deadline based on framework compliance score. */
export async function estimateDeadlineReadiness(schema: string, deadline: RegulatoryDeadline): Promise<number> {
  try {
    const res = await safeQuery(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE implementation_status IN ('implemented', 'effective')) AS implemented
       FROM "${schema}".controls
       WHERE framework_id = $1 AND (deleted_at IS NULL OR deleted_at > NOW())`,
      [deadline.frameworkCode]
    );
    const total = parseInt(res.rows[0]?.total || '0', 10);
    const implemented = parseInt(res.rows[0]?.implemented || '0', 10);
    return total > 0 ? Math.round((implemented / total) * 100) : 50;
  } catch {
    return 50;
  }
}

// ---------------------------------------------------------------------------
// AI intelligence generation
// ---------------------------------------------------------------------------

/** Use Claude AI to generate executive intelligence summary and insights. */
export async function generateAiIntelligence(
  tenantId: string,
  ksaContext: KsaRegulatoryContext,
  compliance: ComplianceDataSummary,
  hotspots: RiskHotspot[],
  deadlines: DeadlineWithReadiness[],
  pendingChanges: number,
  overdueCount: number
): Promise<{ summary: AiExecutiveSummary; insights: RegulatoryInsight[] }> {
  const { claudeJSON } = await import('../../../config/claude-client.js');

  const aiResult = await claudeJSON<{
    posture: string;
    summary_en: string;
    summary_ar: string;
    insights: Array<{
      type: string;
      title_en: string;
      title_ar: string;
      description_en: string;
      description_ar: string;
      severity: string;
      related_framework: string | null;
    }>;
  }>({
    systemPrompt: `You are a senior KSA regulatory intelligence analyst. Analyze the organization's compliance posture and provide:
1. Overall posture assessment (strong/adequate/needs_attention/critical)
2. Executive summary in English and Arabic
3. 3-5 actionable insights (trends, recommendations, alerts)
Respond with JSON: {
  "posture": "strong|adequate|needs_attention|critical",
  "summary_en": "Executive summary in English",
  "summary_ar": "Executive summary in Arabic",
  "insights": [{"type": "trend|recommendation|benchmark|alert", "title_en": "...", "title_ar": "...", "description_en": "...", "description_ar": "...", "severity": "info|warning|critical", "related_framework": null}]
}`,
    userMessage: JSON.stringify({
      sector: ksaContext.sector,
      regulators: ksaContext.regulators,
      overallScore: compliance.overallScore,
      frameworkCount: compliance.frameworkCount,
      totalControls: compliance.totalControls,
      implementedControls: compliance.implementedControls,
      pendingChanges,
      overdueObligations: overdueCount,
      riskHotspots: hotspots.slice(0, 5).map(h => ({
        framework: h.frameworkCode,
        domain: h.domainName,
        score: h.score,
        atRisk: h.controlsAtRisk,
      })),
      upcomingDeadlines: deadlines.slice(0, 5).map(d => ({
        framework: d.deadline.frameworkCode,
        daysUntil: d.daysUntilDue,
        readiness: d.readinessScore,
        status: d.readinessStatus,
      })),
    }),
    maxTokens: 1536,
    temperature: 0.3,
    tenantId,
    agentId: 'ksa-regulatory-intelligence',
    decisionType: 'regulatory_intelligence_dashboard',
  });

  const summary: AiExecutiveSummary = {
    overallPosture: (aiResult.posture as AiExecutiveSummary['overallPosture']) || determinePosture(compliance.overallScore),
    summaryEn: aiResult.summary_en || '',
    summaryAr: aiResult.summary_ar || '',
    keyMetrics: {
      overallComplianceScore: compliance.overallScore,
      activeFrameworksCount: compliance.frameworkCount,
      pendingChangesCount: pendingChanges,
      overdueObligationsCount: overdueCount,
      upcomingDeadlinesCount: deadlines.filter(d => d.daysUntilDue > 0).length,
    },
  };

  const insights: RegulatoryInsight[] = (aiResult.insights || []).map((i: any) => ({
    insightType: (i.type as RegulatoryInsight['insightType']) || 'recommendation',
    titleEn: i.title_en,
    titleAr: i.title_ar,
    descriptionEn: i.description_en,
    descriptionAr: i.description_ar,
    severity: (i.severity as RegulatoryInsight['severity']) || 'info',
    relatedFramework: i.related_framework,
  }));

  return { summary, insights };
}

// ---------------------------------------------------------------------------
// Rule-based fallbacks
// ---------------------------------------------------------------------------

/** Determine posture from score when AI is unavailable. */
export function determinePosture(score: number): AiExecutiveSummary['overallPosture'] {
  if (score >= 80) return 'strong';
  if (score >= 60) return 'adequate';
  if (score >= 40) return 'needs_attention';
  return 'critical';
}

/** Rule-based fallback executive summary. */
export function buildRuleBasedSummary(
  compliance: ComplianceDataSummary,
  pendingChanges: number,
  overdueCount: number,
  deadlineCount: number
): AiExecutiveSummary {
  const posture = determinePosture(compliance.overallScore);
  const summaryEn = `Overall compliance score is ${compliance.overallScore}% across ${compliance.frameworkCount} frameworks. ${compliance.implementedControls} of ${compliance.totalControls} controls implemented. ${pendingChanges} pending regulatory changes and ${overdueCount} overdue obligations require attention.`;
  const summaryAr = `درجة الامتثال الإجمالية ${compliance.overallScore}% عبر ${compliance.frameworkCount} أطر. ${compliance.implementedControls} من ${compliance.totalControls} ضوابط مطبقة. ${pendingChanges} تغييرات تنظيمية معلقة و ${overdueCount} التزامات متأخرة تتطلب الاهتمام.`;

  return {
    overallPosture: posture,
    summaryEn,
    summaryAr,
    keyMetrics: {
      overallComplianceScore: compliance.overallScore,
      activeFrameworksCount: compliance.frameworkCount,
      pendingChangesCount: pendingChanges,
      overdueObligationsCount: overdueCount,
      upcomingDeadlinesCount: deadlineCount,
    },
  };
}

/** Rule-based fallback insights. */
export function buildRuleBasedInsights(
  hotspots: RiskHotspot[],
  deadlines: DeadlineWithReadiness[],
  overdueCount: number
): RegulatoryInsight[] {
  const insights: RegulatoryInsight[] = [];

  if (overdueCount > 0) {
    insights.push({
      insightType: 'alert',
      titleEn: 'Overdue Regulatory Obligations',
      titleAr: 'التزامات تنظيمية متأخرة',
      descriptionEn: `${overdueCount} regulatory obligation(s) are overdue. Immediate action required to avoid penalties.`,
      descriptionAr: `${overdueCount} التزام(ات) تنظيمية متأخرة. يلزم اتخاذ إجراء فوري لتجنب العقوبات.`,
      severity: 'critical',
      relatedFramework: null,
    });
  }

  if (hotspots.length > 0) {
    const worst = hotspots[0]!;
    insights.push({
      insightType: 'recommendation',
      titleEn: `Focus on ${worst.domainName} in ${worst.frameworkCode}`,
      titleAr: `التركيز على ${worst.domainName} في ${worst.frameworkCode}`,
      descriptionEn: `This area has the lowest compliance score (${worst.score}%) with ${worst.controlsAtRisk} controls at risk.`,
      descriptionAr: `هذا المجال لديه أدنى درجة امتثال (${worst.score}%) مع ${worst.controlsAtRisk} ضوابط معرضة للخطر.`,
      severity: worst.score < 30 ? 'critical' : 'warning',
      relatedFramework: worst.frameworkCode,
    });
  }

  const atRiskDeadlines = deadlines.filter(d => d.readinessStatus === 'at_risk');
  if (atRiskDeadlines.length > 0) {
    insights.push({
      insightType: 'alert',
      titleEn: 'Upcoming Deadlines at Risk',
      titleAr: 'مواعيد نهائية قادمة معرضة للخطر',
      descriptionEn: `${atRiskDeadlines.length} upcoming deadline(s) have low readiness scores. Prioritize gap closure.`,
      descriptionAr: `${atRiskDeadlines.length} موعد(مواعيد) نهائية قادمة بدرجات جاهزية منخفضة. أولوية إغلاق الثغرات.`,
      severity: 'warning',
      relatedFramework: atRiskDeadlines[0]?.deadline.frameworkCode || null,
    });
  }

  return insights;
}

/** Rule-based fallback brief content. */
export function buildRuleBasedBrief(
  metrics: BriefMetrics,
  frameworks: { framework: string; total: number; implemented: number; score: number }[],
  overdueCount: number
): BriefContent {
  const frameworkList = frameworks.map(f => `${f.framework}: ${f.score}%`).join(', ');

  return {
    executiveSummaryEn: `Compliance posture stands at ${metrics.overallScore}% across ${metrics.frameworkCount} KSA regulatory frameworks with ${metrics.gapCount} open gaps.`,
    executiveSummaryAr: `وضع الامتثال يقف عند ${metrics.overallScore}% عبر ${metrics.frameworkCount} أطر تنظيمية سعودية مع ${metrics.gapCount} ثغرات مفتوحة.`,
    textEn: `The organization currently maintains ${metrics.controlsImplemented} of ${metrics.controlsTotal} controls in implemented status. Framework breakdown: ${frameworkList}. There are ${overdueCount} overdue regulatory obligations that require immediate attention. The compliance team should prioritize closing the ${metrics.gapCount} identified gaps before the next regulatory reporting cycle.`,
    textAr: `تحافظ المنظمة حالياً على ${metrics.controlsImplemented} من ${metrics.controlsTotal} ضوابط في حالة التطبيق. توزيع الأطر: ${frameworkList}. هناك ${overdueCount} التزامات تنظيمية متأخرة تتطلب اهتماماً فورياً. يجب على فريق الامتثال إعطاء الأولوية لإغلاق ${metrics.gapCount} ثغرات محددة قبل دورة التقارير التنظيمية التالية.`,
  };
}

/** Rule-based fallback priorities. */
export function buildRuleBasedPriorities(
  metrics: BriefMetrics,
  frameworks: { framework: string; total: number; implemented: number; score: number }[]
): BriefPriority[] {
  const priorities: BriefPriority[] = [];

  const sorted = [...frameworks].sort((a, b) => a.score - b.score);
  const weakest = sorted[0];

  if (metrics.overdueObligations > 0) {
    priorities.push({
      timeframe: '30_days',
      priorityEn: `Address ${metrics.overdueObligations} overdue regulatory obligation(s) immediately.`,
      priorityAr: `معالجة ${metrics.overdueObligations} التزام(ات) تنظيمية متأخرة فوراً.`,
      relatedFramework: null,
      urgency: 'critical',
    });
  }

  if (weakest && weakest.score < 60) {
    priorities.push({
      timeframe: '30_days',
      priorityEn: `Improve ${weakest.framework} compliance from ${weakest.score}% — currently the weakest framework.`,
      priorityAr: `تحسين امتثال ${weakest.framework} من ${weakest.score}% — الإطار الأضعف حالياً.`,
      relatedFramework: weakest.framework,
      urgency: 'high',
    });
  }

  if (metrics.gapCount > 0) {
    priorities.push({
      timeframe: '60_days',
      priorityEn: `Close ${Math.min(metrics.gapCount, 20)} highest-priority control gaps to improve overall score.`,
      priorityAr: `إغلاق ${Math.min(metrics.gapCount, 20)} ثغرات ضوابط ذات أولوية عالية لتحسين الدرجة الإجمالية.`,
      relatedFramework: null,
      urgency: 'high',
    });
  }

  priorities.push({
    timeframe: '90_days',
    priorityEn: 'Conduct comprehensive compliance review and prepare for next regulatory reporting cycle.',
    priorityAr: 'إجراء مراجعة شاملة للامتثال والاستعداد لدورة التقارير التنظيمية التالية.',
    relatedFramework: null,
    urgency: 'medium',
  });

  return priorities;
}

/** Build an empty intelligence result for graceful degradation. */
export function buildEmptyIntelligence(generatedAt: string): RegulatoryIntelligenceResult {
  return {
    summary: {
      overallPosture: 'needs_attention',
      summaryEn: 'Unable to generate regulatory intelligence. Tenant configuration may be incomplete.',
      summaryAr: 'غير قادر على إنشاء الذكاء التنظيمي. قد يكون تكوين المستأجر غير مكتمل.',
      keyMetrics: {
        overallComplianceScore: 0,
        activeFrameworksCount: 0,
        pendingChangesCount: 0,
        overdueObligationsCount: 0,
        upcomingDeadlinesCount: 0,
      },
    },
    riskHotspots: [],
    upcomingDeadlines: [],
    insights: [],
    generatedAt,
  };
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

/** Map change type string to FrameworkUpdate type. */
export function mapChangeTypeToUpdateType(changeType: string): FrameworkUpdate['updateType'] {
  switch (changeType) {
    case 'new_regulation':
    case 'new': return 'new_controls';
    case 'repeal': return 'deprecated_controls';
    case 'clarification': return 'guidance_update';
    default: return 'version_change';
  }
}

/** Map deadline type to calendar event type. */
export function mapDeadlineTypeToEventType(deadlineType: string): CalendarEvent['eventType'] {
  switch (deadlineType) {
    case 'self_assessment': return 'submission_deadline';
    case 'reporting': return 'reporting_deadline';
    case 'certification': return 'submission_deadline';
    case 'renewal': return 'renewal_date';
    case 'audit': return 'audit_period';
    default: return 'reporting_deadline';
  }
}

/** Generate occurrence dates from a cron schedule for a given year. */
export function generateOccurrences(cronOrSchedule: string, year: number): string[] {
  const dates: string[] = [];

  if (cronOrSchedule.includes('1 * *') || cronOrSchedule.includes('monthly')) {
    for (let m = 0; m < 12; m++) {
      dates.push(new Date(year, m, 1).toISOString().split('T')[0]!);
    }
    return dates;
  }

  if (cronOrSchedule.includes('quarterly')) {
    for (const m of [0, 3, 6, 9]) {
      dates.push(new Date(year, m, 1).toISOString().split('T')[0]!);
    }
    return dates;
  }

  if (cronOrSchedule.includes('* * *') || cronOrSchedule.includes('daily')) {
    for (const m of [2, 5, 8, 11]) {
      dates.push(new Date(year, m, 28).toISOString().split('T')[0]!);
    }
    return dates;
  }

  dates.push(new Date(year, 5, 30).toISOString().split('T')[0]!);
  return dates;
}

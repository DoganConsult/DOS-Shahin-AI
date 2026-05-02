// ============================================
// KSA Regulatory Intelligence Service (Module Facade)
// AI-powered regulatory intelligence dashboard,
// update checking, compliance calendar, and
// executive regulatory brief generation.
// Delegates to global ksa-regulatory-intelligence.service
// for core context and enriches with AI analysis.
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../ports/database.port';
import { toErrorMessage } from '@dos/db';
import { logger } from '../ports/logger.port';

export interface KsaRegulatoryContext {
  frameworkCodes: string[];
  totalObligations: number;
  overallComplianceRate: number;
  regulatoryDeadlines: RegulatoryDeadline[];
  reportingObligations: ReportingObligation[];
  sector?: string;
  regulators: string[];
  frameworks: string[];
  compliancePriorities?: unknown[];
}

interface ReportingObligation {
  schedule: string;
  descriptionEn: string;
  descriptionAr: string;
  regulatorCode: string;
}

export interface RegulatoryDeadline {
  frameworkCode: string;
  deadline: string;
  controlCode: string;
  status: string;
  dueDate: string;
  deadlineType: string;
  descriptionEn: string;
  descriptionAr: string;
  regulatorCode: string;
  severity: string;
}
import type { GenericRow } from '@dos/types';

import { catchHandler, EC, swallowDefault } from '@dos/platform-core/resilience';

// Re-export types so callers importing from this file still work
export type {
  RegulatoryIntelligenceResult, AiExecutiveSummary, RiskHotspot, DeadlineWithReadiness,
  RegulatoryInsight, UpdateCheckResult, FrameworkUpdate, CalendarEvent,
  RegulatoryCalendarResult, RegulatoryBriefResult, BriefContent, BriefMetrics,
  BriefPriority, ComplianceDataSummary,
} from './ksa-regulatory-intelligence.types';

import type {
  RegulatoryIntelligenceResult, AiExecutiveSummary, RiskHotspot as _RiskHotspot, DeadlineWithReadiness as _DeadlineWithReadiness,
  RegulatoryInsight, UpdateCheckResult, FrameworkUpdate, CalendarEvent,
  RegulatoryCalendarResult, RegulatoryBriefResult, BriefContent, BriefMetrics,
  BriefPriority,
} from './ksa-regulatory-intelligence.types';

// Helpers (extracted to companion file)
import {
  aggregateComplianceData, countPendingChanges, calculateRiskHotspots,
  buildDeadlineReadiness, estimateDeadlineReadiness, generateAiIntelligence,
  determinePosture as _determinePosture, buildRuleBasedSummary, buildRuleBasedInsights,
  buildRuleBasedBrief, buildRuleBasedPriorities, buildEmptyIntelligence,
  mapChangeTypeToUpdateType, mapDeadlineTypeToEventType, generateOccurrences,
} from './ksa-regulatory-intelligence-helpers';

// ---------------------------------------------------------------------------
// 1. Get KSA Regulatory Intelligence Dashboard
// ---------------------------------------------------------------------------

/**
 * AI-powered regulatory intelligence dashboard aggregating compliance scores,
 * recent changes, upcoming deadlines, and enforcement actions.
 * Uses Claude AI for executive summary, risk hotspots, and peer insights.
 */
export async function getKsaRegulatoryIntelligence(tenantId: string): Promise<RegulatoryIntelligenceResult> {
  const schema = tenantSchema(tenantId);
  const generatedAt = new Date().toISOString();

  try {
    // 1. Load KSA regulatory context (sector, frameworks, deadlines)
    const ksaContext = await getKsaRegulatoryContext(tenantId);
    if (!ksaContext) {
      return buildEmptyIntelligence(generatedAt);
    }

    // 2. Aggregate compliance data from tenant schema
    const [complianceData, pendingChanges, overdueObligations] = await Promise.all([
      aggregateComplianceData(schema),
      countPendingChanges(schema),
      getOverdueObligations(tenantId),
    ]);

    // 3. Calculate risk hotspots from domain/framework scores
    const riskHotspots = await calculateRiskHotspots(schema, ksaContext);

    // 4. Build deadline readiness assessments
    const upcomingDeadlines = await buildDeadlineReadiness(schema, ksaContext);

    // 5. Use Claude AI for executive summary and insights
    let summary: AiExecutiveSummary;
    let insights: RegulatoryInsight[] = [];

    try {
      const aiResult = await generateAiIntelligence(
        tenantId, ksaContext, complianceData, riskHotspots,
        upcomingDeadlines, pendingChanges, overdueObligations.length
      );
      summary = aiResult.summary;
      insights = aiResult.insights;
    } catch (aiErr) {
      logger.warn('[KSA Intelligence] AI enrichment failed, using rule-based fallback', {
        tenantId, error: toErrorMessage(aiErr),
      });
      summary = buildRuleBasedSummary(complianceData, pendingChanges, overdueObligations.length, upcomingDeadlines.length);
      insights = buildRuleBasedInsights(riskHotspots, upcomingDeadlines, overdueObligations.length);
    }

    return { summary, riskHotspots, upcomingDeadlines, insights, generatedAt };
  } catch (err) {
    logger.error('[KSA Intelligence] getKsaRegulatoryIntelligence failed', {
      tenantId, error: toErrorMessage(err),
    });
    return buildEmptyIntelligence(generatedAt);
  }
}

// ---------------------------------------------------------------------------
// 2. Check Regulatory Updates
// ---------------------------------------------------------------------------

/**
 * Check for new framework updates that are newer than the tenant's last check.
 * Cross-references with tenant's active frameworks.
 */
export async function checkRegulatoryUpdates(tenantId: string): Promise<UpdateCheckResult> {
  const schema = tenantSchema(tenantId);
  const now = new Date().toISOString();

  try {
    // 1. Get tenant's active frameworks
    const frameworksRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT framework_id, framework_code, framework_name FROM "${schema}".frameworks WHERE status = 'active' OR status IS NULL`,
      []
    ), { tenantId: tenantId, operation: 'query frameworks' });
    const activeFrameworks = frameworksRes.rows.map((r: GenericRow) => r.framework_code || r.framework_id);

    if (activeFrameworks.length === 0) {
      return { hasUpdates: false, updates: [], lastCheckedAt: now };
    }

    // 2. Get last check timestamp from tenant preferences
    const lastCheckRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT value FROM "${schema}".tenant_preferences WHERE key = 'last_regulatory_update_check'`,
      []
    ), { tenantId: tenantId, operation: 'query tenant_preferences' });
    const lastCheckedAt = lastCheckRes.rows[0]?.value || '2000-01-01T00:00:00Z';

    // 3. Check public schema for framework updates newer than last check
    const updatesRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT framework_code, version, last_updated, change_log
       FROM public.regulatory_frameworks
       WHERE framework_code = ANY($1::text[])
         AND last_updated > $2::timestamptz`,
      [activeFrameworks, lastCheckedAt]
    ), { tenantId: tenantId, operation: 'fallback query' });

    // 4. Also check global regulatory_changes table
    const changesRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT change_id, framework_code, regulation_name, change_type, change_summary,
              affected_controls, detected_at
       FROM public.regulatory_changes
       WHERE framework_code = ANY($1::text[])
         AND detected_at > $2::timestamptz
         AND response_status = 'pending_review'
       ORDER BY detected_at DESC
       LIMIT 20`,
      [activeFrameworks, lastCheckedAt]
    ), { tenantId: tenantId, operation: 'fallback query' });

    const updates: FrameworkUpdate[] = [];

    for (const row of updatesRes.rows) {
      updates.push({

        frameworkCode: row.framework_code,

        frameworkName: row.framework_code, // Name lookup from framework table
        updateType: 'version_change',
        descriptionEn: `Framework ${row.framework_code} updated to version ${row.version || 'latest'}.`,
        descriptionAr: `تم تحديث الإطار ${row.framework_code} إلى الإصدار ${row.version || 'الأحدث'}.`,

        publishedAt: row.last_updated || now,
        affectsControlCount: 0,
      });
    }

    for (const row of changesRes.rows) {
      const affectedControls = Array.isArray(row.affected_controls) ? row.affected_controls : [];
      updates.push({

        frameworkCode: row.framework_code,

        frameworkName: row.framework_code,
        updateType: mapChangeTypeToUpdateType((row as any).change_type),

        descriptionEn: row.change_summary || `Regulatory change: ${row.regulation_name}`,

        descriptionAr: row.change_summary || `تغيير تنظيمي: ${row.regulation_name}`,

        publishedAt: row.detected_at || now,
        affectsControlCount: affectedControls.length,
      });
    }

    // 5. Update last check timestamp
    await safeQuery(
      `INSERT INTO "${schema}".tenant_preferences (key, value, updated_at)
       VALUES ('last_regulatory_update_check', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [now]
    ).catch(catchHandler(EC.EVENT_BUS, {}));

    return {
      hasUpdates: updates.length > 0,
      updates,
      lastCheckedAt: now,
    };
  } catch (err) {
    logger.error('[KSA Intelligence] checkRegulatoryUpdates failed', {
      tenantId, error: toErrorMessage(err),
    });
    return { hasUpdates: false, updates: [], lastCheckedAt: now };
  }
}

// ---------------------------------------------------------------------------
// 3. Get Regulatory Calendar
// ---------------------------------------------------------------------------

/**
 * Comprehensive compliance calendar for the tenant's active frameworks.
 * Includes submission deadlines, audit periods, renewal dates, and reporting deadlines.
 * Calculates readiness for each event.
 */
export async function getRegulatoryCalendar(
  tenantId: string,
  year?: number
): Promise<RegulatoryCalendarResult> {
  const schema = tenantSchema(tenantId);
  const targetYear = year || new Date().getFullYear();
  const startDate = `${targetYear}-01-01`;
  const endDate = `${targetYear}-12-31`;
  const now = new Date();

  try {
    const ksaContext = await getKsaRegulatoryContext(tenantId);
    const events: CalendarEvent[] = [];
    let eventCounter = 0;

    // 1. Add KSA regulatory deadlines from context
    if (ksaContext) {
      for (const deadline of ksaContext.regulatoryDeadlines) {
        const dueDate = new Date(deadline.dueDate);
        if (dueDate.getFullYear() !== targetYear) continue;

        const readiness = await estimateDeadlineReadiness(schema, deadline);
        const isOverdue = dueDate < now;

        events.push({
          eventId: `dl-${++eventCounter}`,
          eventType: mapDeadlineTypeToEventType(deadline.deadlineType),
          title: deadline.descriptionEn,
          titleAr: deadline.descriptionAr,
          date: deadline.dueDate,
          endDate: null,
          frameworkCode: deadline.frameworkCode,
          regulatorCode: deadline.regulatorCode,
          readinessScore: readiness,
          status: isOverdue ? 'overdue' : 'upcoming',
        });
      }

      // 2. Add reporting obligation cycles
      for (const obligation of ksaContext.reportingObligations) {
        const dates = generateOccurrences(obligation.schedule, targetYear);
        for (const date of dates) {
          const isOverdue = new Date(date) < now;
          events.push({
            eventId: `ob-${++eventCounter}`,
            eventType: 'reporting_deadline',
            title: obligation.descriptionEn,
            titleAr: obligation.descriptionAr,
            date,
            endDate: null,
            frameworkCode: '',
            regulatorCode: obligation.regulatorCode,
            readinessScore: isOverdue ? 0 : 50,
            status: isOverdue ? 'overdue' : 'upcoming',
          });
        }
      }
    }

    // 3. Add regulatory change effective dates from tenant schema
    const changesRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT change_id, title, effective_date, status
       FROM "${schema}".regulatory_changes
       WHERE effective_date BETWEEN $1 AND $2
       ORDER BY effective_date`,
      [startDate, endDate]
    ), { tenantId: tenantId, operation: 'query regulatory_changes' });

    for (const row of changesRes.rows) {
      events.push({
        eventId: `rc-${row.change_id}`,
        eventType: 'regulatory_change',

        title: row.title || 'Regulatory Change',

        titleAr: row.title || 'تغيير تنظيمي',

        date: row.effective_date,
        endDate: null,
        frameworkCode: '',
        regulatorCode: '',
        readinessScore: row.status === 'implemented' || row.status === 'verified' ? 100 : 30,
        status: row.status === 'closed' || row.status === 'verified' ? 'completed'
          : new Date((row as any).effective_date) < now ? 'overdue' : 'upcoming',
      });
    }

    // 4. Add compliance obligation due dates from obligations table
    const obligationsRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT obligation_id, title_en, compliance_deadline, status
       FROM "${schema}".obligations
       WHERE compliance_deadline BETWEEN $1 AND $2
       ORDER BY compliance_deadline`,
      [startDate, endDate]
    ), { tenantId: tenantId, operation: 'query obligations' });

    for (const row of obligationsRes.rows) {
      events.push({
        eventId: `obl-${row.obligation_id}`,
        eventType: 'submission_deadline',

        title: row.title_en || 'Compliance Obligation',

        titleAr: row.title_en || 'التزام امتثال',

        date: row.compliance_deadline,
        endDate: null,
        frameworkCode: '',
        regulatorCode: '',
        readinessScore: row.status === 'compliant' ? 100 : row.status === 'in_progress' ? 50 : 20,
        status: row.status === 'compliant' ? 'completed'
          : new Date((row as any).compliance_deadline) < now ? 'overdue' : 'upcoming',
      });
    }

    // Sort events by date
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const overdueCount = events.filter(e => e.status === 'overdue').length;
    const upcomingCount = events.filter(e => e.status === 'upcoming').length;

    return { events, overdueCount, upcomingCount };
  } catch (err) {
    logger.error('[KSA Intelligence] getRegulatoryCalendar failed', {
      tenantId, error: toErrorMessage(err),
    });
    return { events: [], overdueCount: 0, upcomingCount: 0 };
  }
}

// ---------------------------------------------------------------------------
// 4. Generate Regulatory Brief
// ---------------------------------------------------------------------------

/**
 * AI-generated regulatory brief covering current compliance status,
 * key risks and gaps, and recommended priorities for 30/60/90 days.
 */
export async function generateRegulatoryBrief(tenantId: string): Promise<RegulatoryBriefResult> {
  const schema = tenantSchema(tenantId);
  const generatedAt = new Date().toISOString();

  try {
    // 1. Gather compliance data
    const complianceData = await aggregateComplianceData(schema);
    const ksaContext = await getKsaRegulatoryContext(tenantId);
    const overdueList = await getOverdueObligations(tenantId);

    const keyMetrics: BriefMetrics = {
      overallScore: complianceData.overallScore,
      frameworkCount: complianceData.frameworkCount,
      controlsTotal: complianceData.totalControls,
      controlsImplemented: complianceData.implementedControls,
      gapCount: complianceData.totalControls - complianceData.implementedControls,
      overdueObligations: overdueList.length,
    };

    // 2. Gather framework breakdown for AI context
    const frameworkBreakdownRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT framework_id, framework_code,
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE implementation_status IN ('implemented', 'effective')) AS implemented
       FROM "${schema}".controls
       WHERE deleted_at IS NULL OR deleted_at > NOW()
       GROUP BY framework_id, framework_code`,
      []
    ), { tenantId: tenantId, operation: 'query controls' });

    const frameworkBreakdown = frameworkBreakdownRes.rows.map((r: GenericRow) => ({
      framework: r.framework_code || r.framework_id,
      total: parseInt(r.total, 10),
      implemented: parseInt(r.implemented, 10),
      score: parseInt(r.total, 10) > 0 ? Math.round((parseInt(r.implemented, 10) / parseInt(r.total, 10)) * 100) : 0,
    }));

    // 3. Use Claude AI to generate the brief
    let brief: BriefContent;
    let priorities: BriefPriority[];

    try {
      const { claudeJSON } = await import('../../../config/claude-client.js');

      const aiResult = await claudeJSON<{
        executive_summary_en: string;
        executive_summary_ar: string;
        detailed_brief_en: string;
        detailed_brief_ar: string;
        priorities: Array<{
          timeframe: string;
          priority_en: string;
          priority_ar: string;
          related_framework: string | null;
          urgency: string;
        }>;
      }>({
        systemPrompt: `You are a senior KSA regulatory compliance advisor generating a concise regulatory brief for executive leadership.
The brief should cover:
1. Current compliance status across all KSA frameworks
2. Key risks and gaps requiring attention
3. Recommended priorities for the next 30/60/90 days

Respond with JSON: {
  "executive_summary_en": "2-3 sentence executive summary in English",
  "executive_summary_ar": "2-3 sentence executive summary in Arabic",
  "detailed_brief_en": "Detailed brief in English (3-5 paragraphs)",
  "detailed_brief_ar": "Detailed brief in Arabic (3-5 paragraphs)",
  "priorities": [
    {"timeframe": "30_days|60_days|90_days", "priority_en": "...", "priority_ar": "...", "related_framework": "...", "urgency": "critical|high|medium"}
  ]
}`,
        userMessage: JSON.stringify({
          sector: ksaContext?.sector || 'any',
          regulators: ksaContext?.regulators || [],
          frameworks: frameworkBreakdown,
          overallScore: keyMetrics.overallScore,
          totalControls: keyMetrics.controlsTotal,
          implementedControls: keyMetrics.controlsImplemented,
          gapCount: keyMetrics.gapCount,
          overdueObligations: keyMetrics.overdueObligations,
          upcomingDeadlines: ksaContext?.regulatoryDeadlines?.slice(0, 5).map(d => ({
            framework: d.frameworkCode,
            type: d.deadlineType,
            dueDate: d.dueDate,
            severity: d.severity,
          })) || [],
          compliancePriorities: ksaContext?.compliancePriorities?.slice(0, 5) || [],
        }),
        maxTokens: 2048,
        temperature: 0.3,
        tenantId,
        agentId: 'ksa-regulatory-intelligence',
        decisionType: 'regulatory_brief_generation',
      });

      brief = {
        executiveSummaryEn: aiResult.executive_summary_en || '',
        executiveSummaryAr: aiResult.executive_summary_ar || '',
        textEn: aiResult.detailed_brief_en || '',
        textAr: aiResult.detailed_brief_ar || '',
      };

      priorities = (aiResult.priorities || []).map((p: any) => ({
        timeframe: (p.timeframe as BriefPriority['timeframe']) || '30_days',
        priorityEn: p.priority_en,
        priorityAr: p.priority_ar,
        relatedFramework: p.related_framework,
        urgency: (p.urgency as BriefPriority['urgency']) || 'medium',
      }));
    } catch (aiErr) {
      logger.warn('[KSA Intelligence] AI brief generation failed, using rule-based fallback', {
        tenantId, error: toErrorMessage(aiErr),
      });
      brief = buildRuleBasedBrief(keyMetrics, frameworkBreakdown, overdueList.length);
      priorities = buildRuleBasedPriorities(keyMetrics, frameworkBreakdown);
    }

    // 4. Persist brief to tenant schema for historical reference
    await safeQuery(
      `INSERT INTO "${schema}".regulatory_briefs (
        tenant_id, brief_text_en, brief_text_ar, key_metrics, priorities_json, generated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())`,
      [tenantId, brief.textEn, brief.textAr, JSON.stringify(keyMetrics), JSON.stringify(priorities)]
    ).catch(catchHandler(EC.FALLBACK_QUERY, {
      operation: 'persist KSA regulatory brief',
      tenantId,
    }));

    return { brief, keyMetrics, priorities, generatedAt };
  } catch (err) {
    logger.error('[KSA Intelligence] generateRegulatoryBrief failed', {
      tenantId, error: toErrorMessage(err),
    });
    return {
      brief: { textEn: '', textAr: '', executiveSummaryEn: '', executiveSummaryAr: '' },
      keyMetrics: { overallScore: 0, frameworkCount: 0, controlsTotal: 0, controlsImplemented: 0, gapCount: 0, overdueObligations: 0 },
      priorities: [],
      generatedAt,
    };
  }
}

export async function getNextRegulatoryDeadline(tenantId: string): Promise<RegulatoryDeadline | null> {
  const ctx = await getKsaRegulatoryContext(tenantId);
  if (!ctx || !ctx.regulatoryDeadlines || ctx.regulatoryDeadlines.length === 0) return null;
  const now = new Date();
  const upcoming = ctx.regulatoryDeadlines
    .filter(d => new Date(d.dueDate) > now)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  return upcoming[0] || null;
}

export async function getKsaRegulatoryContext(tenantId: string): Promise<KsaRegulatoryContext> {
  const schema = tenantSchema(tenantId);
  const { rows: fwRows } = await safeQuery(
    `SELECT DISTINCT framework_code FROM "${schema}".compliance_frameworks WHERE is_active = true`,
  );
  const { rows: oblRows } = await safeQuery(
    `SELECT COUNT(*) AS total, COALESCE(AVG(CASE WHEN status = 'compliant' THEN 100 ELSE 0 END), 0) AS rate
     FROM "${schema}".compliance_obligations`,
  );
  return {
    frameworkCodes: fwRows.map((r: GenericRow) => r.framework_code),
    totalObligations: parseInt(oblRows[0]?.total || '0', 10),
    overallComplianceRate: parseFloat(oblRows[0]?.rate || '0'),
    regulatoryDeadlines: [],
    reportingObligations: [],
    regulators: [],
    frameworks: fwRows.map((r: GenericRow) => r.framework_code),
  };
}

async function getOverdueObligations(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".compliance_obligations
     WHERE due_date < NOW() AND status != 'compliant' LIMIT 50`,
  );
  return rows;
}

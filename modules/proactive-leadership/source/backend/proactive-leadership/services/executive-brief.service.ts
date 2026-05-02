import { safeQuery, tenantSchema } from '../ports/database.port';
import { emitEvent } from '../ports/events.port';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service.js';
import { logger } from '../ports/logger.port';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';

export interface ExecutiveBrief {
  tenantId: string;
  userId: string;
  generatedAt: string;
  riskSummary: { totalRisks: number; criticalRisks: number; avgScore: number };
  complianceSummary: { overallScore: number; activeFrameworks: number; gaps: number };
  incidentSummary: { openIncidents: number; resolvedLast30Days: number };
  highlights: string[];
  recommendations: string[];
}

export async function generateBrief(tenantId: string, userId?: string): Promise<ExecutiveBrief> {
  const schema = tenantSchema(tenantId);
  const brief: ExecutiveBrief = {
    tenantId, userId: userId ?? SYSTEM_JOB_ACTOR, generatedAt: new Date().toISOString(),
    riskSummary: { totalRisks: 0, criticalRisks: 0, avgScore: 0 },
    complianceSummary: { overallScore: 0, activeFrameworks: 0, gaps: 0 },
    incidentSummary: { openIncidents: 0, resolvedLast30Days: 0 },
    highlights: [], recommendations: [],
  };

  try {
    const { rows: riskRows } = await safeQuery(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE risk_score >= 20)::int AS critical,
              COALESCE(AVG(risk_score), 0)::numeric(5,1) AS avg_score
       FROM "${schema}".risks WHERE status != 'closed'`,
    );
    if (riskRows.length > 0) {
      brief.riskSummary = { totalRisks: riskRows[0].total, criticalRisks: riskRows[0].critical, avgScore: Number(riskRows[0].avg_score) };
    }
  } catch {}

  try {
    const { rows: compRows } = await safeQuery(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status IN ('implemented','effective'))::int AS passing
       FROM "${schema}".controls`,
    );
    if (compRows.length > 0) {
      const total = compRows[0].total || 1;
      brief.complianceSummary.overallScore = Math.round((compRows[0].passing / total) * 100);
      brief.complianceSummary.gaps = total - compRows[0].passing;
    }
  } catch {}

  try {
    const { rows: fwRows } = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".frameworks WHERE status = 'active'`,
    );
    brief.complianceSummary.activeFrameworks = fwRows[0]?.cnt ?? 0;
  } catch {}

  try {
    const { rows: incRows } = await safeQuery(
      `SELECT COUNT(*) FILTER (WHERE status != 'resolved')::int AS open,
              COUNT(*) FILTER (WHERE status = 'resolved' AND resolved_at >= NOW() - INTERVAL '30 days')::int AS resolved_30d
       FROM "${schema}".incidents`,
    );
    if (incRows.length > 0) {
      brief.incidentSummary = { openIncidents: incRows[0].open, resolvedLast30Days: incRows[0].resolved_30d };
    }
  } catch {}

  if (brief.riskSummary.criticalRisks > 0) brief.highlights.push(`${brief.riskSummary.criticalRisks} critical risk(s) require attention`);
  if (brief.complianceSummary.overallScore < 70) brief.highlights.push(`Compliance posture at ${brief.complianceSummary.overallScore}% — below 70% threshold`);
  if (brief.incidentSummary.openIncidents > 5) brief.highlights.push(`${brief.incidentSummary.openIncidents} open incidents pending resolution`);
  if (brief.riskSummary.criticalRisks > 0) brief.recommendations.push('Escalate critical risks to risk committee');
  if (brief.complianceSummary.gaps > 10) brief.recommendations.push('Prioritize closing top compliance gaps');

  await enrichBriefWithAI(tenantId, brief).catch((e: any) => logger.warn('[proactive-leadership] AI enrichment failed', { error: (e as Error).message }));

  recordAudit({
    tenantId, userId: userId ?? SYSTEM_JOB_ACTOR, module: 'proactive-leadership', action: 'create',
    entityType: 'executive_brief', entityId: `brief-${brief.generatedAt}`,
    afterState: { highlights: brief.highlights.length, recommendations: brief.recommendations.length },
  }).catch((e: any) => logger.warn('[proactive-leadership] audit failed', { error: (e as Error).message }));

  emitEvent(({
      tenantId, userId: userId ?? SYSTEM_JOB_ACTOR, module: 'proactive-leadership', event: 'brief.generated',
      entityType: 'executive_brief', entityId: `brief-${brief.generatedAt}`,
      data: {
        criticalRisks: brief.riskSummary.criticalRisks,
        complianceScore: brief.complianceSummary.overallScore,
        openIncidents: brief.incidentSummary.openIncidents,
        highlightsCount: brief.highlights.length,
      },
    } as any)).catch((e: any) => logger.warn('[proactive-leadership] event emission failed', { error: (e as Error).message }));

  logger.info('[proactive-leadership] executive brief generated', {
    tenantId, criticalRisks: brief.riskSummary.criticalRisks,
    complianceScore: brief.complianceSummary.overallScore,
  });

  return brief;
}

async function enrichBriefWithAI(tenantId: string, brief: ExecutiveBrief): Promise<void> {
  try {

    const { getAgent } = await import('../../ai/services/agents/core/ai-agent.service.js');
    const agent = await getAgent(tenantId, 'executive-advisor');
    if (!agent || agent.status !== 'active') return;

    if (brief.riskSummary.criticalRisks > 3 && !brief.recommendations.some(r => r.includes('board'))) {
      brief.recommendations.push('AI: Consider board-level risk briefing given elevated critical risk count');
    }
    if (brief.complianceSummary.overallScore < 50) {
      brief.recommendations.push('AI: Compliance posture critically low — recommend urgent remediation sprint');
    }

    logger.info('[proactive-leadership] AI enrichment applied to executive brief', { tenantId });
  } catch {
    // AI module not available — graceful degradation
  }
}

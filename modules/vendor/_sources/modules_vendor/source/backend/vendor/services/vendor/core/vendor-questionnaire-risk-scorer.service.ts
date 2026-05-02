import { logger } from '../../../ports/logger.port';
import { z } from "zod";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow as _getFirstRow } from '@dos/db';
import { eventBus, type PlatformEvent } from '../../../ports/events.port';
import { recordAudit } from '../../../../audit/services/audit/core/audit-trail.service.js';
import { createProcessTask } from '../../../ports/lifecycle.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { Engine as RulesEngine } from 'json-rules-engine';
import { SYSTEM_JOB_ACTOR } from '../../../ports/platform.port';

const QuestionnaireResponseSchema = z.object({
  vendorId: z.string(),
  questionnaireId: z.string(),
  responses: z.array(z.object({
    questionId: z.string(),
    category: z.string(),
    weight: z.number().min(0).max(10).default(1),
    answer: z.union([z.string(), z.number(), z.boolean()]),
    riskIndicator: z.enum(['positive', 'neutral', 'negative', 'critical']).default('neutral'),
  })),
});

export type QuestionnaireResponse = z.infer<typeof QuestionnaireResponseSchema>;

export interface VendorRiskScoreResult {
  vendorId: string;
  overallScore: number;
  riskRating: 'critical' | 'high' | 'medium' | 'low';
  categoryScores: Record<string, number>;
  criticalFlags: string[];
  autoEscalate: boolean;
}

const riskScoringEngine = new RulesEngine();

riskScoringEngine.addRule({
  conditions: {
    any: [
      { fact: 'criticalCount', operator: 'greaterThanInclusive', value: 1 },
      { fact: 'overallScore', operator: 'greaterThanInclusive', value: 80 },
    ],
  },
  event: { type: 'auto_escalate' },
});

riskScoringEngine.addRule({
  conditions: {
    all: [
      { fact: 'securityScore', operator: 'greaterThanInclusive', value: 70 },
      { fact: 'complianceScore', operator: 'greaterThanInclusive', value: 60 },
    ],
  },
  event: { type: 'high_risk_area' },
});

export async function scoreVendorQuestionnaire(
  tenantId: string,
  input: QuestionnaireResponse,
): Promise<VendorRiskScoreResult> {
  const parsed = QuestionnaireResponseSchema.parse(input);
  const schema = tenantSchema(tenantId);

  const categoryScores: Record<string, { total: number; weighted: number; count: number }> = {};
  const criticalFlags: string[] = [];
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const resp of parsed.responses) {
    if (!categoryScores[resp.category]) {
      categoryScores[resp.category] = { total: 0, weighted: 0, count: 0 };
    }

    let riskValue = 0;
    switch (resp.riskIndicator) {
      case 'critical': riskValue = 100; criticalFlags.push(`${resp.category}:${resp.questionId}`); break;
      case 'negative': riskValue = 70; break;
      case 'neutral': riskValue = 40; break;
      case 'positive': riskValue = 10; break;
    }

    categoryScores[resp.category].total += riskValue;
    categoryScores[resp.category].weighted += riskValue * resp.weight;
    categoryScores[resp.category].count++;
    totalWeightedScore += riskValue * resp.weight;
    totalWeight += resp.weight;
  }

  const overallScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;

  const catScoreMap: Record<string, number> = {};
  for (const [cat, data] of Object.entries(categoryScores)) {
    catScoreMap[cat] = data.count > 0 ? Math.round(data.total / data.count) : 0;
  }

  let riskRating: VendorRiskScoreResult['riskRating'];
  if (overallScore >= 80 || criticalFlags.length > 0) riskRating = 'critical';
  else if (overallScore >= 60) riskRating = 'high';
  else if (overallScore >= 35) riskRating = 'medium';
  else riskRating = 'low';

  const facts = {
    criticalCount: criticalFlags.length,
    overallScore,
    securityScore: catScoreMap['security'] ?? 0,
    complianceScore: catScoreMap['compliance'] ?? 0,
  };

  const { events } = await riskScoringEngine.run(facts);
  const autoEscalate = events.some(e => e.type === 'auto_escalate');

  try {
    await safeQuery(
      `UPDATE "${schema}".vendors
       SET risk_score = $1, risk_rating = $2, last_assessed_at = NOW(),
           questionnaire_score = $1, critical_flags = $3, updated_at = NOW()
       WHERE vendor_id = $4`,
      [overallScore, riskRating, JSON.stringify(criticalFlags), parsed.vendorId],
    );

    await safeQuery(
      `INSERT INTO "${schema}".vendor_risk_assessments
       (vendor_id, questionnaire_id, overall_score, risk_rating, category_scores, critical_flags, assessed_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT DO NOTHING`,
      [parsed.vendorId, parsed.questionnaireId, overallScore, riskRating, JSON.stringify(catScoreMap), JSON.stringify(criticalFlags)],
    );
  } catch (err) {
    logger.warn(`[VendorQuestionnaireScorer] DB update failed: ${(err as Error).message}`);
  }

  await swallow(EC.EVENT_BUS, eventBus.publish({
    eventType: 'vendor.risk_changed' as any,

    tenantId, sourceService: 'vendor-questionnaire-scorer', severity: riskRating === 'critical' ? 'critical' : 'info',
    entityType: 'vendor', entityId: parsed.vendorId,
    payload: {
      vendorId: parsed.vendorId, riskRating, riskScore: overallScore,
      questionnaireId: parsed.questionnaireId, criticalFlags,
    },
  }));

  if (autoEscalate) {
    await createProcessTask(tenantId, {
      title: `Vendor risk escalation: Score ${overallScore} (${riskRating})`,
      description: `Vendor questionnaire scored ${overallScore}. ${criticalFlags.length} critical flag(s). Auto-escalation triggered.`,
      taskType: 'vendor_audit_finding',
      priority: 'critical',
      entityType: 'vendor',
      entityId: parsed.vendorId,
      triggerSource: 'vendor.questionnaire_scored',
    });
  }

  await swallow(EC.EVENT_BUS, recordAudit({
    tenantId, userId: SYSTEM_JOB_ACTOR, module: 'vendor', action: 'update',
    entityType: 'vendor', entityId: parsed.vendorId,
    afterState: { overallScore, riskRating, criticalFlags: criticalFlags.length },
  }));

  return { vendorId: parsed.vendorId, overallScore, riskRating, categoryScores: catScoreMap, criticalFlags, autoEscalate };
}

export function registerVendorQuestionnaireScoreSubscribers(): void {
  eventBus.subscribe('vendor.questionnaire_completed' as any, 'vendor-qscore:completed', async (event: PlatformEvent) => {
    if (!event.tenantId) return;
    const vendorId = event.payload?.vendorId as string || event.entityId;
    const questionnaireId = event.payload?.questionnaireId as string;
    const responses = event.payload?.responses as any[];
    if (vendorId && questionnaireId && Array.isArray(responses)) {
      try {
        await scoreVendorQuestionnaire(event.tenantId, { vendorId, questionnaireId, responses });
      } catch (err) {
        logger.error(`[VendorQuestionnaireScorer] scoring failed: ${(err as Error).message}`);
      }
    }
  });

  logger.info('[VendorQuestionnaireScorer] subscribers registered');
}

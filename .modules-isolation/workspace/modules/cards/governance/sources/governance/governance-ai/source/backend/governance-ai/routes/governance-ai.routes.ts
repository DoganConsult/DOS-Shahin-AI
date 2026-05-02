import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());


import type { AuthenticatedRequest as _AuthenticatedRequest } from '@dos/types';
import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { safeQuery } from '../ports/database.port';
/**
 * Governance AI Routes — AGRC-OS
 *
 * Exposes the AI governance pipeline, signal detection, compliance scoring,
 * health intelligence, and escalation evaluation endpoints.
 * All endpoints require DAuth authentication and permission checks.
 * All mutating endpoints use platform validate() middleware with Zod schemas.
 *
 * @owner governance-ai
 * @module governance-ai
 * @since 2026-03-31
 */

import { authenticate, requirePermission } from '../ports/auth.port';

import { asyncHandler, validate, moduleStack, auditMiddleware, setAuditData } from '../ports/middleware.port';

import { runFullPipeline, getPipelineHistory } from '../services/operations/governance-ai-pipeline.service';
import { runSignalScan, listSignalDetectors, upsertSignalDetector } from '../services/intelligence/signal-detection.service';
import { interpretSignal, interpretNewSignals, getInterpretationHistory, reinterpretSignal } from '../services/intelligence/interpretation.service';
import { getLatestComplianceScore, computeComplianceScore } from '../services/intelligence/compliance-score.service';
import { getHealthDashboard, getHealthTrend, getLatestScoreExplanation, generateScoreExplanation } from '../services/intelligence/health-intelligence.service';
import { runEscalationScan, getBoardAttentionSummary, getExecutiveAttentionSummary, escalateItem, deescalateItem } from '../services/intelligence/escalation-engine.service';
import { generateRecommendations, generateRecommendationsForNewIssues, acceptRecommendation, rejectRecommendation, getRecommendationStats, getRecommendationHistory } from '../services/intelligence/action-orchestration.service';
import { submitFeedback, getFeedbackStats, generateNarrativeSummary } from '../services/intelligence/narrative-engine.service';
import { GovernanceAiDiagnosticsService } from '../diagnostics/governance-ai-diagnostics.service';
import { checkLifecycleAuth } from '../services/operations/governance-ai-lifecycle-auth.service';


import { createScanBody, createBatchBody, createComputeBody, createGenerateBody, createEvaluateBody } from '../schemas/governance-ai.schemas';
import {
  pipelineRunBody,
  pipelineHistoryQuery,
  escalateItemBody,
  deescalateBody,
  feedbackBody,
  upsertDetectorBody,
  interpretationHistoryQuery,
  healthTrendQuery,
  recommendationHistoryQuery,
  rejectRecommendationBody,
  signalIdParam,
  escalationIdParam,
  issueIdParam,
  recIdParam,
} from '../schemas/governance-ai.schemas';
const router = Router();
const diagnosticsService = new GovernanceAiDiagnosticsService();

router.use(moduleStack('governance_ai'));
router.use(auditMiddleware('governance_ai'));

// ── Pipeline ──────────────────────────────────────────────────────────

router.post(
  '/pipeline/run',
  authenticate,
  requirePermission('governance_ai.pipeline.execute'),
  validate({ body: pipelineRunBody }),
  asyncHandler(async (req: Request, res: Response) => {
    await checkLifecycleAuth(req.tenantId!, req.userId!, 'pipeline.execute');
    setAuditData(res as any, { action: 'execute', entityType: 'governance_ai_pipeline', entityId: req.tenantId });
    const result = await runFullPipeline(req.tenantId!, req.body);
    res.json(result);
  }),
);

router.get(
  '/pipeline/history',
  authenticate,
  requirePermission('governance_ai.pipeline.read'),
  validate({ query: pipelineHistoryQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const { limit } = req.query as Record<string, string | undefined>;
    res.json({ data: await getPipelineHistory(req.tenantId!, (limit as any)) });
  }),
);

// ── Signals ───────────────────────────────────────────────────────────

router.post(
  '/signals/scan',
  authenticate,
  requirePermission('governance_ai.signal.execute'),
  validate({ body: createScanBody }),
  asyncHandler(async (req: Request, res: Response) => {
    await checkLifecycleAuth(req.tenantId!, req.userId!, 'signal.scan');
    setAuditData(res as any, { action: 'scan', entityType: 'governance_ai_signal', entityId: req.tenantId });
    res.json(await runSignalScan(req.tenantId!));
  }),
);

router.get(
  '/signals/detectors',
  authenticate,
  requirePermission('governance_ai.signal.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: await listSignalDetectors(req.tenantId) });
  }),
);

router.put(
  '/signals/detectors',
  authenticate,
  requirePermission('governance_ai.manage'),
  validate({ body: upsertDetectorBody }),
  asyncHandler(async (req: Request, res: Response) => {
    await checkLifecycleAuth(req.tenantId!, req.userId!, 'detector.configure');
    setAuditData(res as any, { action: 'upsert', entityType: 'governance_ai_detector', entityId: req.tenantId });
    res.json(await upsertSignalDetector(req.tenantId, req.body));
  }),
);

router.post(
  '/signals/:signalId/interpret',
  authenticate,
  requirePermission('governance_ai.signal.interpret'),
  validate({ params: signalIdParam }),
  asyncHandler(async (req: Request, res: Response) => {
    setAuditData(res as any, { action: 'interpret', entityType: 'governance_ai_signal', entityId: req.params.signalId });
    const result = await interpretSignal(req.tenantId!, req.params.signalId);
    res.json(result);
  }),
);

router.post(
  '/signals/:signalId/reinterpret',
  authenticate,
  requirePermission('governance_ai.signal.interpret'),
  validate({ params: signalIdParam }),
  asyncHandler(async (req: Request, res: Response) => {
    await checkLifecycleAuth(req.tenantId!, req.userId!, 'signal.reinterpret');
    setAuditData(res as any, { action: 'reinterpret', entityType: 'governance_ai_signal', entityId: req.params.signalId });
    const result = await reinterpretSignal(req.tenantId!, req.params.signalId);
    res.json(result);
  }),
);

// ── Interpretation ────────────────────────────────────────────────────

router.post(
  '/interpretation/batch',
  authenticate,
  requirePermission('governance_ai.signal.interpret'),
  validate({ body: createBatchBody }),
  asyncHandler(async (req: Request, res: Response) => {
    await checkLifecycleAuth(req.tenantId!, req.userId!, 'interpretation.batch');
    setAuditData(res as any, { action: 'batch_interpret', entityType: 'governance_ai_signal', entityId: req.tenantId });
    res.json(await interpretNewSignals(req.tenantId!));
  }),
);

router.get(
  '/interpretation/history',
  authenticate,
  requirePermission('governance_ai.signal.read'),
  validate({ query: interpretationHistoryQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await getInterpretationHistory(req.tenantId!, req.query as Record<string, string | undefined>));
  }),
);

// ── Compliance Score ──────────────────────────────────────────────────

router.get(
  '/compliance-score',
  authenticate,
  requirePermission('governance_ai.compliance_score.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const existing = await getLatestComplianceScore(req.tenantId!);
    res.json(existing || await computeComplianceScore(req.tenantId!));
  }),
);

router.post(
  '/compliance-score/compute',
  authenticate,
  requirePermission('governance_ai.compliance_score.execute'),
  validate({ body: createComputeBody }),
  asyncHandler(async (req: Request, res: Response) => {
    await checkLifecycleAuth(req.tenantId!, req.userId!, 'compliance_score.compute');
    setAuditData(res as any, { action: 'compute', entityType: 'governance_ai_compliance_score', entityId: req.tenantId });
    res.json(await computeComplianceScore(req.tenantId!));
  }),
);

// ── Health Intelligence ───────────────────────────────────────────────

router.get(
  '/health',
  authenticate,
  requirePermission('governance_ai.health.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    res.json(await getHealthDashboard(req.tenantId!));
  }),
);

router.get(
  '/health/trend',
  authenticate,
  requirePermission('governance_ai.health.read'),
  validate({ query: healthTrendQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const { dimension, range } = req.query as Record<string, string | undefined>;
    res.json({ data: await getHealthTrend(req.tenantId!, dimension, (range as any)) });
  }),
);

router.get(
  '/health/score-explanation',
  authenticate,
  requirePermission('governance_ai.health.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    res.json(await getLatestScoreExplanation(req.tenantId!));
  }),
);

router.post(
  '/health/score-explanation/generate',
  authenticate,
  requirePermission('governance_ai.health.execute'),
  validate({ body: createGenerateBody }),
  asyncHandler(async (req: Request, res: Response) => {
    await checkLifecycleAuth(req.tenantId!, req.userId!, 'score_explanation.generate');
    setAuditData(res as any, { action: 'generate', entityType: 'governance_ai_score_explanation', entityId: req.tenantId });
    res.json(await generateScoreExplanation(req.tenantId!));
  }),
);

// ── Escalation ────────────────────────────────────────────────────────

router.post(
  '/escalation/evaluate',
  authenticate,
  requirePermission('governance_ai.escalation.execute'),
  validate({ body: createEvaluateBody }),
  asyncHandler(async (req: Request, res: Response) => {
    await checkLifecycleAuth(req.tenantId!, req.userId!, 'escalation.evaluate');
    setAuditData(res as any, { action: 'evaluate', entityType: 'governance_ai_escalation', entityId: req.tenantId });
    res.json(await runEscalationScan(req.tenantId!));
  }),
);

router.get(
  '/escalation/board-summary',
  authenticate,
  requirePermission('governance_ai.escalation.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    res.json(await getBoardAttentionSummary(req.tenantId!));
  }),
);

router.get(
  '/escalation/executive-summary',
  authenticate,
  requirePermission('governance_ai.escalation.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    res.json(await getExecutiveAttentionSummary(req.tenantId!));
  }),
);

router.post(
  '/escalation/escalate',
  authenticate,
  requirePermission('governance_ai.escalation.execute'),
  validate({ body: escalateItemBody }),
  asyncHandler(async (req: Request, res: Response) => {
    await checkLifecycleAuth(req.tenantId!, req.userId!, 'escalation.manual');
    const { itemType, itemId, targetLevel, reason } = req.body;
    setAuditData(res as any, { action: 'escalate', entityType: 'governance_ai_escalation', entityId: itemId });
    res.json(await escalateItem(req.tenantId!, itemType, itemId, targetLevel, reason));
  }),
);

router.post(
  '/escalation/:escalationId/deescalate',
  authenticate,
  requirePermission('governance_ai.escalation.execute'),
  validate({ params: escalationIdParam, body: deescalateBody }),
  asyncHandler(async (req: Request, res: Response) => {
    await checkLifecycleAuth(req.tenantId!, req.userId!, 'escalation.deescalate');
    setAuditData(res as any, { action: 'deescalate', entityType: 'governance_ai_escalation', entityId: req.params.escalationId });
    res.json(await deescalateItem(req.tenantId!, req.params.escalationId, req.userId!, req.body.reason));
  }),
);

// ── Recommendations ───────────────────────────────────────────────────

router.post(
  '/recommendations/generate',
  authenticate,
  requirePermission('governance_ai.recommendation.execute'),
  validate({ body: createGenerateBody }),
  asyncHandler(async (req: Request, res: Response) => {
    await checkLifecycleAuth(req.tenantId!, req.userId!, 'recommendation.generate');
    setAuditData(res as any, { action: 'generate', entityType: 'governance_ai_recommendation', entityId: req.tenantId });
    res.json({ data: await generateRecommendationsForNewIssues(req.tenantId!) });
  }),
);

router.post(
  '/recommendations/:issueId/generate',
  authenticate,
  requirePermission('governance_ai.recommendation.execute'),
  validate({ params: issueIdParam }),
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await generateRecommendations(req.tenantId!, req.params.issueId));
  }),
);

router.post(
  '/recommendations/:recId/accept',
  authenticate,
  requirePermission('governance_ai.recommendation.approve'),
  validate({ params: recIdParam }),
  asyncHandler(async (req: Request, res: Response) => {
    await checkLifecycleAuth(req.tenantId!, req.userId!, 'recommendation.accept');
    setAuditData(res as any, { action: 'accept', entityType: 'governance_ai_recommendation', entityId: req.params.recId });
    res.json(await acceptRecommendation(req.tenantId!, req.params.recId, req.userId!));
  }),
);

router.post(
  '/recommendations/:recId/reject',
  authenticate,
  requirePermission('governance_ai.recommendation.approve'),
  validate({ params: recIdParam, body: rejectRecommendationBody }),
  asyncHandler(async (req: Request, res: Response) => {
    setAuditData(res as any, { action: 'reject', entityType: 'governance_ai_recommendation', entityId: req.params.recId });
    res.json(await rejectRecommendation(req.tenantId!, req.params.recId, req.userId!, req.body.reason));
  }),
);

router.get(
  '/recommendations/stats',
  authenticate,
  requirePermission('governance_ai.recommendation.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    res.json(await getRecommendationStats(req.tenantId!));
  }),
);

router.get(
  '/recommendations/history',
  authenticate,
  requirePermission('governance_ai.recommendation.read'),
  validate({ query: recommendationHistoryQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await getRecommendationHistory(req.tenantId!, req.query as Record<string, string | undefined>));
  }),
);

// ── Feedback & Narrative ──────────────────────────────────────────────

router.post(
  '/feedback',
  authenticate,
  requirePermission('governance_ai.record.write'),
  validate({ body: feedbackBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const { sourceType, sourceId, feedbackType, feedbackText } = req.body;
    setAuditData(res as any, { action: 'submit_feedback', entityType: 'governance_ai_feedback', entityId: sourceId });

    res.json(await submitFeedback(req.tenantId, sourceType, sourceId, feedbackType, (feedbackText as any), req.userId!));
  }),
);

router.get(
  '/feedback/stats',
  authenticate,
  requirePermission('governance_ai.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    res.json(await getFeedbackStats(req.tenantId!));
  }),
);

router.get(
  '/narrative/summary',
  authenticate,
  requirePermission('governance_ai.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    res.json({ narrative: await generateNarrativeSummary(req.tenantId!) });
  }),
);

// ── Admin: SLA / Escalation / Runbooks ────────────────────────────────

router.get(
  '/admin/sla',
  authenticate,
  requirePermission('governance_ai.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const schema = `tenant_${req.tenantId}`;
    const { rows } = await safeQuery(
      `SELECT config_value FROM "${schema}".module_configs WHERE module_code = 'governance-ai' AND config_key = 'sla_policy' LIMIT 1`, [],
    ).catch(() => ({ rows: [] }));
    const tenantOverrides = rows[0]?.config_value ? JSON.parse(rows[0].config_value) : null;
    res.json({
      success: true, data: {
        moduleCode: 'governance-ai',
        sla: {
          defaults: { pipelineRunSlaHours: 72, signalResponseSlaHours: 24, escalationResolutionSlaHours: 48, narrativeGenerationSlaHours: 4 },
          timeouts: { approvalTimeoutHours: 72, escalationAfterHours: 48, reminderBeforeHours: 8 },
          thresholds: { maxPendingSignals: 100, maxStaleEscalations: 10, healthScoreMinimum: 60 },
          tenantOverrides,
        },
      },
    });
  }),
);

router.get(
  '/admin/escalation-policy',
  authenticate,
  requirePermission('governance_ai.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const schema = `tenant_${req.tenantId}`;
    const { rows } = await safeQuery(
      `SELECT config_value FROM "${schema}".module_configs WHERE module_code = 'governance-ai' AND config_key = 'escalation_policy' LIMIT 1`, [],
    ).catch(() => ({ rows: [] }));
    const tenantPolicy = rows[0]?.config_value ? JSON.parse(rows[0].config_value) : null;
    res.json({
      success: true, data: {
        moduleCode: 'governance-ai',
        escalation: {
          defaultPath: ['governance_ai.operator', 'governance_ai.module_lead', 'governance_ai.executive_owner'],
          escalateAfterHours: 48,
          reminderBeforeHours: 8,
          autoEscalateOnSlaBreach: true,
          notifyOnEscalation: true,
          maxEscalationLevels: 3,
          tenantPolicy,
        },
      },
    });
  }),
);

router.get(
  '/admin/runbooks',
  authenticate,
  requirePermission('governance_ai.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      success: true, data: {
        moduleCode: 'governance-ai',
        runbooks: [
          { code: 'governance_ai.pipeline_execution', titleEn: 'Pipeline Execution', titleAr: 'تنفيذ خط الأنابيب', url: '/docs/runbooks/governance-ai/pipeline-execution.md' },
          { code: 'governance_ai.signal_triage', titleEn: 'Signal Triage', titleAr: 'فرز الإشارات', url: '/docs/runbooks/governance-ai/signal-triage.md' },
          { code: 'governance_ai.escalation_handling', titleEn: 'Escalation Handling', titleAr: 'معالجة التصعيد', url: '/docs/runbooks/governance-ai/escalation-handling.md' },
          { code: 'governance_ai.narrative_review', titleEn: 'Narrative Review', titleAr: 'مراجعة السرد', url: '/docs/runbooks/governance-ai/narrative-review.md' },
          { code: 'governance_ai.model_lifecycle', titleEn: 'Model Lifecycle', titleAr: 'دورة حياة النموذج', url: '/docs/runbooks/governance-ai/model-lifecycle.md' },
          { code: 'governance_ai.diagnostics_triage', titleEn: 'Diagnostics Triage', titleAr: 'فرز التشخيصات', url: '/docs/runbooks/governance-ai/diagnostics-triage.md' },
        ],
      },
    });
  }),
);

// ── Diagnostics ───────────────────────────────────────────────────────

router.get(
  '/diagnostics',
  authenticate,
  requirePermission('governance_ai.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    res.json(await diagnosticsService.runDiagnostics(req.tenantId!));
  }),
);

export default router;


// Qiyas Module Controller
import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { QiyasService } from './qiyas.service';

import { toErrorMessage } from '@dos/module-sdk';
import { pushToTenant, buildWSEvent, emitEvent } from '../../ports/events.port';

import { z } from 'zod';
import { auditMiddleware, requireOwnership, validate, asyncHandler } from '../../ports/middleware.port';
import { emptyResult, safeQuery } from '../../ports/database.port';
import { swallow, swallowNull, swallowDefault, catchHandler, EC } from '@dos/platform-core/resilience';
import type { GenericRow as _GenericRow } from '@dos/types';
import {
  getSectorBenchmark, getMaturityForecast, getPeerComparison,
} from './services/qiyas-benchmark.service';


// ── Zod Validation Schemas ──
const createModelsBody = z.object({});

const updateModelsmodelIdBody = z.object({});

const createModelsmodelIdDomainsBody = z.object({});

const createAssessmentsBody = z.object({});

const updateAssessmentsidBody = z.object({
  status: z.unknown().optional(),
});

const createAssessmentsidResponsesBody = z.object({});

const createAssessmentsidComputescoresBody = z.object({});

const createRecommendationsBody = z.object({});

const updateRecommendationsidStatusBody = z.object({
  status: z.unknown().optional(),
});

const createCalibrationsessionsBody = z.object({});

const createCalibrationsessionsidEntriesBody = z.object({});

const createCalibrationsessionsidFinalizeBody = z.object({});

const createEvidencescoresBody = z.object({});

const createAssessmentsidSnapshotBody = z.object({});

const updateTargetprofilesBody = z.object({});

const createBenchmarkdatasetsBody = z.object({});

const createAssessmentsidBenchmarkcomparedatasetIdBody = z.object({});

const updateCertificationgapsgapIdBody = z.object({
  status: z.unknown().optional(),
  evidence: z.unknown().optional(),
});

const createAssessmentsidComputecertificationBody = z.object({});

const createAssessmentsidRespondentsBody = z.object({});

const createAssessmentsidScopesBody = z.object({});

const createQuestionsBody = z.object({});

const updateQuestionsquestionIdBody = z.object({});

const createModelsmodelIdVersionsBody = z.object({});

const createModelversionsversionIdPublishBody = z.object({});

const router: import("express").Router = Router();
router.use(auditMiddleware('qiyas'));
const svc = new QiyasService();

function schema(req: Request): string {
  const tenantId = req.tenantId || req.user?.tenantId || '';
  return `tenant_${tenantId}`;
}

// ═══ Dashboard ═══

router.get('/dashboard', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const summary = await svc.getDashboardSummary(schema(req));
    res.json(summary);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ═══ Models CRUD ═══

router.get('/models', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const models = await svc.listModels(schema(req), {
      status: req.query.status as string,
      model_type: req.query.model_type as string,
    });
    res.json(models);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.get('/models/:modelId', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const model = await svc.getModel(schema(req), req.params.modelId);
    if (!model) return res.status(404).json({ error: 'Model not found' });
    res.json(model);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.post('/models', authenticate, requirePermission('qiyas.assessment.write'), validate({ body: createModelsBody }), async (req: Request, res: Response) => {
  try {
    const model = await svc.createModel(schema(req), req.body);
    res.status(201).json(model);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.put('/models/:modelId', authenticate, requirePermission('qiyas.assessment.write'), validate({ body: updateModelsmodelIdBody }), async (req: Request, res: Response) => {
  try {
    const model = await svc.updateModel(schema(req), req.params.modelId, req.body);
    if (!model) return res.status(404).json({ error: 'Model not found' });
    res.json(model);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ═══ Model Domains ═══

router.get('/models/:modelId/domains', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const domains = await svc.listDomains(schema(req), req.params.modelId);
    res.json(domains);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.post('/models/:modelId/domains', authenticate, requirePermission('qiyas.assessment.write'), validate({ body: createModelsmodelIdDomainsBody }), async (req: Request, res: Response) => {
  try {
    const domain = await svc.createDomain(schema(req), req.params.modelId, req.body);
    res.status(201).json(domain);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ═══ Assessments CRUD ═══

router.get('/assessments', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const assessments = await svc.listAssessments(schema(req), {
      status: req.query.status as string,
      model_id: req.query.model_id as string,
    });
    res.json(assessments);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.get('/assessments/:id', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const assessment = await svc.getAssessment(schema(req), req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
    res.json(assessment);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.post('/assessments', authenticate, requirePermission('qiyas.assessment.write'), validate({ body: createAssessmentsBody }), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const assessment = await svc.createAssessment(schema(req), req.body, userId);

    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId || req.user?.tenantId, userId, module: 'qiyas', event: 'assessment_started', entityType: 'assessment', entityId: (assessment as any)?.assessment_id || '', data: assessment }), { tenantId: req.tenantId, operation: 'grcEvent:qiyas.assessment.assessment_started' });
    res.status(201).json(assessment);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.put('/assessments/:id', authenticate, requirePermission('qiyas.assessment.write'), requireOwnership('qiyas_assessment'), validate({ body: updateAssessmentsidBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const s = schema(req);
    const assessment = await svc.updateAssessment(s, req.params.id, req.body);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId, module: 'qiyas', event: 'status_changed', entityType: 'assessment', entityId: req.params.id, data: { status: req.body.status } } as any)), { tenantId, operation: 'grcEvent:qiyas.assessment.status_changed' });
    if (req.body.status === 'finalized') {
      const scores = await swallowNull(EC.FALLBACK_QUERY, svc.computeScores(s, req.params.id), {  operation: 'fallback query' }) as { overallScore: number; maturityLevel: string; domainScores: unknown } | null;
      if (scores) {
        const { query: dbQuery } = await import('../../config/database.js');
        dbQuery(
          `INSERT INTO "${s}".grc_maturity_sync
           (assessment_id, overall_score, maturity_level, domain_scores, synced_at, sync_status)
           VALUES ($1, $2, $3, $4, NOW(), 'synced')
           ON CONFLICT (assessment_id) DO UPDATE
             SET overall_score = $2, maturity_level = $3, domain_scores = $4, synced_at = NOW(), sync_status = 'synced'`,
          [req.params.id, scores.overallScore, scores.maturityLevel, JSON.stringify(scores.domainScores)]
        ).catch(catchHandler(EC.EVENT_BUS, {}));

        pushToTenant(tenantId, buildWSEvent('qiyas_score_computed' as any, {
          assessmentId: req.params.id,
          event: 'assessment_finalized',
          maturityLevel: scores.maturityLevel,
          overallScore: scores.overallScore,
        }));

        dbQuery(
          `INSERT INTO "${s}".qiyas_grc_trigger_log
           (trigger_type, source_entity_id, source_entity_type, payload, status, created_at)
           VALUES ('assessment_finalized', $1, 'assessment', $2, 'pending', NOW())`,
          [req.params.id, JSON.stringify({
            assessmentId: req.params.id,
            maturityLevel: scores.maturityLevel,
            overallScore: scores.overallScore,
            domainScores: scores.domainScores,
          })]
        ).catch(catchHandler(EC.EVENT_BUS, {}));

        swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId, module: 'qiyas', event: 'assessment_completed', entityType: 'assessment', entityId: req.params.id, data: { maturityLevel: scores.maturityLevel, overallScore: scores.overallScore } } as any)), { tenantId, operation: 'grcEvent:qiyas.assessment.assessment_completed' });
      }
    }

    res.json(assessment);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ═══ Responses ═══

router.get('/assessments/:id/responses', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const responses = await svc.listResponses(schema(req), req.params.id);
    res.json(responses);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.post('/assessments/:id/responses', authenticate, requirePermission('qiyas.assessment.write'), requireOwnership('qiyas_assessment'), validate({ body: createAssessmentsidResponsesBody }), async (req: Request, res: Response) => {
  try {
    const response = await svc.saveResponse(schema(req), req.params.id, req.body);
    res.json(response);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ═══ Scores ═══

router.get('/assessments/:id/scores', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const scores = await svc.getAssessmentScores(schema(req), req.params.id);
    res.json(scores);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.post('/assessments/:id/compute-scores', authenticate, requirePermission('qiyas.assessment.write'), requireOwnership('qiyas_assessment'), validate({ body: createAssessmentsidComputescoresBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const result = await svc.computeScores(schema(req), req.params.id);
    pushToTenant(tenantId, buildWSEvent('qiyas_score_computed' as any, { assessmentId: req.params.id, ...result }));
    res.json(result);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ═══ Benchmarks ═══

router.get('/assessments/:id/benchmarks', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const comparisons = await svc.listBenchmarkComparisons(schema(req), req.params.id);
    res.json(comparisons);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.get('/assessments/:id/benchmarks/percentiles', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const percentiles = await svc.getBenchmarkPercentiles(schema(req), req.params.id);
    res.json(percentiles);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ═══ Certification Readiness ═══

router.get('/assessments/:id/certification', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const cert = await svc.getCertificationReadiness(schema(req), req.params.id);
    res.json(cert);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ═══ Recommendations ═══

router.get('/recommendations', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const rows = await svc.listRecommendations(schema(req), req.query.assessmentId as string);
    res.json({ recommendations: rows, count: rows.length });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.post('/recommendations', authenticate, requirePermission('qiyas.assessment.read'), validate({ body: createRecommendationsBody }), async (req: Request, res: Response) => {
  try {
    const rec = await svc.createRecommendation(schema(req), req.body);
    res.status(201).json(rec);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.put('/recommendations/:id/status', authenticate, requirePermission('qiyas.assessment.write'), validate({ body: updateRecommendationsidStatusBody }), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const rec = await svc.updateRecommendationStatus(schema(req), req.params.id, req.body.status, userId);
    res.json(rec);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.get('/assessments/:id/improvement-paths', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const paths = await svc.getImprovementPaths(schema(req), req.params.id);
    res.json({ paths, count: paths.length });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ═══ Calibration ═══

router.get('/calibration-sessions', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const sessions = await svc.listCalibrationSessions(schema(req), req.query.assessmentId as string);
    res.json({ sessions, count: sessions.length });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.post('/calibration-sessions', authenticate, requirePermission('qiyas.assessment.write'), validate({ body: createCalibrationsessionsBody }), async (req: Request, res: Response) => {
  try {
    const session = await svc.createCalibrationSession(schema(req), req.body);
    res.status(201).json(session);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.post('/calibration-sessions/:id/entries', authenticate, requirePermission('qiyas.assessment.write'), validate({ body: createCalibrationsessionsidEntriesBody }), async (req: Request, res: Response) => {
  try {
    const entry = await svc.addCalibrationEntry(schema(req), req.params.id, req.body);
    res.json(entry);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.post('/calibration-sessions/:id/finalize', authenticate, requirePermission('qiyas.assessment.write'), validate({ body: createCalibrationsessionsidFinalizeBody }), async (req: Request, res: Response) => {
  try {
    const session = await svc.finalizeCalibration(schema(req), req.params.id);
    res.json(session);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ═══ Evidence Scoring ═══

router.get('/evidence-scoring-models', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const models = await svc.getEvidenceScoringModels(schema(req));
    res.json({ models, count: models.length });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.post('/evidence-scores', authenticate, requirePermission('qiyas.assessment.write'), validate({ body: createEvidencescoresBody }), async (req: Request, res: Response) => {
  try {
    const result = await svc.scoreEvidence(schema(req), req.body);
    res.json(result);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.get('/evidence-quality-metrics', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const metrics = await svc.getEvidenceQualityMetrics(schema(req), req.query.assessmentId as string);
    res.json({ metrics, count: metrics.length });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ═══ Maturity Analytics ═══

router.post('/assessments/:id/snapshot', authenticate, requirePermission('qiyas.assessment.write'), requireOwnership('qiyas_assessment'), validate({ body: createAssessmentsidSnapshotBody }), async (req: Request, res: Response) => {
  try {
    const snapshot = await svc.takeMaturitySnapshot(schema(req), req.params.id);
    res.json(snapshot);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.get('/maturity-snapshots', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const limit = parseInt(String(req.query.limit || '30'));
    const snapshots = await svc.getMaturitySnapshots(schema(req), limit);
    res.json({ snapshots, count: snapshots.length });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.get('/progression-history', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const history = await svc.getProgressionHistory(schema(req), req.query.domainId as string);
    res.json({ history, count: history.length });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.get('/assessments/:id/heatmap', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const heatmap = await svc.getMaturityHeatmap(schema(req), req.params.id);
    res.json({ cells: heatmap, count: heatmap.length });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.get('/target-profiles', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const profiles = await svc.getTargetProfiles(schema(req));
    res.json({ profiles, count: profiles.length });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.put('/target-profiles', authenticate, requirePermission('qiyas.assessment.write'), validate({ body: updateTargetprofilesBody }), async (req: Request, res: Response) => {
  try {
    const profile = await svc.upsertTargetProfile(schema(req), req.body);
    res.json(profile);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ═══ Benchmark Management ═══

router.get('/benchmark-datasets', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const datasets = await svc.listBenchmarkDatasets(schema(req));
    res.json({ datasets, count: datasets.length });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.post('/benchmark-datasets', authenticate, requirePermission('qiyas.assessment.write'), validate({ body: createBenchmarkdatasetsBody }), async (req: Request, res: Response) => {
  try {
    const dataset = await svc.createBenchmarkDataset(schema(req), req.body);
    res.status(201).json(dataset);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.post('/assessments/:id/benchmark-compare/:datasetId', authenticate, requirePermission('qiyas.assessment.write'), requireOwnership('qiyas_assessment'), validate({ body: createAssessmentsidBenchmarkcomparedatasetIdBody }), async (req: Request, res: Response) => {
  try {
    const result = await svc.computeBenchmarkComparison(schema(req), req.params.id, req.params.datasetId);
    res.json(result);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ═══ Certification Readiness Management ═══

router.put('/certification-gaps/:gapId', authenticate, requirePermission('qiyas.assessment.write'), validate({ body: updateCertificationgapsgapIdBody }), async (req: Request, res: Response) => {
  try {
    const gap = await svc.updateCertificationGapStatus(schema(req), req.params.gapId, req.body.status, req.body.evidence);
    res.json(gap);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.post('/assessments/:id/compute-certification', authenticate, requirePermission('qiyas.assessment.write'), requireOwnership('qiyas_assessment'), validate({ body: createAssessmentsidComputecertificationBody }), async (req: Request, res: Response) => {
  try {
    const result = await svc.computeCertificationReadiness(schema(req), req.params.id);
    res.json(result);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ═══ Respondent Management ═══

router.get('/assessments/:id/respondents', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const respondents = await svc.listRespondents(schema(req), req.params.id);
    res.json({ respondents, count: respondents.length });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.post('/assessments/:id/respondents', authenticate, requirePermission('qiyas.assessment.write'), requireOwnership('qiyas_assessment'), validate({ body: createAssessmentsidRespondentsBody }), async (req: Request, res: Response) => {
  try {
    const respondent = await svc.assignRespondent(schema(req), req.params.id, req.body);
    res.status(201).json(respondent);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.delete('/respondents/:respondentId', authenticate, requirePermission('qiyas.assessment.delete'), async (req: Request, res: Response) => {
  try {
    await svc.removeRespondent(schema(req), req.params.respondentId);
    res.json({ deleted: true });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.get('/assessments/:id/respondent-progress', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const progress = await svc.getRespondentProgress(schema(req), req.params.id);
    res.json(progress);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ═══ Assessment Scoping ═══

router.get('/assessments/:id/scopes', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const scopes = await svc.listScopes(schema(req), req.params.id);
    res.json({ scopes, count: scopes.length });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.post('/assessments/:id/scopes', authenticate, requirePermission('qiyas.assessment.write'), requireOwnership('qiyas_assessment'), validate({ body: createAssessmentsidScopesBody }), async (req: Request, res: Response) => {
  try {
    const scope = await svc.addScope(schema(req), req.params.id, req.body);
    res.status(201).json(scope);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.delete('/scopes/:scopeId', authenticate, requirePermission('qiyas.assessment.delete'), async (req: Request, res: Response) => {
  try {
    await svc.removeScope(schema(req), req.params.scopeId);
    res.json({ deleted: true });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ═══ Question Bank ═══

router.get('/questions', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const questions = await svc.listQuestions(schema(req), {
      domainId: req.query.domainId as string,
      groupId: req.query.groupId as string,
    });
    res.json({ questions, count: questions.length });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.post('/questions', authenticate, requirePermission('qiyas.assessment.write'), validate({ body: createQuestionsBody }), async (req: Request, res: Response) => {
  try {
    const question = await svc.createQuestion(schema(req), req.body);
    res.status(201).json(question);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.put('/questions/:questionId', authenticate, requirePermission('qiyas.assessment.write'), validate({ body: updateQuestionsquestionIdBody }), async (req: Request, res: Response) => {
  try {
    const question = await svc.updateQuestion(schema(req), req.params.questionId, req.body);
    res.json(question);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.delete('/questions/:questionId', authenticate, requirePermission('qiyas.assessment.delete'), async (req: Request, res: Response) => {
  try {
    await svc.deleteQuestion(schema(req), req.params.questionId);
    res.json({ deleted: true });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.get('/question-groups', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const groups = await svc.listQuestionGroups(schema(req), req.query.modelId as string);
    res.json({ groups, count: groups.length });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ═══ Model Versioning ═══

router.get('/models/:modelId/versions', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const versions = await svc.listModelVersions(schema(req), req.params.modelId);
    res.json({ versions, count: versions.length });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.post('/models/:modelId/versions', authenticate, requirePermission('qiyas.assessment.write'), validate({ body: createModelsmodelIdVersionsBody }), async (req: Request, res: Response) => {
  try {
    const version = await svc.createModelVersion(schema(req), req.params.modelId, req.body);
    res.status(201).json(version);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

router.post('/model-versions/:versionId/publish', authenticate, requirePermission('qiyas.assessment.write'), validate({ body: createModelversionsversionIdPublishBody }), async (req: Request, res: Response) => {
  try {
    const version = await svc.publishModelVersion(schema(req), req.params.versionId);
    res.json(version);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ═══ Cross-module: GRC trigger log ═══

router.get('/grc-triggers', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const s = schema(req);
    const limit = parseInt(String(req.query.limit || '20'));
    const { safeQuery } = await import('../../config/database.js');
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT trigger_log_id, trigger_type, source_entity_id, source_entity_type,
              payload, status, created_at, processed_at
       FROM "${s}".qiyas_grc_trigger_log
       ORDER BY created_at DESC LIMIT $1`,
      [limit]
    ), {  operation: 'query qiyas_grc_trigger_log' });
    res.json({ triggers: result.rows, count: result.rows.length });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ═══ Cross-module: auto-tasks ═══

router.get('/auto-tasks', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const s = schema(req);
    const limit = parseInt(String(req.query.limit || '20'));
    const { safeQuery } = await import('../../config/database.js');
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT task_id, task_type, source_trigger_id, entity_id, entity_type,
              priority, status, created_at
       FROM "${s}".qiyas_auto_tasks
       ORDER BY created_at DESC LIMIT $1`,
      [limit]
    ), {  operation: 'query qiyas_auto_tasks' });
    res.json({ tasks: result.rows, count: result.rows.length });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ═══ Cross-module: maturity sync ═══

router.get('/maturity-sync', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const s = schema(req);
    const limit = parseInt(String(req.query.limit || '10'));
    const { safeQuery } = await import('../../config/database.js');
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT assessment_id, overall_score, maturity_level, synced_at, sync_status
       FROM "${s}".grc_maturity_sync
       ORDER BY synced_at DESC LIMIT $1`,
      [limit]
    ), {  operation: 'query grc_maturity_sync' });
    res.json({ syncs: result.rows, count: result.rows.length });
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ═══ Sector Benchmarking ═══

/** Get anonymized sector benchmark for a maturity model */
router.get('/benchmark/:modelCode', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || '';
    const result = await getSectorBenchmark(tenantId, req.params.modelCode);
    res.json(result);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

/** Get maturity forecast with velocity and improvement actions */
router.get('/forecast/:modelCode', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || '';
    const targetLevel = parseInt(String(req.query.target_level || '5'), 10);
    const result = await getMaturityForecast(tenantId, req.params.modelCode, targetLevel);
    res.json(result);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

/** Get anonymized peer comparison (opt-in tenants only) */
router.get('/peer-comparison/:modelCode', authenticate, requirePermission('qiyas.assessment.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || '';
    const result = await getPeerComparison(tenantId, req.params.modelCode);
    res.json(result);
  } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
});

// ═══════════════════════════════════════════════════════════════
// AI-First Qiyas Enhancements — Smart Assessment & Dynamic Benchmarks
// ═══════════════════════════════════════════════════════════════

// POST /qiyas/ai-gap-analysis — AI-driven maturity gap analysis
router.post('/ai-gap-analysis', authenticate, requirePermission('qiyas.assessment.read'), asyncHandler(async (req: Request, res: Response) => {
  const s = schema(req);
  const { assessment_id, target_level } = req.body;

  const [scores, domains, recommendations] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT domain_id, domain_name, score, max_score, maturity_level FROM "${s}".qiyas_domain_scores WHERE assessment_id = $1 ORDER BY score ASC`, [assessment_id]), {  operation: 'query qiyas_domain_scores' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT * FROM "${s}".qiyas_domains ORDER BY display_order`), {  operation: 'query qiyas_domain_scores' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT * FROM "${s}".qiyas_recommendations WHERE assessment_id = $1 AND status = 'pending' ORDER BY priority ASC`, [assessment_id]), {  operation: 'query qiyas_domain_scores' }),
  ]);

  const { claudeJSON } = await import('../../config/claude-client.js');
  const analysis = await claudeJSON({
    systemPrompt: `You are a GRC maturity assessment expert specializing in Saudi regulatory frameworks (NCA ECC, SAMA CSF, PDPL, SDAIA).
Analyze the maturity scores and provide a gap analysis. Respond with JSON:
{
  overall_maturity: string, target_gap: number,
  critical_gaps: [{domain: string, current_level: number, target_level: number, gap: number, priority: "critical"|"high"|"medium", remediation_steps: string[]}],
  quick_wins: [{domain: string, action: string, expected_improvement: number, effort: "low"|"medium"|"high"}],
  roadmap: [{phase: string, duration: string, domains: string[], expected_maturity_gain: number}],
  regulatory_risks: string[],
  investment_estimate: {low: string, high: string, currency: "SAR"}
}`,
    userMessage: `Assessment scores:\n${JSON.stringify(scores.rows)}\nTarget level: ${target_level || 4}\nDomains:\n${JSON.stringify(domains.rows)}\nPending recommendations:\n${JSON.stringify(recommendations.rows)}`,
    maxTokens: 2048,
    temperature: 0.3,
  });

  res.json({ assessment_id, ...(analysis as object) });
}));

// POST /qiyas/ai-benchmark-compare — AI-powered peer benchmarking
router.post('/ai-benchmark-compare', authenticate, requirePermission('qiyas.assessment.read'), asyncHandler(async (req: Request, res: Response) => {
  const s = schema(req);
  const { assessment_id, sector, org_size } = req.body;

  const scores = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT domain_id, domain_name, score, max_score, maturity_level FROM "${s}".qiyas_domain_scores WHERE assessment_id = $1`, [assessment_id]
  ), {  operation: 'query qiyas_domain_scores' });

  const benchmarks = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT * FROM "${s}".qiyas_benchmark_datasets WHERE sector = $1 ORDER BY created_at DESC LIMIT 1`, [sector || 'general']
  ), {  operation: 'query qiyas_domain_scores' });

  const { claudeJSON } = await import('../../config/claude-client.js');
  const comparison = await claudeJSON({
    systemPrompt: `You are a GRC benchmarking expert. Compare the organization's scores against sector benchmarks.
Respond with JSON: {
  percentile_rank: number (0-100),
  strengths: [{domain: string, score: number, benchmark_avg: number, percentile: number}],
  weaknesses: [{domain: string, score: number, benchmark_avg: number, percentile: number}],
  competitive_position: "leading"|"above_average"|"average"|"below_average"|"lagging",
  sector_insights: string,
  improvement_priority: string[]
}`,
    userMessage: `Organization scores:\n${JSON.stringify(scores.rows)}\nSector: ${sector}\nOrg size: ${org_size}\nBenchmark data:\n${JSON.stringify(benchmarks.rows[0] || {})}`,
    maxTokens: 1536,
    temperature: 0.2,
  });

  res.json(comparison);
}));

// GET /qiyas/ai-readiness-score — AI-powered certification readiness assessment
router.get('/ai-readiness-score', authenticate, requirePermission('qiyas.assessment.read'), asyncHandler(async (req: Request, res: Response) => {
  const s = schema(req);
  const framework = req.query.framework as string || 'NCA-ECC';

  const [controls, evidence, policies, gaps] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT implementation_status, COUNT(*) AS cnt FROM "${s}".controls WHERE deleted_at IS NULL AND framework_id ILIKE '%' || $1 || '%' GROUP BY implementation_status`, [framework]), {  operation: 'query controls' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'approved') AS approved FROM "${s}".evidence`), {  operation: 'query controls' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'active') AS active FROM "${s}".policies`), {  operation: 'query controls' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT * FROM "${s}".qiyas_certification_gaps WHERE framework_code ILIKE '%' || $1 || '%' AND status = 'open' ORDER BY severity DESC LIMIT 20`, [framework]), {  operation: 'query evidence' }),
  ]);

  const { claudeJSON } = await import('../../config/claude-client.js');
  const readiness = await claudeJSON({
    systemPrompt: `You are a Saudi regulatory certification readiness assessor. Evaluate readiness for framework certification.
Respond with JSON: {
  readiness_score: number (0-100),
  certification_feasible: boolean,
  estimated_timeline_months: number,
  blockers: [{area: string, issue: string, severity: "critical"|"high"|"medium"}],
  strengths: string[],
  required_actions: [{action: string, priority: number, effort_days: number}],
  regulatory_contact_recommended: boolean
}`,
    userMessage: `Framework: ${framework}\nControls: ${JSON.stringify(controls.rows)}\nEvidence: ${JSON.stringify(evidence.rows[0])}\nPolicies: ${JSON.stringify(policies.rows[0])}\nOpen gaps: ${JSON.stringify(gaps.rows)}`,
    maxTokens: 1536,
    temperature: 0.2,
  });

  res.json({ framework, ...(readiness as object) });
}));

export default router;

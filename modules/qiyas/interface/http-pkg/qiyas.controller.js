"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Qiyas Module Controller
const express_1 = require("express");
const auth_port_1 = require("./ports/auth.port");
const qiyas_service_1 = require("./qiyas.service");
// @ts-ignore - Pragmatic stabilization to unblock build
const module_sdk_1 = require("@dos/module-sdk");
const events_port_1 = require("./ports/events.port");
const zod_1 = require("zod");
const middleware_port_1 = require("./ports/middleware.port");
const database_port_1 = require("./ports/database.port");
const resilience_1 = require("@dos/platform-core/resilience");
const qiyas_benchmark_service_1 = require("./services/qiyas-benchmark.service");
// ── Zod Validation Schemas ──
const createModelsBody = zod_1.z.object({});
const updateModelsmodelIdBody = zod_1.z.object({});
const createModelsmodelIdDomainsBody = zod_1.z.object({});
const createAssessmentsBody = zod_1.z.object({});
const updateAssessmentsidBody = zod_1.z.object({
    status: zod_1.z.unknown().optional(),
});
const createAssessmentsidResponsesBody = zod_1.z.object({});
const createAssessmentsidComputescoresBody = zod_1.z.object({});
const createRecommendationsBody = zod_1.z.object({});
const updateRecommendationsidStatusBody = zod_1.z.object({
    status: zod_1.z.unknown().optional(),
});
const createCalibrationsessionsBody = zod_1.z.object({});
const createCalibrationsessionsidEntriesBody = zod_1.z.object({});
const createCalibrationsessionsidFinalizeBody = zod_1.z.object({});
const createEvidencescoresBody = zod_1.z.object({});
const createAssessmentsidSnapshotBody = zod_1.z.object({});
const updateTargetprofilesBody = zod_1.z.object({});
const createBenchmarkdatasetsBody = zod_1.z.object({});
const createAssessmentsidBenchmarkcomparedatasetIdBody = zod_1.z.object({});
const updateCertificationgapsgapIdBody = zod_1.z.object({
    status: zod_1.z.unknown().optional(),
    evidence: zod_1.z.unknown().optional(),
});
const createAssessmentsidComputecertificationBody = zod_1.z.object({});
const createAssessmentsidRespondentsBody = zod_1.z.object({});
const createAssessmentsidScopesBody = zod_1.z.object({});
const createQuestionsBody = zod_1.z.object({});
const updateQuestionsquestionIdBody = zod_1.z.object({});
const createModelsmodelIdVersionsBody = zod_1.z.object({});
const createModelversionsversionIdPublishBody = zod_1.z.object({});
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.auditMiddleware)('qiyas'));
const svc = new qiyas_service_1.QiyasService();
function schema(req) {
    const tenantId = req.tenantId || req.user?.tenantId || '';
    return `tenant_${tenantId}`;
}
// ═══ Dashboard ═══
router.get('/dashboard', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const summary = await svc.getDashboardSummary(schema(req));
        res.json(summary);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
// ═══ Models CRUD ═══
router.get('/models', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const models = await svc.listModels(schema(req), {
            status: req.query.status,
            model_type: req.query.model_type,
        });
        res.json(models);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.get('/models/:modelId', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const model = await svc.getModel(schema(req), req.params.modelId);
        if (!model)
            return res.status(404).json({ error: 'Model not found' });
        res.json(model);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.post('/models', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.write'), (0, middleware_port_1.validate)({ body: createModelsBody }), async (req, res) => {
    try {
        const model = await svc.createModel(schema(req), req.body);
        res.status(201).json(model);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.put('/models/:modelId', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.write'), (0, middleware_port_1.validate)({ body: updateModelsmodelIdBody }), async (req, res) => {
    try {
        const model = await svc.updateModel(schema(req), req.params.modelId, req.body);
        if (!model)
            return res.status(404).json({ error: 'Model not found' });
        res.json(model);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
// ═══ Model Domains ═══
router.get('/models/:modelId/domains', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const domains = await svc.listDomains(schema(req), req.params.modelId);
        res.json(domains);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.post('/models/:modelId/domains', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.write'), (0, middleware_port_1.validate)({ body: createModelsmodelIdDomainsBody }), async (req, res) => {
    try {
        const domain = await svc.createDomain(schema(req), req.params.modelId, req.body);
        res.status(201).json(domain);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
// ═══ Assessments CRUD ═══
router.get('/assessments', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const assessments = await svc.listAssessments(schema(req), {
            status: req.query.status,
            model_id: req.query.model_id,
        });
        res.json(assessments);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.get('/assessments/:id', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const assessment = await svc.getAssessment(schema(req), req.params.id);
        if (!assessment)
            return res.status(404).json({ error: 'Assessment not found' });
        res.json(assessment);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.post('/assessments', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.write'), (0, middleware_port_1.validate)({ body: createAssessmentsBody }), async (req, res) => {
    try {
        const userId = req.user.userId;
        const assessment = await svc.createAssessment(schema(req), req.body, userId);
        // @ts-ignore - Pragmatic stabilization to unblock build
        (0, resilience_1.swallow)(resilience_1.EC.EVENT_BUS, (0, events_port_1.emitEvent)({ tenantId: req.tenantId || req.user?.tenantId, userId, module: 'qiyas', event: 'assessment_started', entityType: 'assessment', entityId: assessment?.assessment_id || '', data: assessment }), { tenantId: req.tenantId, operation: 'grcEvent:qiyas.assessment.assessment_started' });
        res.status(201).json(assessment);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.put('/assessments/:id', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.write'), (0, middleware_port_1.requireOwnership)('qiyas_assessment'), (0, middleware_port_1.validate)({ body: updateAssessmentsidBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const s = schema(req);
        const assessment = await svc.updateAssessment(s, req.params.id, req.body);
        if (!assessment)
            return res.status(404).json({ error: 'Assessment not found' });
        (0, resilience_1.swallow)(resilience_1.EC.EVENT_BUS, (0, events_port_1.emitEvent)({ tenantId, userId: req.user.userId, module: 'qiyas', event: 'status_changed', entityType: 'assessment', entityId: req.params.id, data: { status: req.body.status } }), { tenantId, operation: 'grcEvent:qiyas.assessment.status_changed' });
        if (req.body.status === 'finalized') {
            const scores = await (0, resilience_1.swallowNull)(resilience_1.EC.FALLBACK_QUERY, svc.computeScores(s, req.params.id), { operation: 'fallback query' });
            if (scores) {
                const { query: dbQuery } = await import('../../config/database.js');
                dbQuery(`INSERT INTO "${s}".grc_maturity_sync
           (assessment_id, overall_score, maturity_level, domain_scores, synced_at, sync_status)
           VALUES ($1, $2, $3, $4, NOW(), 'synced')
           ON CONFLICT (assessment_id) DO UPDATE
             SET overall_score = $2, maturity_level = $3, domain_scores = $4, synced_at = NOW(), sync_status = 'synced'`, [req.params.id, scores.overallScore, scores.maturityLevel, JSON.stringify(scores.domainScores)]).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS, {}));
                (0, events_port_1.pushToTenant)(tenantId, (0, events_port_1.buildWSEvent)('qiyas_score_computed', {
                    assessmentId: req.params.id,
                    event: 'assessment_finalized',
                    maturityLevel: scores.maturityLevel,
                    overallScore: scores.overallScore,
                }));
                dbQuery(`INSERT INTO "${s}".qiyas_grc_trigger_log
           (trigger_type, source_entity_id, source_entity_type, payload, status, created_at)
           VALUES ('assessment_finalized', $1, 'assessment', $2, 'pending', NOW())`, [req.params.id, JSON.stringify({
                        assessmentId: req.params.id,
                        maturityLevel: scores.maturityLevel,
                        overallScore: scores.overallScore,
                        domainScores: scores.domainScores,
                    })]).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS, {}));
                (0, resilience_1.swallow)(resilience_1.EC.EVENT_BUS, (0, events_port_1.emitEvent)({ tenantId, userId: req.user.userId, module: 'qiyas', event: 'assessment_completed', entityType: 'assessment', entityId: req.params.id, data: { maturityLevel: scores.maturityLevel, overallScore: scores.overallScore } }), { tenantId, operation: 'grcEvent:qiyas.assessment.assessment_completed' });
            }
        }
        res.json(assessment);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
// ═══ Responses ═══
router.get('/assessments/:id/responses', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const responses = await svc.listResponses(schema(req), req.params.id);
        res.json(responses);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.post('/assessments/:id/responses', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.write'), (0, middleware_port_1.requireOwnership)('qiyas_assessment'), (0, middleware_port_1.validate)({ body: createAssessmentsidResponsesBody }), async (req, res) => {
    try {
        const response = await svc.saveResponse(schema(req), req.params.id, req.body);
        res.json(response);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
// ═══ Scores ═══
router.get('/assessments/:id/scores', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const scores = await svc.getAssessmentScores(schema(req), req.params.id);
        res.json(scores);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.post('/assessments/:id/compute-scores', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.write'), (0, middleware_port_1.requireOwnership)('qiyas_assessment'), (0, middleware_port_1.validate)({ body: createAssessmentsidComputescoresBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId;
        const result = await svc.computeScores(schema(req), req.params.id);
        (0, events_port_1.pushToTenant)(tenantId, (0, events_port_1.buildWSEvent)('qiyas_score_computed', { assessmentId: req.params.id, ...result }));
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
// ═══ Benchmarks ═══
router.get('/assessments/:id/benchmarks', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const comparisons = await svc.listBenchmarkComparisons(schema(req), req.params.id);
        res.json(comparisons);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.get('/assessments/:id/benchmarks/percentiles', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const percentiles = await svc.getBenchmarkPercentiles(schema(req), req.params.id);
        res.json(percentiles);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
// ═══ Certification Readiness ═══
router.get('/assessments/:id/certification', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const cert = await svc.getCertificationReadiness(schema(req), req.params.id);
        res.json(cert);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
// ═══ Recommendations ═══
router.get('/recommendations', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const rows = await svc.listRecommendations(schema(req), req.query.assessmentId);
        res.json({ recommendations: rows, count: rows.length });
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.post('/recommendations', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), (0, middleware_port_1.validate)({ body: createRecommendationsBody }), async (req, res) => {
    try {
        const rec = await svc.createRecommendation(schema(req), req.body);
        res.status(201).json(rec);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.put('/recommendations/:id/status', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.write'), (0, middleware_port_1.validate)({ body: updateRecommendationsidStatusBody }), async (req, res) => {
    try {
        const userId = req.user?.userId;
        const rec = await svc.updateRecommendationStatus(schema(req), req.params.id, req.body.status, userId);
        res.json(rec);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.get('/assessments/:id/improvement-paths', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const paths = await svc.getImprovementPaths(schema(req), req.params.id);
        res.json({ paths, count: paths.length });
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
// ═══ Calibration ═══
router.get('/calibration-sessions', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const sessions = await svc.listCalibrationSessions(schema(req), req.query.assessmentId);
        res.json({ sessions, count: sessions.length });
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.post('/calibration-sessions', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.write'), (0, middleware_port_1.validate)({ body: createCalibrationsessionsBody }), async (req, res) => {
    try {
        const session = await svc.createCalibrationSession(schema(req), req.body);
        res.status(201).json(session);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.post('/calibration-sessions/:id/entries', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.write'), (0, middleware_port_1.validate)({ body: createCalibrationsessionsidEntriesBody }), async (req, res) => {
    try {
        const entry = await svc.addCalibrationEntry(schema(req), req.params.id, req.body);
        res.json(entry);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.post('/calibration-sessions/:id/finalize', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.write'), (0, middleware_port_1.validate)({ body: createCalibrationsessionsidFinalizeBody }), async (req, res) => {
    try {
        const session = await svc.finalizeCalibration(schema(req), req.params.id);
        res.json(session);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
// ═══ Evidence Scoring ═══
router.get('/evidence-scoring-models', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const models = await svc.getEvidenceScoringModels(schema(req));
        res.json({ models, count: models.length });
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.post('/evidence-scores', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.write'), (0, middleware_port_1.validate)({ body: createEvidencescoresBody }), async (req, res) => {
    try {
        const result = await svc.scoreEvidence(schema(req), req.body);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.get('/evidence-quality-metrics', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const metrics = await svc.getEvidenceQualityMetrics(schema(req), req.query.assessmentId);
        res.json({ metrics, count: metrics.length });
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
// ═══ Maturity Analytics ═══
router.post('/assessments/:id/snapshot', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.write'), (0, middleware_port_1.requireOwnership)('qiyas_assessment'), (0, middleware_port_1.validate)({ body: createAssessmentsidSnapshotBody }), async (req, res) => {
    try {
        const snapshot = await svc.takeMaturitySnapshot(schema(req), req.params.id);
        res.json(snapshot);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.get('/maturity-snapshots', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const limit = parseInt(String(req.query.limit || '30'));
        const snapshots = await svc.getMaturitySnapshots(schema(req), limit);
        res.json({ snapshots, count: snapshots.length });
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.get('/progression-history', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const history = await svc.getProgressionHistory(schema(req), req.query.domainId);
        res.json({ history, count: history.length });
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.get('/assessments/:id/heatmap', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const heatmap = await svc.getMaturityHeatmap(schema(req), req.params.id);
        res.json({ cells: heatmap, count: heatmap.length });
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.get('/target-profiles', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const profiles = await svc.getTargetProfiles(schema(req));
        res.json({ profiles, count: profiles.length });
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.put('/target-profiles', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.write'), (0, middleware_port_1.validate)({ body: updateTargetprofilesBody }), async (req, res) => {
    try {
        const profile = await svc.upsertTargetProfile(schema(req), req.body);
        res.json(profile);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
// ═══ Benchmark Management ═══
router.get('/benchmark-datasets', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const datasets = await svc.listBenchmarkDatasets(schema(req));
        res.json({ datasets, count: datasets.length });
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.post('/benchmark-datasets', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.write'), (0, middleware_port_1.validate)({ body: createBenchmarkdatasetsBody }), async (req, res) => {
    try {
        const dataset = await svc.createBenchmarkDataset(schema(req), req.body);
        res.status(201).json(dataset);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.post('/assessments/:id/benchmark-compare/:datasetId', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.write'), (0, middleware_port_1.requireOwnership)('qiyas_assessment'), (0, middleware_port_1.validate)({ body: createAssessmentsidBenchmarkcomparedatasetIdBody }), async (req, res) => {
    try {
        const result = await svc.computeBenchmarkComparison(schema(req), req.params.id, req.params.datasetId);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
// ═══ Certification Readiness Management ═══
router.put('/certification-gaps/:gapId', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.write'), (0, middleware_port_1.validate)({ body: updateCertificationgapsgapIdBody }), async (req, res) => {
    try {
        const gap = await svc.updateCertificationGapStatus(schema(req), req.params.gapId, req.body.status, req.body.evidence);
        res.json(gap);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.post('/assessments/:id/compute-certification', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.write'), (0, middleware_port_1.requireOwnership)('qiyas_assessment'), (0, middleware_port_1.validate)({ body: createAssessmentsidComputecertificationBody }), async (req, res) => {
    try {
        const result = await svc.computeCertificationReadiness(schema(req), req.params.id);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
// ═══ Respondent Management ═══
router.get('/assessments/:id/respondents', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const respondents = await svc.listRespondents(schema(req), req.params.id);
        res.json({ respondents, count: respondents.length });
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.post('/assessments/:id/respondents', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.write'), (0, middleware_port_1.requireOwnership)('qiyas_assessment'), (0, middleware_port_1.validate)({ body: createAssessmentsidRespondentsBody }), async (req, res) => {
    try {
        const respondent = await svc.assignRespondent(schema(req), req.params.id, req.body);
        res.status(201).json(respondent);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.delete('/respondents/:respondentId', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.delete'), async (req, res) => {
    try {
        await svc.removeRespondent(schema(req), req.params.respondentId);
        res.json({ deleted: true });
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.get('/assessments/:id/respondent-progress', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const progress = await svc.getRespondentProgress(schema(req), req.params.id);
        res.json(progress);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
// ═══ Assessment Scoping ═══
router.get('/assessments/:id/scopes', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const scopes = await svc.listScopes(schema(req), req.params.id);
        res.json({ scopes, count: scopes.length });
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.post('/assessments/:id/scopes', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.write'), (0, middleware_port_1.requireOwnership)('qiyas_assessment'), (0, middleware_port_1.validate)({ body: createAssessmentsidScopesBody }), async (req, res) => {
    try {
        const scope = await svc.addScope(schema(req), req.params.id, req.body);
        res.status(201).json(scope);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.delete('/scopes/:scopeId', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.delete'), async (req, res) => {
    try {
        await svc.removeScope(schema(req), req.params.scopeId);
        res.json({ deleted: true });
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
// ═══ Question Bank ═══
router.get('/questions', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const questions = await svc.listQuestions(schema(req), {
            domainId: req.query.domainId,
            groupId: req.query.groupId,
        });
        res.json({ questions, count: questions.length });
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.post('/questions', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.write'), (0, middleware_port_1.validate)({ body: createQuestionsBody }), async (req, res) => {
    try {
        const question = await svc.createQuestion(schema(req), req.body);
        res.status(201).json(question);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.put('/questions/:questionId', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.write'), (0, middleware_port_1.validate)({ body: updateQuestionsquestionIdBody }), async (req, res) => {
    try {
        const question = await svc.updateQuestion(schema(req), req.params.questionId, req.body);
        res.json(question);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.delete('/questions/:questionId', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.delete'), async (req, res) => {
    try {
        await svc.deleteQuestion(schema(req), req.params.questionId);
        res.json({ deleted: true });
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.get('/question-groups', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const groups = await svc.listQuestionGroups(schema(req), req.query.modelId);
        res.json({ groups, count: groups.length });
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
// ═══ Model Versioning ═══
router.get('/models/:modelId/versions', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const versions = await svc.listModelVersions(schema(req), req.params.modelId);
        res.json({ versions, count: versions.length });
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.post('/models/:modelId/versions', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.write'), (0, middleware_port_1.validate)({ body: createModelsmodelIdVersionsBody }), async (req, res) => {
    try {
        const version = await svc.createModelVersion(schema(req), req.params.modelId, req.body);
        res.status(201).json(version);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
router.post('/model-versions/:versionId/publish', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.write'), (0, middleware_port_1.validate)({ body: createModelversionsversionIdPublishBody }), async (req, res) => {
    try {
        const version = await svc.publishModelVersion(schema(req), req.params.versionId);
        res.json(version);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
// ═══ Cross-module: GRC trigger log ═══
router.get('/grc-triggers', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const s = schema(req);
        const limit = parseInt(String(req.query.limit || '20'));
        const { safeQuery } = await import('../../config/database.js');
        const result = await (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)(), safeQuery(`SELECT trigger_log_id, trigger_type, source_entity_id, source_entity_type,
              payload, status, created_at, processed_at
       FROM "${s}".qiyas_grc_trigger_log
       ORDER BY created_at DESC LIMIT $1`, [limit]), { operation: 'query qiyas_grc_trigger_log' });
        res.json({ triggers: result.rows, count: result.rows.length });
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
// ═══ Cross-module: auto-tasks ═══
router.get('/auto-tasks', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const s = schema(req);
        const limit = parseInt(String(req.query.limit || '20'));
        const { safeQuery } = await import('../../config/database.js');
        const result = await (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)(), safeQuery(`SELECT task_id, task_type, source_trigger_id, entity_id, entity_type,
              priority, status, created_at
       FROM "${s}".qiyas_auto_tasks
       ORDER BY created_at DESC LIMIT $1`, [limit]), { operation: 'query qiyas_auto_tasks' });
        res.json({ tasks: result.rows, count: result.rows.length });
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
// ═══ Cross-module: maturity sync ═══
router.get('/maturity-sync', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const s = schema(req);
        const limit = parseInt(String(req.query.limit || '10'));
        const { safeQuery } = await import('../../config/database.js');
        const result = await (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)(), safeQuery(`SELECT assessment_id, overall_score, maturity_level, synced_at, sync_status
       FROM "${s}".grc_maturity_sync
       ORDER BY synced_at DESC LIMIT $1`, [limit]), { operation: 'query grc_maturity_sync' });
        res.json({ syncs: result.rows, count: result.rows.length });
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
// ═══ Sector Benchmarking ═══
/** Get anonymized sector benchmark for a maturity model */
router.get('/benchmark/:modelCode', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || '';
        const result = await (0, qiyas_benchmark_service_1.getSectorBenchmark)(tenantId, req.params.modelCode);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
/** Get maturity forecast with velocity and improvement actions */
router.get('/forecast/:modelCode', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || '';
        const targetLevel = parseInt(String(req.query.target_level || '5'), 10);
        const result = await (0, qiyas_benchmark_service_1.getMaturityForecast)(tenantId, req.params.modelCode, targetLevel);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
/** Get anonymized peer comparison (opt-in tenants only) */
router.get('/peer-comparison/:modelCode', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user?.tenantId || '';
        const result = await (0, qiyas_benchmark_service_1.getPeerComparison)(tenantId, req.params.modelCode);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: (0, module_sdk_1.toErrorMessage)(err) });
    }
});
// ═══════════════════════════════════════════════════════════════
// AI-First Qiyas Enhancements — Smart Assessment & Dynamic Benchmarks
// ═══════════════════════════════════════════════════════════════
// POST /qiyas/ai-gap-analysis — AI-driven maturity gap analysis
router.post('/ai-gap-analysis', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const s = schema(req);
    const { assessment_id, target_level } = req.body;
    const [scores, domains, recommendations] = await Promise.all([
        (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)(), (0, database_port_1.safeQuery)(`SELECT domain_id, domain_name, score, max_score, maturity_level FROM "${s}".qiyas_domain_scores WHERE assessment_id = $1 ORDER BY score ASC`, [assessment_id]), { operation: 'query qiyas_domain_scores' }),
        (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)(), (0, database_port_1.safeQuery)(`SELECT * FROM "${s}".qiyas_domains ORDER BY display_order`), { operation: 'query qiyas_domain_scores' }),
        (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)(), (0, database_port_1.safeQuery)(`SELECT * FROM "${s}".qiyas_recommendations WHERE assessment_id = $1 AND status = 'pending' ORDER BY priority ASC`, [assessment_id]), { operation: 'query qiyas_domain_scores' }),
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
    res.json({ assessment_id, ...analysis });
}));
// POST /qiyas/ai-benchmark-compare — AI-powered peer benchmarking
router.post('/ai-benchmark-compare', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const s = schema(req);
    const { assessment_id, sector, org_size } = req.body;
    const scores = await (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)(), (0, database_port_1.safeQuery)(`SELECT domain_id, domain_name, score, max_score, maturity_level FROM "${s}".qiyas_domain_scores WHERE assessment_id = $1`, [assessment_id]), { operation: 'query qiyas_domain_scores' });
    const benchmarks = await (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)(), (0, database_port_1.safeQuery)(`SELECT * FROM "${s}".qiyas_benchmark_datasets WHERE sector = $1 ORDER BY created_at DESC LIMIT 1`, [sector || 'general']), { operation: 'query qiyas_domain_scores' });
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
router.get('/ai-readiness-score', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('qiyas.assessment.read'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const s = schema(req);
    const framework = req.query.framework || 'NCA-ECC';
    const [controls, evidence, policies, gaps] = await Promise.all([
        (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)(), (0, database_port_1.safeQuery)(`SELECT implementation_status, COUNT(*) AS cnt FROM "${s}".controls WHERE deleted_at IS NULL AND framework_id ILIKE '%' || $1 || '%' GROUP BY implementation_status`, [framework]), { operation: 'query controls' }),
        (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)(), (0, database_port_1.safeQuery)(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'approved') AS approved FROM "${s}".evidence`), { operation: 'query controls' }),
        (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)(), (0, database_port_1.safeQuery)(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'active') AS active FROM "${s}".policies`), { operation: 'query controls' }),
        (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)(), (0, database_port_1.safeQuery)(`SELECT * FROM "${s}".qiyas_certification_gaps WHERE framework_code ILIKE '%' || $1 || '%' AND status = 'open' ORDER BY severity DESC LIMIT 20`, [framework]), { operation: 'query evidence' }),
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
    res.json({ framework, ...readiness });
}));
exports.default = router;
//# sourceMappingURL=qiyas.controller.js.map
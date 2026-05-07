import { Router } from 'express';
// ============================================
// AGRC-OS -- EU AI Act Classification Routes
// Risk classification, impact assessment CRUD,
// and scoring for AI systems under governance
// ============================================
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import { validate, auditMiddleware, setAuditData, automationMiddleware, asyncHandler, moduleStack, mutationEventHook } from '../../ports/middleware.port.js';
import { createClassifyBody, createImpactAssessmentBody, createScoreBody } from '../../schemas/ai-governance.schemas.js';
import { classifyAiSystem, createAiImpactAssessment, getAiImpactAssessment, scoreAiImpactAssessment, ensureAiImpactAssessmentsTable, } from '../../services/ai/compliance/ai-act-classification.service.js';
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai-governance'));
router.use(auditMiddleware('ai-governance'));
router.use(mutationEventHook('ai-governance'));
router.use(auditMiddleware('ai-governance'));
router.use(automationMiddleware('ai-governance'));
// POST /api/ai-governance/models/:modelId/classify -- EU AI Act classification
router.post('/models/:modelId/classify', authenticate, requirePermission('ai.governance.write'), validate({ body: createClassifyBody }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const { modelId } = req.params;
    // Ensure table exists for compliance gap checking
    await ensureAiImpactAssessmentsTable(tenantId);
    const classification = await classifyAiSystem(tenantId, modelId);
    setAuditData(res, {
        action: 'classify',
        entityType: 'ai_model',
        entityId: modelId,
        afterState: {
            risk_level: classification.risk_level,
            applicable_articles: classification.applicable_articles.length,
        },
    });
    res.json(classification);
}));
// POST /api/ai-governance/models/:modelId/impact-assessment -- Create AIIA
router.post('/models/:modelId/impact-assessment', authenticate, requirePermission('ai.governance.write'), validate({ body: createImpactAssessmentBody }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.user.userId;
    const { modelId } = req.params;
    // Ensure table exists before inserting
    await ensureAiImpactAssessmentsTable(tenantId);
    const assessment = await createAiImpactAssessment(tenantId, modelId, userId);
    setAuditData(res, {
        action: 'create',
        entityType: 'ai_impact_assessment',
        entityId: assessment.assessment_id,
        afterState: { model_id: modelId, status: 'draft' },
    });
    res.status(201).json(assessment);
}));
// GET /api/ai-governance/impact-assessments/:assessmentId -- Get AIIA
router.get('/impact-assessments/:assessmentId', authenticate, requirePermission('ai.governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const { assessmentId } = req.params;
    // Ensure table exists for graceful degradation
    await ensureAiImpactAssessmentsTable(tenantId);
    const assessment = await getAiImpactAssessment(tenantId, assessmentId);
    if (!assessment) {
        res.status(404).json({ error: 'AI Impact Assessment not found' });
        return;
    }
    res.json(assessment);
}));
// POST /api/ai-governance/impact-assessments/:assessmentId/score -- Score AIIA
router.post('/impact-assessments/:assessmentId/score', authenticate, requirePermission('ai.governance.write'), validate({ body: createScoreBody }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const { assessmentId } = req.params;
    // Ensure table exists
    await ensureAiImpactAssessmentsTable(tenantId);
    const result = await scoreAiImpactAssessment(tenantId, assessmentId);
    setAuditData(res, {
        action: 'score',
        entityType: 'ai_impact_assessment',
        entityId: assessmentId,
        afterState: { risk_score: result.risk_score },
    });
    res.json(result);
}));
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=ai-act-classification.routes.js.map
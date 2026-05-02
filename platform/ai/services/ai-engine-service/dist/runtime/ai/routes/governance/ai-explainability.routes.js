import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import * as ExplainabilityService from '../../services/reasoning/ai-explainability.service.js';
import { toErrorMessage } from '@dos/module-sdk';
// ── Zod Schemas ──────────────────────────────────────────────────────────
import { auditMiddleware, validate, moduleStack, mutationEventHook } from '../../ports/middleware.port.js';
import { explainabilityPostBody, explainabilityRecordIdReviewPostBody, explainabilityRecordIdCounterfactualPostBody } from "../../schemas/ai.schemas.js";
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai'));
router.use(mutationEventHook('ai'));
router.use(auditMiddleware('ai'));
// Create explainability record
router.post('/explainability', authenticate, requirePermission('ai.agent.write'), validate({ body: explainabilityPostBody }), async (req, res) => {
    try {
        const { systemId, decisionId, ...recordData } = req.body;
        recordData.created_by = req.userId;
        const result = await ExplainabilityService.createExplainabilityRecord(req.tenantId, {
            agent_id: systemId,
            decision_type: decisionId,
            ...recordData,
        });
        res.status(201).json(result);
    }
    catch (err) {
        res.status(500).json({ error: toErrorMessage(err) });
    }
});
// Get explainability records
router.get('/explainability', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('ai.agent.read'), async (req, res) => {
    try {
        const { systemId, decisionId, startDate: _startDate, endDate: _endDate } = req.query;
        const result = await ExplainabilityService.getExplainabilityRecords(req.tenantId, {
            agent_id: systemId,
            decision_type: decisionId,
        });
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: toErrorMessage(err) });
    }
});
// Review explainability record
router.post('/explainability/:recordId/review', authenticate, requirePermission('ai.agent.write'), validate({ body: explainabilityRecordIdReviewPostBody }), async (req, res) => {
    try {
        const { recordId } = req.params;
        const { reviewStatus, reviewNotes } = req.body;
        const result = await ExplainabilityService.reviewExplainabilityRecord(req.tenantId, recordId, req.userId, reviewStatus, reviewNotes);
        res.json({ reviewed: result });
    }
    catch (err) {
        res.status(500).json({ error: toErrorMessage(err) });
    }
});
// Create counterfactual analysis
router.post('/explainability/:recordId/counterfactual', authenticate, requirePermission('ai.agent.write'), validate({ body: explainabilityRecordIdCounterfactualPostBody }), async (req, res) => {
    try {
        const { recordId } = req.params;
        const { scenarioDescription, alternativeInputs, predictedOutcome } = req.body;
        const result = await ExplainabilityService.createCounterfactualAnalysis(req.tenantId, recordId, {
            scenario_description: scenarioDescription,
            input_changes: alternativeInputs,
            predicted_outcome: predictedOutcome,
        });
        res.status(201).json(result);
    }
    catch (err) {
        res.status(500).json({ error: toErrorMessage(err) });
    }
});
// Get explainability requirements
router.get('/explainability/requirements', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('ai.agent.read'), async (req, res) => {
    try {
        const { systemId } = req.query;
        const result = await ExplainabilityService.getExplainabilityRequirements(req.tenantId, systemId);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: toErrorMessage(err) });
    }
});
// Get transparency metrics
router.get('/explainability/transparency-metrics', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('ai.agent.read'), async (req, res) => {
    try {
        const { systemId, startDate, endDate } = req.query;
        const result = await ExplainabilityService.calculateTransparencyMetrics(req.tenantId, systemId || '', startDate || new Date(Date.now() - 30 * 86400000).toISOString(), endDate || new Date().toISOString());
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: toErrorMessage(err) });
    }
});
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=ai-explainability.routes.js.map
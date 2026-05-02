/**
 * AI OS Decisions, Runs & Recommendations Sub-Router
 *
 * Enterprise-grade endpoints for decision records, run traces,
 * reasoning chains, and recommendation lifecycle management.
 *
 * @module ai-os/decisions
 */
import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import { NotFoundError } from '../../../../errors/index.js';
import { paginationQuery, agentFilterQuery, entityFilterQuery, hoursQuery, extractPagination, setCacheHeaders, setNoCacheHeaders, aiReadLimiter, aiApproveLimiter, aiExportLimiter, } from './shared.js';
import { aiOsRecommendationsDecisionIdAcceptPostBody, aiOsRecommendationsDecisionIdRejectPostBody, aiOsRecommendationsBatchAcceptPostBody, aiOsRecommendationsBatchRejectPostBody, } from './ai-os-schemas.js';
import { listDecisions, getDecisionById, getRunTrace, getDecisionStats, getDecisionTrend, getExplainabilityChain, getDecisionsByEntityForApi, } from '../../services/reasoning/ai-decision-engine.service.js';
import { listRecommendations, acceptRecommendation, rejectRecommendation, batchAcceptRecommendations, batchRejectRecommendations, getRecommendationStats, } from '../../services/reasoning/ai-recommendation-engine.service.js';
import { tenantSchema, safeQuery } from '../../ports/database.port.js';
import { z } from 'zod';
import { auditMiddleware, asyncHandler, validate, moduleStack, mutationEventHook } from '../../ports/middleware.port.js';
const router = Router();
router.use(moduleStack('ai'));
router.use(auditMiddleware('ai'));
router.use(mutationEventHook('ai'));
// ══════════════════════════════════════════════════════════════════════════
// DECISIONS
// ══════════════════════════════════════════════════════════════════════════
/**
 * @swagger
 * /ai-os/decisions:
 *   get:
 *     summary: List AI decision records
 *     tags: [AI OS - Decisions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 50, maximum: 200 }
 *       - in: query
 *         name: agentId
 *         schema: { type: string }
 *       - in: query
 *         name: entityType
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of decisions
 */
router.get('/ai-os/decisions', authenticate, requirePermission('ai.agent.read'), aiReadLimiter, validate({ query: paginationQuery.extend(agentFilterQuery.shape).extend(entityFilterQuery.shape) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const { agentId, entityType } = req.query;
    const { page, pageSize, offset, limit } = extractPagination(req.query);
    const result = await listDecisions(tenantId, { agentId, entityType, limit, offset });
    setCacheHeaders(res, 30);
    const items = result.items || result.decisions || result;
    const total = result.total ?? (Array.isArray(items) ? items.length : 0);
    res.paginated(items, total, page, pageSize);
}));
/**
 * @swagger
 * /ai-os/decisions/stats/summary:
 *   get:
 *     summary: Get decision statistics summary
 *     tags: [AI OS - Decisions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: hours
 *         schema: { type: integer, default: 24, maximum: 720 }
 *     responses:
 *       200:
 *         description: Decision statistics
 */
router.get('/ai-os/decisions/stats/summary', authenticate, requirePermission('ai.agent.read'), aiReadLimiter, validate({ query: hoursQuery }), asyncHandler(async (req, res) => {
    const stats = await getDecisionStats(req.tenantId, Number(req.query.hours) || 24);
    setCacheHeaders(res, 30);
    res.ok(stats);
}));
/**
 * @swagger
 * /ai-os/decisions/trend:
 *   get:
 *     summary: Get decision trend over time
 *     tags: [AI OS - Decisions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 7 }
 *     responses:
 *       200:
 *         description: Decision trend data points
 */
router.get('/ai-os/decisions/trend', authenticate, requirePermission('ai.agent.read'), aiReadLimiter, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const trend = await getDecisionTrend(req.tenantId, Number(req.query.days) || 7);
    setCacheHeaders(res, 30);
    res.ok({ items: trend });
}));
/**
 * @swagger
 * /ai-os/decisions/entity/{entityType}/{entityId}:
 *   get:
 *     summary: Get decisions for a specific entity
 *     tags: [AI OS - Decisions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Decisions linked to entity
 */
router.get('/ai-os/decisions/entity/:entityType/:entityId', authenticate, requirePermission('ai.agent.read'), aiReadLimiter, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const items = await getDecisionsByEntityForApi(req.tenantId, req.params.entityType, req.params.entityId);
    setCacheHeaders(res, 30);
    res.ok({ items });
}));
/**
 * @swagger
 * /ai-os/decisions/{decisionId}:
 *   get:
 *     summary: Get a single decision by ID
 *     tags: [AI OS - Decisions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: decisionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Decision record
 *       404:
 *         description: Decision not found
 */
router.get('/ai-os/decisions/:decisionId', authenticate, requirePermission('ai.agent.read'), aiReadLimiter, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const record = await getDecisionById(req.tenantId, req.params.decisionId);
    if (!record)
        throw new NotFoundError('Decision', req.params.decisionId);
    setCacheHeaders(res, 30);
    res.ok(record);
}));
/**
 * @swagger
 * /ai-os/decisions/{decisionId}/explain:
 *   get:
 *     summary: Get explainability chain for a decision
 *     tags: [AI OS - Decisions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: decisionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Explainability chain
 *       404:
 *         description: Decision not found
 */
router.get('/ai-os/decisions/:decisionId/explain', authenticate, requirePermission('ai.agent.read'), aiReadLimiter, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const chain = await getExplainabilityChain(req.tenantId, req.params.decisionId);
    if (!chain.decision)
        throw new NotFoundError('Decision', req.params.decisionId);
    setCacheHeaders(res, 30);
    res.ok(chain);
}));
// ══════════════════════════════════════════════════════════════════════════
// RUNS
// ══════════════════════════════════════════════════════════════════════════
/**
 * @swagger
 * /ai-os/runs/batch/trace:
 *   get:
 *     summary: Batch load reasoning chains for multiple runs
 *     tags: [AI OS - Runs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: runIds
 *         required: true
 *         schema: { type: string }
 *         description: Comma-separated run IDs
 *       - in: query
 *         name: initialLimit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Batch reasoning chains
 *       400:
 *         description: Missing runIds parameter
 */
router.get('/ai-os/runs/batch/trace', authenticate, requirePermission('ai.agent.read'), aiReadLimiter, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const { runIds, initialLimit = '10' } = req.query;
    if (!runIds || typeof runIds !== 'string') {
        throw new (await import('../../../../errors/index.js')).ValidationError([{ path: 'runIds', message: 'runIds query parameter required (comma-separated)' }]);
    }
    const runIdList = runIds.split(',').filter((id) => id.trim());
    const limitNum = Number(initialLimit) || 10;
    const { getReasoningChain, getReasoningChainSummary } = await import('../../services/reasoning/reasoning-chain.service.js');
    const chains = await Promise.all(runIdList.map(async (runId) => {
        try {
            const allSteps = await getReasoningChain(req.tenantId, runId);
            const summary = await getReasoningChainSummary(req.tenantId, runId);
            const initialSteps = allSteps.slice(0, limitNum);
            return {
                run_id: runId,
                steps: initialSteps,
                totalSteps: allSteps.length,
                summary,
            };
        }
        catch {
            return { run_id: runId, steps: [], totalSteps: 0, summary: null };
        }
    }));
    setCacheHeaders(res, 30);
    res.ok({ chains });
}));
/**
 * @swagger
 * /ai-os/runs/{runId}/trace:
 *   get:
 *     summary: Get full run trace with reasoning chain
 *     tags: [AI OS - Runs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: runId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Run trace and reasoning chain
 */
router.get('/ai-os/runs/:runId/trace', authenticate, requirePermission('ai.agent.read'), aiReadLimiter, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const runId = req.params.runId;
    const { offset, limit } = req.query;
    const trace = await getRunTrace(req.tenantId, runId);
    // Include reasoning chain if available
    let reasoningChain = [];
    try {
        const { getReasoningChain } = await import('../../services/reasoning/reasoning-chain.service.js');
        const allSteps = await getReasoningChain(req.tenantId, runId);
        // Support pagination for lazy loading
        const offsetNum = Number(offset) || 0;
        const limitNum = Number(limit) || allSteps.length;
        reasoningChain = allSteps.slice(offsetNum, offsetNum + limitNum);
    }
    catch {
        // Reasoning chain not available, continue without it
    }
    setCacheHeaders(res, 30);
    res.ok({ trace_id: runId, run_id: runId, items: trace, reasoning_chain: reasoningChain });
}));
/**
 * @swagger
 * /ai-os/runs/{runId}/trace/summary:
 *   get:
 *     summary: Get reasoning chain summary for a run
 *     tags: [AI OS - Runs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: runId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Reasoning chain summary
 *       404:
 *         description: Summary not found
 */
router.get('/ai-os/runs/:runId/trace/summary', authenticate, requirePermission('ai.agent.read'), aiReadLimiter, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const runId = req.params.runId;
    const { getReasoningChainSummary } = await import('../../services/reasoning/reasoning-chain.service.js');
    const summary = await getReasoningChainSummary(req.tenantId, runId);
    if (!summary)
        throw new NotFoundError('ReasoningChainSummary', runId);
    setCacheHeaders(res, 30);
    res.ok(summary);
}));
/**
 * @swagger
 * /ai-os/runs/{runId}/entities:
 *   get:
 *     summary: Get related entities for a run
 *     tags: [AI OS - Runs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: runId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deduplicated list of entities linked to run
 */
router.get('/ai-os/runs/:runId/entities', authenticate, requirePermission('ai.agent.read'), aiReadLimiter, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const runId = req.params.runId;
    const schema = tenantSchema(req.tenantId);
    // Get entities from observations and decisions linked to this run
    const obsResult = await safeQuery(`SELECT DISTINCT entity_type, entity_id, title
       FROM "${schema}".ai_observations
       WHERE run_id = $1 AND tenant_id = $2`, [runId, req.tenantId]);
    const decResult = await safeQuery(`SELECT DISTINCT entity_type, entity_id, outcome->>'title' as title
       FROM "${schema}".decision_record
       WHERE run_id = $1 AND tenant_id = $2 AND outcome->>'title' IS NOT NULL`, [runId, req.tenantId]);
    const entities = [
        ...obsResult.rows.map((r) => ({
            entityType: r.entity_type,
            entityId: r.entity_id,
            title: r.title || `${r.entity_type}:${r.entity_id}`,
        })),
        ...decResult.rows.map((r) => ({
            entityType: r.entity_type,
            entityId: r.entity_id,
            title: r.title || `${r.entity_type}:${r.entity_id}`,
        })),
    ];
    // Deduplicate
    const uniqueEntities = Array.from(new Map(entities.map(e => [`${e.entityType}:${e.entityId}`, e])).values());
    setCacheHeaders(res, 30);
    res.ok({ entities: uniqueEntities });
}));
/**
 * @swagger
 * /ai-os/runs/{runId}/trace/export:
 *   get:
 *     summary: Export reasoning chain as JSON or PDF
 *     tags: [AI OS - Runs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: runId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [json, pdf], default: json }
 *     responses:
 *       200:
 *         description: Exported reasoning chain
 *       400:
 *         description: Invalid format
 */
router.get('/ai-os/runs/:runId/trace/export', authenticate, requirePermission('ai.agent.read'), aiExportLimiter, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const runId = req.params.runId;
    const { format = 'json' } = req.query;
    const { getReasoningChain, getReasoningChainSummary } = await import('../../services/reasoning/reasoning-chain.service.js');
    const steps = await getReasoningChain(req.tenantId, runId);
    const summary = await getReasoningChainSummary(req.tenantId, runId);
    if (format === 'json') {
        setNoCacheHeaders(res);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="reasoning-chain-${runId.substring(0, 8)}.json"`);
        res.json({ run_id: runId, summary, steps });
    }
    else if (format === 'pdf') {
        setNoCacheHeaders(res);
        const PDFDocument = (await import('pdfkit')).default;
        const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `AI Reasoning Chain — ${runId.substring(0, 8)}`, Author: 'AGRC Platform' } });
        const buffers = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(buffers);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="reasoning-chain-${runId.substring(0, 8)}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.end(pdfBuffer);
        });
        doc.fontSize(18).text('AI Reasoning Chain Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).fillColor('#666').text(`Run ID: ${runId}`, { align: 'center' });
        doc.text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
        doc.moveDown();
        if (summary) {
            doc.fontSize(14).fillColor('#000').text('Summary');
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor('#333').text(typeof summary === 'string' ? summary : JSON.stringify(summary, null, 2));
            doc.moveDown();
        }
        if (steps && Array.isArray(steps) && steps.length > 0) {
            doc.fontSize(14).fillColor('#000').text('Reasoning Steps');
            doc.moveDown(0.5);
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                doc.fontSize(11).fillColor('#1a1a1a').text(`Step ${i + 1}: ${step.step_type || step.action || 'N/A'}`);
                if (step.input)
                    doc.fontSize(9).fillColor('#555').text(`Input: ${typeof step.input === 'string' ? step.input.substring(0, 500) : JSON.stringify(step.input).substring(0, 500)}`);
                if (step.output)
                    doc.fontSize(9).fillColor('#555').text(`Output: ${typeof step.output === 'string' ? step.output.substring(0, 500) : JSON.stringify(step.output).substring(0, 500)}`);
                if (step.duration_ms)
                    doc.fontSize(9).fillColor('#888').text(`Duration: ${step.duration_ms}ms`);
                doc.moveDown(0.5);
            }
        }
        else {
            doc.fontSize(10).fillColor('#666').text('No reasoning steps recorded for this run.');
        }
        doc.end();
    }
    else {
        throw new (await import('../../../../errors/index.js')).ValidationError([{ path: 'format', message: 'Invalid format. Use "json" or "pdf"' }]);
    }
}));
// ══════════════════════════════════════════════════════════════════════════
// RECOMMENDATIONS
// ══════════════════════════════════════════════════════════════════════════
/**
 * @swagger
 * /ai-os/recommendations:
 *   get:
 *     summary: List AI recommendations
 *     tags: [AI OS - Recommendations]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 50, maximum: 200 }
 *       - in: query
 *         name: agentId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of recommendations
 */
router.get('/ai-os/recommendations', authenticate, requirePermission('ai.agent.read'), aiReadLimiter, validate({ query: paginationQuery.extend(agentFilterQuery.shape).extend({ status: z.string().optional() }) }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const { status, agentId } = req.query;
    const { page, pageSize, offset, limit } = extractPagination(req.query);
    const result = await listRecommendations(tenantId, { status, agentId, limit, offset });
    setCacheHeaders(res, 30);
    const items = result.items || result.decisions || result;
    const total = result.total ?? (Array.isArray(items) ? items.length : 0);
    res.paginated(items, total, page, pageSize);
}));
/**
 * @swagger
 * /ai-os/recommendations/stats:
 *   get:
 *     summary: Get recommendation statistics
 *     tags: [AI OS - Recommendations]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Recommendation statistics
 */
router.get('/ai-os/recommendations/stats', authenticate, requirePermission('ai.agent.read'), aiReadLimiter, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const stats = await getRecommendationStats(req.tenantId);
    setCacheHeaders(res, 30);
    res.ok(stats);
}));
/**
 * @swagger
 * /ai-os/recommendations/{decisionId}/accept:
 *   post:
 *     summary: Accept a recommendation
 *     tags: [AI OS - Recommendations]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: decisionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Recommendation accepted
 */
router.post('/ai-os/recommendations/:decisionId/accept', authenticate, requirePermission('ai.agent.approve'), aiApproveLimiter, validate({ body: aiOsRecommendationsDecisionIdAcceptPostBody }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.user.userId;
    const ok = await acceptRecommendation(tenantId, req.params.decisionId, userId);
    setNoCacheHeaders(res);
    res.created({ accepted: ok });
}));
/**
 * @swagger
 * /ai-os/recommendations/{decisionId}/reject:
 *   post:
 *     summary: Reject a recommendation
 *     tags: [AI OS - Recommendations]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: decisionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Recommendation rejected
 */
router.post('/ai-os/recommendations/:decisionId/reject', authenticate, requirePermission('ai.agent.approve'), aiApproveLimiter, validate({ body: aiOsRecommendationsDecisionIdRejectPostBody }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.user.userId;
    const ok = await rejectRecommendation(tenantId, req.params.decisionId, userId, req.body.reason);
    setNoCacheHeaders(res);
    res.created({ rejected: ok });
}));
/**
 * @swagger
 * /ai-os/recommendations/batch/accept:
 *   post:
 *     summary: Batch accept multiple recommendations
 *     tags: [AI OS - Recommendations]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [decisionIds]
 *             properties:
 *               decisionIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Batch accept result
 */
router.post('/ai-os/recommendations/batch/accept', authenticate, requirePermission('ai.agent.approve'), aiApproveLimiter, validate({ body: aiOsRecommendationsBatchAcceptPostBody }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.user.userId;
    const count = await batchAcceptRecommendations(tenantId, req.body.decisionIds || [], userId);
    setNoCacheHeaders(res);
    res.created({ accepted: count });
}));
/**
 * @swagger
 * /ai-os/recommendations/batch/reject:
 *   post:
 *     summary: Batch reject multiple recommendations
 *     tags: [AI OS - Recommendations]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [decisionIds]
 *             properties:
 *               decisionIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Batch reject result
 */
router.post('/ai-os/recommendations/batch/reject', authenticate, requirePermission('ai.agent.approve'), aiApproveLimiter, validate({ body: aiOsRecommendationsBatchRejectPostBody }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.user.userId;
    const count = await batchRejectRecommendations(tenantId, req.body.decisionIds || [], userId, req.body.reason);
    setNoCacheHeaders(res);
    res.created({ rejected: count });
}));
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=decisions.routes.js.map
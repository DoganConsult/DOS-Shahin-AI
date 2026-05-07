// @ts-nocheck
import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import { createSimulation, applyChange, applyScenario, discardSimulation, getSimulations, getSimulationWithImpact, analyzeOrgStructureImpact } from '../../services/digital/digital-twin.service.js';
import { getScenarioTemplates, executeScenarioTemplate } from "../../services/misc/scenario-templates.service.js";
import { emitEvent } from '../../ports/events.port.js';
import { toErrorMessage } from '@dos/module-sdk';
// ── Zod Schemas ──────────────────────────────────────────────────────────
import { validate, asyncHandler, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../ports/middleware.port.js';
import { swallow, EC } from '@dos/platform-core/resilience/resilient-catch';
import { rootPostBody, idChangePostBody, idScenarioPostBody, createExecuteBody, createOrgImpactBody } from "../../schemas/ai-governance.schemas.js";
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai-governance'));
router.use(auditMiddleware("ai-governance"));
router.use(automationMiddleware("ai-governance"));
router.get("/", authenticate, requirePermission("ai.governance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const sims = await getSimulations(req.tenantId);
    res.json({ simulations: sims, count: sims.length });
}));
router.post("/", authenticate, requirePermission("ai.governance.write"), validate({ body: rootPostBody }), asyncHandler(async (req, res) => {
    const { includeOrgStructure, includeDependencies } = req.body;
    const sim = await createSimulation(req.tenantId, req.user.userId, {
        includeOrgStructure: includeOrgStructure === true,
        includeDependencies: includeDependencies === true,
    });
    setAuditData(res, { action: "create", entityType: "simulation", entityId: sim.simulation_id, afterState: sim });
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'ai-governance', event: 'digital_twin.created', entityType: 'digital_twin', entityId: sim.simulation_id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:risks.digital_twin.created' });
    res.status(201).json(sim);
}));
// ── Scenario Template Routes (before parameterized /:id routes) ─────────
router.get("/scenario-templates", authenticate, requirePermission("ai.governance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (_req, res) => {
    const templates = getScenarioTemplates();
    res.json({ templates, count: templates.length });
}));
router.post("/scenario-templates/:code/execute", authenticate, requirePermission("ai.governance.write"), validate({ body: createExecuteBody }), asyncHandler(async (req, res) => {
    const code = req.params.code;
    try {
        const result = await executeScenarioTemplate(req.tenantId, code, req.user.userId);
        setAuditData(res, { action: "create", entityType: "scenario_execution", entityId: result.simulation_id, afterState: result });
        swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'ai-governance', event: 'digital_twin.created', entityType: 'scenario_execution', entityId: result.simulation_id }), { tenantId: req.tenantId, operation: 'grcEvent:risks.scenario_execution.created' });
        res.status(201).json(result);
    }
    catch (err) {
        const msg = toErrorMessage(err);
        if (msg.includes('not found')) {
            res.status(404).json({ error: msg });
            return;
        }
        throw err;
    }
}));
router.post("/:id/change", authenticate, requirePermission("ai.governance.write"), validate({ body: idChangePostBody }), asyncHandler(async (req, res) => {
    const id = req.params.id;
    const { type, entityId, changes, cascade } = req.body;
    if (!type || !entityId || !changes) {
        res.status(400).json({ error: "type, entityId, changes required" });
        return;
    }
    const sim = await applyChange(req.tenantId, id, { type, entityId, changes, cascade: cascade === true });
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'ai-governance', event: 'digital_twin.updated', entityType: 'digital_twin', entityId: id }), { tenantId: req.tenantId, operation: 'grcEvent:risks.digital_twin.updated' });
    res.json(sim);
}));
router.delete("/:id", authenticate, requirePermission("ai_governance.manage"), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
    const id = req.params.id;
    await discardSimulation(req.tenantId, id);
    setAuditData(res, { action: "delete", entityType: "simulation", entityId: id });
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'ai-governance', event: 'digital_twin.deleted', entityType: 'digital_twin', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:risks.digital_twin.deleted' });
    res.json({ discarded: true });
}));
router.post("/:id/scenario", authenticate, requirePermission("ai.governance.write"), validate({ body: idScenarioPostBody }), asyncHandler(async (req, res) => {
    const id = req.params.id;
    const scenario = req.body;
    if (!scenario.name || !scenario.scope || !scenario.changes) {
        res.status(400).json({ error: "Scenario name, scope, and changes required" });
        return;
    }
    const sim = await applyScenario(req.tenantId, id, scenario);
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'ai-governance', event: 'digital_twin.updated', entityType: 'digital_twin', entityId: id }), { tenantId: req.tenantId, operation: 'grcEvent:risks.digital_twin.updated' });
    res.json(sim);
}));
router.get("/:id/impact", authenticate, requirePermission("ai.governance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const id = req.params.id;
    const sim = await getSimulationWithImpact(req.tenantId, id);
    res.json({
        simulation: sim,
        impact: sim.impact_projection,
    });
}));
router.post("/:id/org-impact", authenticate, requirePermission("ai.governance.write"), validate({ body: createOrgImpactBody }), asyncHandler(async (req, res) => {
    const id = req.params.id;
    const analysis = await analyzeOrgStructureImpact(req.tenantId, id);
    setAuditData(res, { action: "analyze", entityType: "org_structure_impact", entityId: id, afterState: analysis });
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'ai-governance', event: 'digital_twin.updated', entityType: 'digital_twin', entityId: id }), { tenantId: req.tenantId, operation: 'grcEvent:risks.digital_twin.updated' });
    res.json(analysis);
}));
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=digital-twin.routes.js.map
import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import { executeRedTeamRun, getRedTeamRuns, getRedTeamSummary } from '../../services/misc/red-team.service.js';
import { emitEvent } from '../../ports/events.port.js';
// ── Zod Schemas ──────────────────────────────────────────────────────────
import { validate, asyncHandler, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../ports/middleware.port.js';
import { swallow, EC } from '@dos/platform-core/resilience/resilient-catch';
import { runPostBody } from "../../schemas/ai-governance.schemas.js";
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai-governance'));
router.use(auditMiddleware("ai-governance"));
router.use(automationMiddleware("ai-governance"));
router.get("/", authenticate, requirePermission("ai.governance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const modelId = req.query.modelId;
    const runs = await getRedTeamRuns(req.tenantId, modelId);
    res.json({ runs, count: runs.length });
}));
router.get("/summary", authenticate, requirePermission("ai.governance.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
    const summary = await getRedTeamSummary(req.tenantId);
    res.json(summary);
}));
router.post("/run", authenticate, requirePermission("ai_governance.manage"), validate({ body: runPostBody }), asyncHandler(async (req, res) => {
    const { modelId, canaryPrompt } = req.body;
    if (!modelId || !canaryPrompt) {
        res.status(400).json({ error: "modelId, canaryPrompt required" });
        return;
    }
    const run = await executeRedTeamRun(req.tenantId, { modelId, canaryPrompt });
    setAuditData(res, { action: "create", entityType: "red_team_run", entityId: run.run_id, afterState: run });
    swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'ai-governance', event: 'red_team.created', entityType: 'red_team', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:risks.red_team.created' });
    res.status(201).json(run);
}));
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=red-team.routes.js.map
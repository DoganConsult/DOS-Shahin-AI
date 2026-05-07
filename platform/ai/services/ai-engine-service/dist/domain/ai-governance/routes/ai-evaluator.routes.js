// @ts-nocheck
import { Router } from 'express';
import { authenticate } from '@dos/module-auth';
import { evaluateModel, evaluateAgent } from '../controllers/ai-evaluator.controller.js';
import { validate } from "../ports/middleware.port.js";
import { z } from "zod";
const router = Router();
router.use(authenticate);
router.post('/models/:modelId/evaluate', validate({ body: genericPayloadSchema }), evaluateModel);
router.post('/agents/:agentId/evaluate', validate({ body: genericPayloadSchema }), evaluateAgent);
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=ai-evaluator.routes.js.map
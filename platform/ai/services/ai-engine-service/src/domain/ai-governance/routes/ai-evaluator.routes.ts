// @ts-nocheck
import { Router } from 'express';
import { authenticate } from '@dos/module-auth';
import { 
  evaluateModel,
  evaluateAgent
} from '../controllers/ai-evaluator.controller';
import { validate } from "../ports/middleware.port";
import { z } from "zod";

export import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();

router.use(authenticate);

router.post('/models/:modelId/evaluate', validate({ body: genericPayloadSchema }), evaluateModel);
router.post('/agents/:agentId/evaluate', validate({ body: genericPayloadSchema }), evaluateAgent);

let genericPayloadSchema = z.record(z.unknown());

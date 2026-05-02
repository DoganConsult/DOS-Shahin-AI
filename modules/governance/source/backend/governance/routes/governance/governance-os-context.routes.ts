import { Request, Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission as _requirePermission } from '../../ports/auth.port';
import {
  getContext,
  getAllContexts,
  resolveFullContext,
  recomputeFromOnboarding as _recomputeFromOnboarding,
  getDimensionMeta,
  type ContextDimension,
} from '../../../governance-os/services/governance/governance-context-engine.service';
import {
  getAllModuleStates,
  getModuleState,
  updateModuleState,
  getActiveModules,
  isModuleActive as _isModuleActive,
} from '../../ports/platform.port';
import {
  getAgentAssignments,
  assignAgentToModule,
  evaluateAndFireAgents,
  seedDefaultAgentAssignments,
} from '../../../ai/services/orchestration/agent-context-bridge.service';
import {
  getLayerContextReadMap,
  reReadAllLayers,
  triggerFullContextRecompute,
  getContextHealthReport,
} from '../../services/governance/governance-continuous-reread.service';
import { AuthenticatedRequest } from '@dos/types';
import { validate, auditMiddleware, moduleStack, mutationEventHook } from '../../ports/middleware.port';

import { createRecomputeBody, updateStateBody, createAssignBody, createFireBody, createSeedDefaultsBody, createRereadBody } from '../../schemas/governance.schemas';

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware('governance'));
router.use(mutationEventHook('governance'));

router.get('/context', validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'no_tenant' });
    const all = await getAllContexts(tenantId);
    res.json({ contexts: all });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/context/resolve', validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'no_tenant' });
    const resolution = await resolveFullContext(tenantId);
    res.json(resolution);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/context/health', validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'no_tenant' });
    const report = await getContextHealthReport(tenantId);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/context/dimensions', validate({ query: z.record(z.unknown()) }), authenticate, (_req: Request, res: Response) => {
  res.json({ dimensions: getDimensionMeta() });
});

router.get('/context/:dimension', validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'no_tenant' });
    const dim = req.params.dimension as ContextDimension;
    const _key = (req.query.key as string) || 'default';
    const ctx = await getContext(tenantId, dim);
    if (!ctx) return res.status(404).json({ error: 'not_found' });
    res.json(ctx);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/context/recompute', authenticate, validate({ body: createRecomputeBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'no_tenant' });
    const result = await triggerFullContextRecompute(tenantId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/modules/states', validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'no_tenant' });
    const states = await getAllModuleStates(tenantId);
    res.json({ modules: states });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/modules/active', validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'no_tenant' });
    const active = await getActiveModules(tenantId);
    res.json({ activeModules: active });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/modules/:moduleCode/state', validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'no_tenant' });
    const state = await getModuleState(tenantId, req.params.moduleCode);
    if (!state) return res.status(404).json({ error: 'not_found' });
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch('/modules/:moduleCode/state', authenticate, validate({ body: updateStateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'no_tenant' });
    const updated = await updateModuleState(tenantId, req.params.moduleCode, req.body);
    if (!updated) return res.status(404).json({ error: 'not_found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/agents/assignments', validate({ query: z.record(z.unknown()) }), authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'no_tenant' });
    const moduleCode = req.query.module as string | undefined;
    const assignments = await getAgentAssignments(tenantId, moduleCode);
    res.json({ assignments });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/agents/assign', authenticate, validate({ body: createAssignBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'no_tenant' });
    const { agentId, moduleCode, ...config } = req.body;
    if (!agentId || !moduleCode) return res.status(400).json({ error: 'agentId and moduleCode required' });
    const assignment = await assignAgentToModule(tenantId, agentId, moduleCode, config);
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/agents/fire', authenticate, validate({ body: createFireBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'no_tenant' });
    const { moduleCode, eventType, entityId } = req.body;
    if (!moduleCode || !eventType) return res.status(400).json({ error: 'moduleCode and eventType required' });
    const results = await evaluateAndFireAgents(tenantId, moduleCode, eventType, entityId);
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/agents/seed-defaults', authenticate, validate({ body: createSeedDefaultsBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'no_tenant' });
    const count = await seedDefaultAgentAssignments(tenantId);
    res.json({ seeded: count });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/layers/context-map', validate({ query: z.record(z.unknown()) }), authenticate, async (_req: Request, res: Response) => {
  try {
    const map = await getLayerContextReadMap();
    res.json({ layers: map });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/layers/reread', authenticate, validate({ body: createRereadBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: 'no_tenant' });
    const results = await reReadAllLayers(tenantId);
    res.json({ layers: results });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;


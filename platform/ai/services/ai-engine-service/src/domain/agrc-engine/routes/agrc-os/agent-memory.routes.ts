// @ts-nocheck
import { Request, Response, Router } from 'express';
import { z as _z } from 'zod';
import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
// AGRC-OS — Agent Memory routes
// Covers: retrieve, commit, store, search, forget, stats


import { authenticate, requirePermission } from '../../ports/auth.port';
import { validate, auditMiddleware, setAuditData } from '../../ports/middleware.port';
import { errMsg } from '../../../../i18n/error-messages';
import { emitEvent } from '../../ports/events.port';
import { writeLimiter } from './shared';
import { createRetrieveBody, createCommitBody, createStoreBody } from '../../schemas/agrc-engine.schemas';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(auditMiddleware('agrc-engine'));

// ════════════════════════════════════════════════════════════════
// Agent Memory — Store, Retrieve, Commit, Forget, Stats
// ════════════════════════════════════════════════════════════════

// POST /api/agrc-os/memory/retrieve — Semantic search over agent memories
router.post('/memory/retrieve', authenticate, requirePermission('platform.agent.read'), validate({ body: createRetrieveBody }), async (req: Request, res: Response) => {
  try {
    const { retrieveMemories } = await import('../../runtime/ai/services/memory/memory-store.service');
    const tenantId = req.tenantId;
    const { query, types, agentId, userId, topK } = req.body;
    if (!query) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
    const memories = await retrieveMemories({
      tenantId, query, types, agentId, userId, topK,
    });
    emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    res.json({ memories, count: memories.length });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

// POST /api/agrc-os/memory/commit — Write memories after agent run
router.post('/memory/commit', authenticate, requirePermission('platform.agent.write'), writeLimiter, validate({ body: createCommitBody }), async (req: Request, res: Response) => {
  try {
    const { commitMemories } = await import('../../runtime/ai/services/memory/memory-store.service');
    const tenantId = req.tenantId;
    const { facts, summary, agentId, userId, runId } = req.body;
    if (!facts || !Array.isArray(facts) || facts.length === 0) {
      res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return;
    }
    const ids = await commitMemories({ tenantId, facts, summary, agentId, userId, runId });
    setAuditData(res as any, {
      action: 'create', entityType: 'agent_memory', entityId: ids[0] || 'batch',
      afterState: { count: ids.length, agentId },
    });
    emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    res.json({ memoryIds: ids, count: ids.length });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

// POST /api/agrc-os/memory/store — Store single memory entry
router.post('/memory/store', authenticate, requirePermission('platform.agent.write'), writeLimiter, validate({ body: createStoreBody }), async (req: Request, res: Response) => {
  try {
    const { storeMemory } = await import('../../runtime/ai/services/memory/memory-store.service');
    const tenantId = req.tenantId;
    const { content, memoryType, agentId, userId, summary, metadata, importanceScore, expiresInDays } = req.body;
    if (!content) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
    const id = await storeMemory({
      tenantId, content, memoryType: memoryType || 'task',
      agentId, userId, summary, metadata, importanceScore, expiresInDays,
    });
    setAuditData(res as any, { action: 'create', entityType: 'agent_memory', entityId: id || '' });
    emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    res.json({ memoryId: id });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

// GET /api/agrc-os/memory/search — List/search memories
router.get('/memory/search', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req: Request, res: Response) => {
  try {
    const { searchMemories } = await import('../../runtime/ai/services/memory/memory-store.service');
    const tenantId = req.tenantId;
    const memories = await searchMemories(tenantId, {
      query: req.query.query as string | undefined,
      userId: req.query.userId as string | undefined,
      agentId: req.query.agentId as string | undefined,

      type: req.query.type as string,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    });
    res.json({ memories, count: memories.length });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

// DELETE /api/agrc-os/memory/forget — Soft-delete memories (right to forget)
router.delete('/memory/forget', validate({ body: genericPayloadSchema }), authenticate, requirePermission('platform.agent.write'), writeLimiter, async (req: Request, res: Response) => {
  try {
    const { forgetMemories } = await import('../../runtime/ai/services/memory/memory-store.service');
    const tenantId = req.tenantId;
    const { userId, agentId, memoryIds, namespace } = req.body;
    const count = await forgetMemories(tenantId, { userId, agentId, memoryIds, namespace });
    setAuditData(res as any, { action: 'delete', entityType: 'agent_memory', entityId: 'batch', afterState: { count } });
    emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'deleted', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    res.json({ deletedCount: count });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

// GET /api/agrc-os/memory/stats — Memory usage stats
router.get('/memory/stats', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('platform.agent.read'), async (req: Request, res: Response) => {
  try {
    const { getMemoryStats } = await import('../../runtime/ai/services/memory/memory-store.service');
    const stats = await getMemoryStats(req.tenantId);
    res.json(stats);
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

export default router;


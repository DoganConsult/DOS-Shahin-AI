/**
 * OpenClaw A2A HTTP Routes.
 *
 * Exposes the agent-to-agent message queue via REST endpoints.
 * Mounted at /openclaw/a2a in ai-engine-service.
 */

import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { enqueueA2AMessage, dequeueA2AMessages, ackA2AMessage, nackA2AMessage, getA2AQueueStats } from './agent-message-queue';
import { notifyNewMessage } from './a2a-redis-notifier';
import { enqueueMessageBody, dequeueMessagesBody, nackMessageBody } from './a2a.schemas';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { traceSurfaceCall } from '../../domain/agrc-engine/observability/langfuse-bridge';

const router: ExpressRouter = Router();
router.use(authenticate);

// POST /enqueue — Enqueue a message with Redis notification
router.post('/enqueue', requirePermission('platform.agent.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.headers['x-tenant-id'] as string;
    if (!tenantId) { res.status(400).json({ error: 'tenantId required' }); return; }

    const parsed = enqueueMessageBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.format() }); return; }

    const { fromAgentId, toAgentId, messageType, payload, priority } = parsed.data;
    const messageId = await traceSurfaceCall(
      {
        surface: 'openclaw-a2a',
        name: `a2a.enqueue.${fromAgentId}->${toAgentId}`,
        tenantId,
        userId: (req as any).user?.userId,
        input: { fromAgentId, toAgentId, messageType, priority, payloadKeys: Object.keys(payload || {}) },
        metadata: { fromAgentId, toAgentId, messageType, priority, op: 'enqueue' },
      },
      () => enqueueA2AMessage(tenantId, fromAgentId, toAgentId, messageType, payload, priority),
    );

    // Notify via Redis pub/sub (non-blocking)
    notifyNewMessage(tenantId, toAgentId, messageId).catch(() => {});

    res.status(201).json({ messageId });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Enqueue failed', details: (err as Error).message });
  }
});

// POST /dequeue — Dequeue pending messages for an agent
router.post('/dequeue', requirePermission('platform.agent.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.headers['x-tenant-id'] as string;
    if (!tenantId) { res.status(400).json({ error: 'tenantId required' }); return; }

    const parsed = dequeueMessagesBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.format() }); return; }

    const messages = await traceSurfaceCall(
      {
        surface: 'openclaw-a2a',
        name: `a2a.dequeue.${parsed.data.agentId}`,
        tenantId,
        userId: (req as any).user?.userId,
        input: { agentId: parsed.data.agentId, limit: parsed.data.limit },
        metadata: { agentId: parsed.data.agentId, op: 'dequeue' },
      },
      () => dequeueA2AMessages(tenantId, parsed.data.agentId, parsed.data.limit),
    );
    res.json({ messages, count: messages.length });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Dequeue failed', details: (err as Error).message });
  }
});

// POST /:messageId/ack — Acknowledge a processed message
router.post('/:messageId/ack', requirePermission('platform.agent.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.headers['x-tenant-id'] as string;
    if (!tenantId) { res.status(400).json({ error: 'tenantId required' }); return; }

    await traceSurfaceCall(
      {
        surface: 'openclaw-a2a',
        name: `a2a.ack`,
        tenantId,
        userId: (req as any).user?.userId,
        input: { messageId: req.params.messageId },
        metadata: { messageId: req.params.messageId, op: 'ack' },
      },
      () => ackA2AMessage(tenantId, req.params.messageId),
    );
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Ack failed', details: (err as Error).message });
  }
});

// POST /:messageId/nack — Negative acknowledge (mark failed)
router.post('/:messageId/nack', requirePermission('platform.agent.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.headers['x-tenant-id'] as string;
    if (!tenantId) { res.status(400).json({ error: 'tenantId required' }); return; }

    const parsed = nackMessageBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.format() }); return; }

    await nackA2AMessage(tenantId, req.params.messageId, parsed.data.errorMessage);
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Nack failed', details: (err as Error).message });
  }
});

// GET /stats — Queue statistics
router.get('/stats', requirePermission('platform.agent.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || req.headers['x-tenant-id'] as string;
    if (!tenantId) { res.status(400).json({ error: 'tenantId required' }); return; }

    const stats = await getA2AQueueStats(tenantId);
    res.json(stats);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Stats failed', details: (err as Error).message });
  }
});

export default router;

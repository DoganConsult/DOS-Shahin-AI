// ============================================================
// CANONICAL ACTION EXECUTOR
//
// Single dispatch point for shared action types.
// All callers (agent-runner, event-trigger, canonical event-bus)
// should route shared actions through this service.
//
// Domain-specific actions (create_control, update_risk_score)
// remain in their domain services.
// GRC-specific actions (trigger_workflow, update_status)
// remain in canonical event-bus.
// ============================================================

import { v4 as uuid } from 'uuid';
import { createProcessTask } from '../ports/lifecycle.port';
import { createNotification } from '../../notification/services/notification.service';
import { eventBus } from '../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { safeQuery } from "@dos/db";

const MAX_ACTION_DEPTH = 3;
const _activeChains = new Set<string>();

export interface ActionRequest {
  type: string;
  tenantId: string;
  payload: Record<string, unknown>;
  correlationId?: string;
  source?: string;
  actor?: string;
  idempotencyKey?: string;
  _depth?: number;
  _chain?: string[];
}

export interface ActionResult {
  executed: boolean;
  actionId: string;
  reason?: string;
}

export async function dispatchAction(req: ActionRequest): Promise<ActionResult> {
  const actionId = uuid();
  const depth = req._depth ?? 0;
  const chain = req._chain ?? [];
  const _correlationId = req.correlationId ?? actionId;

  // Loop guard
  if (depth >= MAX_ACTION_DEPTH) {
    return { executed: false, actionId, reason: `max depth ${MAX_ACTION_DEPTH} exceeded` };
  }

  // Chain cycle detection
  const chainKey = `${req.type}:${req.payload?.entityId ?? 'none'}`;
  if (chain.includes(chainKey)) {
    return { executed: false, actionId, reason: `cycle detected: ${chainKey}` };
  }

  // Idempotency guard (simple in-memory for now)
  if (req.idempotencyKey && _activeChains.has(req.idempotencyKey)) {
    return { executed: false, actionId, reason: `duplicate idempotencyKey: ${req.idempotencyKey}` };
  }
  if (req.idempotencyKey) _activeChains.add(req.idempotencyKey);

  try {
    switch (req.type) {
      case 'notify':
      case 'send_notification':
        await executeNotify(req);
        break;
      case 'create_task':
      case 'request_evidence':
        await executeCreateTask(req);
        break;
      case 'webhook':
        await executeWebhook(req);
        break;
      case 'email':
      case 'send_email':
        await executeEmail(req);
        break;
      case 'publish_event':
        await executePublishEvent(req);
        break;
      case 'run_agent': {
        // Guarded: increment depth, extend chain
        const { runAgent } = await import('../../ai/services/agents/core/agent-runner.service.js');
        const agentId = req.payload?.agentId || req.payload?.target_agent_id;
        if (agentId) {
          await runAgent(req.tenantId, (agentId as any));
        }
        break;
      }
      default:
        return { executed: false, actionId, reason: `unhandled shared action type: ${req.type}` };
    }
    return { executed: true, actionId };
  } catch (err: unknown) {
    return { executed: false, actionId, reason: toErrorMessage(err) };
  } finally {
    if (req.idempotencyKey) _activeChains.delete(req.idempotencyKey);
  }
}

async function executeNotify(req: ActionRequest): Promise<void> {
  const p = req.payload;
  await createNotification(req.tenantId, {

    userId: asString(p.recipientId) || asString(p.userId) || asString(p.recipient_id),

    type: asString(p.notificationType) || asString(p.type) || 'system',

    title: asString(p.title) || asString(p.subject) || 'Notification',

    body: asString(p.body) || asString(p.message) || asString(p.description),

    link: asString(p.link),
  });
}

async function executeCreateTask(req: ActionRequest): Promise<void> {
  const p = req.payload;
  await createProcessTask(req.tenantId, {

    title: asString(p.title),

    type: asString(p.taskType) || asString(p.task_type) || req.type,

    ownerId: asString(p.assigneeRole) || asString(p.assignee_role) || req.actor,
    metadata: {

      entityType: asString(p.entityType) || asString(p.entity_type) || 'general',

      entityId: asString(p.entityId) || asString(p.entity_id),

      description: asString(p.description),

      priority: asString(p.priority, 'medium'),
      createdBy: req.actor || 'system',
    },
  });
}

async function executeWebhook(req: ActionRequest): Promise<void> {
  const p = req.payload;

  const url = asString(p.webhookUrl) || asString(p.url) || asString(p.webhook_url);
  if (!url) return;
  try {
    await fetch((url as any), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: req.tenantId!,
        correlationId: req.correlationId,
        source: req.source,
        payload: p,
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Webhook failures are non-fatal
  }
}

async function executeEmail(req: ActionRequest): Promise<void> {
  const p = req.payload;
  await createNotification(req.tenantId, {

    userId: asString(p.recipientId) || asString(p.userId) || asString(p.recipient_id),
    type: 'email',

    title: asString(p.subject) || asString(p.title) || 'Email Notification',

    body: asString(p.body) || asString(p.message),

    link: asString(p.link),
  });
}

async function executePublishEvent(req: ActionRequest): Promise<void> {
  const p = req.payload;

  const eventType = asString(p.eventType) || asString(p.event_type) || 'action.dispatched';
  eventBus.publish({
    event_type: eventType,
    eventType,
    tenantId: req.tenantId!,
    source: req.source || 'action-executor',

    severity: asString(p.severity, 'info'),

    payload: asRecord(p),
  });
}

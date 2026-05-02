import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { INBOX_EVENT_CONTRACT } from './inbox.events';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function insertInboxMessage(tenantId: string, opts: { type: string; subject: string; body: string; priority: string; entityType: string; entityId: string; source: string }): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".inbox_messages (message_id, type, subject, body, priority, entity_type, entity_id, source, status, created_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'unread', NOW())`,
    [opts.type, opts.subject, opts.body, opts.priority, opts.entityType, opts.entityId, opts.source],
  );
}

async function handleWorkflowStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const entityType = payload.entityType as string;
  const entityId = payload.entityId as string;
  const newStatus = payload.newState as string || payload.status as string;

  if (!entityType?.startsWith('inbox') || !entityId || !newStatus) {
    if (newStatus === 'approval_required' || newStatus === 'escalated') {
      await insertInboxMessage(tenantId, {
        type: 'workflow_action', subject: `Action required: ${entityType} status changed to ${newStatus}`,
        body: `A workflow item requires your attention. Entity: ${entityType} ${entityId}, new status: ${newStatus}.`,
        priority: newStatus === 'escalated' ? 'high' : 'medium',
        entityType: entityType || 'workflow', entityId: entityId || '', source: 'workflow.status_changed',
      });
    }
    return;
  }

  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".inbox_messages SET status = $1, updated_at = NOW() WHERE message_id = $2 AND status != $1`,
    [newStatus, entityId],
  );
}

async function handleGovernanceActionCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const actionId = payload.entityId as string || payload.actionId as string;
  const title = payload.title as string || 'Governance action';

  await insertInboxMessage(tenantId, {
    type: 'governance_action', subject: `Governance action: ${title}`,
    body: `A governance action has been created and requires your attention. Action ID: ${actionId}.`,
    priority: 'high',
    entityType: 'governance_action', entityId: actionId, source: 'governance.action_created',
  });
}

async function handleIncidentEscalated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const incidentId = payload.entityId as string || payload.incidentId as string;
  const severity = payload.severity as string || 'high';

  await insertInboxMessage(tenantId, {
    type: 'incident_escalation', subject: `Incident escalated: ${severity}`,
    body: `An incident has been escalated. Immediate attention required. Incident ID: ${incidentId}.`,
    priority: 'critical',
    entityType: 'incident', entityId: incidentId, source: 'incident.escalated',
  });
}

async function handleComplianceReviewOverdue(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const controlId = payload.entityId as string || payload.controlId as string;

  await insertInboxMessage(tenantId, {
    type: 'compliance_overdue', subject: `Compliance review overdue`,
    body: `A compliance review is overdue. Control ID: ${controlId}. Please complete the review.`,
    priority: 'high',
    entityType: 'compliance_control', entityId: controlId, source: 'compliance.review_overdue',
  });
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[inbox] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[inbox] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));
handlers.set('governance.action_created', wrapHandler('handleGovernanceActionCreated', handleGovernanceActionCreated));
handlers.set('incident.escalated', wrapHandler('handleIncidentEscalated', handleIncidentEscalated));
handlers.set('compliance.review_overdue', wrapHandler('handleComplianceReviewOverdue', handleComplianceReviewOverdue));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${INBOX_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerInboxEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `inbox:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[inbox] registered ${handlers.size} domain event subscribers`);
}

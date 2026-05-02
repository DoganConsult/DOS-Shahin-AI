import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { RECORDS_EVENT_CONTRACT } from './records.events';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function handleCompliancePostureChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const newPosture = payload.newPosture as string;

  if (newPosture === 'non_compliant') {
    const activeRecords = await safeQuery(
      `SELECT record_id FROM "${schema}".records WHERE status = 'active' AND classification = 'regulatory' LIMIT 50`,
      [],
    );

    if (activeRecords.rows.length > 0) {
      await createProcessTask(tenantId, {
        title: `Records: Compliance posture degraded — review regulatory records`,
        description: `Compliance posture is non-compliant. Review ${activeRecords.rows.length} active regulatory records for retention policy compliance.`,
        taskType: 'records_review',
        priority: 'high',
        entityType: 'compliance_posture',
        entityId: payload.frameworkCode as string || 'general',
        triggerSource: 'compliance.posture_changed',
      });
    }
  }
}

async function handlePolicyApproved(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const policyId = payload.entityId as string;
  const policyTitle = payload.title as string || 'Updated policy';

  await createProcessTask(tenantId, {
    title: `Records: Policy approved — update retention schedules`,
    description: `Policy "${policyTitle}" has been approved. Review and update record retention schedules that reference this policy.`,
    taskType: 'records_retention_review',
    priority: 'medium',
    entityType: 'policy',
    entityId: policyId,
    triggerSource: 'policy.approved',
  });
}

async function handleAuditEngagementCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const engagementId = payload.entityId as string;

  await safeQuery(
    `UPDATE "${schema}".records
     SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{last_audit_engagement}', $1::jsonb),
         updated_at = NOW()
     WHERE classification = 'audit' AND status = 'active'`,
    [JSON.stringify(engagementId)],
  );

  await createProcessTask(tenantId, {
    title: `Records: Audit engagement completed — archive audit workpapers`,
    description: `Audit engagement has been completed. Classify and archive related audit workpapers and evidence records.`,
    taskType: 'records_archival',
    priority: 'medium',
    entityType: 'audit_engagement',
    entityId: engagementId,
    triggerSource: 'audit.engagement_completed',
  });
}

async function handleWorkflowStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const entityType = payload.entityType as string;
  const entityId = payload.entityId as string;
  const newStatus = payload.newState as string || payload.status as string;

  if (!entityType?.startsWith('record') || !entityId || !newStatus) return;

  await safeQuery(
    `UPDATE "${schema}".records SET status = $1, updated_at = NOW() WHERE record_id = $2 AND status != $1`,
    [newStatus, entityId],
  );
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[records] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[records] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('compliance.posture_changed', wrapHandler('handleCompliancePostureChanged', handleCompliancePostureChanged));
handlers.set('policy.approved', wrapHandler('handlePolicyApproved', handlePolicyApproved));
handlers.set('audit.engagement_completed', wrapHandler('handleAuditEngagementCompleted', handleAuditEngagementCompleted));
handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${RECORDS_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerRecordsEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `records:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[records] registered ${handlers.size} domain event subscribers`);
}

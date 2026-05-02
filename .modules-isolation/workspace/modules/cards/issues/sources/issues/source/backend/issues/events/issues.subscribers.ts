import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { ISSUES_EVENT_CONTRACT } from './issues.events';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function handleComplianceGapDetected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const gapId = payload.entityId as string || payload.gapId as string;
  const severity = payload.severity as string || 'medium';

  await safeQuery(
    `INSERT INTO "${schema}".issues (issue_id, title, description, severity, source_module, source_entity_id, status, created_at, created_by)
     VALUES (gen_random_uuid(), $1, $2, $3, 'compliance', $4, 'open', NOW(), 'system')
     ON CONFLICT DO NOTHING`,
    [`Compliance gap: ${gapId}`, `Auto-created from compliance gap detection. Gap ID: ${gapId}`, severity, gapId],
  );
}

async function handleAuditFindingCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const findingId = payload.entityId as string || payload.findingId as string;
  const severity = payload.severity as string || 'medium';
  const title = payload.title as string || `Audit finding: ${findingId}`;

  await safeQuery(
    `INSERT INTO "${schema}".issues (issue_id, title, description, severity, source_module, source_entity_id, status, created_at, created_by)
     VALUES (gen_random_uuid(), $1, $2, $3, 'audit', $4, 'open', NOW(), 'system')
     ON CONFLICT DO NOTHING`,
    [title, `Auto-created from audit finding. Finding ID: ${findingId}`, severity, findingId],
  );
}

async function handleRiskResidualHigh(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const riskId = payload.entityId as string || payload.riskId as string;

  await createProcessTask(tenantId, {
    title: `Issue: High residual risk requires attention`,
    description: `Residual risk remains high after treatment. Track as issue for executive visibility.`,
    taskType: 'issue_triage',
    priority: 'high',
    entityType: 'risk',
    entityId: riskId,
    triggerSource: 'risk.residual_high',
  });
}

async function handleIncidentCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const incidentId = payload.entityId as string || payload.incidentId as string;
  const severity = payload.severity as string || 'medium';

  if (severity === 'critical' || severity === 'high') {
    await safeQuery(
      `INSERT INTO "${schema}".issues (issue_id, title, description, severity, source_module, source_entity_id, status, created_at, created_by)
       VALUES (gen_random_uuid(), $1, $2, $3, 'incident', $4, 'open', NOW(), 'system')
       ON CONFLICT DO NOTHING`,
      [`Incident tracking: ${severity} incident`, `Auto-created from ${severity} incident for issue tracking. Incident ID: ${incidentId}`, severity, incidentId],
    );
  }
}

async function handleVendorIssueCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const vendorId = payload.entityId as string || payload.vendorId as string;
  const issueTitle = payload.title as string || `Vendor issue: ${vendorId}`;

  await safeQuery(
    `INSERT INTO "${schema}".issues (issue_id, title, description, severity, source_module, source_entity_id, status, created_at, created_by)
     VALUES (gen_random_uuid(), $1, $2, 'medium', 'vendor', $3, 'open', NOW(), 'system')
     ON CONFLICT DO NOTHING`,
    [issueTitle, `Vendor-originated issue propagated to issue tracker. Vendor ID: ${vendorId}`, vendorId],
  );
}

async function handleWorkflowStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const entityType = payload.entityType as string;
  const entityId = payload.entityId as string;
  const newStatus = payload.newState as string || payload.status as string;

  if (!entityType?.startsWith('issue') || !entityId || !newStatus) return;

  await safeQuery(
    `UPDATE "${schema}".issues SET status = $1, updated_at = NOW() WHERE issue_id = $2 AND status != $1`,
    [newStatus, entityId],
  );
}

// -- foundation.position.holder.unassigned (F-004) ---------------------------
async function handleFoundationPositionUnassigned(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const userId = (payload.userId as string | undefined) ?? (event.userId as string | undefined);
  if (!userId) return;
  const schema = tenantSchema(tenantId);

  const orphaned = await safeQuery(
    `UPDATE "${schema}".issues
     SET assigned_to = NULL, updated_at = NOW()
     WHERE assigned_to = $1 AND deleted_at IS NULL
     RETURNING issue_id`,
    [userId],
  );

  for (const row of orphaned.rows) {
    await createProcessTask(tenantId, {
      title: `Reassign issue (Foundation position vacated)`,
      description: `Previous assignee was removed from their Foundation position. Pick a new assignee.`,
      taskType: 'issue_reassignment',
      priority: 'high',
      entityType: 'issue',
      entityId: row.issue_id as string,
      triggerSource: 'foundation.position.holder.unassigned',
    });
  }
}


// -- foundation.org.manager.changed (Phase 2) -------------------------------
//
// When a Foundation position's reports_to changes, the escalation/approver
// chain for any open issues record tied to that position must be recomputed.
// We emit a single recompute task per event so downstream operators can
// review the impacted chain. Idempotency is enforced by the task store on
// (triggerSource, entityId).
async function handleFoundationManagerChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const positionId = (payload.positionId as string | undefined) ?? (event.entityId as string | undefined);
  if (!positionId) return;

  await createProcessTask(tenantId, {
    title: `Recompute escalation chain (issues) — manager changed`,
    description: `Foundation position reports_to changed. Recompute escalation paths for open issues records linked to this position.`,
    taskType: 'issues_escalation_recompute',
    priority: 'high',
    entityType: 'position',
    entityId: positionId,
    triggerSource: 'foundation.org.manager.changed',
  });
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[issues] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[issues] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('compliance.gap_detected', wrapHandler('handleComplianceGapDetected', handleComplianceGapDetected));
handlers.set('audit.finding_created', wrapHandler('handleAuditFindingCreated', handleAuditFindingCreated));
handlers.set('risk.residual_high', wrapHandler('handleRiskResidualHigh', handleRiskResidualHigh));
handlers.set('incident.created', wrapHandler('handleIncidentCreated', handleIncidentCreated));
handlers.set('vendor.issue_created', wrapHandler('handleVendorIssueCreated', handleVendorIssueCreated));
handlers.set('foundation.org.manager.changed', wrapHandler('handleFoundationManagerChanged', handleFoundationManagerChanged));
handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));
handlers.set('foundation.position.holder.unassigned', wrapHandler('handleFoundationPositionUnassigned', handleFoundationPositionUnassigned));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${ISSUES_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerIssuesEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `issues:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[issues] registered ${handlers.size} domain event subscribers`);
}

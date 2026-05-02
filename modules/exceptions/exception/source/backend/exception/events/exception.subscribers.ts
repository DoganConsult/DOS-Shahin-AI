import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { recordAudit as _recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { EXCEPTION_EVENT_CONTRACT } from './exception.events';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function handleComplianceGapDetected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const gapId = payload.entityId as string || payload.gapId as string;
  const severity = payload.severity as string || 'medium';

  const existingException = await safeQuery(
    `SELECT exception_id FROM "${schema}".exceptions
     WHERE linked_entity_type = 'compliance_gap' AND linked_entity_id = $1 AND status NOT IN ('rejected','expired')
     LIMIT 1`,
    [gapId],
  );

  if (existingException.rows.length === 0 && (severity === 'critical' || severity === 'high')) {
    await createProcessTask(tenantId, {
      title: `Exception review: Compliance gap may require exception`,
      description: `A ${severity} compliance gap has been detected. Determine if a temporary exception is needed while remediation is in progress.`,
      taskType: 'exception_review',
      priority: severity === 'critical' ? 'critical' : 'high',
      entityType: 'compliance_gap',
      entityId: gapId,
      triggerSource: 'compliance.gap_detected',
    });
  }
}

async function handleRiskScoreChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const riskId = payload.entityId as string || payload.riskId as string;
  const newScore = payload.newScore as number;

  const activeExceptions = await safeQuery(
    `SELECT exception_id, compensating_control FROM "${schema}".exceptions
     WHERE linked_entity_type = 'risk' AND linked_entity_id = $1 AND status = 'active'`,
    [riskId],
  );

  for (const row of activeExceptions.rows) {
    if ((newScore ?? 0) >= 20) {
      await createProcessTask(tenantId, {
        title: `Exception escalation: Risk score now ${newScore}`,
        description: `Risk score has increased beyond threshold. Re-evaluate active exception and compensating controls.`,
        taskType: 'exception_review',
        priority: 'critical',
        entityType: 'exception',
        entityId: row.exception_id as string,
        triggerSource: 'risk.score_changed',
      });
    }
  }
}

async function handlePolicyApproved(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const policyId = payload.entityId as string || payload.policyId as string;

  const affectedExceptions = await safeQuery(
    `SELECT exception_id FROM "${schema}".exceptions
     WHERE linked_entity_type = 'policy' AND linked_entity_id = $1 AND status = 'active'`,
    [policyId],
  );

  for (const row of affectedExceptions.rows) {
    await createProcessTask(tenantId, {
      title: `Exception review: Linked policy updated`,
      description: `Policy has been approved with new requirements. Review if active exception is still valid under the updated policy.`,
      taskType: 'exception_review',
      priority: 'medium',
      entityType: 'exception',
      entityId: row.exception_id as string,
      triggerSource: 'policy.approved',
    });
  }
}

async function handleWorkflowStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const entityType = payload.entityType as string;
  const entityId = payload.entityId as string;
  const newStatus = payload.newState as string || payload.status as string;

  if (!entityType?.startsWith('exception') || !entityId || !newStatus) return;

  await safeQuery(
    `UPDATE "${schema}".exceptions SET status = $1, updated_at = NOW() WHERE exception_id = $2 AND status != $1`,
    [newStatus, entityId],
  );
}

async function handleAuditFindingCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const findingId = payload.entityId as string;
  const severity = payload.severity as string || 'medium';
  const status = payload.status as string;

  // We only care about findings that are immediately deferred or have critical severity
  if (status === 'deferred' && (severity === 'critical' || severity === 'high')) {
    await createProcessTask(tenantId, {
      title: `Exception review: High severity finding deferred`,
      description: `A ${severity} audit finding has been deferred. Evaluate if a formal exception and compensating controls are necessary.`,
      taskType: 'exception_review',
      priority: severity === 'critical' ? 'critical' : 'high',
      entityType: 'audit_finding',
      entityId: findingId,
      triggerSource: 'audit.finding_created',
    });
  }
}

async function handleVendorDdCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const vendorId = payload.entityId as string || payload.vendorId as string;
  const residualRisk = payload.residualRisk as string || 'low';

  if (residualRisk === 'high' || residualRisk === 'critical') {
    await createProcessTask(tenantId, {
      title: `Exception review: Vendor onboarded with ${residualRisk} residual risk`,
      description: `Vendor ${vendorId} DD completed with elevated residual risk. Review if an exception is required to continue vendor relationship.`,
      taskType: 'exception_review',
      priority: residualRisk === 'critical' ? 'critical' : 'high',
      entityType: 'vendor',
      entityId: vendorId,
      triggerSource: 'vendor.dd_completed',
    });
  }
}

async function handleAssetCriticalityChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const assetId = payload.entityId as string || payload.assetId as string;
  const newCriticality = payload.newCriticality as string;

  if (newCriticality === 'high' || newCriticality === 'critical') {
    const affectedExceptions = await safeQuery(
      `SELECT exception_id FROM "${schema}".exceptions
       WHERE linked_entity_type = 'asset' AND linked_entity_id = $1 AND status = 'active'`,
      [assetId],
    );

    for (const row of affectedExceptions.rows) {
      await createProcessTask(tenantId, {
        title: `Exception re-evaluation: Asset criticality upgraded`,
        description: `Asset criticality increased to ${newCriticality}. Review if the active exception remains acceptable under stricter controls.`,
        taskType: 'exception_review',
        priority: 'high',
        entityType: 'exception',
        entityId: row.exception_id as string,
        triggerSource: 'asset.criticality_changed',
      });
    }
  }
}


// -- foundation.org.manager.changed (Phase 2) -------------------------------
//
// When a Foundation position's reports_to changes, the escalation/approver
// chain for any open exception record tied to that position must be recomputed.
// We emit a single recompute task per event so downstream operators can
// review the impacted chain. Idempotency is enforced by the task store on
// (triggerSource, entityId).
async function handleFoundationManagerChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const positionId = (payload.positionId as string | undefined) ?? (event.entityId as string | undefined);
  if (!positionId) return;

  await createProcessTask(tenantId, {
    title: `Recompute escalation chain (exception) — manager changed`,
    description: `Foundation position reports_to changed. Recompute escalation paths for open exception records linked to this position.`,
    taskType: 'exception_escalation_recompute',
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
      logger.info(`[exception] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[exception] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('compliance.gap_detected', wrapHandler('handleComplianceGapDetected', handleComplianceGapDetected));
handlers.set('risk.score_changed', wrapHandler('handleRiskScoreChanged', handleRiskScoreChanged));
handlers.set('policy.approved', wrapHandler('handlePolicyApproved', handlePolicyApproved));
handlers.set('foundation.org.manager.changed', wrapHandler('handleFoundationManagerChanged', handleFoundationManagerChanged));
handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));
handlers.set('audit.finding_created', wrapHandler('handleAuditFindingCreated', handleAuditFindingCreated));
handlers.set('vendor.dd_completed', wrapHandler('handleVendorDdCompleted', handleVendorDdCompleted));
handlers.set('asset.criticality_changed', wrapHandler('handleAssetCriticalityChanged', handleAssetCriticalityChanged));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${EXCEPTION_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerExceptionEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `exception:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[exception] registered ${handlers.size} domain event subscribers`);
}

import { logger } from '../ports/logger.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { ACTION_EVENT_CONTRACT } from './action.events';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function handleRemediationActionAssigned(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const remediationId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Action item: Remediation action assigned`,
    description: `A remediation action has been assigned. Create and track action item to completion.`,
    taskType: 'remediation',
    priority: 'high',
    entityType: 'remediation',
    entityId: remediationId,
    triggerSource: 'remediation.action_assigned',
  });
}

async function handleGovernanceActionCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const actionId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Action item: Governance action created`,
    description: `A governance action has been created. Track execution and report progress.`,
    taskType: 'verification',
    priority: 'medium',
    entityType: 'governance_action',
    entityId: actionId,
    triggerSource: 'governance.action_created',
  });
}

async function handleAuditFindingCreated(event: PlatformEvent): Promise<void> {
  // NOTE: Remediation task creation for audit findings is handled by
  // audit-hub cross-module subscriber (audit-hub.ts:registerAuditHub)
  // which creates risk entries, remediation tasks, workflow tasks, and
  // evidence requests. Creating a process task here would triple-write.
  // This handler is retained for future action-module-specific logic
  // (e.g. action item tracking, dashboard counters).
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  logger.info(`[action] audit.finding_created received — remediation delegated to audit-hub`, { tenantId, entityId: payload.entityId });
}

async function handleIncidentCapaAssigned(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const incidentId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Action item: Incident CAPA assigned`,
    description: `A corrective/preventive action has been assigned from an incident. Track to closure.`,
    taskType: 'remediation',
    priority: 'high',
    entityType: 'incident',
    entityId: incidentId,
    triggerSource: 'incident.capa_assigned',
  });
}

async function handleComplianceGapDetected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const gapId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Action item: Compliance gap requires action`,
    description: `A compliance gap has been detected. Create action items to address the gap.`,
    taskType: 'remediation',
    priority: 'high',
    entityType: 'compliance_gap',
    entityId: gapId,
    triggerSource: 'compliance.gap_detected',
  });
}

async function handleWorkflowStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const entityType = payload.entityType as string;
  if (!entityType?.startsWith('action')) return;
}

async function handleEvidenceExpired(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const evidenceId = payload.entityId as string || payload.evidenceId as string;
  const evidenceName = payload.evidenceName as string || 'Evidence document';

  await createProcessTask(tenantId, {
    title: `Action required: Stale evidence - ${evidenceName}`,
    description: `Evidence document "${evidenceName}" has expired or reached staleness threshold. Please upload a fresh copy or attest to its continued validity.`,
    taskType: 'remediation',
    priority: 'high',
    entityType: 'evidence',
    entityId: evidenceId,
    triggerSource: 'evidence.expired',
  });
}

async function handleBcpExerciseOverdue(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const exerciseId = payload.entityId as string || payload.exerciseId as string;
  const title = payload.title as string || 'BCP Exercise';

  await createProcessTask(tenantId, {
    title: `Action required: BCP exercise overdue - ${title}`,
    description: `A scheduled BCP exercise is past its planned date. Executive action required to reschedule and complete the drill.`,
    taskType: 'remediation',
    priority: 'critical',
    entityType: 'bcp_exercise',
    entityId: exerciseId,
    triggerSource: 'bcp.exercise_overdue',
  });
}

async function handleReportGenerationFailed(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const reportId = payload.entityId as string || payload.reportId as string;
  const errorMsg = payload.error as string || 'Unknown systemic issue';

  await createProcessTask(tenantId, {
    title: `System Support Action: Report generation failed`,
    description: `Report generation for ID ${reportId} failed with error: ${errorMsg}. Admin intervention required to verify data binding and template integrity.`,
    taskType: 'verification',
    priority: 'high',
    entityType: 'report',
    entityId: reportId,
    triggerSource: 'report.generation_failed',
  });
}

async function handleControlEffectivenessFailed(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Action: Control effectiveness failure requires corrective action`,
    description: `Controls are failing effectiveness. Create action items for control owners to address deficiencies.`,
    taskType: 'action_tracking',
    priority: 'high',
    entityType: 'control',
    entityId: payload.entityId as string || '',
    triggerSource: 'controls.effectiveness_failed',
  });
}

async function handleGovernanceDecisionRecorded(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const decisionId = payload.entityId as string;
  await createProcessTask(tenantId, {
    title: `Action: Governance decision requires follow-up actions`,
    description: `A governance decision has been recorded. Create and assign follow-up action items.`,
    taskType: 'action_tracking',
    priority: 'medium',
    entityType: 'governance_decision',
    entityId: decisionId,
    triggerSource: 'governance.decision_recorded',
  });
}

async function handleComplianceFrameworkGap(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const coverage = payload.coverage as number;
  await createProcessTask(tenantId, {
    title: `Action: Framework coverage gap — create mapping actions`,
    description: `Framework "${payload.frameworkName}" has ${coverage}% coverage. Create action items to map missing controls.`,
    taskType: 'action_tracking',
    priority: (coverage ?? 100) < 50 ? 'critical' : 'high',
    entityType: 'framework',
    entityId: payload.entityId as string || '',
    triggerSource: 'compliance.framework_gap_identified',
  });
}

// -- foundation.position.holder.unassigned (F-005) ---------------------------
//
// When a Foundation position holder is unassigned, every action_items row
// owned by the vacated user must be cleared and a reassignment task created.
async function handleFoundationPositionUnassigned(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const userId = (payload.userId as string | undefined) ?? (event.userId as string | undefined);
  if (!userId) return;
  const schema = tenantSchema(tenantId);

  const orphaned = await safeQuery(
    `UPDATE "${schema}".action_items
     SET owner_id = NULL, updated_at = NOW()
     WHERE owner_id = $1
     RETURNING id`,
    [userId],
  );

  for (const row of orphaned.rows) {
    await createProcessTask(tenantId, {
      title: `Reassign action item (Foundation position vacated)`,
      description: `Previous owner was removed from their Foundation position. Pick a new owner.`,
      taskType: 'action_reassignment',
      priority: 'high',
      entityType: 'action_item',
      entityId: row.id as string,
      triggerSource: 'foundation.position.holder.unassigned',
    });
  }
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[action] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[action] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('remediation.action_assigned', wrapHandler('handleRemediationActionAssigned', handleRemediationActionAssigned));
handlers.set('governance.action_created', wrapHandler('handleGovernanceActionCreated', handleGovernanceActionCreated));
handlers.set('audit.finding_created', wrapHandler('handleAuditFindingCreated', handleAuditFindingCreated));
handlers.set('incident.capa_assigned', wrapHandler('handleIncidentCapaAssigned', handleIncidentCapaAssigned));
handlers.set('compliance.gap_detected', wrapHandler('handleComplianceGapDetected', handleComplianceGapDetected));
handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));
handlers.set('evidence.expired', wrapHandler('handleEvidenceExpired', handleEvidenceExpired));
handlers.set('bcp.exercise_overdue', wrapHandler('handleBcpExerciseOverdue', handleBcpExerciseOverdue));
handlers.set('report.generation_failed', wrapHandler('handleReportGenerationFailed', handleReportGenerationFailed));
handlers.set('controls.effectiveness_failed', wrapHandler('handleControlEffectivenessFailed', handleControlEffectivenessFailed));
handlers.set('governance.decision_recorded', wrapHandler('handleGovernanceDecisionRecorded', handleGovernanceDecisionRecorded));
handlers.set('compliance.framework_gap_identified', wrapHandler('handleComplianceFrameworkGap', handleComplianceFrameworkGap));
handlers.set('foundation.position.holder.unassigned', wrapHandler('handleFoundationPositionUnassigned', handleFoundationPositionUnassigned));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${ACTION_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerActionEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `action:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[action] registered ${handlers.size} domain event subscribers`);
}

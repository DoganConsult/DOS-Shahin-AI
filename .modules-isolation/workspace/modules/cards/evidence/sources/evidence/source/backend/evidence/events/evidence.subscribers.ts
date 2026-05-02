import { logger } from '../ports/logger.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { EVIDENCE_EVENT_CONTRACT } from './evidence.events';
import { registerNavigationIntegration } from '@dos/platform-core/shell/navigation/navigation-integration';
import { createEvidenceRequest } from '../services/workflow/evidence-request.service';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function handleComplianceAssessmentCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  const payload = event.payload ?? {};
  if (!tenantId) return;
  const assessmentId = payload.entityId as string;

  await createEvidenceRequest(tenantId, {
    controlId: payload.controlId as string || undefined,
    frameworkCode: payload.frameworkCode as string || undefined,
    evidenceType: 'compliance_assessment',
    requestDetails: `Compliance assessment ${assessmentId} completed — collect supporting evidence for any gaps or control weaknesses.`,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'medium',
    createdBy: payload.triggeredBy as string || 'system',
  });

  await createProcessTask(tenantId, {
    title: `Evidence request: Compliance assessment completed`,
    description: `A compliance assessment has been completed. Generate evidence requests for any gaps or control weaknesses.`,
    taskType: 'evidence_request',
    priority: 'medium',
    entityType: 'compliance_assessment',
    entityId: assessmentId,
    triggerSource: 'compliance.assessment_completed',
  });
}

async function handleAuditFindingCreated(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  const payload = event.payload ?? {};
  if (!tenantId) return;
  const findingId = payload.entityId as string;

  await createEvidenceRequest(tenantId, {
    controlId: payload.controlId as string || undefined,
    evidenceType: 'audit_finding',
    requestDetails: `Audit finding ${findingId} created — collect supporting evidence for remediation.`,
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'high',
    createdBy: payload.triggeredBy as string || 'system',
  });

  await createProcessTask(tenantId, {
    title: `Evidence request: Audit finding requires supporting evidence`,
    description: `An audit finding has been created. Collect supporting evidence for remediation.`,
    taskType: 'evidence_request',
    priority: 'high',
    entityType: 'audit_finding',
    entityId: findingId,
    triggerSource: 'audit.finding_created',
  });
}

async function handleRiskAssessmentCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  const payload = event.payload ?? {};
  if (!tenantId) return;
  const riskId = payload.entityId as string;

  await createEvidenceRequest(tenantId, {
    controlId: payload.controlId as string || undefined,
    evidenceType: 'risk_assessment',
    requestDetails: `Risk assessment ${riskId} completed — collect evidence for control effectiveness.`,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'medium',
    createdBy: payload.triggeredBy as string || 'system',
  });

  await createProcessTask(tenantId, {
    title: `Evidence request: Risk assessment completed`,
    description: `A risk assessment has been completed. Collect evidence for control effectiveness.`,
    taskType: 'evidence_request',
    priority: 'medium',
    entityType: 'risk_assessment',
    entityId: riskId,
    triggerSource: 'risk.assessment_completed',
  });
}

async function handleVendorAssessmentDue(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  const payload = event.payload ?? {};
  if (!tenantId) return;
  const vendorId = payload.entityId as string;

  await createEvidenceRequest(tenantId, {
    evidenceType: 'vendor_certification',
    requestDetails: `Vendor ${vendorId} assessment due — collect vendor certifications and compliance evidence.`,
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'medium',
    createdBy: payload.triggeredBy as string || 'system',
  });

  await createProcessTask(tenantId, {
    title: `Evidence request: Vendor assessment due`,
    description: `A vendor assessment is due. Collect vendor certifications and compliance evidence.`,
    taskType: 'evidence_request',
    priority: 'medium',
    entityType: 'vendor',
    entityId: vendorId,
    triggerSource: 'vendor.assessment_due',
  });
}

async function handleEvidenceCoverageLow(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  const payload = event.payload ?? {};
  if (!tenantId) return;

  await createEvidenceRequest(tenantId, {
    controlId: payload.entityId as string || undefined,
    evidenceType: 'control_evidence',
    requestDetails: `Control "${payload.controlName}" has no attached evidence — auto-generated collection request.`,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'high',
    createdBy: payload.triggeredBy as string || 'system',
  });

  await createProcessTask(tenantId, {
    title: `Evidence: Auto-generate request for control "${payload.controlName}"`,
    description: `Control has no attached evidence. Create evidence collection request.`,
    taskType: 'evidence_request', priority: 'high',
    entityType: 'control', entityId: payload.entityId as string || '',
    triggerSource: 'evidence.coverage_low',
  });
}

async function handleControlEffectivenessLow(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  const payload = event.payload ?? {};
  if (!tenantId) return;

  await createEvidenceRequest(tenantId, {
    controlId: payload.entityId as string || undefined,
    evidenceType: 'control_effectiveness',
    requestDetails: `${payload.failingControls} controls failing effectiveness — collect supplementary evidence for remediation.`,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    priority: 'high',
    createdBy: payload.triggeredBy as string || 'system',
  });

  await createProcessTask(tenantId, {
    title: `Evidence: Request additional evidence for ${payload.failingControls} failing controls`,
    description: `Controls are failing effectiveness. Collect supplementary evidence for remediation.`,
    taskType: 'evidence_request', priority: 'high',
    entityType: 'control', entityId: payload.entityId as string || '',
    triggerSource: 'control.effectiveness_low',
  });
}

async function handleWorkflowStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  const payload = event.payload ?? {};
  if (!tenantId) return;
  const entityType = payload.entityType as string;
  if (!entityType?.startsWith('evidence')) return;

  const newStatus = payload.newState as string || payload.toStatus as string;
  const entityId = payload.entityId as string;
  if (!newStatus || !entityId) return;

  const { safeQuery, tenantSchema } = await import('../ports/database.port.js');
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".evidence_requests SET status = $1, updated_at = NOW() WHERE request_id = $2`,
    [newStatus, entityId],
  ).catch((err: Error) => {
    logger.warn(`[evidence] workflow status sync failed for ${entityId}: ${err.message}`);
  });
}

// -- foundation.position.holder.unassigned (F-006) ---------------------------
//
// When a Foundation position holder is unassigned, every evidence_items row
// previously collected by the vacated user is unowned (collected_by NULL)
// and a collect/reassignment task is created per orphaned record.
async function handleFoundationPositionUnassigned(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const userId = (payload.userId as string | undefined) ?? (event.userId as string | undefined);
  if (!userId) return;
  const schema = tenantSchema(tenantId);

  const orphaned = await safeQuery(
    `UPDATE "${schema}".evidence_items
     SET collected_by = NULL, updated_at = NOW()
     WHERE collected_by = $1
     RETURNING id`,
    [userId],
  );

  for (const row of orphaned.rows) {
    await createProcessTask(tenantId, {
      title: `Reassign evidence collector (Foundation position vacated)`,
      description: `Previous evidence collector was removed from their Foundation position. Re-collect or assign owner.`,
      taskType: 'evidence_reassignment',
      priority: 'high',
      entityType: 'evidence_item',
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
      logger.info(`[evidence] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[evidence] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('compliance.assessment_completed', wrapHandler('handleComplianceAssessmentCompleted', handleComplianceAssessmentCompleted));
handlers.set('audit.finding_created', wrapHandler('handleAuditFindingCreated', handleAuditFindingCreated));
handlers.set('risk.assessment_completed', wrapHandler('handleRiskAssessmentCompleted', handleRiskAssessmentCompleted));
handlers.set('vendor.assessment_due', wrapHandler('handleVendorAssessmentDue', handleVendorAssessmentDue));
handlers.set('evidence.coverage_low', wrapHandler('handleEvidenceCoverageLow', handleEvidenceCoverageLow));
handlers.set('control.effectiveness_low', wrapHandler('handleControlEffectivenessLow', handleControlEffectivenessLow));
handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));
handlers.set('foundation.position.holder.unassigned', wrapHandler('handleFoundationPositionUnassigned', handleFoundationPositionUnassigned));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${EVIDENCE_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerEvidenceEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe({
      subscriberId: `evidence:${eventName}`,
      eventType: eventName,
      handler: async (event: PlatformEvent) => {
        await handler(event as unknown as Record<string, unknown>);
      },
    });
  }
  logger.info(`[evidence] registered ${handlers.size} domain event subscribers`);
  registerNavigationIntegration('evidence');
}

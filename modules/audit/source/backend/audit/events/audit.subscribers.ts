import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { AUDIT_EVENT_CONTRACT } from './audit.events';
import { registerNavigationIntegration } from '@dos/platform-core/shell/navigation/navigation-integration';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function handleComplianceGapDetected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const gapId = payload.entityId as string;
  const severity = payload.severity as string || 'medium';

  await createProcessTask(tenantId, {
    title: `Audit universe: Compliance gap detected`,
    description: `A compliance gap has been detected. Evaluate whether an audit engagement should be planned.`,
    taskType: 'audit_response',
    priority: severity === 'critical' ? 'critical' : 'high',
    entityType: 'compliance_gap',
    entityId: gapId,
    triggerSource: 'compliance.gap_detected',
  });
}

async function handleRiskResidualHigh(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const riskId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Audit attention: High residual risk flagged`,
    description: `Residual risk remains high after treatment. Consider risk-based audit engagement.`,
    taskType: 'audit_response',
    priority: 'high',
    entityType: 'risk',
    entityId: riskId,
    triggerSource: 'risk.residual_high',
  });
}

async function handleEvidenceCollected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const _evidenceId = payload.entityId as string;
  const controlId = payload.controlId as string;

  if (controlId) {
    await safeQuery(
      `UPDATE "${schema}".audit_working_papers
       SET evidence_status = 'collected', updated_at = NOW()
       WHERE control_id = $1 AND status = 'pending_evidence'`,
      [controlId],
    );
  }
}

async function handleIncidentClassified(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const incidentId = payload.entityId as string;
  const severity = payload.severity as string;

  if (severity === 'critical' || severity === 'high') {
    await createProcessTask(tenantId, {
      title: `Audit universe: Critical incident classified`,
      description: `A ${severity} incident has been classified. Assess for inclusion in audit universe.`,
      taskType: 'audit_response',
      priority: severity === 'critical' ? 'critical' : 'high',
      entityType: 'incident',
      entityId: incidentId,
      triggerSource: 'incident.classified',
    });
  }
}

async function handleVendorAssessmentDue(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const vendorId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Vendor audit: Assessment due`,
    description: `Vendor assessment is due. Schedule vendor audit engagement.`,
    taskType: 'audit_response',
    priority: 'medium',
    entityType: 'vendor',
    entityId: vendorId,
    triggerSource: 'vendor.assessment_due',
  });
}

async function handleControlEffectivenessLow(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Audit universe: ${payload.failingControls} controls failing — schedule control testing`,
    description: `Controls are ineffective. Add to audit universe for targeted testing.`,
    taskType: 'audit_response', priority: 'high',
    entityType: 'control', entityId: payload.entityId as string || '',
    triggerSource: 'control.effectiveness_low',
  });
}

async function handleRiskExceededAppetite(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Audit universe: Risk appetite breach — ${payload.riskName}`,
    description: `Risk score ${payload.riskScore} exceeds appetite max ${payload.maxScore}. Consider risk-based audit engagement.`,
    taskType: 'audit_response', priority: 'critical',
    entityType: 'risk', entityId: payload.entityId as string || '',
    triggerSource: 'risk.exceeded_appetite',
  });
}

async function handleBcpMaturityRegression(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Audit universe: BCP maturity regressed (${payload.previousScore} → ${payload.currentScore})`,
    description: `BCP maturity dropped. Include BCP processes in next audit cycle.`,
    taskType: 'audit_response', priority: 'high',
    entityType: 'bcm_maturity', entityId: payload.entityId as string || '',
    triggerSource: 'bcp.maturity_regression',
  });
}

async function handleControlStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const controlId = payload.entityId as string;
  const newStatus = payload.newState as string || payload.status as string;

  if (newStatus === 'retired' || newStatus === 'suspended') {
    await createProcessTask(tenantId, {
      title: `Audit universe: Control ${newStatus}`,
      description: `A control has been ${newStatus}. Review audit scope and working papers.`,
      taskType: 'audit_response',
      priority: 'medium',
      entityType: 'control',
      entityId: controlId,
      triggerSource: 'controls.status_changed',
    });
  }
}

async function handleControlDeficiencyDetected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const controlId = payload.entityId as string;
  const severity = payload.severity as string || 'medium';

  await createProcessTask(tenantId, {
    title: `Audit universe: Control deficiency detected`,
    description: `A control deficiency has been identified. Schedule targeted audit testing.`,
    taskType: 'audit_response',
    priority: severity === 'critical' ? 'critical' : 'high',
    entityType: 'control',
    entityId: controlId,
    triggerSource: 'controls.deficiency_detected',
  });
}

async function handleWorkflowStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const entityType = payload.entityType as string;
  const entityId = payload.entityId as string;
  const newStatus = payload.newState as string || payload.status as string;

  if (!entityType?.startsWith('audit') || !entityId || !newStatus) return;

  await safeQuery(
    `UPDATE "${schema}".audit_engagements
     SET status = $1, updated_at = NOW()
     WHERE engagement_id = $2 AND status != $1`,
    [newStatus, entityId],
  );
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[audit] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[audit] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('compliance.gap_detected', wrapHandler('handleComplianceGapDetected', handleComplianceGapDetected));
handlers.set('risk.residual_high', wrapHandler('handleRiskResidualHigh', handleRiskResidualHigh));
handlers.set('evidence.collected', wrapHandler('handleEvidenceCollected', handleEvidenceCollected));
handlers.set('incident.classified', wrapHandler('handleIncidentClassified', handleIncidentClassified));
handlers.set('vendor.assessment_due', wrapHandler('handleVendorAssessmentDue', handleVendorAssessmentDue));
handlers.set('control.effectiveness_low', wrapHandler('handleControlEffectivenessLow', handleControlEffectivenessLow));
handlers.set('risk.exceeded_appetite', wrapHandler('handleRiskExceededAppetite', handleRiskExceededAppetite));
handlers.set('bcp.maturity_regression', wrapHandler('handleBcpMaturityRegression', handleBcpMaturityRegression));
handlers.set('controls.status_changed', wrapHandler('handleControlStatusChanged', handleControlStatusChanged));
handlers.set('controls.deficiency_detected', wrapHandler('handleControlDeficiencyDetected', handleControlDeficiencyDetected));
handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));

// -- Phase 4 (F-031/F-034): Foundation role lifecycle ----------------------
//
// Audit must record an access-review trace for each role grant/revoke so the
// audit universe can sample privileged-access changes. Idempotency is on
// (triggerSource, entityId).
async function handleFoundationRoleAssigned(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const roleCode = (payload.roleCode as string | undefined) ?? (event.entityId as string | undefined);
  if (!roleCode) return;
  await createProcessTask(tenantId, {
    title: `Audit access-review: role assigned (${roleCode})`,
    description: `A functional role was assigned. Add to access-review sampling pool for the next audit cycle.`,
    taskType: 'audit_access_review',
    priority: 'medium',
    entityType: 'role',
    entityId: roleCode,
    triggerSource: 'foundation.role.assigned',
  });
}

async function handleFoundationRoleUnassigned(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const roleCode = (payload.roleCode as string | undefined) ?? (event.entityId as string | undefined);
  if (!roleCode) return;
  await createProcessTask(tenantId, {
    title: `Audit access-review: role unassigned (${roleCode})`,
    description: `A functional role was unassigned. Verify orphan ownership and update audit universe.`,
    taskType: 'audit_access_review',
    priority: 'medium',
    entityType: 'role',
    entityId: roleCode,
    triggerSource: 'foundation.role.unassigned',
  });
}
handlers.set('foundation.role.assigned', wrapHandler('handleFoundationRoleAssigned', handleFoundationRoleAssigned));
handlers.set('foundation.role.unassigned', wrapHandler('handleFoundationRoleUnassigned', handleFoundationRoleUnassigned));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${AUDIT_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerAuditEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `audit:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[audit] registered ${handlers.size} domain event subscribers`);
  registerNavigationIntegration('audit');
}

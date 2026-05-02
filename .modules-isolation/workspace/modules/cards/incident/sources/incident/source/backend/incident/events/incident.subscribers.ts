import { logger } from '../ports/logger.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { INCIDENT_EVENT_CONTRACT } from './incident.events';
import { registerNavigationIntegration } from '@dos/platform-core/shell/navigation/navigation-integration';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function handleRiskResidualHigh(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const riskId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Incident watch: High residual risk flagged`,
    description: `Residual risk is high. Monitor for potential incidents and prepare response playbooks.`,
    taskType: 'incident_response',
    priority: 'high',
    entityType: 'risk',
    entityId: riskId,
    triggerSource: 'risk.residual_high',
  });
}

async function handleCompliancePostureChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const programId = payload.entityId as string;
  const postureScore = payload.score as number || payload.postureScore as number;

  if (postureScore !== undefined && postureScore < 50) {
    await createProcessTask(tenantId, {
      title: `Incident readiness: Compliance posture degraded`,
      description: `Compliance posture has dropped below 50%. Review incident response readiness.`,
      taskType: 'incident_response',
      priority: 'high',
      entityType: 'compliance_program',
      entityId: programId,
      triggerSource: 'compliance.posture_changed',
    });
  }
}

async function handleVendorRiskChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const vendorId = payload.entityId as string;
  const riskRating = payload.riskRating as string;

  if (riskRating === 'critical') {
    await createProcessTask(tenantId, {
      title: `Incident alert: Vendor risk critical`,
      description: `Vendor risk has been rated critical. Update incident playbooks for vendor-related scenarios.`,
      taskType: 'incident_response',
      priority: 'critical',
      entityType: 'vendor',
      entityId: vendorId,
      triggerSource: 'vendor.risk_changed',
    });
  }
}

async function handleBcpCrisisDeclared(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const crisisId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Incident management: BCP crisis declared`,
    description: `A BCP crisis has been declared. Activate incident command and coordinate response.`,
    taskType: 'incident_response',
    priority: 'critical',
    entityType: 'bcp_crisis',
    entityId: crisisId,
    triggerSource: 'bcp.crisis_declared',
  });
}

async function handleIncidentSlaBreach(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Incident: ${payload.breachedCount || 1} SLA(s) breached — auto-escalate`,
    description: `Incident SLA breaches detected. Auto-escalate to next responder tier.`,
    taskType: 'incident_response', priority: 'critical',
    entityType: 'incident', entityId: payload.entityId as string || '',
    triggerSource: 'incident.sla_breached',
  });
}

async function handleBcpCrisisReadinessLow(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Incident readiness: Crisis communication plan stale — ${payload.title}`,
    description: `Crisis comm plan not reviewed in 365+ days. Update incident response playbooks.`,
    taskType: 'incident_response', priority: 'high',
    entityType: 'crisis_comm_plan', entityId: payload.entityId as string || '',
    triggerSource: 'bcp.crisis_readiness_low',
  });
}

async function handleRemediationVerified(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const planId = payload.entityId as string;
  const sourceType = payload.sourceEntityType as string;

  if (sourceType === 'incident') {
    await createProcessTask(tenantId, {
      title: `Incident closure: CAPA remediation verified`,
      description: `Remediation plan has been verified. Review incident for closure.`,
      taskType: 'incident_response',
      priority: 'medium',
      entityType: 'remediation_plan',
      entityId: planId,
      triggerSource: 'remediation.verified',
    });
  }
}

async function handleRemediationOverdue(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const planId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Incident follow-up: Remediation overdue`,
    description: `A remediation plan linked to an incident is overdue. Escalate for review.`,
    taskType: 'incident_response',
    priority: 'high',
    entityType: 'remediation_plan',
    entityId: planId,
    triggerSource: 'remediation.overdue',
  });
}

async function handleControlEffectivenessLow(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Incident readiness: Controls failing effectiveness`,
    description: `${payload.failingControls} controls are ineffective. Update incident playbooks for affected areas.`,
    taskType: 'incident_response',
    priority: 'high',
    entityType: 'control',
    entityId: payload.entityId as string || '',
    triggerSource: 'controls.effectiveness_failed',
  });
}

async function handleAuditFindingCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const findingId = payload.entityId as string;
  const severity = payload.severity as string;

  if (severity === 'critical') {
    await createProcessTask(tenantId, {
      title: `Incident awareness: Critical audit finding`,
      description: `A critical audit finding has been raised. Review incident response readiness for affected area.`,
      taskType: 'incident_response',
      priority: 'critical',
      entityType: 'audit_finding',
      entityId: findingId,
      triggerSource: 'audit.finding_created',
    });
  }
}

async function handleWorkflowStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const entityType = payload.entityType as string;
  if (!entityType?.startsWith('incident')) return;
}


// -- foundation.org.manager.changed (Phase 2) -------------------------------
//
// When a Foundation position's reports_to changes, the escalation/approver
// chain for any open incident record tied to that position must be recomputed.
// We emit a single recompute task per event so downstream operators can
// review the impacted chain. Idempotency is enforced by the task store on
// (triggerSource, entityId).
async function handleFoundationManagerChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const positionId = (payload.positionId as string | undefined) ?? (event.entityId as string | undefined);
  if (!positionId) return;

  await createProcessTask(tenantId, {
    title: `Recompute escalation chain (incident) — manager changed`,
    description: `Foundation position reports_to changed. Recompute escalation paths for open incident records linked to this position.`,
    taskType: 'incident_escalation_recompute',
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
      logger.info(`[incident] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[incident] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('risk.residual_high', wrapHandler('handleRiskResidualHigh', handleRiskResidualHigh));
handlers.set('compliance.posture_changed', wrapHandler('handleCompliancePostureChanged', handleCompliancePostureChanged));
handlers.set('vendor.risk_changed', wrapHandler('handleVendorRiskChanged', handleVendorRiskChanged));
handlers.set('bcp.crisis_declared', wrapHandler('handleBcpCrisisDeclared', handleBcpCrisisDeclared));
handlers.set('incident.sla_breached', wrapHandler('handleIncidentSlaBreach', handleIncidentSlaBreach));
handlers.set('bcp.crisis_readiness_low', wrapHandler('handleBcpCrisisReadinessLow', handleBcpCrisisReadinessLow));
handlers.set('remediation.verified', wrapHandler('handleRemediationVerified', handleRemediationVerified));
handlers.set('remediation.overdue', wrapHandler('handleRemediationOverdue', handleRemediationOverdue));
handlers.set('controls.effectiveness_failed', wrapHandler('handleControlEffectivenessLow', handleControlEffectivenessLow));
handlers.set('audit.finding_created', wrapHandler('handleAuditFindingCreated', handleAuditFindingCreated));
handlers.set('foundation.org.manager.changed', wrapHandler('handleFoundationManagerChanged', handleFoundationManagerChanged));
handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${INCIDENT_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerIncidentEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `incident:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[incident] registered ${handlers.size} domain event subscribers`);
  registerNavigationIntegration('incident');
}

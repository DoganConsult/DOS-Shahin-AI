import { logger } from '../ports/logger.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { DORA_EVENT_CONTRACT } from './dora.events';
import { registerNavigationIntegration } from '@dos/platform-core/shell/navigation/navigation-integration';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function handleIncidentCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const severity = payload.severity as string || 'medium';
  if (severity === 'critical' || severity === 'high') {
    await createProcessTask(tenantId, {
      title: `DORA: Assess major ICT incident — ${payload.title || payload.entityId}`,
      description: `Critical incident detected. Evaluate for DORA major incident reporting obligations.`,
      taskType: 'verification', priority: 'critical',
      entityType: 'incident', entityId: payload.entityId as string || '',
      triggerSource: 'incident.created',
    });
  }
}

async function handleIncidentEscalated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `DORA: Incident escalated — initiate regulatory notification assessment`,
    description: `Escalated incident requires DORA Art. 19 notification assessment.`,
    taskType: 'verification', priority: 'critical',
    entityType: 'incident', entityId: payload.entityId as string || '',
    triggerSource: 'incident.escalated',
  });
}

async function handleAssetClassified(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `DORA: Asset classified — update ICT asset registry`,
    description: `Asset "${payload.assetName || payload.entityId}" classified as "${payload.classification}". Update DORA ICT asset inventory.`,
    taskType: 'verification', priority: 'medium',
    entityType: 'asset', entityId: payload.entityId as string || '',
    triggerSource: 'asset.classified',
  });
}

async function handleVendorRiskChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `DORA: Third-party ICT risk changed — ${payload.vendorName || payload.entityId}`,
    description: `Vendor risk profile changed. Review DORA Art. 28 third-party risk obligations.`,
    taskType: 'verification', priority: 'high',
    entityType: 'vendor', entityId: payload.entityId as string || '',
    triggerSource: 'vendor.risk_changed',
  });
}

async function handleBcpTestFailed(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `DORA: BCP test failed — update digital operational resilience testing`,
    description: `BCP test failure impacts DORA Art. 24-27 resilience testing requirements.`,
    taskType: 'verification', priority: 'high',
    entityType: 'bcp_test', entityId: payload.entityId as string || '',
    triggerSource: 'bcp.test_failed',
  });
}

async function handleWorkflowStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const entityType = payload.entityType as string;
  if (!entityType?.startsWith('dora')) return;
}

async function handleComplianceFrameworkGap(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const frameworkName = payload.frameworkName as string || 'Unknown';
  const coverage = payload.coverage as number;

  await createProcessTask(tenantId, {
    title: `DORA: Framework coverage gap — ${frameworkName}`,
    description: `Framework "${frameworkName}" has ${coverage}% coverage. Map DORA obligations to uncovered framework requirements.`,
    taskType: 'dora_obligation_review',
    priority: (coverage ?? 100) < 50 ? 'critical' : 'high',
    entityType: 'framework',
    entityId: payload.entityId as string || '',
    triggerSource: 'compliance.framework_gap_identified',
  });
}

async function handleControlEffectivenessFailed(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const controlId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `DORA Art. 6: ICT control effectiveness failure`,
    description: `Control has failed effectiveness testing. Assess impact on ICT risk management framework (Art. 6) and update resilience testing schedule.`,
    taskType: 'dora_obligation_review',
    priority: 'critical',
    entityType: 'control',
    entityId: controlId,
    triggerSource: 'controls.effectiveness_failed',
  });
}

async function handleControlDeficiencyDetected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const controlId = payload.entityId as string;
  const severity = payload.severity as string || 'medium';

  await createProcessTask(tenantId, {
    title: `DORA: Control deficiency impacts obligation mapping`,
    description: `A control deficiency has been detected. Review DORA obligation mappings and update control mapping status.`,
    taskType: 'dora_obligation_review',
    priority: severity === 'critical' ? 'critical' : 'high',
    entityType: 'control',
    entityId: controlId,
    triggerSource: 'controls.deficiency_detected',
  });
}

async function handleIncidentSlaBreach(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const incidentId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `DORA Art. 19: Major incident SLA breach — assess reporting obligation`,
    description: `Incident SLA has been breached. Evaluate whether DORA major ICT incident reporting obligations (Art. 19) apply.`,
    taskType: 'dora_obligation_review',
    priority: 'critical',
    entityType: 'incident',
    entityId: incidentId,
    triggerSource: 'incident.sla_breached',
  });
}

async function handleRemediationOverdue(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const planId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `DORA: Remediation overdue — obligation fulfillment at risk`,
    description: `A remediation plan is overdue. Assess impact on DORA obligation deadlines and resilience testing schedule.`,
    taskType: 'dora_obligation_review',
    priority: 'high',
    entityType: 'remediation_plan',
    entityId: planId,
    triggerSource: 'remediation.overdue',
  });
}

async function handleGovernanceDecisionRecorded(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const decisionId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `DORA: Governance decision recorded — update board oversight`,
    description: `A governance decision has been recorded. Link to DORA Art. 5 management body responsibilities and update obligation tracking.`,
    taskType: 'dora_obligation_review',
    priority: 'medium',
    entityType: 'governance_decision',
    entityId: decisionId,
    triggerSource: 'governance.decision_recorded',
  });
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[dora] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[dora] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('incident.created', wrapHandler('handleIncidentCreated', handleIncidentCreated));
handlers.set('incident.escalated', wrapHandler('handleIncidentEscalated', handleIncidentEscalated));
handlers.set('asset.classified', wrapHandler('handleAssetClassified', handleAssetClassified));
handlers.set('vendor.risk_changed', wrapHandler('handleVendorRiskChanged', handleVendorRiskChanged));
handlers.set('bcp.test_failed', wrapHandler('handleBcpTestFailed', handleBcpTestFailed));
handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));
handlers.set('compliance.framework_gap_identified', wrapHandler('handleComplianceFrameworkGap', handleComplianceFrameworkGap));
handlers.set('controls.effectiveness_failed', wrapHandler('handleControlEffectivenessFailed', handleControlEffectivenessFailed));
handlers.set('controls.deficiency_detected', wrapHandler('handleControlDeficiencyDetected', handleControlDeficiencyDetected));
handlers.set('incident.sla_breached', wrapHandler('handleIncidentSlaBreach', handleIncidentSlaBreach));
handlers.set('remediation.overdue', wrapHandler('handleRemediationOverdue', handleRemediationOverdue));
handlers.set('governance.decision_recorded', wrapHandler('handleGovernanceDecisionRecorded', handleGovernanceDecisionRecorded));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${DORA_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerDoraEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `dora:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[dora] registered ${handlers.size} domain event subscribers`);
  registerNavigationIntegration('dora');
}

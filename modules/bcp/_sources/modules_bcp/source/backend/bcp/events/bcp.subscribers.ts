import { logger } from '../ports/logger.port';
import { safeQuery as _safeQuery, tenantSchema as _tenantSchema } from '../ports/database.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { BCP_EVENT_CONTRACT } from './bcp.events';
import { registerNavigationIntegration } from '@dos/platform-core/shell/navigation/navigation-integration';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function handleRiskResidualHigh(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const riskId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `BCP review: High residual risk impacts continuity`,
    description: `High residual risk detected. Review BCP plans and update business impact analysis.`,
    taskType: 'verification',
    priority: 'high',
    entityType: 'risk',
    entityId: riskId,
    triggerSource: 'risk.residual_high',
  });
}

async function handleIncidentCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const incidentId = payload.entityId as string;
  const severity = payload.severity as string;

  if (severity === 'critical') {
    await createProcessTask(tenantId, {
      title: `BCP activation: Critical incident reported`,
      description: `A critical incident has been reported. Evaluate BCP plan activation.`,
      taskType: 'verification',
      priority: 'critical',
      entityType: 'incident',
      entityId: incidentId,
      triggerSource: 'incident.created',
    });
  }
}

async function handleIncidentEscalated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const incidentId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `BCP crisis evaluation: Incident escalated`,
    description: `An incident has been escalated. Evaluate whether crisis declaration is warranted.`,
    taskType: 'verification',
    priority: 'critical',
    entityType: 'incident',
    entityId: incidentId,
    triggerSource: 'incident.escalated',
  });
}

async function handleAssetClassified(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const assetId = payload.entityId as string;
  const criticality = payload.criticality as string;

  if (criticality === 'critical') {
    await createProcessTask(tenantId, {
      title: `BCP update: Critical asset classified`,
      description: `A critical asset has been classified. Update BCP plans for this asset dependency.`,
      taskType: 'verification',
      priority: 'high',
      entityType: 'asset',
      entityId: assetId,
      triggerSource: 'asset.classified',
    });
  }
}

async function handleVendorRiskChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const vendorId = payload.entityId as string;
  const riskRating = payload.riskRating as string;

  if (riskRating === 'critical' || riskRating === 'high') {
    await createProcessTask(tenantId, {
      title: `BCP vendor review: Vendor risk changed to ${riskRating}`,
      description: `Vendor risk rating has changed. Review BCP vendor dependencies.`,
      taskType: 'verification',
      priority: riskRating === 'critical' ? 'critical' : 'high',
      entityType: 'vendor',
      entityId: vendorId,
      triggerSource: 'vendor.risk_changed',
    });
  }
}

async function handleBcpPlanStale(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `BCP: Plan stale — ${payload.title}`,
    description: `BCP plan not reviewed in 180+ days. Schedule internal review.`,
    taskType: 'verification', priority: 'high',
    entityType: 'bcp_plan', entityId: payload.entityId as string || '',
    triggerSource: 'bcp.plan_stale',
  });
}

async function handleBcpExerciseOverdue(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `BCP: Exercise overdue — ${payload.title}`,
    description: `BCP exercise was scheduled for ${payload.scheduledDate}. Reschedule immediately.`,
    taskType: 'verification', priority: 'high',
    entityType: 'bcp_exercise', entityId: payload.entityId as string || '',
    triggerSource: 'bcp.exercise_overdue',
  });
}

async function handleBcpRtoRpoDrift(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `BCP: RTO/RPO drift — ${payload.strategy}`,
    description: `Actual RTO(${payload.actualRto}h) exceeds target(${payload.targetRto}h). Update recovery strategy.`,
    taskType: 'verification', priority: 'critical',
    entityType: 'bcp_exercise', entityId: payload.entityId as string || '',
    triggerSource: 'bcp.rto_rpo_drift',
  });
}

async function handleBcpDependencyCritical(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `BCP: Critical dependency needs review — ${payload.nodeName}`,
    description: `Dependency node "${payload.nodeName}" (${payload.criticality}) in map "${payload.mapTitle}" not reviewed in 180+ days.`,
    taskType: 'verification', priority: (payload.criticality as string) === 'critical' ? 'critical' : 'high',
    entityType: 'bcm_dependency', entityId: payload.entityId as string || '',
    triggerSource: 'bcp.dependency_critical',
  });
}

async function handleBcpCrisisReadinessLow(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `BCP: Crisis readiness low — ${payload.title}`,
    description: `Crisis communication plan not reviewed in 365+ days. Update and test readiness.`,
    taskType: 'verification', priority: 'high',
    entityType: 'crisis_comm_plan', entityId: payload.entityId as string || '',
    triggerSource: 'bcp.crisis_readiness_low',
  });
}

async function handleBcpMaturityRegression(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `BCP: Maturity regressed (${payload.previousScore} → ${payload.currentScore})`,
    description: `BCP maturity dropped by ${payload.drop} points. Create improvement plan.`,
    taskType: 'verification', priority: 'critical',
    entityType: 'bcm_maturity', entityId: payload.entityId as string || '',
    triggerSource: 'bcp.maturity_regression',
  });
}

async function handleBcpBiaStale(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `BCP: BIA assessment stale — ${payload.title}`,
    description: `Business Impact Analysis approved 365+ days ago. Schedule refresh.`,
    taskType: 'verification', priority: (payload.criticality as string) === 'critical' ? 'critical' : 'high',
    entityType: 'bia_assessment', entityId: payload.entityId as string || '',
    triggerSource: 'bcp.bia_stale',
  });
}

async function handleWorkflowStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const entityType = payload.entityType as string;
  if (!entityType?.startsWith('bcp')) return;
}

async function handleControlEffectivenessFailed(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;

  await createProcessTask(tenantId, {
    title: `BCP: Control effectiveness failure — review recovery assumptions`,
    description: `Controls are failing effectiveness. Review whether BCP recovery assumptions still hold and update RTO/RPO targets.`,
    taskType: 'bcp_review',
    priority: 'critical',
    entityType: 'control',
    entityId: payload.entityId as string || '',
    triggerSource: 'controls.effectiveness_failed',
  });
}

async function handleControlDeficiencyDetected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const controlId = payload.entityId as string;
  const severity = payload.severity as string || 'medium';

  await createProcessTask(tenantId, {
    title: `BCP: Control deficiency impacts resilience posture`,
    description: `A control deficiency has been detected. Assess impact on business continuity plans and resilience testing.`,
    taskType: 'bcp_review',
    priority: severity === 'critical' ? 'critical' : 'high',
    entityType: 'control',
    entityId: controlId,
    triggerSource: 'controls.deficiency_detected',
  });
}

async function handleRemediationOverdue(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const planId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `BCP: Remediation overdue — continuity risk increasing`,
    description: `A remediation plan is overdue. Outstanding remediation reduces RTO/RPO reliability. Review BCP plan assumptions.`,
    taskType: 'bcp_review',
    priority: 'high',
    entityType: 'remediation_plan',
    entityId: planId,
    triggerSource: 'remediation.overdue',
  });
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[bcp] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[bcp] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('risk.residual_high', wrapHandler('handleRiskResidualHigh', handleRiskResidualHigh));
handlers.set('incident.created', wrapHandler('handleIncidentCreated', handleIncidentCreated));
handlers.set('incident.escalated', wrapHandler('handleIncidentEscalated', handleIncidentEscalated));
handlers.set('asset.classified', wrapHandler('handleAssetClassified', handleAssetClassified));
handlers.set('vendor.risk_changed', wrapHandler('handleVendorRiskChanged', handleVendorRiskChanged));
handlers.set('bcp.plan_stale', wrapHandler('handleBcpPlanStale', handleBcpPlanStale));
handlers.set('bcp.exercise_overdue', wrapHandler('handleBcpExerciseOverdue', handleBcpExerciseOverdue));
handlers.set('bcp.rto_rpo_drift', wrapHandler('handleBcpRtoRpoDrift', handleBcpRtoRpoDrift));
handlers.set('bcp.dependency_critical', wrapHandler('handleBcpDependencyCritical', handleBcpDependencyCritical));
handlers.set('bcp.crisis_readiness_low', wrapHandler('handleBcpCrisisReadinessLow', handleBcpCrisisReadinessLow));
handlers.set('bcp.maturity_regression', wrapHandler('handleBcpMaturityRegression', handleBcpMaturityRegression));
handlers.set('bcp.bia_stale', wrapHandler('handleBcpBiaStale', handleBcpBiaStale));
handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));
handlers.set('controls.effectiveness_failed', wrapHandler('handleControlEffectivenessFailed', handleControlEffectivenessFailed));
handlers.set('controls.deficiency_detected', wrapHandler('handleControlDeficiencyDetected', handleControlDeficiencyDetected));
handlers.set('remediation.overdue', wrapHandler('handleRemediationOverdue', handleRemediationOverdue));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${BCP_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerBcpEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `bcp:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[bcp] registered ${handlers.size} domain event subscribers`);
  registerNavigationIntegration('bcp');
}

import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { REMEDIATION_EVENT_CONTRACT } from './remediation.events';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function handleComplianceGapDetected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const gapId = payload.entityId as string;
  const severity = payload.severity as string || 'medium';

  await createProcessTask(tenantId, {
    title: `Remediation plan: Compliance gap detected`,
    description: `A compliance gap requires a remediation plan. Create and assign remediation actions.`,
    taskType: 'remediation',
    priority: severity === 'critical' ? 'critical' : 'high',
    entityType: 'compliance_gap',
    entityId: gapId,
    triggerSource: 'compliance.gap_detected',
  });
}

async function handleAuditFindingCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const findingId = payload.entityId as string;
  const severity = payload.severity as string || 'medium';

  await createProcessTask(tenantId, {
    title: `Remediation plan: Audit finding raised`,
    description: `An audit finding requires remediation. Create corrective action plan.`,
    taskType: 'remediation',
    priority: severity === 'critical' ? 'critical' : 'high',
    entityType: 'audit_finding',
    entityId: findingId,
    triggerSource: 'audit.finding_created',
  });
}

async function handleRiskResidualHigh(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const riskId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Remediation: High residual risk requires mitigation`,
    description: `Residual risk remains above appetite. Create remediation plan for risk mitigation.`,
    taskType: 'remediation',
    priority: 'high',
    entityType: 'risk',
    entityId: riskId,
    triggerSource: 'risk.residual_high',
  });
}

async function handleIncidentCapaAssigned(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const incidentId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Remediation: CAPA assigned from incident`,
    description: `A corrective and preventive action has been assigned from an incident. Track remediation progress.`,
    taskType: 'remediation',
    priority: 'high',
    entityType: 'incident',
    entityId: incidentId,
    triggerSource: 'incident.capa_assigned',
  });
}

async function handleVendorIssueCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const vendorId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Remediation: Vendor issue requires corrective action`,
    description: `A vendor issue has been raised. Create remediation plan and track resolution.`,
    taskType: 'remediation',
    priority: 'medium',
    entityType: 'vendor',
    entityId: vendorId,
    triggerSource: 'vendor.issue_created',
  });
}

async function handleWorkflowStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const entityType = payload.entityType as string;
  const entityId = payload.entityId as string;
  const newStatus = payload.newState as string || payload.status as string;

  if (!entityType?.startsWith('remediation') || !entityId || !newStatus) return;

  await safeQuery(
    `UPDATE "${schema}".remediation_plans
     SET status = $1, updated_at = NOW()
     WHERE plan_id = $2 AND status != $1`,
    [newStatus, entityId],
  );

  if (newStatus === 'completed' || newStatus === 'closed') {
    try {
      const planRes = await safeQuery(
        `SELECT source_entity_type, source_entity_id FROM "${schema}".remediation_plans WHERE plan_id = $1`,
        [entityId],
      );
      const plan = planRes.rows[0];
      if (plan?.source_entity_type && plan?.source_entity_id) {

        const { propagateRemediationCompletion } = await import('../../platform/services/cross/cross-module-state-propagator.service.js');
        await propagateRemediationCompletion(tenantId, entityId, plan.source_entity_type as string, plan.source_entity_id as string);
      }

      await eventBus.publish({
        eventType: 'remediation.plan_completed' as any,

        tenantId, sourceService: 'remediation', severity: 'info',
        entityType: 'remediation_plan', entityId,
        payload: {
          planId: entityId,
          sourceEntityType: plan?.source_entity_type,
          sourceEntityId: plan?.source_entity_id,
        },
      });
    } catch { /* auto-closure non-fatal */ }
  }
}

async function handleRiskMitigationRequired(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Remediation: Untreated high risk — ${payload.riskName}`,
    description: `Risk "${payload.riskName}" (score ${payload.score}) has no treatment. Create mitigation plan.`,
    taskType: 'remediation', priority: 'critical',
    entityType: 'risk', entityId: payload.entityId as string || '',
    triggerSource: 'risk.mitigation_required',
  });
}

async function handleFrameworkGapIdentified(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Remediation: Framework coverage gap — ${payload.frameworkName}`,
    description: `Framework "${payload.frameworkName}" has ${payload.coverage}% coverage. Create remediation plan to map missing controls.`,
    taskType: 'remediation', priority: (payload.coverage as number) < 50 ? 'critical' : 'high',
    entityType: 'framework', entityId: payload.entityId as string || '',
    triggerSource: 'framework.gap_identified',
  });
}

async function handleAuditRemediationDue(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Remediation: Non-compliant assessment finding`,
    description: `Assessment finding "${payload.findingTitle}" is ${payload.status}. Create corrective action plan.`,
    taskType: 'remediation', priority: 'high',
    entityType: 'assessment_item', entityId: payload.entityId as string || '',
    triggerSource: 'audit.remediation_due',
  });
}

async function handleBcpMaturityRegression(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Remediation: BCP maturity regressed (${payload.previousScore} → ${payload.currentScore})`,
    description: `BCP maturity dropped by ${payload.drop} points. Create improvement plan.`,
    taskType: 'remediation', priority: 'critical',
    entityType: 'bcm_maturity', entityId: payload.entityId as string || '',
    triggerSource: 'bcp.maturity_regression',
  });
}

async function handleControlEffectivenessLow(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Remediation: ${payload.failingControls} controls ineffective`,
    description: `${payload.failingControls} of ${payload.total} controls are failing effectiveness. Create remediation plan.`,
    taskType: 'remediation', priority: 'high',
    entityType: 'control', entityId: payload.entityId as string || '',
    triggerSource: 'control.effectiveness_low',
  });
}

// -- incident.pir_completed ---------------------------------------------------

async function handleIncidentPirCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const incidentId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Remediation: Post-incident review completed — create improvement plan`,
    description: `Post-incident review has been completed. Create remediation plan for identified improvements.`,
    taskType: 'remediation',
    priority: 'high',
    entityType: 'incident',
    entityId: incidentId,
    triggerSource: 'incident.pir_completed',
  });
}

// -- incident.closed ----------------------------------------------------------

async function handleIncidentClosed(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const incidentId = payload.entityId as string;

  // Check if any open remediation plans are linked to this incident
  const openPlans = await safeQuery(
    `SELECT plan_id FROM "${schema}".remediation_plans
     WHERE source_entity_type = 'incident' AND source_entity_id = $1 AND status NOT IN ('completed', 'closed', 'verified')`,
    [incidentId],
  );

  if (openPlans.rows.length > 0) {
    await createProcessTask(tenantId, {
      title: `Remediation check: Incident closed with ${openPlans.rows.length} open plan(s)`,
      description: `Incident has been closed but has open remediation plans. Verify plans are still needed or close them.`,
      taskType: 'remediation',
      priority: 'medium',
      entityType: 'incident',
      entityId: incidentId,
      triggerSource: 'incident.closed',
    });
  }
}

// -- controls.deficiency_detected ---------------------------------------------

async function handleControlDeficiencyDetected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const controlId = payload.entityId as string;
  const severity = payload.severity as string || 'medium';

  await createProcessTask(tenantId, {
    title: `Remediation: Control deficiency detected`,
    description: `A control deficiency has been detected. Create remediation plan to address the deficiency.`,
    taskType: 'remediation',
    priority: severity === 'critical' ? 'critical' : 'high',
    entityType: 'control',
    entityId: controlId,
    triggerSource: 'controls.deficiency_detected',
  });
}

// -- governance.action_created ------------------------------------------------

async function handleGovernanceActionCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const actionId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Remediation: Governance action requires execution plan`,
    description: `A governance action has been created. Link or create remediation plan for tracking.`,
    taskType: 'remediation',
    priority: 'medium',
    entityType: 'governance_action',
    entityId: actionId,
    triggerSource: 'governance.action_created',
  });
}


// -- foundation.org.manager.changed (Phase 2) -------------------------------
//
// When a Foundation position's reports_to changes, the escalation/approver
// chain for any open remediation record tied to that position must be recomputed.
// We emit a single recompute task per event so downstream operators can
// review the impacted chain. Idempotency is enforced by the task store on
// (triggerSource, entityId).
async function handleFoundationManagerChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const positionId = (payload.positionId as string | undefined) ?? (event.entityId as string | undefined);
  if (!positionId) return;

  await createProcessTask(tenantId, {
    title: `Recompute escalation chain (remediation) — manager changed`,
    description: `Foundation position reports_to changed. Recompute escalation paths for open remediation records linked to this position.`,
    taskType: 'remediation_escalation_recompute',
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
      logger.info(`[remediation] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[remediation] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('compliance.gap_detected', wrapHandler('handleComplianceGapDetected', handleComplianceGapDetected));
handlers.set('audit.finding_created', wrapHandler('handleAuditFindingCreated', handleAuditFindingCreated));
handlers.set('risk.residual_high', wrapHandler('handleRiskResidualHigh', handleRiskResidualHigh));
handlers.set('incident.capa_assigned', wrapHandler('handleIncidentCapaAssigned', handleIncidentCapaAssigned));
handlers.set('vendor.issue_created', wrapHandler('handleVendorIssueCreated', handleVendorIssueCreated));
handlers.set('foundation.org.manager.changed', wrapHandler('handleFoundationManagerChanged', handleFoundationManagerChanged));
handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));
handlers.set('risk.mitigation_required', wrapHandler('handleRiskMitigationRequired', handleRiskMitigationRequired));
handlers.set('framework.gap_identified', wrapHandler('handleFrameworkGapIdentified', handleFrameworkGapIdentified));
handlers.set('audit.remediation_due', wrapHandler('handleAuditRemediationDue', handleAuditRemediationDue));
handlers.set('bcp.maturity_regression', wrapHandler('handleBcpMaturityRegression', handleBcpMaturityRegression));
handlers.set('control.effectiveness_low', wrapHandler('handleControlEffectivenessLow', handleControlEffectivenessLow));
handlers.set('incident.pir_completed', wrapHandler('handleIncidentPirCompleted', handleIncidentPirCompleted));
handlers.set('incident.closed', wrapHandler('handleIncidentClosed', handleIncidentClosed));
handlers.set('controls.deficiency_detected', wrapHandler('handleControlDeficiencyDetected', handleControlDeficiencyDetected));
handlers.set('governance.action_created', wrapHandler('handleGovernanceActionCreated', handleGovernanceActionCreated));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${REMEDIATION_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerRemediationEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `remediation:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[remediation] registered ${handlers.size} domain event subscribers`);
}

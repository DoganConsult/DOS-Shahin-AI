/**
 * Controls Event Subscribers -- Handles consumed cross-module events for the controls domain.
 *
 * Consumed events (declared in CONTROLS_EVENT_CONTRACT):
 *   - risk.score_changed        -> Review control effectiveness for linked risks
 *   - risk.appetite_breached    -> Escalate control review for breached risk appetite
 *   - compliance.gap_detected   -> Map controls to detected compliance gap
 *   - audit.finding_created     -> Update control and schedule review for audit finding
 *   - policy.approved           -> Review mapped controls for policy alignment
 *   - evidence.expired          -> Flag control evidence as expired, request collection
 *   - incident.classified       -> Review controls for incident contribution
 *   - remediation.verified      -> Mark control remediation status as verified
 *   - workflow.status_changed   -> Sync control status from workflow transitions
 *
 * Each handler is idempotent: duplicate events are safely ignored.
 * All handlers are wrapped with error boundary and structured logging.
 *
 * @owner controls
 * @module controls
 * @since 2026-03-31
 */

import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { CONTROLS_EVENT_CONTRACT } from './controls.events';
import { swallow, EC } from '@dos/platform-core/resilience';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

// -- risk.score_changed -------------------------------------------------------

async function handleRiskScoreChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const riskId = payload.entityId as string || payload.riskId as string;
  const newScore = payload.newScore as number ?? payload.score as number;

  const linkedControls = await safeQuery(
    `SELECT control_id FROM "${schema}".control_risk_mappings WHERE risk_id = $1`,
    [riskId],
  );

  for (const row of linkedControls.rows) {
    await createProcessTask(tenantId, {
      title: `Control review: Linked risk score changed to ${newScore}`,
      description: `Risk score has changed. Review control effectiveness and test schedule for linked controls.`,
      taskType: 'control_review',
      priority: (newScore ?? 0) >= 15 ? 'critical' : 'high',
      entityType: 'control',
      entityId: row.control_id as string,
      triggerSource: 'risk.score_changed',
    });
  }
}

// -- risk.appetite_breached ---------------------------------------------------

async function handleRiskAppetiteBreached(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const riskId = payload.entityId as string;

  const linkedControls = await safeQuery(
    `SELECT control_id FROM "${schema}".control_risk_mappings WHERE risk_id = $1`,
    [riskId],
  );

  for (const row of linkedControls.rows) {
    await createProcessTask(tenantId, {
      title: `Control escalation: Risk appetite breached`,
      description: `Risk appetite has been breached. Evaluate control gaps and schedule emergency testing.`,
      taskType: 'control_review',
      priority: 'critical',
      entityType: 'control',
      entityId: row.control_id as string,
      triggerSource: 'risk.appetite_breached',
    });
  }
}

// -- compliance.gap_detected --------------------------------------------------

async function handleComplianceGapDetected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const gapId = payload.entityId as string;
  const severity = payload.severity as string || 'medium';

  await createProcessTask(tenantId, {
    title: `Control mapping: Compliance gap detected`,
    description: `A compliance gap has been detected. Map controls to the gap and assess coverage.`,
    taskType: 'control_review',
    priority: severity === 'critical' ? 'critical' : 'high',
    entityType: 'compliance_gap',
    entityId: gapId,
    triggerSource: 'compliance.gap_detected',
  });
}

// -- audit.finding_created ----------------------------------------------------

async function handleAuditFindingCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const findingId = payload.entityId as string;
  const controlId = payload.controlId as string;
  const severity = payload.severity as string || 'medium';

  if (controlId) {
    const schema = tenantSchema(tenantId);
    await safeQuery(
      `UPDATE "${schema}".controls
       SET last_finding_severity = $1, last_finding_at = NOW(), updated_at = NOW()
       WHERE control_id = $2`,
      [severity, controlId],
    );
  }

  await createProcessTask(tenantId, {
    title: `Control review: Audit finding raised`,
    description: `An audit finding has been raised. Review and update control effectiveness.`,
    taskType: 'control_review',
    priority: severity === 'critical' ? 'critical' : 'high',
    entityType: 'audit_finding',
    entityId: findingId,
    triggerSource: 'audit.finding_created',
  });
}

// -- policy.approved ----------------------------------------------------------

async function handlePolicyApproved(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const policyId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Control alignment: Policy approved`,
    description: `A policy has been approved. Review mapped controls for alignment with updated policy.`,
    taskType: 'control_review',
    priority: 'medium',
    entityType: 'policy',
    entityId: policyId,
    triggerSource: 'policy.approved',
  });
}

// -- evidence.expired ---------------------------------------------------------

async function handleEvidenceExpired(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const controlId = payload.controlId as string;

  if (controlId) {
    const schema = tenantSchema(tenantId);
    await safeQuery(
      `UPDATE "${schema}".controls
       SET evidence_status = 'expired', updated_at = NOW()
       WHERE control_id = $1`,
      [controlId],
    );

    await createProcessTask(tenantId, {
      title: `Control evidence expired`,
      description: `Evidence has expired for a control. Collect fresh evidence to maintain effectiveness rating.`,
      taskType: 'evidence_request',
      priority: 'high',
      entityType: 'control',
      entityId: controlId,
      triggerSource: 'evidence.expired',
    });
  }
}

// -- incident.classified ------------------------------------------------------

async function handleIncidentClassified(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const incidentId = payload.entityId as string;
  const severity = payload.severity as string;

  if (severity === 'critical' || severity === 'high') {
    await createProcessTask(tenantId, {
      title: `Control review: ${severity} incident classified`,
      description: `A ${severity} incident has been classified. Review whether control failures contributed.`,
      taskType: 'control_review',
      priority: severity === 'critical' ? 'critical' : 'high',
      entityType: 'incident',
      entityId: incidentId,
      triggerSource: 'incident.classified',
    });
  }
}

// -- remediation.verified -----------------------------------------------------

async function handleRemediationVerified(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const planId = payload.entityId as string;
  const controlId = payload.controlId as string;

  if (controlId) {
    await safeQuery(
      `UPDATE "${schema}".controls
       SET remediation_status = 'verified', updated_at = NOW()
       WHERE control_id = $1`,
      [controlId],
    );
  }

  swallow(EC.EVENT_BUS, recordAudit({
    tenantId, userId: SYSTEM_JOB_ACTOR, module: 'controls', action: 'update',
    entityType: 'remediation_verified', entityId: planId,
  }));
}

// -- workflow.status_changed --------------------------------------------------

async function handleWorkflowStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const entityType = payload.entityType as string;
  const entityId = payload.entityId as string;
  const newStatus = payload.newState as string || payload.status as string;

  if (!entityType?.startsWith('control') || !entityId || !newStatus) return;

  await safeQuery(
    `UPDATE "${schema}".controls
     SET status = $1, updated_at = NOW()
     WHERE control_id = $2 AND status != $1`,
    [newStatus, entityId],
  );
}

// -- foundation.position.holder.unassigned (F-001) ----------------------------
//
// When a Foundation position holder is unassigned, every control owned by
// that user must be reassigned (or at minimum: owner cleared + reassignment
// task created). Idempotent: re-running on an already-unowned control is a
// no-op because UPDATE filters on owner_user_id = $1.
async function handleFoundationPositionUnassigned(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const userId = (payload.userId as string | undefined) ?? (event.userId as string | undefined);
  if (!userId) return;
  const schema = tenantSchema(tenantId);

  const orphaned = await safeQuery(
    `UPDATE "${schema}".controls
     SET owner_user_id = NULL, updated_at = NOW()
     WHERE owner_user_id = $1
     RETURNING control_id`,
    [userId],
  );

  for (const row of orphaned.rows) {
    await createProcessTask(tenantId, {
      title: `Reassign control owner (Foundation position vacated)`,
      description: `Previous owner was removed from their Foundation position. Pick a new owner.`,
      taskType: 'control_reassignment',
      priority: 'high',
      entityType: 'control',
      entityId: row.control_id as string,
      triggerSource: 'foundation.position.holder.unassigned',
    });
    swallow(EC.EVENT_BUS, recordAudit({
      tenantId, userId: SYSTEM_JOB_ACTOR, module: 'controls', action: 'update',
      entityType: 'control', entityId: row.control_id as string,
    }));
  }
}

// -- Handler Wrapper ----------------------------------------------------------

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[controls] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[controls] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

// -- Handler Registration -----------------------------------------------------

handlers.set('risk.score_changed', wrapHandler('handleRiskScoreChanged', handleRiskScoreChanged));
handlers.set('risk.appetite_breached', wrapHandler('handleRiskAppetiteBreached', handleRiskAppetiteBreached));
handlers.set('compliance.gap_detected', wrapHandler('handleComplianceGapDetected', handleComplianceGapDetected));
handlers.set('audit.finding_created', wrapHandler('handleAuditFindingCreated', handleAuditFindingCreated));
handlers.set('policy.approved', wrapHandler('handlePolicyApproved', handlePolicyApproved));
handlers.set('evidence.expired', wrapHandler('handleEvidenceExpired', handleEvidenceExpired));
handlers.set('incident.classified', wrapHandler('handleIncidentClassified', handleIncidentClassified));
handlers.set('remediation.verified', wrapHandler('handleRemediationVerified', handleRemediationVerified));
handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));
handlers.set('foundation.position.holder.unassigned', wrapHandler('handleFoundationPositionUnassigned', handleFoundationPositionUnassigned));

// -- Phase 6 (F-050): foundation.dept_created ------------------------------
//
// New department => seed a default control-owner placeholder so controls
// scoped to this dept can be assigned. Idempotency on (triggerSource, entityId).
async function handleFoundationDeptCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const deptId = (payload.entityId as string | undefined) ?? (event.entityId as string | undefined);
  if (!deptId) return;
  await createProcessTask(tenantId, {
    title: 'Seed control owner placeholder for new department',
    description: `New department ${deptId} created. Assign a default control owner.`,
    taskType: 'control_owner_placeholder',
    priority: 'medium',
    entityType: 'department',
    entityId: deptId,
    triggerSource: 'foundation.dept_created',
  });
}
handlers.set('foundation.dept_created', wrapHandler('handleFoundationDeptCreated', handleFoundationDeptCreated));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${CONTROLS_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerControlsEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `controls:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[controls] registered ${handlers.size} domain event subscribers`);
}

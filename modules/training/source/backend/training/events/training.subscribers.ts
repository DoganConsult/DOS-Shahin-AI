import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { TRAINING_EVENT_CONTRACT } from './training.events';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function handleCompliancePostureChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const _schema = tenantSchema(tenantId);
  const newPosture = payload.newPosture as string || payload.posture as string;
  const frameworkCode = payload.frameworkCode as string;

  if (newPosture === 'non_compliant' || newPosture === 'at_risk') {
    const gapAreas = payload.gapAreas as string[] || [];
    await createProcessTask(tenantId, {
      title: `Training gap: Compliance posture degraded to ${newPosture}`,
      description: `Compliance posture has changed. Consider launching targeted training campaigns for gap areas: ${gapAreas.join(', ') || frameworkCode || 'general compliance'}.`,
      taskType: 'training_review',
      priority: newPosture === 'non_compliant' ? 'high' : 'medium',
      entityType: 'compliance_posture',
      entityId: frameworkCode || 'general',
      triggerSource: 'compliance.posture_changed',
    });
  }
}

async function handlePolicyApproved(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const policyId = payload.entityId as string || payload.policyId as string;
  const policyTitle = payload.title as string || 'Updated policy';

  await createProcessTask(tenantId, {
    title: `Training update: Policy "${policyTitle}" approved`,
    description: `A policy has been approved. Review existing training materials and update curricula to reflect new policy requirements. Consider attestation campaign.`,
    taskType: 'training_content_review',
    priority: 'medium',
    entityType: 'policy',
    entityId: policyId,
    triggerSource: 'policy.approved',
  });
}

async function handleIncidentLessonDocumented(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const incidentId = payload.entityId as string || payload.incidentId as string;
  const lessonTitle = payload.lessonTitle as string || 'Incident lesson';
  const severity = payload.severity as string || 'medium';

  await createProcessTask(tenantId, {
    title: `Training: Incident lesson documented — "${lessonTitle}"`,
    description: `A lesson learned from an incident has been documented. Incorporate into awareness training and phishing simulations.`,
    taskType: 'training_content_creation',
    priority: severity === 'critical' ? 'high' : 'medium',
    entityType: 'incident_lesson',
    entityId: incidentId,
    triggerSource: 'incident.lesson_documented',
  });
}

async function handleTrainingComplianceGap(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const overdueCount = payload.overdueCount as number || 0;
  await safeQuery(
    `UPDATE "${schema}".training_campaigns
     SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{autonomous_refresh_triggered}', 'true'::jsonb),
         updated_at = NOW()
     WHERE status = 'active' AND type = 'compliance'
     LIMIT 1`,
    [],
  );
  await createProcessTask(tenantId, {
    title: `Training: ${overdueCount} assignments overdue — auto-assign refresher courses`,
    description: `Training compliance gap detected. Generate and auto-assign refresher modules.`,
    taskType: 'training_content_creation', priority: overdueCount > 10 ? 'critical' : 'high',
    entityType: 'training', entityId: payload.entityId as string || '',
    triggerSource: 'training.compliance_gap',
  });
}

async function handleRaciGapDetected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const missing = (payload.missingRoles as string[])?.join(', ') || 'unknown';
  await createProcessTask(tenantId, {
    title: `Training: RACI awareness gap — missing ${missing}`,
    description: `RACI roles missing for ${payload.entityType}. Create RACI awareness training for team.`,
    taskType: 'training_content_creation', priority: 'medium',
    entityType: payload.entityType as string || 'grc_entity', entityId: payload.entityId as string || '',
    triggerSource: 'raci.gap_detected',
  });
}

async function handleWorkflowStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const entityType = payload.entityType as string;
  const entityId = payload.entityId as string;
  const newStatus = payload.newState as string || payload.status as string;

  if (!entityType?.startsWith('training') || !entityId || !newStatus) return;

  await safeQuery(
    `UPDATE "${schema}".training_campaigns SET status = $1, updated_at = NOW() WHERE campaign_id = $2 AND status != $1`,
    [newStatus, entityId],
  );
}

async function handleIncidentClosed(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const incidentId = payload.entityId as string;
  const rootCause = payload.rootCause as string;

  if (rootCause === 'human_error' || rootCause === 'social_engineering' || rootCause === 'phishing') {
    await createProcessTask(tenantId, {
      title: `Training: Auto-assign remediation module for incident ${incidentId}`,
      description: `Incident was closed with a human-centric root cause (${rootCause}). Assign a micro-learning remediation module to the involved user(s).`,
      taskType: 'training_assignment',
      priority: 'high',
      entityType: 'incident',
      entityId: incidentId,
      triggerSource: 'incident.closed',
    });
  }
}

async function handleAuditFindingCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const findingId = payload.entityId as string;
  const findingType = payload.findingType as string;

  if (findingType === 'policy_violation') {
    await createProcessTask(tenantId, {
      title: `Training: Policy violation refresher assignment`,
      description: `Audit finding ${findingId} indicates a direct policy violation. Automatically enroll the control owner in a policy refresher course.`,
      taskType: 'training_assignment',
      priority: 'medium',
      entityType: 'audit_finding',
      entityId: findingId,
      triggerSource: 'audit.finding_created',
    });
  }
}

async function handleUserRoleChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const userId = payload.userId as string || payload.entityId as string;
  const newRole = payload.newRole as string;
  
  if (newRole && newRole !== 'user' && newRole !== 'guest') {
    await createProcessTask(tenantId, {
      title: `Training: Onboarding induction for new privileged role`,
      description: `User ${userId} reached privileged role "${newRole}". Launch induction compliance and privacy training campaigns.`,
      taskType: 'training_assignment',
      priority: 'high',
      entityType: 'user',
      entityId: userId,
      triggerSource: 'user.role_changed',
    });
  }
}

async function handlePrivacyDsrReceived(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const dsrId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Training: DSR Response SLA Awareness`,
    description: `A new Data Subject Request (${dsrId}) was received. Ensure the assigned handler has active regulatory SLA awareness certification.`,
    taskType: 'training_review',
    priority: 'medium',
    entityType: 'dsr',
    entityId: dsrId,
    triggerSource: 'privacy.dsr_received',
  });
}

async function handleComplianceFrameworkGap(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const frameworkName = payload.frameworkName as string || 'Unknown';
  const coverage = payload.coverage as number;

  if ((coverage ?? 100) < 70) {
    await createProcessTask(tenantId, {
      title: `Training: Framework gap requires awareness campaign — ${frameworkName}`,
      description: `Framework "${frameworkName}" has ${coverage}% coverage. Schedule targeted training for framework-specific controls.`,
      taskType: 'training_assignment',
      priority: (coverage ?? 100) < 50 ? 'critical' : 'high',
      entityType: 'framework',
      entityId: payload.entityId as string || '',
      triggerSource: 'compliance.framework_gap_identified',
    });
  }
}

async function handleControlDeficiency(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const controlId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Training: Control deficiency — assign control owner training`,
    description: `A control deficiency has been detected. Assign training to control owners on proper control operation and testing.`,
    taskType: 'training_assignment',
    priority: 'high',
    entityType: 'control',
    entityId: controlId,
    triggerSource: 'controls.deficiency_detected',
  });
}

async function handleIncidentSlaBreach(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Training: SLA awareness — incident response refresher needed`,
    description: `Incident SLA has been breached. Schedule incident response training refresher for affected teams.`,
    taskType: 'training_assignment',
    priority: 'high',
    entityType: 'incident',
    entityId: payload.entityId as string || '',
    triggerSource: 'incident.sla_breached',
  });
}

async function handleRemediationOverdue(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Training: Remediation skills gap — assign process training`,
    description: `A remediation plan is overdue. Assess whether remediation owners need process or skills training.`,
    taskType: 'training_assignment',
    priority: 'medium',
    entityType: 'remediation_plan',
    entityId: payload.entityId as string || '',
    triggerSource: 'remediation.overdue',
  });
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[training] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[training] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('compliance.posture_changed', wrapHandler('handleCompliancePostureChanged', handleCompliancePostureChanged));
handlers.set('policy.approved', wrapHandler('handlePolicyApproved', handlePolicyApproved));
handlers.set('incident.lesson_documented', wrapHandler('handleIncidentLessonDocumented', handleIncidentLessonDocumented));
handlers.set('training.compliance_gap', wrapHandler('handleTrainingComplianceGap', handleTrainingComplianceGap));
handlers.set('raci.gap_detected', wrapHandler('handleRaciGapDetected', handleRaciGapDetected));
handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));
handlers.set('incident.closed', wrapHandler('handleIncidentClosed', handleIncidentClosed));
handlers.set('audit.finding_created', wrapHandler('handleAuditFindingCreated', handleAuditFindingCreated));
handlers.set('user.role_changed', wrapHandler('handleUserRoleChanged', handleUserRoleChanged));
handlers.set('team.member_added', wrapHandler('handleUserRoleChanged', handleUserRoleChanged));
handlers.set('privacy.dsr_received', wrapHandler('handlePrivacyDsrReceived', handlePrivacyDsrReceived));
handlers.set('compliance.framework_gap_identified', wrapHandler('handleComplianceFrameworkGap', handleComplianceFrameworkGap));
handlers.set('controls.deficiency_detected', wrapHandler('handleControlDeficiency', handleControlDeficiency));
handlers.set('incident.sla_breached', wrapHandler('handleIncidentSlaBreach', handleIncidentSlaBreach));
handlers.set('remediation.overdue', wrapHandler('handleRemediationOverdue', handleRemediationOverdue));

// -- Phase 6 (F-051): foundation.dept_created ------------------------------
//
// New department => auto-enroll dept in baseline curricula. Idempotency on
// (triggerSource, entityId).
async function handleFoundationDeptCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const deptId = (payload.entityId as string | undefined) ?? (event.entityId as string | undefined);
  if (!deptId) return;
  await createProcessTask(tenantId, {
    title: 'Auto-enroll department in baseline curricula',
    description: `New department ${deptId} created. Enroll members in baseline training curricula.`,
    taskType: 'training_baseline_enroll',
    priority: 'medium',
    entityType: 'department',
    entityId: deptId,
    triggerSource: 'foundation.dept_created',
  });
}
handlers.set('foundation.dept_created', wrapHandler('handleFoundationDeptCreated', handleFoundationDeptCreated));

// -- Phase 7 (F-060): foundation.position.holder.assigned ------------------
//
// New position holder => auto-enroll user in position-required courses.
// Idempotency on (triggerSource, entityId=userId).
async function handleFoundationPositionAssigned(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const userId = (payload.userId as string | undefined);
  const positionId = (payload.positionId as string | undefined) ?? (payload.entityId as string | undefined) ?? (event.entityId as string | undefined);
  if (!userId || !positionId) return;
  await createProcessTask(tenantId, {
    title: 'Auto-enroll user in position-required courses',
    description: `User ${userId} assigned to position ${positionId}. Enroll in mandatory courses.`,
    taskType: 'training_position_enroll',
    priority: 'medium',
    entityType: 'user',
    entityId: userId,
    triggerSource: 'foundation.position.holder.assigned',
  });
}
handlers.set('foundation.position.holder.assigned', wrapHandler('handleFoundationPositionAssigned', handleFoundationPositionAssigned));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${TRAINING_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerTrainingEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `training:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[training] registered ${handlers.size} domain event subscribers`);
}

import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { PRIVACY_EVENT_CONTRACT } from './privacy.events';
import { swallow, EC } from '@dos/platform-core/resilience';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function handleIncidentBreachReported(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const incidentId = payload.entityId as string || payload.incidentId as string;
  const severity = payload.severity as string || 'high';
  const affectedDataSubjects = payload.affectedDataSubjects as number || 0;

  await safeQuery(
    `INSERT INTO "${schema}".data_subject_requests (request_id, type, status, source_incident_id, priority, created_at, created_by)
     VALUES (gen_random_uuid(), 'breach_notification', 'open', $1, $2, NOW(), 'system')
     ON CONFLICT DO NOTHING`,
    [incidentId, severity === 'critical' ? 'critical' : 'high'],
  );

  await createProcessTask(tenantId, {
    title: `Privacy: Data breach reported — initiate notification workflow`,
    description: `A data breach has been reported (incident ${incidentId}). ${affectedDataSubjects > 0 ? `Approximately ${affectedDataSubjects} data subjects affected.` : ''} Initiate breach notification within regulatory deadlines.`,
    taskType: 'privacy_breach_response',
    priority: 'critical',
    entityType: 'incident',
    entityId: incidentId,
    triggerSource: 'incident.breach_reported',
  });

  swallow(EC.EVENT_BUS, recordAudit({
    tenantId, userId: SYSTEM_JOB_ACTOR, module: 'privacy', action: 'create',
    entityType: 'breach_notification', entityId: incidentId,
    afterState: { severity, affectedDataSubjects },
  }));
}

async function handleCompliancePostureChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const newPosture = payload.newPosture as string;
  const frameworkCode = payload.frameworkCode as string;

  if (frameworkCode?.includes('privacy') || frameworkCode?.includes('pdpl') || frameworkCode?.includes('gdpr') || newPosture === 'non_compliant') {
    const openDsrs = await safeQuery(
      `SELECT COUNT(*) as cnt FROM "${schema}".data_subject_requests WHERE status NOT IN ('completed', 'closed')`,
      [],
    );

    const dsrCount = parseInt(openDsrs.rows[0]?.cnt || '0', 10);
    if (dsrCount > 0) {
      await createProcessTask(tenantId, {
        title: `Privacy: Compliance posture changed — review ${dsrCount} open DSRs`,
        description: `Privacy-related compliance posture has changed to ${newPosture}. Review open data subject requests for regulatory impact.`,
        taskType: 'privacy_review',
        priority: 'high',
        entityType: 'compliance_posture',
        entityId: frameworkCode || 'general',
        triggerSource: 'compliance.posture_changed',
      });
    }
  }
}

async function handleVendorDdCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const vendorId = payload.entityId as string || payload.vendorId as string;
  const dataProcessingAgreement = payload.dataProcessingAgreement as boolean;
  const crossBorderTransfer = payload.crossBorderTransfer as boolean;

  if (crossBorderTransfer || dataProcessingAgreement === false) {
    await createProcessTask(tenantId, {
      title: `Privacy: Vendor DD completed — ${crossBorderTransfer ? 'cross-border transfer review' : 'DPA missing'}`,
      description: `Vendor due diligence completed for ${vendorId}. ${crossBorderTransfer ? 'Cross-border data transfer detected — privacy impact assessment required.' : 'No data processing agreement found — DPA review required.'}`,
      taskType: 'privacy_impact_assessment',
      priority: 'high',
      entityType: 'vendor',
      entityId: vendorId,
      triggerSource: 'vendor.dd_completed',
    });
  }
}

async function handlePolicyApproved(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const policyId = payload.entityId as string;
  const policyTitle = payload.title as string || 'Updated policy';

  await createProcessTask(tenantId, {
    title: `Privacy: Policy approved — review privacy notices`,
    description: `Policy "${policyTitle}" has been approved. Review and update privacy notices, consent forms, and data processing records for alignment.`,
    taskType: 'privacy_notice_review',
    priority: 'medium',
    entityType: 'policy',
    entityId: policyId,
    triggerSource: 'policy.approved',
  });
}

async function handlePrivacyImpactHigh(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".data_subject_requests (request_id, type, status, priority, created_at, created_by)
     VALUES (gen_random_uuid(), 'dpia_required', 'open', 'high', NOW(), 'system')
     ON CONFLICT DO NOTHING`,
    [],
  );
  await createProcessTask(tenantId, {
    title: `Privacy: DPIA required — ${payload.processingActivity}`,
    description: `Processing activity "${payload.processingActivity}" has ${payload.impactLevel} impact. Conduct DPIA before proceeding.`,
    taskType: 'privacy_impact_assessment', priority: 'critical',
    entityType: 'privacy', entityId: payload.entityId as string || '',
    triggerSource: 'privacy.impact_high',
  });
}

async function handleTrainingComplianceGap(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const overdueCount = payload.overdueCount as number || 0;
  if (overdueCount > 5) {
    await createProcessTask(tenantId, {
      title: `Privacy: ${overdueCount} training assignments overdue — privacy awareness risk`,
      description: `Training gaps increase privacy incident risk. Ensure privacy awareness modules are prioritized.`,
      taskType: 'privacy_review', priority: 'high',
      entityType: 'training', entityId: payload.entityId as string || '',
      triggerSource: 'training.compliance_gap',
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

  if (!entityType?.startsWith('privacy') && !entityType?.startsWith('dsr') && !entityType?.startsWith('data_subject')) return;
  if (!entityId || !newStatus) return;

  await safeQuery(
    `UPDATE "${schema}".data_subject_requests SET status = $1, updated_at = NOW() WHERE request_id = $2 AND status != $1`,
    [newStatus, entityId],
  );
}

async function handleAssetCreatedUpdated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const assetId = payload.entityId as string || payload.assetId as string;
  const dataClass = payload.dataClassification as string;
  const categories = payload.dataCategories as string[] || [];

  if (dataClass === 'restricted' || dataClass === 'confidential' || categories.includes('pii') || categories.includes('phi')) {
    await createProcessTask(tenantId, {
      title: `Privacy: DPIA required for PII/PHI Asset - ${payload.name || assetId}`,
      description: `Asset "${payload.name || assetId}" has been tracked with data classification containing sensitive personal data. Perform Data Privacy Impact Assessment.`,
      taskType: 'privacy_impact_assessment',
      priority: 'high',
      entityType: 'asset',
      entityId: assetId,
      triggerSource: 'asset.classification_change',
    });
  }
}

async function handleExceptionApproved(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const exceptionId = payload.entityId as string;
  const linkedEntity = payload.linkedEntityType as string;

  if (linkedEntity === 'privacy_control' || linkedEntity === 'dsr_process') {
    await createProcessTask(tenantId, {
      title: `Privacy Warning: Exception granted for privacy control`,
      description: `An exception (${exceptionId}) was approved for a privacy-related process. Ensure Data Subject Requests (DSR) logging accommodates this temporarily diminished control state.`,
      taskType: 'privacy_review',
      priority: 'high',
      entityType: 'exception',
      entityId: exceptionId,
      triggerSource: 'exception.approved',
    });
  }
}

async function handleIncidentContained(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const incidentId = payload.entityId as string;
  const isBreach = payload.isDataBreach as boolean;

  if (isBreach || payload.type === 'data_breach' || payload.type === 'privacy_incident') {
    await createProcessTask(tenantId, {
      title: `Privacy: Breach contained — format external DPA transmission`,
      description: `Incident ${incidentId} has been contained. Transition formal breach notification from drafting state to external authority transmission.`,
      taskType: 'privacy_breach_response',
      priority: 'critical',
      entityType: 'incident',
      entityId: incidentId,
      triggerSource: 'incident.contained',
    });
  }
}

async function handleIncidentSlaBreach(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const incidentId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Privacy: Incident SLA breached — assess breach notification deadline`,
    description: `Incident SLA has been breached. Evaluate GDPR Art. 33/34 breach notification obligations and update privacy response timeline.`,
    taskType: 'privacy_review',
    priority: 'critical',
    entityType: 'incident',
    entityId: incidentId,
    triggerSource: 'incident.sla_breached',
  });
}

async function handlePrivacyControlFailed(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const controlId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Privacy: Privacy-related control failing effectiveness`,
    description: `Controls are failing effectiveness testing. Review impact on privacy controls and data protection measures.`,
    taskType: 'privacy_review',
    priority: 'high',
    entityType: 'control',
    entityId: controlId,
    triggerSource: 'controls.effectiveness_failed',
  });
}

async function handleGovernanceHealthScore(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const score = payload.score as number || payload.healthScore as number;

  if (score !== undefined && score < 60) {
    await createProcessTask(tenantId, {
      title: `Privacy governance: Health score degraded to ${score}`,
      description: `Governance health score has dropped below threshold. Review privacy governance posture and DPO oversight status.`,
      taskType: 'privacy_review',
      priority: 'high',
      entityType: 'governance_health',
      entityId: payload.entityId as string || '',
      triggerSource: 'governance.health_score_updated',
    });
  }
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[privacy] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[privacy] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('incident.breach_reported', wrapHandler('handleIncidentBreachReported', handleIncidentBreachReported));
handlers.set('compliance.posture_changed', wrapHandler('handleCompliancePostureChanged', handleCompliancePostureChanged));
handlers.set('vendor.dd_completed', wrapHandler('handleVendorDdCompleted', handleVendorDdCompleted));
handlers.set('policy.approved', wrapHandler('handlePolicyApproved', handlePolicyApproved));
handlers.set('privacy.impact_high', wrapHandler('handlePrivacyImpactHigh', handlePrivacyImpactHigh));
handlers.set('training.compliance_gap', wrapHandler('handleTrainingComplianceGap', handleTrainingComplianceGap));
handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));
handlers.set('asset.created', wrapHandler('handleAssetCreatedUpdated', handleAssetCreatedUpdated));
handlers.set('asset.updated', wrapHandler('handleAssetCreatedUpdated', handleAssetCreatedUpdated));
handlers.set('exception.approved', wrapHandler('handleExceptionApproved', handleExceptionApproved));
handlers.set('incident.contained', wrapHandler('handleIncidentContained', handleIncidentContained));
handlers.set('incident.sla_breached', wrapHandler('handleIncidentSlaBreach', handleIncidentSlaBreach));
handlers.set('controls.effectiveness_failed', wrapHandler('handlePrivacyControlFailed', handlePrivacyControlFailed));
handlers.set('governance.health_score_updated', wrapHandler('handleGovernanceHealthScore', handleGovernanceHealthScore));

// -- Phase 4 (F-032/F-035): Foundation role lifecycle ----------------------
//
// Privacy must reassess data-access scope when a role grants or removes
// processing rights. We surface a recompute task per event.
async function handleFoundationRoleAssignedPrivacy(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const roleCode = (payload.roleCode as string | undefined) ?? (event.entityId as string | undefined);
  if (!roleCode) return;
  await createProcessTask(tenantId, {
    title: `Privacy access review: role assigned (${roleCode})`,
    description: `Recompute data-subject access scope for role ${roleCode}; verify lawful basis for any new processing.`,
    taskType: 'privacy_access_review',
    priority: 'medium',
    entityType: 'role',
    entityId: roleCode,
    triggerSource: 'foundation.role.assigned',
  });
}
async function handleFoundationRoleUnassignedPrivacy(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const roleCode = (payload.roleCode as string | undefined) ?? (event.entityId as string | undefined);
  if (!roleCode) return;
  await createProcessTask(tenantId, {
    title: `Privacy access review: role unassigned (${roleCode})`,
    description: `Confirm data-subject access removal and update DPIA register if processing scope changed.`,
    taskType: 'privacy_access_review',
    priority: 'medium',
    entityType: 'role',
    entityId: roleCode,
    triggerSource: 'foundation.role.unassigned',
  });
}
handlers.set('foundation.role.assigned', wrapHandler('handleFoundationRoleAssignedPrivacy', handleFoundationRoleAssignedPrivacy));
handlers.set('foundation.role.unassigned', wrapHandler('handleFoundationRoleUnassignedPrivacy', handleFoundationRoleUnassignedPrivacy));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${PRIVACY_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerPrivacyEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `privacy:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[privacy] registered ${handlers.size} domain event subscribers`);
}

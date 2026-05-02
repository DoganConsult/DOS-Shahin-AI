import { logger } from '../../ports/logger.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { createProcessTask } from '../../ports/lifecycle.port';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import { eventBus, type PlatformEvent } from '../../ports/events.port';
import { COMPLIANCE_EVENT_CONTRACT } from './compliance.events';
import { swallow, EC } from '@dos/platform-core/resilience';
import { registerNavigationIntegration } from '@dos/platform-core/shell/navigation/navigation-integration';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function handleRiskScoreChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const riskId = payload.entityId as string || payload.riskId as string;
  const newScore = payload.newScore as number || payload.score as number;

  const linkedControls = await safeQuery(
    `SELECT control_id FROM "${schema}".risk_compliance_links
     WHERE risk_id = $1 OR gap_id = $1`,
    [riskId],
  );

  if (linkedControls.rows.length > 0) {
    await createProcessTask(tenantId, {
      title: `Compliance review: Risk score changed`,
      description: `Risk score has changed to ${newScore}. Review impact on linked compliance controls and posture.`,
      taskType: 'control_review',
      priority: (newScore ?? 0) >= 15 ? 'critical' : 'high',
      entityType: 'risk',
      entityId: riskId,
      triggerSource: 'risk.score_changed',
    });
  }
}

async function handleRiskAssessmentCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const riskId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Update compliance program: Risk assessment completed`,
    description: `Risk assessment has been completed. Update compliance program status and control effectiveness ratings.`,
    taskType: 'control_review',
    priority: 'medium',
    entityType: 'risk_assessment',
    entityId: riskId,
    triggerSource: 'risk.assessment_completed',
  });
}

async function handleEvidenceCollected(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const controlId = payload.controlId as string;
  const evidenceId = payload.entityId as string;

  if (controlId) {
    await safeQuery(
      `UPDATE "${schema}".compliance_controls
       SET evidence_status = 'collected', last_evidence_at = NOW(), updated_at = NOW()
       WHERE control_id = $1`,
      [controlId],
    );
  }

  swallow(EC.EVENT_BUS, recordAudit({
    tenantId, userId: SYSTEM_JOB_ACTOR, module: 'compliance', action: 'update',
    entityType: 'evidence_collection', entityId: evidenceId,
  }));
}

async function handleEvidenceExpired(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const controlId = payload.controlId as string;
  const _evidenceId = payload.entityId as string;

  if (controlId) {
    await safeQuery(
      `UPDATE "${schema}".compliance_controls
       SET evidence_status = 'expired', updated_at = NOW()
       WHERE control_id = $1`,
      [controlId],
    );

    await createProcessTask(tenantId, {
      title: `Evidence expired: Resubmit evidence for compliance control`,
      description: `Evidence has expired. Submit fresh evidence to maintain compliance status.`,
      taskType: 'evidence_request',
      priority: 'high',
      entityType: 'compliance_control',
      entityId: controlId,
      triggerSource: 'evidence.expired',
    });
  }
}

async function handleAuditFindingCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const findingId = payload.entityId as string || payload.findingId as string;
  const severity = payload.severity as string || 'medium';

  await createProcessTask(tenantId, {
    title: `Compliance review: Audit finding raised`,
    description: `An audit finding has been raised. Assess compliance gaps and update program status.`,
    taskType: 'control_review',
    priority: severity === 'critical' ? 'critical' : 'high',
    entityType: 'audit_finding',
    entityId: findingId,
    triggerSource: 'audit.finding_created',
  });
}

async function handlePolicyApproved(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const policyId = payload.entityId as string || payload.policyId as string;

  const linkedControls = await safeQuery(
    `SELECT control_id FROM "${schema}".compliance_controls
     WHERE policy_id = $1 OR linked_policy_ids @> ARRAY[$1]::text[]`,
    [policyId],
  );

  if (linkedControls.rows.length > 0) {
    await createProcessTask(tenantId, {
      title: `Compliance update: Policy approved`,
      description: `A linked policy has been approved. Review ${linkedControls.rows.length} compliance control(s) for alignment.`,
      taskType: 'control_review',
      priority: 'medium',
      entityType: 'policy',
      entityId: policyId,
      triggerSource: 'policy.approved',
    });
  }
}

async function handleVendorComplianceGap(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const vendorId = payload.entityId as string || payload.vendorId as string;
  const gapDescription = payload.gapDescription as string || 'Vendor compliance gap propagated';

  await createProcessTask(tenantId, {
    title: `Vendor compliance gap: Review impact on compliance program`,
    description: gapDescription,
    taskType: 'control_review',
    priority: 'high',
    entityType: 'vendor',
    entityId: vendorId,
    triggerSource: 'vendor.compliance_gap_propagated',
  });
}

async function handleControlEffectivenessLow(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Compliance alert: ${payload.failingControls} controls failing effectiveness`,
    description: `${payload.failingControls} of ${payload.total} controls are ineffective. Re-evaluate compliance posture.`,
    taskType: 'control_review', priority: 'critical',
    entityType: 'control', entityId: payload.entityId as string || '',
    triggerSource: 'control.effectiveness_low',
  });
}

async function handleFrameworkGapIdentified(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Compliance: Framework coverage gap — ${payload.frameworkName}`,
    description: `Framework "${payload.frameworkName}" has ${payload.coverage}% coverage. Map missing controls to close gap.`,
    taskType: 'control_review', priority: (payload.coverage as number) < 50 ? 'critical' : 'high',
    entityType: 'framework', entityId: payload.entityId as string || '',
    triggerSource: 'framework.gap_identified',
  });
}

async function handleEvidenceCoverageLow(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  await createProcessTask(tenantId, {
    title: `Compliance: Control "${payload.controlName}" has no evidence`,
    description: `Control lacks attached evidence. Flag for compliance program review.`,
    taskType: 'evidence_request', priority: 'high',
    entityType: 'control', entityId: payload.entityId as string || '',
    triggerSource: 'evidence.coverage_low',
  });
}

async function handleWorkflowStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const entityType = payload.entityType as string;
  const entityId = payload.entityId as string;
  const newStatus = payload.newState as string || payload.status as string;

  if (!entityType?.startsWith('compliance') || !entityId || !newStatus) return;

  await safeQuery(
    `UPDATE "${schema}".compliance_programs
     SET status = $1, updated_at = NOW()
     WHERE program_id = $2 AND status != $1`,
    [newStatus, entityId],
  );
}


// -- foundation.scope_changed (Phase 3) -------------------------------------
//
// When a Foundation org/department/business-unit moves under a new parent,
// compliance applicability for records linked to that org node must be
// recomputed. We emit one recompute task per event; idempotency on
// (triggerSource, entityId) is enforced by the task store.
async function handleFoundationScopeChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const entityId = (payload.entityId as string | undefined) ?? (event.entityId as string | undefined);
  if (!entityId) return;
  const entityType = (payload.entityType as string | undefined) ?? 'org_unit';

  await createProcessTask(tenantId, {
    title: `Recompute compliance applicability — Foundation scope changed`,
    description: `recompute obligation applicability for ${entityType} ${entityId} after parent change.`,
    taskType: 'compliance_applicability_recompute',
    priority: 'medium',
    entityType,
    entityId,
    triggerSource: 'foundation.scope_changed',
  });
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[compliance] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[compliance] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('risk.score_changed', wrapHandler('handleRiskScoreChanged', handleRiskScoreChanged));
handlers.set('risk.assessment_completed', wrapHandler('handleRiskAssessmentCompleted', handleRiskAssessmentCompleted));
handlers.set('evidence.collected', wrapHandler('handleEvidenceCollected', handleEvidenceCollected));
handlers.set('evidence.expired', wrapHandler('handleEvidenceExpired', handleEvidenceExpired));
handlers.set('audit.finding_created', wrapHandler('handleAuditFindingCreated', handleAuditFindingCreated));
handlers.set('policy.approved', wrapHandler('handlePolicyApproved', handlePolicyApproved));
handlers.set('vendor.compliance_gap_propagated', wrapHandler('handleVendorComplianceGap', handleVendorComplianceGap));
handlers.set('control.effectiveness_low', wrapHandler('handleControlEffectivenessLow', handleControlEffectivenessLow));
handlers.set('framework.gap_identified', wrapHandler('handleFrameworkGapIdentified', handleFrameworkGapIdentified));
handlers.set('evidence.coverage_low', wrapHandler('handleEvidenceCoverageLow', handleEvidenceCoverageLow));
handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${COMPLIANCE_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerComplianceEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `compliance:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[compliance] registered ${handlers.size} domain event subscribers`);
  registerNavigationIntegration('compliance');
}

// ── Cross-module: ksa-regulatory, records compliance integration ──

function handleKsaRegulatoryForCompliance(event: PlatformEvent): void {
  if (!event.tenantId) return;
  logger.debug('[Compliance] ksa-regulatory change for compliance', { tenantId: event.tenantId });
}

function handleRecordsForCompliance(event: PlatformEvent): void {
  if (!event.tenantId) return;
  logger.debug('[Compliance] records retention event', { tenantId: event.tenantId });
}

try {
  eventBus.subscribe('ksa_regulatory.assessment_completed_processed' as any, 'compliance:ksa-regulatory.assessed', (handleKsaRegulatoryForCompliance as any));
  eventBus.subscribe('records.disposal.approve' as any, 'compliance:records.disposal', (handleRecordsForCompliance as any));
} catch { /* pass */ }

handlers.set('foundation.scope_changed', wrapHandler('handleFoundationScopeChanged', handleFoundationScopeChanged));

// -- Phase 5 (F-041): foundation.org_created -------------------------------
//
// New org node => recompute compliance applicability so obligations attach
// to the new branch. Idempotency is on (triggerSource, entityId).
async function handleFoundationOrgCreatedCompliance(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const orgId = (payload.entityId as string | undefined) ?? (event.entityId as string | undefined);
  if (!orgId) return;
  await createProcessTask(tenantId, {
    title: 'Recompute compliance applicability for new org',
    description: `New org node ${orgId} created. Recompute obligation/control applicability for this branch.`,
    taskType: 'compliance_applicability_recompute',
    priority: 'medium',
    entityType: 'org_unit',
    entityId: orgId,
    triggerSource: 'foundation.org_created',
  });
}
handlers.set('foundation.org_created', wrapHandler('handleFoundationOrgCreatedCompliance', handleFoundationOrgCreatedCompliance));

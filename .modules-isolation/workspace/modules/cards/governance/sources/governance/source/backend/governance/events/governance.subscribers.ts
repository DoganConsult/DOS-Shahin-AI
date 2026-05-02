import { logger } from '../../../ports/logger.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { eventBus, type PlatformEvent } from '../../ports/events.port';
import { GOVERNANCE_EVENT_CONTRACT } from './governance.events';
import { registerNavigationIntegration } from '@dos/platform-core/shell/navigation/navigation-integration';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function handleCompliancePostureChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const programId = payload.entityId as string;
  const score = payload.score as number || payload.postureScore as number;

  await createProcessTask(tenantId, {
    title: `Governance health: Compliance posture changed`,
    description: `Compliance posture score has changed${score !== undefined ? ` to ${score}` : ''}. Update governance health score and board reporting.`,
    taskType: 'verification',
    priority: (score !== undefined && score < 60) ? 'high' : 'medium',
    entityType: 'compliance_program',
    entityId: programId,
    triggerSource: 'compliance.posture_changed',
  });
}

async function handleRiskAssessmentCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const riskId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Governance update: Risk assessment completed`,
    description: `A risk assessment has been completed. Update governance risk context and oversight dashboard.`,
    taskType: 'verification',
    priority: 'medium',
    entityType: 'risk_assessment',
    entityId: riskId,
    triggerSource: 'risk.assessment_completed',
  });
}

async function handlePolicyApproved(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const policyId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Governance milestone: Policy approved`,
    description: `A policy has been approved. Record governance milestone and update oversight tracking.`,
    taskType: 'verification',
    priority: 'low',
    entityType: 'policy',
    entityId: policyId,
    triggerSource: 'policy.approved',
  });
}

async function handleAuditEngagementCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const engagementId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Governance update: Audit engagement completed`,
    description: `An audit engagement has been completed. Review findings for governance oversight and board reporting.`,
    taskType: 'verification',
    priority: 'medium',
    entityType: 'audit_engagement',
    entityId: engagementId,
    triggerSource: 'audit.engagement_completed',
  });
}

async function handleRiskExceededAppetite(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  await createProcessTask(tenantId, {
    title: `Governance escalation: Risk exceeded appetite — ${payload.riskName || payload.entityId}`,
    description: `Risk score ${payload.riskScore} exceeds appetite max ${payload.maxScore}. Board-level escalation required.`,
    taskType: 'verification', priority: 'critical',
    entityType: 'risk', entityId: payload.entityId as string || '',
    triggerSource: 'risk.exceeded_appetite',
  });
}

async function handleFrameworkGapIdentified(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  await createProcessTask(tenantId, {
    title: `Governance alert: Framework coverage gap — ${payload.frameworkName}`,
    description: `Framework ${payload.frameworkName} has only ${payload.coverage}% control coverage. Update governance oversight.`,
    taskType: 'verification', priority: (payload.coverage as number) < 50 ? 'critical' : 'high',
    entityType: 'framework', entityId: payload.entityId as string || '',
    triggerSource: 'framework.gap_identified',
  });
}

async function handleIncidentSlaBreach(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  await createProcessTask(tenantId, {
    title: `Governance alert: ${payload.breachedCount || 1} incident SLA(s) breached`,
    description: `Incident SLA breaches detected. Executive oversight and escalation required.`,
    taskType: 'verification', priority: 'critical',
    entityType: 'incident', entityId: payload.entityId as string || '',
    triggerSource: 'incident.sla_breached',
  });
}

async function handlePrivacyImpactHigh(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  await createProcessTask(tenantId, {
    title: `Governance alert: High privacy impact — ${payload.processingActivity}`,
    description: `Processing activity "${payload.processingActivity}" has ${payload.impactLevel} impact without completed DPIA. Board visibility required.`,
    taskType: 'verification', priority: 'high',
    entityType: 'privacy', entityId: payload.entityId as string || '',
    triggerSource: 'privacy.impact_high',
  });
}

async function handleBcpRtoRpoDrift(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  await createProcessTask(tenantId, {
    title: `Governance alert: BCP RTO/RPO drift — ${payload.strategy}`,
    description: `Actual RTO(${payload.actualRto}h) exceeds target(${payload.targetRto}h). Governance oversight needed.`,
    taskType: 'verification', priority: 'critical',
    entityType: 'bcp_exercise', entityId: payload.entityId as string || '',
    triggerSource: 'bcp.rto_rpo_drift',
  });
}

async function handleBcpCrisisReadinessLow(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  await createProcessTask(tenantId, {
    title: `Governance alert: Crisis communication plan stale — ${payload.title}`,
    description: `Crisis comm plan not reviewed in 365+ days. Board attention needed.`,
    taskType: 'verification', priority: 'high',
    entityType: 'crisis_comm_plan', entityId: payload.entityId as string || '',
    triggerSource: 'bcp.crisis_readiness_low',
  });
}

async function handleBcpMaturityRegression(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  await createProcessTask(tenantId, {
    title: `Governance alert: BCP maturity regressed (${payload.previousScore} → ${payload.currentScore})`,
    description: `BCP maturity score dropped by ${payload.drop} points. Board review required.`,
    taskType: 'verification', priority: 'critical',
    entityType: 'bcm_maturity', entityId: payload.entityId as string || '',
    triggerSource: 'bcp.maturity_regression',
  });
}

async function handleBcpPlanStale(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  await createProcessTask(tenantId, {
    title: `Governance alert: BCP plan stale — ${payload.title}`,
    description: `BCP plan not reviewed in 180+ days. Add to governance review agenda.`,
    taskType: 'verification', priority: 'high',
    entityType: 'bcp_plan', entityId: payload.entityId as string || '',
    triggerSource: 'bcp.plan_stale',
  });
}

async function handleBcpBiaStale(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  await createProcessTask(tenantId, {
    title: `Governance alert: BIA assessment stale — ${payload.title}`,
    description: `Business Impact Analysis approved 365+ days ago. Schedule refresh.`,
    taskType: 'verification', priority: (payload.criticality as string) === 'critical' ? 'critical' : 'high',
    entityType: 'bia_assessment', entityId: payload.entityId as string || '',
    triggerSource: 'bcp.bia_stale',
  });
}

async function handleIncidentEscalated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const incidentId = payload.entityId as string;
  const severity = payload.severity as string;

  await createProcessTask(tenantId, {
    title: `Governance escalation: Incident escalated (${severity})`,
    description: `An incident has been escalated. Board-level awareness and oversight may be required.`,
    taskType: 'verification',
    priority: severity === 'critical' ? 'critical' : 'high',
    entityType: 'incident',
    entityId: incidentId,
    triggerSource: 'incident.escalated',
  });
}

async function handleControlEffectivenessLow(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  await createProcessTask(tenantId, {
    title: `Governance alert: ${payload.failingControls} controls failing effectiveness`,
    description: `Controls are ineffective. Update governance health score and flag for board reporting.`,
    taskType: 'verification',
    priority: 'high',
    entityType: 'control',
    entityId: payload.entityId as string || '',
    triggerSource: 'controls.effectiveness_failed',
  });
}

async function handleRemediationOverdue(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const planId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Governance oversight: Remediation overdue`,
    description: `A remediation plan is overdue. Flag for governance committee review and escalation.`,
    taskType: 'verification',
    priority: 'high',
    entityType: 'remediation_plan',
    entityId: planId,
    triggerSource: 'remediation.overdue',
  });
}

// -- Phase 4 (F-030/F-033): Foundation role lifecycle ----------------------
//
// Governance must surface a board-visible review task whenever a privileged
// role is granted or revoked. Idempotency is enforced by the task store on
// (triggerSource, entityId).
async function handleFoundationRoleAssigned(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const roleCode = (payload.roleCode as string | undefined) ?? (event.entityId as string | undefined);
  if (!roleCode) return;
  await createProcessTask(tenantId, {
    title: `Governance review: role assigned (${roleCode})`,
    description: `A functional role was assigned. Update governance access posture and board reporting if the role is sensitive.`,
    taskType: 'governance_role_review',
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
    title: `Governance review: role unassigned (${roleCode})`,
    description: `A functional role was unassigned. Confirm orphan ownership, sign-off chains, and update governance health score.`,
    taskType: 'governance_role_review',
    priority: 'medium',
    entityType: 'role',
    entityId: roleCode,
    triggerSource: 'foundation.role.unassigned',
  });
}

async function handleWorkflowStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const entityType = payload.entityType as string;
  if (!entityType?.startsWith('governance')) return;
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[governance] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[governance] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('compliance.posture_changed', wrapHandler('handleCompliancePostureChanged', handleCompliancePostureChanged));
handlers.set('risk.assessment_completed', wrapHandler('handleRiskAssessmentCompleted', handleRiskAssessmentCompleted));
handlers.set('policy.approved', wrapHandler('handlePolicyApproved', handlePolicyApproved));
handlers.set('audit.engagement_completed', wrapHandler('handleAuditEngagementCompleted', handleAuditEngagementCompleted));
handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));
handlers.set('risk.exceeded_appetite', wrapHandler('handleRiskExceededAppetite', handleRiskExceededAppetite));
handlers.set('framework.gap_identified', wrapHandler('handleFrameworkGapIdentified', handleFrameworkGapIdentified));
handlers.set('incident.sla_breached', wrapHandler('handleIncidentSlaBreach', handleIncidentSlaBreach));
handlers.set('privacy.impact_high', wrapHandler('handlePrivacyImpactHigh', handlePrivacyImpactHigh));
handlers.set('bcp.rto_rpo_drift', wrapHandler('handleBcpRtoRpoDrift', handleBcpRtoRpoDrift));
handlers.set('bcp.crisis_readiness_low', wrapHandler('handleBcpCrisisReadinessLow', handleBcpCrisisReadinessLow));
handlers.set('bcp.maturity_regression', wrapHandler('handleBcpMaturityRegression', handleBcpMaturityRegression));
handlers.set('bcp.plan_stale', wrapHandler('handleBcpPlanStale', handleBcpPlanStale));
handlers.set('bcp.bia_stale', wrapHandler('handleBcpBiaStale', handleBcpBiaStale));
handlers.set('incident.escalated', wrapHandler('handleIncidentEscalated', handleIncidentEscalated));
handlers.set('controls.effectiveness_failed', wrapHandler('handleControlEffectivenessLow', handleControlEffectivenessLow));
handlers.set('remediation.overdue', wrapHandler('handleRemediationOverdue', handleRemediationOverdue));
handlers.set('foundation.role.assigned', wrapHandler('handleFoundationRoleAssigned', handleFoundationRoleAssigned));
handlers.set('foundation.role.unassigned', wrapHandler('handleFoundationRoleUnassigned', handleFoundationRoleUnassigned));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${GOVERNANCE_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerGovernanceEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `governance:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[governance] registered ${handlers.size} domain event subscribers`);
  registerNavigationIntegration('governance');
}

// ── Cross-module: governance-os, governance-ai, ksa-regulatory ──

function handleGovernanceOsFrameworkChange(event: PlatformEvent): void {
  if (!event.tenantId) return;
  logger.debug('[Governance] governance-os framework change', { tenantId: event.tenantId });
}

function handleGovernanceAiRecommendation(event: PlatformEvent): void {
  if (!event.tenantId) return;
  logger.debug('[Governance] governance-ai recommendation', { tenantId: event.tenantId });
}

function handleKsaRegulatoryPostureChange(event: PlatformEvent): void {
  if (!event.tenantId) return;
  logger.debug('[Governance] ksa-regulatory posture change', { tenantId: event.tenantId });
}

try {
  eventBus.subscribe('governance-os.framework.activated' as any, 'governance:governance-os.activated', (handleGovernanceOsFrameworkChange as any));
  eventBus.subscribe('governance-ai.pipeline' as any, 'governance:governance-ai.pipeline', (handleGovernanceAiRecommendation as any));
  eventBus.subscribe('ksa_regulatory.assessment_completed_processed' as any, 'governance:ksa-regulatory.assessed', (handleKsaRegulatoryPostureChange as any));
} catch { /* pass */ }

import { logger } from '../../ports/logger.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { createProcessTask } from '../../ports/lifecycle.port';
import { eventBus, type PlatformEvent } from '../../ports/events.port';
import { QIYAS_EVENT_CONTRACT } from './qiyas.events';
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
    await createProcessTask(tenantId, {
      title: `Qiyas: Compliance posture changed to ${newPosture}`,
      description: `Compliance posture has degraded. Re-run maturity assessment for framework ${frameworkCode || 'general'} to reflect updated baseline.`,
      taskType: 'qiyas_reassessment',
      priority: newPosture === 'non_compliant' ? 'high' : 'medium',
      entityType: 'compliance_posture',
      entityId: frameworkCode || 'general',
      triggerSource: 'compliance.posture_changed',
    });
  }
}

async function handleRiskAssessmentCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const riskId = payload.entityId as string;

  await createProcessTask(tenantId, {
    title: `Qiyas: Risk assessment completed — update maturity scores`,
    description: `A risk assessment has been completed. Review maturity scoring dimensions affected by risk assessment results.`,
    taskType: 'qiyas_score_review',
    priority: 'medium',
    entityType: 'risk_assessment',
    entityId: riskId,
    triggerSource: 'risk.assessment_completed',
  });
}

async function handleGovernanceHealthScoreUpdated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const healthScore = payload.healthScore as number || payload.score as number;
  const bodyId = payload.entityId as string;

  if ((healthScore ?? 100) < 60) {
    await createProcessTask(tenantId, {
      title: `Qiyas: Governance health score dropped below threshold`,
      description: `Governance health score is ${healthScore}. This may indicate maturity regression. Consider re-running Qiyas assessment.`,
      taskType: 'qiyas_reassessment',
      priority: 'high',
      entityType: 'governance_body',
      entityId: bodyId,
      triggerSource: 'governance.health_score_updated',
    });
  }
}

async function handleAuditEngagementCompleted(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const engagementId = payload.entityId as string;
  const findingsCount = payload.findingsCount as number || 0;

  if (findingsCount > 0) {
    await createProcessTask(tenantId, {
      title: `Qiyas: Audit engagement completed with ${findingsCount} findings`,
      description: `Audit engagement has completed. Findings may affect maturity scores. Review and update Qiyas assessment.`,
      taskType: 'qiyas_score_review',
      priority: findingsCount >= 5 ? 'high' : 'medium',
      entityType: 'audit_engagement',
      entityId: engagementId,
      triggerSource: 'audit.engagement_completed',
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

  if (!entityType?.startsWith('qiyas') || !entityId || !newStatus) return;

  await safeQuery(
    `UPDATE "${schema}".qiyas_assessments SET status = $1, updated_at = NOW() WHERE qiyas_assessment_id = $2 AND status != $1`,
    [newStatus, entityId],
  );
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[qiyas] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[qiyas] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('compliance.posture_changed', wrapHandler('handleCompliancePostureChanged', handleCompliancePostureChanged));
handlers.set('risk.assessment_completed', wrapHandler('handleRiskAssessmentCompleted', handleRiskAssessmentCompleted));
handlers.set('governance.health_score_updated', wrapHandler('handleGovernanceHealthScoreUpdated', handleGovernanceHealthScoreUpdated));
handlers.set('audit.engagement_completed', wrapHandler('handleAuditEngagementCompleted', handleAuditEngagementCompleted));
handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${QIYAS_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerQiyasEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `qiyas:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[qiyas] registered ${handlers.size} domain event subscribers`);
}

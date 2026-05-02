import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { AI_GOVERNANCE_EVENT_CONTRACT } from './ai-governance.events';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience/resilient-catch';
import { registerNavigationIntegration } from '@dos/platform-core/shell/navigation/navigation-integration';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function handleCompliancePostureChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);
  const newPosture = payload.newPosture as string || payload.posture as string;

  if (newPosture === 'non_compliant' || newPosture === 'at_risk') {
    const deployedSystems = await safeQuery(
      `SELECT id, name FROM "${schema}".ai_system_registry WHERE status = 'deployed' OR status = 'monitoring'`,
      [],
    );

    for (const sys of deployedSystems.rows) {
      await createProcessTask(tenantId, {
        title: `AI Governance: Compliance posture degraded — review AI system "${sys.name || sys.id}"`,
        description: `Compliance posture changed to ${newPosture}. Review deployed AI systems for regulatory alignment.`,
        taskType: 'ai_governance_review',
        priority: newPosture === 'non_compliant' ? 'high' : 'medium',
        entityType: 'ai_system',
        entityId: sys.id as string,
        triggerSource: 'compliance.posture_changed',
      });
    }
  }
}

async function handleRiskScoreChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);
  const riskId = payload.entityId as string || payload.riskId as string;
  const newScore = payload.newScore as number || payload.score as number;

  if ((newScore ?? 0) >= 15) {
    const linkedSystems = await safeQuery(
      `SELECT id, name FROM "${schema}".ai_system_registry
       WHERE metadata->>'linked_risk_id' = $1 OR risk_tier = 'high'
       LIMIT 10`,
      [riskId],
    );

    for (const sys of linkedSystems.rows) {
      await createProcessTask(tenantId, {
        title: `AI Governance: Risk score elevated for linked AI system`,
        description: `Risk score has reached ${newScore}. Review AI system "${sys.name || sys.id}" risk classification and controls.`,
        taskType: 'ai_governance_review',
        priority: 'high',
        entityType: 'ai_system',
        entityId: sys.id as string,
        triggerSource: 'risk.score_changed',
      });
    }
  }
}

async function handleAuditFindingCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const findingId = payload.entityId as string || payload.findingId as string;
  const severity = payload.severity as string || 'medium';

  await createProcessTask(tenantId, {
    title: `AI Governance: Audit finding may affect AI systems`,
    description: `An audit finding (${severity}) has been raised. Evaluate whether AI systems in scope require re-assessment.`,
    taskType: 'ai_governance_review',
    priority: severity === 'critical' ? 'critical' : 'high',
    entityType: 'audit_finding',
    entityId: findingId,
    triggerSource: 'audit.finding_created',
  });
}

async function handleWorkflowStatusChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId) return;
  const schema = tenantSchema(tenantId);
  const entityType = payload.entityType as string;
  const entityId = payload.entityId as string;
  const newStatus = payload.newState as string || payload.status as string;

  if (!entityType?.startsWith('ai_governance') && !entityType?.startsWith('ai-governance')) return;
  if (!entityId || !newStatus) return;

  await safeQuery(
    `UPDATE "${schema}".ai_system_registry SET status = $1, updated_at = NOW() WHERE id = $2 AND status != $1`,
    [newStatus, entityId],
  );
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[ai-governance] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[ai-governance] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('compliance.posture_changed', wrapHandler('handleCompliancePostureChanged', handleCompliancePostureChanged));
handlers.set('risk.score_changed', wrapHandler('handleRiskScoreChanged', handleRiskScoreChanged));
handlers.set('audit.finding_created', wrapHandler('handleAuditFindingCreated', handleAuditFindingCreated));
handlers.set('workflow.status_changed', wrapHandler('handleWorkflowStatusChanged', handleWorkflowStatusChanged));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${AI_GOVERNANCE_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerAiGovernanceEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `ai-governance:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[ai-governance] registered ${handlers.size} domain event subscribers`);
  registerNavigationIntegration('ai-governance');
}

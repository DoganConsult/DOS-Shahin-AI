import { logger } from '../ports/logger.port';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { PROACTIVE_LEADERSHIP_EVENT_CONTRACT } from './proactive-leadership.events';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

const reactiveCycleLock = new Set<string>();

async function triggerReactiveCycle(tenantId: string, triggerEvent: string): Promise<void> {
  if (reactiveCycleLock.has(tenantId)) return;
  reactiveCycleLock.add(tenantId);
  try {
    const { runProactiveLeadershipCycle } = await import('../services/proactive-leadership-engine.service.js');
    const result = await runProactiveLeadershipCycle(tenantId);
    logger.info(`[proactive-leadership] reactive cycle triggered by ${triggerEvent}: ${result.signalsDetected} signals, ${result.predictionsMade} predictions`, { tenantId });
  } catch (err) {
    logger.error(`[proactive-leadership] reactive cycle failed: ${(err as Error).message}`, { tenantId });
  } finally {
    setTimeout(() => reactiveCycleLock.delete(tenantId), 60_000);
  }
}

async function handleRiskExceededAppetite(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  if (!tenantId) return;
  await triggerReactiveCycle(tenantId, 'risk.exceeded_appetite');
}

async function handleIncidentSlaBreach(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  if (!tenantId) return;
  await triggerReactiveCycle(tenantId, 'incident.sla_breached');
}

async function handleBcpCrisisReadinessLow(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  if (!tenantId) return;
  await triggerReactiveCycle(tenantId, 'bcp.crisis_readiness_low');
}

async function handleControlEffectivenessLow(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  if (!tenantId) return;
  await triggerReactiveCycle(tenantId, 'control.effectiveness_low');
}

async function handleCompliancePostureChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const posturePercent = payload.posturePercent as number;
  if (posturePercent !== undefined && posturePercent < 50) {
    await triggerReactiveCycle(tenantId, 'compliance.posture_changed');
  }
}

async function handleBcpMaturityRegression(event: PlatformEvent): Promise<void> {
  const { tenantId } = event;
  if (!tenantId) return;
  await triggerReactiveCycle(tenantId, 'bcp.maturity_regression');
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[proactive-leadership] handled ${name}`, { tenantId: event.tenantId });
    } catch (err) {
      logger.error(`[proactive-leadership] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('risk.exceeded_appetite', wrapHandler('handleRiskExceededAppetite', handleRiskExceededAppetite));
handlers.set('incident.sla_breached', wrapHandler('handleIncidentSlaBreach', handleIncidentSlaBreach));
handlers.set('bcp.crisis_readiness_low', wrapHandler('handleBcpCrisisReadinessLow', handleBcpCrisisReadinessLow));
handlers.set('control.effectiveness_low', wrapHandler('handleControlEffectivenessLow', handleControlEffectivenessLow));
handlers.set('compliance.posture_changed', wrapHandler('handleCompliancePostureChanged', handleCompliancePostureChanged));
handlers.set('bcp.maturity_regression', wrapHandler('handleBcpMaturityRegression', handleBcpMaturityRegression));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${PROACTIVE_LEADERSHIP_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerProactiveLeadershipEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `proactive-leadership:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[proactive-leadership] registered ${handlers.size} domain event subscribers`);
}

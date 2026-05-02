import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { createProcessTask } from '../ports/lifecycle.port';
import { eventBus, type PlatformEvent } from '../ports/events.port';
import { REPORTING_EVENT_CONTRACT } from './reporting.events';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { registerNavigationIntegration } from '@dos/platform-core/shell/navigation/navigation-integration';

export type EventHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, EventHandler>();

async function handleRiskScoreChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const newScore = payload.newScore as number || payload.score as number;

  if ((newScore ?? 0) >= 15) {
    await safeQuery(
      `UPDATE "${schema}".reports
       SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{risk_data_stale}', 'true'::jsonb),
           updated_at = NOW()
       WHERE status IN ('draft', 'scheduled') AND report_type IN ('risk_summary', 'executive_dashboard', 'board_pack')`,
      [],
    );
  }
}

async function handlePostureChanged(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const _newPosture = payload.newPosture as string;

  await safeQuery(
    `UPDATE "${schema}".reports
     SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{compliance_data_stale}', 'true'::jsonb),
         updated_at = NOW()
     WHERE status IN ('draft', 'scheduled') AND report_type IN ('compliance_summary', 'executive_dashboard', 'board_pack')`,
    [],
  );
}

async function handleKpiSnapshot(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const schema = tenantSchema(tenantId);
  const snapshotId = payload.entityId as string;

  await safeQuery(
    `UPDATE "${schema}".reports
     SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{latest_kpi_snapshot}', $1::jsonb),
         updated_at = NOW()
     WHERE status = 'scheduled' AND report_type = 'executive_dashboard'`,
    [JSON.stringify(snapshotId)],
  );
}

async function handleAuditFinding(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const severity = payload.severity as string || 'medium';

  if (severity === 'critical' || severity === 'high') {
    await createProcessTask(tenantId, {
      title: `Reporting: Critical audit finding — regenerate affected reports`,
      description: `A ${severity} audit finding has been created. Scheduled reports containing audit data should be regenerated.`,
      taskType: 'report_regeneration',
      priority: 'high',
      entityType: 'audit_finding',
      entityId: payload.entityId as string,
      triggerSource: 'audit.finding_created',
    });
  }
}

async function handleIncidentCreated(event: PlatformEvent): Promise<void> {
  const { tenantId, payload } = event;
  if (!tenantId || !payload) return;
  const severity = payload.severity as string || 'medium';

  if (severity === 'critical') {
    await createProcessTask(tenantId, {
      title: `Reporting: Critical incident — board notification report needed`,
      description: `A critical incident has been classified. Generate incident summary report for board notification.`,
      taskType: 'report_generation',
      priority: 'critical',
      entityType: 'incident',
      entityId: payload.entityId as string,
      triggerSource: 'incident.classified',
    });
  }
}

function wrapHandler(name: string, fn: (event: PlatformEvent) => Promise<void>): EventHandler {
  return async (payload: Record<string, unknown>) => {
    const event = payload as unknown as PlatformEvent;
    try {
      await fn(event);
      logger.info(`[reporting] handled ${name}`, { tenantId: event.tenantId, entityId: event.entityId });
    } catch (err) {
      logger.error(`[reporting] handler ${name} failed: ${(err as Error).message}`, { tenantId: event.tenantId });
    }
  };
}

handlers.set('risk.score_changed', wrapHandler('handleRiskScoreChanged', handleRiskScoreChanged));
handlers.set('compliance.posture_changed', wrapHandler('handlePostureChanged', handlePostureChanged));
handlers.set('analytics.kpi_snapshot_generated', wrapHandler('handleKpiSnapshot', handleKpiSnapshot));
handlers.set('audit.finding_created', wrapHandler('handleAuditFinding', handleAuditFinding));
handlers.set('incident.classified', wrapHandler('handleIncidentCreated', handleIncidentCreated));

export function getSubscriptionHandlers(): Map<string, EventHandler> {
  return handlers;
}

export function subscribeAll(bus: { on(event: string, handler: EventHandler): void }): void {
  for (const [event, handler] of handlers) {
    bus.on(event, handler);
  }
  logger.info(`[${REPORTING_EVENT_CONTRACT.moduleCode}] subscribed to ${handlers.size} events`);
}

export function registerReportingEventSubscribers(): void {
  for (const [eventName, handler] of handlers) {
    eventBus.subscribe(eventName as string, `reporting:${eventName}`, async (event: PlatformEvent) => {
      await handler(event as unknown as Record<string, unknown>);
    });
  }
  logger.info(`[reporting] registered ${handlers.size} domain event subscribers`);
  registerNavigationIntegration('reporting');
}

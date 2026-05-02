import { eventBus } from '../ports/events.port';
import type { IntegrationsStatus } from '../types/integrations.types';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type IntegrationsEntityType = 'connector' | 'sync_job' | 'webhook' | 'mapping';
export type IntegrationsAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'assigned' | 'escalated' | 'approved' | 'rejected'
  | 'activated' | 'deactivated' | 'degraded' | 'recovered'
  | 'sync_started' | 'sync_completed' | 'sync_failed' | 'sync_retried'
  | 'webhook_registered' | 'webhook_triggered' | 'webhook_failed'
  | 'mapping_updated' | 'mapping_validated'
  | 'health_check_passed' | 'health_check_failed'
  | 'rate_limit_exceeded' | 'auth_expired'
  | 'bulk_updated' | 'exported';

export interface IntegrationsEventOptions {
  tenantId: string;
  entityType: IntegrationsEntityType;
  entityId: string;
  action: IntegrationsAction;
  triggeredBy: string;
  previousState?: IntegrationsStatus;
  newState?: IntegrationsStatus;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: IntegrationsAction): 'info' | 'warning' | 'critical' {
  if (act === 'sync_failed' || act === 'health_check_failed' || act === 'auth_expired') return 'critical';
  if (act === 'degraded' || act === 'rate_limit_exceeded' || act === 'webhook_failed' || act === 'sync_retried') return 'warning';
  return 'info';
}

export function emitIntegrationsEvent(opts: IntegrationsEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `integrations.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'integrations',
          severity: severityForAction(opts.action),
          payload: {
            entityType: opts.entityType,
            entityId: opts.entityId,
            action: opts.action,
            triggeredBy: opts.triggeredBy,
            correlationId,
            previousState: opts.previousState,
            newState: opts.newState,
            timestamp: new Date().toISOString(),
            eventVersion: 1,
            ...(opts.data || {}),
          },
        } as any));
  } catch {
  }
}

export function emitIntegrationsStatusChange(
  tenantId: string, entityType: IntegrationsEntityType, entityId: string,
  previousState: IntegrationsStatus, newState: IntegrationsStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitIntegrationsEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitSyncCompleted(tenantId: string, connectorId: string, recordsSynced: number, durationMs: number, triggeredBy: string): void {
  emitIntegrationsEvent({ tenantId, entityType: 'connector', entityId: connectorId, action: 'sync_completed', triggeredBy, data: { recordsSynced, durationMs } });
}

export function emitSyncFailed(tenantId: string, connectorId: string, error: string, retryCount: number, triggeredBy: string): void {
  emitIntegrationsEvent({ tenantId, entityType: 'connector', entityId: connectorId, action: 'sync_failed', triggeredBy, data: { error, retryCount } });
}

export function emitHealthCheckFailed(tenantId: string, connectorId: string, reason: string, triggeredBy: string): void {
  emitIntegrationsEvent({ tenantId, entityType: 'connector', entityId: connectorId, action: 'health_check_failed', triggeredBy, data: { reason } });
}

export function emitAuthExpired(tenantId: string, connectorId: string, provider: string, triggeredBy: string): void {
  emitIntegrationsEvent({ tenantId, entityType: 'connector', entityId: connectorId, action: 'auth_expired', triggeredBy, data: { provider } });
}

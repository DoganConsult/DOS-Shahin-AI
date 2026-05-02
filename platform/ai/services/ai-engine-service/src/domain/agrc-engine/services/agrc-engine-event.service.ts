import { eventBus } from '../ports/events.port';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type AgrcEngineEntityType = 'run' | 'result' | 'config' | 'telemetry' | 'ccm';
export type AgrcEngineAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'run_started' | 'run_completed' | 'run_failed' | 'config_changed'
  | 'telemetry_collected' | 'ccm_evaluated' | 'ccm_failed'
  | 'approved' | 'rejected' | 'escalated' | 'exported';

export interface AgrcEngineEventOptions {
  tenantId: string;
  entityType: AgrcEngineEntityType;
  entityId: string;
  action: AgrcEngineAction;
  triggeredBy: string;
  previousState?: string;
  newState?: string;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: AgrcEngineAction): 'info' | 'warning' | 'critical' {
  if (act === 'run_failed' || act === 'ccm_failed') return 'critical';
  if (act === 'config_changed' || act === 'escalated') return 'warning';
  return 'info';
}

export function emitAgrcEngineEvent(opts: AgrcEngineEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `agrc_engine.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'agrc-engine',
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

export function emitAgrcEngineStatusChange(
  tenantId: string, entityType: AgrcEngineEntityType, entityId: string,
  previousState: string, newState: string, triggeredBy: string,
  correlationId?: string,
): void {
  emitAgrcEngineEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitRunStarted(tenantId: string, runId: string, runType: string, triggeredBy: string): void {
  emitAgrcEngineEvent({ tenantId, entityType: 'run', entityId: runId, action: 'run_started', triggeredBy, data: { runType } });
}

export function emitRunFailed(tenantId: string, runId: string, errorReason: string, triggeredBy: string): void {
  emitAgrcEngineEvent({ tenantId, entityType: 'run', entityId: runId, action: 'run_failed', triggeredBy, data: { errorReason } });
}

export function emitConfigChanged(tenantId: string, configId: string, configKey: string, triggeredBy: string): void {
  emitAgrcEngineEvent({ tenantId, entityType: 'config', entityId: configId, action: 'config_changed', triggeredBy, data: { configKey } });
}

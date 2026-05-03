// @ts-nocheck
import { eventBus } from '../../ports/events.port';
import type { AiStatus } from '@dos/types';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type AiEntityType = 'agent' | 'task' | 'prompt' | 'conversation' | 'tool_invocation' | 'ai';
export type AiAction = 'created' | 'updated' | 'deleted' | 'status_changed' | 'assigned' | 'escalated' | 'approved' | 'rejected' | 'exported';

export interface AiEventOptions {
  tenantId: string;
  entityType: AiEntityType;
  entityId: string;
  action: AiAction;
  triggeredBy: string;
  previousState?: AiStatus;
  newState?: AiStatus;
  correlationId?: string;
  data?: Record<string, unknown>;
}

export function emitAiEvent(opts: AiEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `ai.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'ai',
          severity: 'info',
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
    // Non-critical: events are best-effort
  }
}

export function emitAiStatusChange(
  tenantId: string, entityType: AiEntityType, entityId: string,
  previousState: AiStatus, newState: AiStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitAiEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

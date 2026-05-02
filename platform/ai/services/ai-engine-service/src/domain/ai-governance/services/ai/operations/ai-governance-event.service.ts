// @ts-nocheck
import { eventBus } from '../../../ports/events.port';
import type { AiGovernanceStatus } from '@dos/types';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type AiGovernanceEntityType = 'model_registry' | 'prompt_registry' | 'ai_policy' | 'bias_assessment';
export type AiGovernanceAction = 'created' | 'updated' | 'deleted' | 'status_changed' | 'assigned' | 'escalated' | 'approved' | 'rejected' | 'exported';

export interface AiGovernanceEventOptions {
  tenantId: string;
  entityType: AiGovernanceEntityType;
  entityId: string;
  action: AiGovernanceAction;
  triggeredBy: string;
  previousState?: AiGovernanceStatus;
  newState?: AiGovernanceStatus;
  correlationId?: string;
  data?: Record<string, unknown>;
}

export function emitAiGovernanceEvent(opts: AiGovernanceEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `ai-governance.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'ai-governance',
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

export function emitAiGovernanceStatusChange(
  tenantId: string, entityType: AiGovernanceEntityType, entityId: string,
  previousState: AiGovernanceStatus, newState: AiGovernanceStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitAiGovernanceEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

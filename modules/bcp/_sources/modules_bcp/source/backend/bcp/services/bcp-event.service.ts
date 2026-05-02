import { eventBus } from '../ports/events.port';
import type { BcpStatus } from '../types/bcp.types';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type BcpEntityType = 'plan' | 'bia' | 'exercise' | 'recovery_strategy';
export type BcpAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'assigned' | 'reassigned'
  | 'approved' | 'rejected' | 'activated' | 'retired'
  | 'test_scheduled' | 'test_started' | 'test_passed' | 'test_failed'
  | 'exercise_completed' | 'exercise_results_recorded'
  | 'bia_completed' | 'bia_updated' | 'rto_rpo_set'
  | 'recovery_strategy_defined' | 'recovery_strategy_validated'
  | 'plan_invoked' | 'plan_deactivated'
  | 'escalated' | 'overdue_detected'
  | 'bulk_updated' | 'exported';

export interface BcpEventOptions {
  tenantId: string;
  entityType: BcpEntityType;
  entityId: string;
  action: BcpAction;
  triggeredBy: string;
  previousState?: BcpStatus;
  newState?: BcpStatus;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: BcpAction): 'info' | 'warning' | 'critical' {
  if (act === 'test_failed' || act === 'plan_invoked') return 'critical';
  if (act === 'overdue_detected' || act === 'escalated' || act === 'retired') return 'warning';
  return 'info';
}

export function emitBcpEvent(opts: BcpEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `bcp.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'bcp',
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

export function emitBcpStatusChange(
  tenantId: string, entityType: BcpEntityType, entityId: string,
  previousState: BcpStatus, newState: BcpStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitBcpEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitTestCompleted(tenantId: string, planId: string, testType: string, passed: boolean, triggeredBy: string): void {
  emitBcpEvent({ tenantId, entityType: 'exercise', entityId: planId, action: passed ? 'test_passed' : 'test_failed', triggeredBy, data: { testType, passed } });
}

export function emitPlanInvoked(tenantId: string, planId: string, activationTrigger: string, triggeredBy: string): void {
  emitBcpEvent({ tenantId, entityType: 'plan', entityId: planId, action: 'plan_invoked', triggeredBy, data: { activationTrigger } });
}

export function emitBiaCompleted(tenantId: string, biaId: string, planId: string, impactTier: string, triggeredBy: string): void {
  emitBcpEvent({ tenantId, entityType: 'bia', entityId: biaId, action: 'bia_completed', triggeredBy, data: { planId, impactTier } });
}

export function emitRtoRpoSet(tenantId: string, planId: string, rtoHours: number, rpoHours: number, triggeredBy: string): void {
  emitBcpEvent({ tenantId, entityType: 'plan', entityId: planId, action: 'rto_rpo_set', triggeredBy, data: { rtoHours, rpoHours } });
}

import { eventBus } from '../ports/events.port';
import type { TrainingStatus } from '@dos/types/training';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type TrainingEntityType = 'program' | 'course' | 'enrollment' | 'completion' | 'campaign';
export type TrainingAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'assigned' | 'escalated' | 'approved' | 'rejected'
  | 'published' | 'enrollment_opened' | 'enrollment_closed'
  | 'enrolled' | 'unenrolled' | 'completed' | 'failed'
  | 'quiz_submitted' | 'quiz_passed' | 'quiz_failed'
  | 'certificate_issued' | 'certificate_expired' | 'certificate_renewed'
  | 'campaign_launched' | 'campaign_completed'
  | 'overdue_flagged' | 'reminder_sent'
  | 'bulk_updated' | 'exported';

export interface TrainingEventOptions {
  tenantId: string;
  entityType: TrainingEntityType;
  entityId: string;
  action: TrainingAction;
  triggeredBy: string;
  previousState?: TrainingStatus;
  newState?: TrainingStatus;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: TrainingAction): 'info' | 'warning' | 'critical' {
  if (act === 'certificate_expired' || act === 'quiz_failed') return 'critical';
  if (act === 'overdue_flagged' || act === 'failed' || act === 'unenrolled') return 'warning';
  return 'info';
}

export function emitTrainingEvent(opts: TrainingEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `training.${opts.entityType}.${opts.action}` as string;
    eventBus.publish({
      eventType,
      tenantId: opts.tenantId,

      sourceService: 'training',
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
    });
  } catch {
  }
}

export function emitTrainingStatusChange(
  tenantId: string, entityType: TrainingEntityType, entityId: string,
  previousState: TrainingStatus, newState: TrainingStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitTrainingEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitCertificateExpired(tenantId: string, enrollmentId: string, userId: string, courseTitle: string, triggeredBy: string): void {
  emitTrainingEvent({ tenantId, entityType: 'completion', entityId: enrollmentId, action: 'certificate_expired', triggeredBy, data: { userId, courseTitle } });
}

export function emitOverdueFlagged(tenantId: string, programId: string, daysOverdue: number, triggeredBy: string): void {
  emitTrainingEvent({ tenantId, entityType: 'program', entityId: programId, action: 'overdue_flagged', triggeredBy, data: { daysOverdue } });
}

export function emitQuizPassed(tenantId: string, enrollmentId: string, score: number, passingScore: number, triggeredBy: string): void {
  emitTrainingEvent({ tenantId, entityType: 'enrollment', entityId: enrollmentId, action: 'quiz_passed', triggeredBy, data: { score, passingScore } });
}

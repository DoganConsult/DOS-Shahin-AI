import { eventBus } from '../../ports/events.port';
import type { ReportingStatus } from '@dos/types/reporting';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type ReportingEntityType = 'report' | 'template' | 'schedule' | 'distribution';

export type ReportingAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed' | 'bulk_updated'
  | 'report_scheduled' | 'report_generated' | 'report_failed' | 'report_exported' | 'report_shared'
  | 'report_approved' | 'report_rejected' | 'report_expired' | 'report_reopened'
  | 'generation_started' | 'generation_timeout' | 'generation_retried'
  | 'template_created' | 'template_updated' | 'template_deleted' | 'template_published'
  | 'schedule_activated' | 'schedule_paused' | 'schedule_triggered' | 'schedule_deactivated' | 'schedule_missed'
  | 'distribution_sent' | 'distribution_failed' | 'distribution_retried' | 'distribution_bounced'
  | 'assigned' | 'escalated' | 'exported';

export interface ReportingEventOptions {
  tenantId: string;
  entityType: ReportingEntityType;
  entityId: string;
  action: ReportingAction;
  triggeredBy: string;
  previousState?: ReportingStatus;
  newState?: ReportingStatus;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: ReportingAction): 'info' | 'warning' | 'critical' {
  if (act === 'report_failed' || act === 'generation_timeout' || act === 'distribution_failed' || act === 'schedule_missed') return 'critical';
  if (act === 'escalated' || act === 'report_expired' || act === 'distribution_bounced' || act === 'generation_retried') return 'warning';
  return 'info';
}

export function emitReportingEvent(opts: ReportingEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `reporting.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'reporting',
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

export function emitReportingStatusChange(
  tenantId: string, entityType: ReportingEntityType, entityId: string,
  previousState: ReportingStatus, newState: ReportingStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitReportingEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitReportCreated(tenantId: string, reportId: string, reportType: string, format: string, triggeredBy: string): void {
  emitReportingEvent({ tenantId, entityType: 'report', entityId: reportId, action: 'created', triggeredBy, data: { reportType, format } });
}

export function emitReportScheduled(tenantId: string, reportId: string, scheduleCron: string, triggeredBy: string): void {
  emitReportingEvent({ tenantId, entityType: 'report', entityId: reportId, action: 'report_scheduled', triggeredBy, data: { scheduleCron } });
}

export function emitGenerationStarted(tenantId: string, reportId: string, reportType: string, triggeredBy: string): void {
  emitReportingEvent({ tenantId, entityType: 'report', entityId: reportId, action: 'generation_started', triggeredBy, data: { reportType } });
}

export function emitReportGenerated(tenantId: string, reportId: string, reportType: string, format: string, generationMinutes: number, triggeredBy: string): void {
  emitReportingEvent({ tenantId, entityType: 'report', entityId: reportId, action: 'report_generated', triggeredBy, data: { reportType, format, generationMinutes } });
}

export function emitReportFailed(tenantId: string, reportId: string, reportType: string, errorMessage: string, triggeredBy: string, correlationId?: string): void {
  emitReportingEvent({ tenantId, entityType: 'report', entityId: reportId, action: 'report_failed', triggeredBy, correlationId, data: { reportType, errorMessage } });
}

export function emitGenerationTimeout(tenantId: string, reportId: string, minutesStuck: number, triggeredBy: string): void {
  emitReportingEvent({ tenantId, entityType: 'report', entityId: reportId, action: 'generation_timeout', triggeredBy, data: { minutesStuck } });
}

export function emitGenerationRetried(tenantId: string, reportId: string, retryCount: number, triggeredBy: string): void {
  emitReportingEvent({ tenantId, entityType: 'report', entityId: reportId, action: 'generation_retried', triggeredBy, data: { retryCount } });
}

export function emitReportExported(tenantId: string, reportId: string, format: string, exportedBy: string): void {
  emitReportingEvent({ tenantId, entityType: 'report', entityId: reportId, action: 'report_exported', triggeredBy: exportedBy, data: { format } });
}

export function emitReportShared(tenantId: string, reportId: string, recipientCount: number, sharedBy: string): void {
  emitReportingEvent({ tenantId, entityType: 'report', entityId: reportId, action: 'report_shared', triggeredBy: sharedBy, data: { recipientCount } });
}

export function emitReportApproved(tenantId: string, reportId: string, approvedBy: string): void {
  emitReportingEvent({ tenantId, entityType: 'report', entityId: reportId, action: 'report_approved', triggeredBy: approvedBy });
}

export function emitReportRejected(tenantId: string, reportId: string, rejectedBy: string, reason: string): void {
  emitReportingEvent({ tenantId, entityType: 'report', entityId: reportId, action: 'report_rejected', triggeredBy: rejectedBy, data: { reason } });
}

export function emitReportExpired(tenantId: string, reportId: string, reportType: string, triggeredBy: string): void {
  emitReportingEvent({ tenantId, entityType: 'report', entityId: reportId, action: 'report_expired', triggeredBy, data: { reportType } });
}

export function emitTemplateCreated(tenantId: string, templateId: string, templateCode: string, createdBy: string): void {
  emitReportingEvent({ tenantId, entityType: 'template', entityId: templateId, action: 'template_created', triggeredBy: createdBy, data: { templateCode } });
}

export function emitTemplateUpdated(tenantId: string, templateId: string, updatedBy: string): void {
  emitReportingEvent({ tenantId, entityType: 'template', entityId: templateId, action: 'template_updated', triggeredBy: updatedBy });
}

export function emitTemplatePublished(tenantId: string, templateId: string, publishedBy: string): void {
  emitReportingEvent({ tenantId, entityType: 'template', entityId: templateId, action: 'template_published', triggeredBy: publishedBy });
}

export function emitScheduleActivated(tenantId: string, scheduleId: string, cron: string, activatedBy: string): void {
  emitReportingEvent({ tenantId, entityType: 'schedule', entityId: scheduleId, action: 'schedule_activated', triggeredBy: activatedBy, data: { cron } });
}

export function emitSchedulePaused(tenantId: string, scheduleId: string, pausedBy: string, reason?: string): void {
  emitReportingEvent({ tenantId, entityType: 'schedule', entityId: scheduleId, action: 'schedule_paused', triggeredBy: pausedBy, data: { reason } });
}

export function emitScheduleTriggered(tenantId: string, scheduleId: string, reportId: string, triggeredBy: string): void {
  emitReportingEvent({ tenantId, entityType: 'schedule', entityId: scheduleId, action: 'schedule_triggered', triggeredBy, data: { reportId } });
}

export function emitScheduleDeactivated(tenantId: string, scheduleId: string, deactivatedBy: string): void {
  emitReportingEvent({ tenantId, entityType: 'schedule', entityId: scheduleId, action: 'schedule_deactivated', triggeredBy: deactivatedBy });
}

export function emitScheduleMissed(tenantId: string, scheduleId: string, expectedAt: string, triggeredBy: string): void {
  emitReportingEvent({ tenantId, entityType: 'schedule', entityId: scheduleId, action: 'schedule_missed', triggeredBy, data: { expectedAt } });
}

export function emitDistributionSent(tenantId: string, distributionId: string, recipientCount: number, method: string, triggeredBy: string): void {
  emitReportingEvent({ tenantId, entityType: 'distribution', entityId: distributionId, action: 'distribution_sent', triggeredBy, data: { recipientCount, method } });
}

export function emitDistributionFailed(tenantId: string, distributionId: string, method: string, errorMessage: string, triggeredBy: string): void {
  emitReportingEvent({ tenantId, entityType: 'distribution', entityId: distributionId, action: 'distribution_failed', triggeredBy, data: { method, errorMessage } });
}

export function emitDistributionRetried(tenantId: string, distributionId: string, retryCount: number, triggeredBy: string): void {
  emitReportingEvent({ tenantId, entityType: 'distribution', entityId: distributionId, action: 'distribution_retried', triggeredBy, data: { retryCount } });
}

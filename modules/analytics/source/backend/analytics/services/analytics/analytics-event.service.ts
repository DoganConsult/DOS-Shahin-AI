import { eventBus } from '../../ports/events.port';
import type { AnalyticsStatus } from '@dos/types/analytics';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type AnalyticsEntityType =
  | 'dashboard'
  | 'widget'
  | 'kpi'
  | 'report_snapshot'
  | 'data_source'
  | 'kpi_threshold';

export type AnalyticsAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'status_changed'
  | 'published'
  | 'deprecated'
  | 'archived'
  | 'shared'
  | 'cloned'
  | 'exported'
  | 'widget_added'
  | 'widget_removed'
  | 'widget_refreshed'
  | 'widget_refresh_failed'
  | 'widget_config_changed'
  | 'kpi_threshold_breached'
  | 'kpi_target_met'
  | 'kpi_recalculated'
  | 'report_generated'
  | 'report_scheduled'
  | 'report_exported'
  | 'data_source_connected'
  | 'data_source_disconnected'
  | 'data_source_refresh_failed'
  | 'access_granted'
  | 'access_revoked'
  | 'escalated';

export type AnalyticsEventSeverity = 'info' | 'warning' | 'critical';

const ACTION_SEVERITY_MAP: Record<AnalyticsAction, AnalyticsEventSeverity> = {
  created: 'info',
  updated: 'info',
  deleted: 'warning',
  status_changed: 'info',
  published: 'info',
  deprecated: 'warning',
  archived: 'info',
  shared: 'info',
  cloned: 'info',
  exported: 'info',
  escalated: 'warning',
  widget_added: 'info',
  widget_removed: 'warning',
  widget_refreshed: 'info',
  widget_refresh_failed: 'warning',
  widget_config_changed: 'info',
  kpi_threshold_breached: 'critical',
  kpi_target_met: 'info',
  kpi_recalculated: 'info',
  report_generated: 'info',
  report_scheduled: 'info',
  report_exported: 'info',
  data_source_connected: 'info',
  data_source_disconnected: 'warning',
  data_source_refresh_failed: 'warning',
  access_granted: 'info',
  access_revoked: 'warning',
};

export interface AnalyticsEventOptions {
  tenantId: string;
  entityType: AnalyticsEntityType;
  entityId: string;
  action: AnalyticsAction;
  triggeredBy: string;
  previousState?: AnalyticsStatus;
  newState?: AnalyticsStatus;
  correlationId?: string;
  data?: Record<string, unknown>;
}

export function emitAnalyticsEvent(opts: AnalyticsEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `analytics.${opts.entityType}.${opts.action}` as string;
    const severity = ACTION_SEVERITY_MAP[opts.action] ?? 'info';
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'analytics',
          severity,
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

export function emitAnalyticsStatusChange(
  tenantId: string,
  entityType: AnalyticsEntityType,
  entityId: string,
  previousState: AnalyticsStatus,
  newState: AnalyticsStatus,
  triggeredBy: string,
  correlationId?: string,
): void {
  emitAnalyticsEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitDashboardPublished(
  tenantId: string, dashboardId: string, triggeredBy: string,
  data?: { dashboardType?: string; widgetCount?: number; sharedWithTeamIds?: string[] },
): void {
  emitAnalyticsEvent({ tenantId, entityType: 'dashboard', entityId: dashboardId, action: 'published', triggeredBy, data });
}

export function emitDashboardShared(
  tenantId: string, dashboardId: string, triggeredBy: string,
  data: { sharedWithUserId?: string; sharedWithTeamId?: string; visibility?: string },
): void {
  emitAnalyticsEvent({ tenantId, entityType: 'dashboard', entityId: dashboardId, action: 'shared', triggeredBy, data });
}

export function emitDashboardCloned(
  tenantId: string, sourceDashboardId: string, newDashboardId: string, triggeredBy: string,
): void {
  emitAnalyticsEvent({
    tenantId,
    entityType: 'dashboard',
    entityId: newDashboardId,
    action: 'cloned',
    triggeredBy,
    data: { sourceDashboardId },
  });
}

export function emitWidgetAdded(
  tenantId: string, dashboardId: string, widgetId: string, triggeredBy: string,
  data?: { widgetType?: string; dataSource?: string },
): void {
  emitAnalyticsEvent({ tenantId, entityType: 'widget', entityId: widgetId, action: 'widget_added', triggeredBy, data: { dashboardId, ...data } });
}

export function emitWidgetRemoved(
  tenantId: string, dashboardId: string, widgetId: string, triggeredBy: string,
): void {
  emitAnalyticsEvent({ tenantId, entityType: 'widget', entityId: widgetId, action: 'widget_removed', triggeredBy, data: { dashboardId } });
}

export function emitWidgetRefreshed(
  tenantId: string, widgetId: string, triggeredBy: string,
  data?: { durationMs?: number; rowCount?: number; dataSource?: string },
): void {
  emitAnalyticsEvent({ tenantId, entityType: 'widget', entityId: widgetId, action: 'widget_refreshed', triggeredBy, data });
}

export function emitWidgetRefreshFailed(
  tenantId: string, widgetId: string, triggeredBy: string,
  data: { errorMessage: string; dataSource?: string; consecutiveFailures?: number },
): void {
  emitAnalyticsEvent({ tenantId, entityType: 'widget', entityId: widgetId, action: 'widget_refresh_failed', triggeredBy, data });
}

export function emitKpiThresholdBreached(
  tenantId: string, kpiId: string, triggeredBy: string,
  data: { metricCode: string; currentValue: number; threshold: number; moduleCode?: string },
): void {
  emitAnalyticsEvent({ tenantId, entityType: 'kpi_threshold', entityId: kpiId, action: 'kpi_threshold_breached', triggeredBy, data });
}

export function emitKpiTargetMet(
  tenantId: string, kpiId: string, triggeredBy: string,
  data: { metricCode: string; currentValue: number; target: number; period?: string },
): void {
  emitAnalyticsEvent({ tenantId, entityType: 'kpi', entityId: kpiId, action: 'kpi_target_met', triggeredBy, data });
}

export function emitKpiRecalculated(
  tenantId: string, kpiId: string, triggeredBy: string,
  data: { metricCode: string; previousValue?: number; newValue: number; period: string },
): void {
  emitAnalyticsEvent({ tenantId, entityType: 'kpi', entityId: kpiId, action: 'kpi_recalculated', triggeredBy, data });
}

export function emitReportGenerated(
  tenantId: string, reportId: string, triggeredBy: string,
  data?: { dashboardId?: string; format?: string; rowCount?: number; generationMs?: number },
): void {
  emitAnalyticsEvent({ tenantId, entityType: 'report_snapshot', entityId: reportId, action: 'report_generated', triggeredBy, data });
}

export function emitReportScheduled(
  tenantId: string, reportId: string, triggeredBy: string,
  data?: { dashboardId?: string; cronExpression?: string; format?: string; recipients?: string[] },
): void {
  emitAnalyticsEvent({ tenantId, entityType: 'report_snapshot', entityId: reportId, action: 'report_scheduled', triggeredBy, data });
}

export function emitReportExported(
  tenantId: string, reportId: string, triggeredBy: string,
  data?: { format?: string; rowCount?: number; fileSizeBytes?: number },
): void {
  emitAnalyticsEvent({ tenantId, entityType: 'report_snapshot', entityId: reportId, action: 'report_exported', triggeredBy, data });
}

export function emitDataSourceConnected(
  tenantId: string, dataSourceId: string, triggeredBy: string,
  data?: { dataSourceType?: string; moduleCode?: string },
): void {
  emitAnalyticsEvent({ tenantId, entityType: 'data_source', entityId: dataSourceId, action: 'data_source_connected', triggeredBy, data });
}

export function emitDataSourceDisconnected(
  tenantId: string, dataSourceId: string, triggeredBy: string,
  data?: { dataSourceType?: string; reason?: string; affectedWidgets?: number },
): void {
  emitAnalyticsEvent({ tenantId, entityType: 'data_source', entityId: dataSourceId, action: 'data_source_disconnected', triggeredBy, data });
}

export function emitDataSourceRefreshFailed(
  tenantId: string, dataSourceId: string, triggeredBy: string,
  data: { dataSourceType?: string; errorMessage: string; affectedWidgets?: number },
): void {
  emitAnalyticsEvent({ tenantId, entityType: 'data_source', entityId: dataSourceId, action: 'data_source_refresh_failed', triggeredBy, data });
}

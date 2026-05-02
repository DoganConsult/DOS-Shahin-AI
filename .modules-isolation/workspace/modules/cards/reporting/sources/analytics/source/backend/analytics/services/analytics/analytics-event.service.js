"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitAnalyticsEvent = emitAnalyticsEvent;
exports.emitAnalyticsStatusChange = emitAnalyticsStatusChange;
exports.emitDashboardPublished = emitDashboardPublished;
exports.emitDashboardShared = emitDashboardShared;
exports.emitDashboardCloned = emitDashboardCloned;
exports.emitWidgetAdded = emitWidgetAdded;
exports.emitWidgetRemoved = emitWidgetRemoved;
exports.emitWidgetRefreshed = emitWidgetRefreshed;
exports.emitWidgetRefreshFailed = emitWidgetRefreshFailed;
exports.emitKpiThresholdBreached = emitKpiThresholdBreached;
exports.emitKpiTargetMet = emitKpiTargetMet;
exports.emitKpiRecalculated = emitKpiRecalculated;
exports.emitReportGenerated = emitReportGenerated;
exports.emitReportScheduled = emitReportScheduled;
exports.emitReportExported = emitReportExported;
exports.emitDataSourceConnected = emitDataSourceConnected;
exports.emitDataSourceDisconnected = emitDataSourceDisconnected;
exports.emitDataSourceRefreshFailed = emitDataSourceRefreshFailed;
const events_port_1 = require("../../ports/events.port");
const crypto_1 = require("crypto");
const ACTION_SEVERITY_MAP = {
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
function emitAnalyticsEvent(opts) {
    try {
        const correlationId = opts.correlationId || (0, crypto_1.randomUUID)();
        const eventType = `analytics.${opts.entityType}.${opts.action}`;
        const severity = ACTION_SEVERITY_MAP[opts.action] ?? 'info';
        events_port_1.eventBus.publish({
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
        });
    }
    catch {
        // Non-critical: events are best-effort
    }
}
function emitAnalyticsStatusChange(tenantId, entityType, entityId, previousState, newState, triggeredBy, correlationId) {
    emitAnalyticsEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}
function emitDashboardPublished(tenantId, dashboardId, triggeredBy, data) {
    emitAnalyticsEvent({ tenantId, entityType: 'dashboard', entityId: dashboardId, action: 'published', triggeredBy, data });
}
function emitDashboardShared(tenantId, dashboardId, triggeredBy, data) {
    emitAnalyticsEvent({ tenantId, entityType: 'dashboard', entityId: dashboardId, action: 'shared', triggeredBy, data });
}
function emitDashboardCloned(tenantId, sourceDashboardId, newDashboardId, triggeredBy) {
    emitAnalyticsEvent({
        tenantId,
        entityType: 'dashboard',
        entityId: newDashboardId,
        action: 'cloned',
        triggeredBy,
        data: { sourceDashboardId },
    });
}
function emitWidgetAdded(tenantId, dashboardId, widgetId, triggeredBy, data) {
    emitAnalyticsEvent({ tenantId, entityType: 'widget', entityId: widgetId, action: 'widget_added', triggeredBy, data: { dashboardId, ...data } });
}
function emitWidgetRemoved(tenantId, dashboardId, widgetId, triggeredBy) {
    emitAnalyticsEvent({ tenantId, entityType: 'widget', entityId: widgetId, action: 'widget_removed', triggeredBy, data: { dashboardId } });
}
function emitWidgetRefreshed(tenantId, widgetId, triggeredBy, data) {
    emitAnalyticsEvent({ tenantId, entityType: 'widget', entityId: widgetId, action: 'widget_refreshed', triggeredBy, data });
}
function emitWidgetRefreshFailed(tenantId, widgetId, triggeredBy, data) {
    emitAnalyticsEvent({ tenantId, entityType: 'widget', entityId: widgetId, action: 'widget_refresh_failed', triggeredBy, data });
}
function emitKpiThresholdBreached(tenantId, kpiId, triggeredBy, data) {
    emitAnalyticsEvent({ tenantId, entityType: 'kpi_threshold', entityId: kpiId, action: 'kpi_threshold_breached', triggeredBy, data });
}
function emitKpiTargetMet(tenantId, kpiId, triggeredBy, data) {
    emitAnalyticsEvent({ tenantId, entityType: 'kpi', entityId: kpiId, action: 'kpi_target_met', triggeredBy, data });
}
function emitKpiRecalculated(tenantId, kpiId, triggeredBy, data) {
    emitAnalyticsEvent({ tenantId, entityType: 'kpi', entityId: kpiId, action: 'kpi_recalculated', triggeredBy, data });
}
function emitReportGenerated(tenantId, reportId, triggeredBy, data) {
    emitAnalyticsEvent({ tenantId, entityType: 'report_snapshot', entityId: reportId, action: 'report_generated', triggeredBy, data });
}
function emitReportScheduled(tenantId, reportId, triggeredBy, data) {
    emitAnalyticsEvent({ tenantId, entityType: 'report_snapshot', entityId: reportId, action: 'report_scheduled', triggeredBy, data });
}
function emitReportExported(tenantId, reportId, triggeredBy, data) {
    emitAnalyticsEvent({ tenantId, entityType: 'report_snapshot', entityId: reportId, action: 'report_exported', triggeredBy, data });
}
function emitDataSourceConnected(tenantId, dataSourceId, triggeredBy, data) {
    emitAnalyticsEvent({ tenantId, entityType: 'data_source', entityId: dataSourceId, action: 'data_source_connected', triggeredBy, data });
}
function emitDataSourceDisconnected(tenantId, dataSourceId, triggeredBy, data) {
    emitAnalyticsEvent({ tenantId, entityType: 'data_source', entityId: dataSourceId, action: 'data_source_disconnected', triggeredBy, data });
}
function emitDataSourceRefreshFailed(tenantId, dataSourceId, triggeredBy, data) {
    emitAnalyticsEvent({ tenantId, entityType: 'data_source', entityId: dataSourceId, action: 'data_source_refresh_failed', triggeredBy, data });
}
//# sourceMappingURL=analytics-event.service.js.map
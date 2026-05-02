import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPublish = vi.fn();
vi.mock('../../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: (...args: unknown[]) => mockPublish(...args) },
}));

import {
  emitAnalyticsEvent,
  emitAnalyticsStatusChange,
  emitDashboardPublished,
  emitDashboardShared,
  emitDashboardCloned,
  emitWidgetAdded,
  emitWidgetRemoved,
  emitWidgetRefreshed,
  emitWidgetRefreshFailed,
  emitKpiThresholdBreached,
  emitKpiTargetMet,
  emitKpiRecalculated,
  emitReportGenerated,
  emitDataSourceConnected,
  emitDataSourceDisconnected,
  emitDataSourceRefreshFailed,
} from './analytics-event.service';

const TENANT = 'test-tenant';
const USER = 'user-001';

describe('AnalyticsEventService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitAnalyticsEvent()', () => {
    it('publishes event with correct structure', () => {
      emitAnalyticsEvent({ tenantId: TENANT, entityType: 'dashboard', entityId: 'd-1', action: 'created', triggeredBy: USER });
      expect(mockPublish).toHaveBeenCalledTimes(1);
      const call = mockPublish.mock.calls[0][0];
      expect(call.eventType).toBe('analytics.dashboard.created');
      expect(call.tenantId).toBe(TENANT);
      expect(call.sourceService).toBe('analytics');
      expect(call.payload.entityType).toBe('dashboard');
      expect(call.payload.entityId).toBe('d-1');
      expect(call.payload.eventVersion).toBe(1);
    });

    it('assigns info severity for created action', () => {
      emitAnalyticsEvent({ tenantId: TENANT, entityType: 'dashboard', entityId: 'd-1', action: 'created', triggeredBy: USER });
      expect(mockPublish.mock.calls[0][0].severity).toBe('info');
    });

    it('assigns critical severity for kpi_threshold_breached', () => {
      emitAnalyticsEvent({ tenantId: TENANT, entityType: 'kpi_threshold', entityId: 'k-1', action: 'kpi_threshold_breached', triggeredBy: USER });
      expect(mockPublish.mock.calls[0][0].severity).toBe('critical');
    });

    it('assigns warning severity for deleted action', () => {
      emitAnalyticsEvent({ tenantId: TENANT, entityType: 'dashboard', entityId: 'd-1', action: 'deleted', triggeredBy: USER });
      expect(mockPublish.mock.calls[0][0].severity).toBe('warning');
    });

    it('generates correlationId when not provided', () => {
      emitAnalyticsEvent({ tenantId: TENANT, entityType: 'dashboard', entityId: 'd-1', action: 'created', triggeredBy: USER });
      expect(mockPublish.mock.calls[0][0].payload.correlationId).toBeDefined();
    });

    it('uses provided correlationId', () => {
      emitAnalyticsEvent({ tenantId: TENANT, entityType: 'dashboard', entityId: 'd-1', action: 'created', triggeredBy: USER, correlationId: 'cor-99' });
      expect(mockPublish.mock.calls[0][0].payload.correlationId).toBe('cor-99');
    });

    it('includes previousState and newState when provided', () => {
      emitAnalyticsEvent({ tenantId: TENANT, entityType: 'dashboard', entityId: 'd-1', action: 'status_changed', triggeredBy: USER, previousState: 'draft' as any, newState: 'active' as any });
      const payload = mockPublish.mock.calls[0][0].payload;
      expect(payload.previousState).toBe('draft');
      expect(payload.newState).toBe('active');
    });

    it('does not throw when eventBus.publish throws', () => {
      mockPublish.mockImplementationOnce(() => { throw new Error('bus down'); });
      expect(() => emitAnalyticsEvent({ tenantId: TENANT, entityType: 'dashboard', entityId: 'd-1', action: 'created', triggeredBy: USER })).not.toThrow();
    });
  });

  describe('convenience helpers', () => {
    it('emitAnalyticsStatusChange publishes status_changed', () => {
      emitAnalyticsStatusChange(TENANT, 'dashboard', 'd-1', 'draft' as any, 'active' as any, USER);
      expect(mockPublish.mock.calls[0][0].payload.action).toBe('status_changed');
    });

    it('emitDashboardPublished publishes published action', () => {
      emitDashboardPublished(TENANT, 'd-1', USER);
      expect(mockPublish.mock.calls[0][0].eventType).toBe('analytics.dashboard.published');
    });

    it('emitDashboardShared includes sharing data', () => {
      emitDashboardShared(TENANT, 'd-1', USER, { sharedWithUserId: 'u-2', visibility: 'team' });
      expect(mockPublish.mock.calls[0][0].payload.sharedWithUserId).toBe('u-2');
    });

    it('emitDashboardCloned includes sourceDashboardId', () => {
      emitDashboardCloned(TENANT, 'd-src', 'd-new', USER);
      expect(mockPublish.mock.calls[0][0].payload.sourceDashboardId).toBe('d-src');
    });

    it('emitWidgetAdded includes dashboardId', () => {
      emitWidgetAdded(TENANT, 'd-1', 'w-1', USER);
      expect(mockPublish.mock.calls[0][0].payload.dashboardId).toBe('d-1');
    });

    it('emitWidgetRemoved publishes widget_removed', () => {
      emitWidgetRemoved(TENANT, 'd-1', 'w-1', USER);
      expect(mockPublish.mock.calls[0][0].eventType).toBe('analytics.widget.widget_removed');
    });

    it('emitWidgetRefreshed publishes widget_refreshed', () => {
      emitWidgetRefreshed(TENANT, 'w-1', USER, { durationMs: 120 });
      expect(mockPublish.mock.calls[0][0].payload.durationMs).toBe(120);
    });

    it('emitWidgetRefreshFailed includes error data', () => {
      emitWidgetRefreshFailed(TENANT, 'w-1', USER, { errorMessage: 'timeout' });
      expect(mockPublish.mock.calls[0][0].payload.errorMessage).toBe('timeout');
    });

    it('emitKpiThresholdBreached includes threshold data', () => {
      emitKpiThresholdBreached(TENANT, 'k-1', USER, { metricCode: 'm1', currentValue: 90, threshold: 80 });
      expect(mockPublish.mock.calls[0][0].payload.threshold).toBe(80);
    });

    it('emitKpiTargetMet includes target data', () => {
      emitKpiTargetMet(TENANT, 'k-1', USER, { metricCode: 'm1', currentValue: 100, target: 95 });
      expect(mockPublish.mock.calls[0][0].payload.target).toBe(95);
    });

    it('emitKpiRecalculated includes period', () => {
      emitKpiRecalculated(TENANT, 'k-1', USER, { metricCode: 'm1', newValue: 50, period: 'Q1' });
      expect(mockPublish.mock.calls[0][0].payload.period).toBe('Q1');
    });

    it('emitReportGenerated publishes report_generated', () => {
      emitReportGenerated(TENANT, 'r-1', USER);
      expect(mockPublish.mock.calls[0][0].eventType).toBe('analytics.report_snapshot.report_generated');
    });

    it('emitDataSourceConnected publishes data_source_connected', () => {
      emitDataSourceConnected(TENANT, 'ds-1', USER);
      expect(mockPublish.mock.calls[0][0].eventType).toBe('analytics.data_source.data_source_connected');
    });

    it('emitDataSourceDisconnected publishes data_source_disconnected', () => {
      emitDataSourceDisconnected(TENANT, 'ds-1', USER);
      expect(mockPublish.mock.calls[0][0].eventType).toBe('analytics.data_source.data_source_disconnected');
    });

    it('emitDataSourceRefreshFailed includes error', () => {
      emitDataSourceRefreshFailed(TENANT, 'ds-1', USER, { errorMessage: 'conn lost' });
      expect(mockPublish.mock.calls[0][0].payload.errorMessage).toBe('conn lost');
    });
  });
});

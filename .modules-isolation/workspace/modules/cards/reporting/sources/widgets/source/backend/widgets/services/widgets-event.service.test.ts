import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPublish = vi.fn();
vi.mock('../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: (...args: unknown[]) => mockPublish(...args) },
}));

import {
  emitWidgetsEvent,
  emitWidgetsStatusChange,
  emitWidgetPublished,
  emitWidgetDataRefreshed,
  emitBundleActivated,
  emitRenderFailed,
} from './widgets-event.service';

const TENANT = 'test-tenant';
const USER = 'user-001';

describe('WidgetsEventService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('emitWidgetsEvent()', () => {
    it('publishes with correct structure', () => {
      emitWidgetsEvent({ tenantId: TENANT, entityType: 'widget', entityId: 'w-1', action: 'created', triggeredBy: USER });
      const call = mockPublish.mock.calls[0][0];
      expect(call.eventType).toBe('widgets.widget.created');
      expect(call.sourceService).toBe('widgets');
      expect(call.payload.eventVersion).toBe(1);
    });

    it('assigns critical severity for render_failed', () => {
      emitWidgetsEvent({ tenantId: TENANT, entityType: 'render', entityId: 'w-1', action: 'render_failed', triggeredBy: USER });
      expect(mockPublish.mock.calls[0][0].severity).toBe('critical');
    });

    it('assigns critical severity for data_disconnected', () => {
      emitWidgetsEvent({ tenantId: TENANT, entityType: 'data_source', entityId: 'ds-1', action: 'data_disconnected', triggeredBy: USER });
      expect(mockPublish.mock.calls[0][0].severity).toBe('critical');
    });

    it('assigns warning severity for data_stale', () => {
      emitWidgetsEvent({ tenantId: TENANT, entityType: 'data_source', entityId: 'ds-1', action: 'data_stale', triggeredBy: USER });
      expect(mockPublish.mock.calls[0][0].severity).toBe('warning');
    });

    it('assigns warning severity for suspended', () => {
      emitWidgetsEvent({ tenantId: TENANT, entityType: 'widget', entityId: 'w-1', action: 'suspended', triggeredBy: USER });
      expect(mockPublish.mock.calls[0][0].severity).toBe('warning');
    });

    it('assigns info severity for created', () => {
      emitWidgetsEvent({ tenantId: TENANT, entityType: 'widget', entityId: 'w-1', action: 'created', triggeredBy: USER });
      expect(mockPublish.mock.calls[0][0].severity).toBe('info');
    });

    it('does not throw on publish error', () => {
      mockPublish.mockImplementationOnce(() => { throw new Error('down'); });
      expect(() => emitWidgetsEvent({ tenantId: TENANT, entityType: 'widget', entityId: 'w-1', action: 'created', triggeredBy: USER })).not.toThrow();
    });

    it('generates correlationId when not provided', () => {
      emitWidgetsEvent({ tenantId: TENANT, entityType: 'widget', entityId: 'w-1', action: 'created', triggeredBy: USER });
      expect(mockPublish.mock.calls[0][0].payload.correlationId).toBeDefined();
    });
  });

  describe('convenience helpers', () => {
    it('emitWidgetsStatusChange publishes status_changed', () => {
      emitWidgetsStatusChange(TENANT, 'widget', 'w-1', 'draft', 'active', USER);
      expect(mockPublish.mock.calls[0][0].payload.action).toBe('status_changed');
    });

    it('emitWidgetPublished publishes published', () => {
      emitWidgetPublished(TENANT, 'w-1', USER);
      expect(mockPublish.mock.calls[0][0].eventType).toBe('widgets.widget.published');
    });

    it('emitWidgetDataRefreshed includes dataSourceId', () => {
      emitWidgetDataRefreshed(TENANT, 'w-1', 'ds-1', USER);
      expect(mockPublish.mock.calls[0][0].payload.dataSourceId).toBe('ds-1');
    });

    it('emitBundleActivated includes widgetCount', () => {
      emitBundleActivated(TENANT, 'b-1', 5, USER);
      expect(mockPublish.mock.calls[0][0].payload.widgetCount).toBe(5);
    });

    it('emitRenderFailed includes errorReason', () => {
      emitRenderFailed(TENANT, 'w-1', 'timeout', USER);
      expect(mockPublish.mock.calls[0][0].payload.errorReason).toBe('timeout');
    });
  });
});

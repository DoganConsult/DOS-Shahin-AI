import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPublish = vi.fn();
vi.mock('../../platform/services/event/event-bus.service', () => ({
  eventBus: { publish: (...args: unknown[]) => mockPublish(...args) },
}));

import {
  emitPacksEvent,
  emitPacksStatusChange,
  emitPackInstalled,
  emitPackInstallFailed,
  emitCatalogSynced,
  emitCompatibilityChecked,
} from './packs-event.service';

const TENANT = 'test-tenant';
const USER = 'user-001';

describe('PacksEventService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('emitPacksEvent()', () => {
    it('publishes event with correct structure', () => {
      emitPacksEvent({ tenantId: TENANT, entityType: 'pack', entityId: 'p-1', action: 'created', triggeredBy: USER });
      expect(mockPublish).toHaveBeenCalledTimes(1);
      const call = mockPublish.mock.calls[0][0];
      expect(call.eventType).toBe('packs.pack.created');
      expect(call.sourceService).toBe('packs');
      expect(call.payload.eventVersion).toBe(1);
    });

    it('assigns critical severity for install_failed', () => {
      emitPacksEvent({ tenantId: TENANT, entityType: 'installation', entityId: 'p-1', action: 'install_failed', triggeredBy: USER });
      expect(mockPublish.mock.calls[0][0].severity).toBe('critical');
    });

    it('assigns warning severity for compatibility_checked', () => {
      emitPacksEvent({ tenantId: TENANT, entityType: 'compatibility', entityId: 'p-1', action: 'compatibility_checked', triggeredBy: USER });
      expect(mockPublish.mock.calls[0][0].severity).toBe('warning');
    });

    it('assigns info severity for created', () => {
      emitPacksEvent({ tenantId: TENANT, entityType: 'pack', entityId: 'p-1', action: 'created', triggeredBy: USER });
      expect(mockPublish.mock.calls[0][0].severity).toBe('info');
    });

    it('does not throw on publish error', () => {
      mockPublish.mockImplementationOnce(() => { throw new Error('down'); });
      expect(() => emitPacksEvent({ tenantId: TENANT, entityType: 'pack', entityId: 'p-1', action: 'created', triggeredBy: USER })).not.toThrow();
    });
  });

  describe('convenience helpers', () => {
    it('emitPacksStatusChange publishes status_changed', () => {
      emitPacksStatusChange(TENANT, 'pack', 'p-1', 'draft', 'active', USER);
      expect(mockPublish.mock.calls[0][0].payload.action).toBe('status_changed');
    });

    it('emitPackInstalled includes version', () => {
      emitPackInstalled(TENANT, 'p-1', '2.0.0', USER);
      expect(mockPublish.mock.calls[0][0].payload.version).toBe('2.0.0');
    });

    it('emitPackInstallFailed includes errorReason', () => {
      emitPackInstallFailed(TENANT, 'p-1', 'deps missing', USER);
      expect(mockPublish.mock.calls[0][0].payload.errorReason).toBe('deps missing');
    });

    it('emitCatalogSynced includes packCount', () => {
      emitCatalogSynced(TENANT, 'cat-1', 15, USER);
      expect(mockPublish.mock.calls[0][0].payload.packCount).toBe(15);
    });

    it('emitCompatibilityChecked includes isCompatible', () => {
      emitCompatibilityChecked(TENANT, 'p-1', true, USER);
      expect(mockPublish.mock.calls[0][0].payload.isCompatible).toBe(true);
    });
  });
});

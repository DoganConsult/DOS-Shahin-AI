/**
 * WidgetBundleService -- Unit Tests
 *
 * Tests all CRUD operations (list, getById, create, update, transitionStatus, delete),
 * verifying repository delegation, NotFoundError propagation, and event emission via swallow.
 *
 * @owner widgets
 * @module widgets
 * @since 2026-03-31
 */

import { describe, it, expect, vi, beforeEach, type Mock as _Mock } from 'vitest';

// ── Mock dependencies before importing the module under test ──────────────

const mockFindAll = vi.fn();
const mockFindById = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateStatus = vi.fn();
const mockSoftDelete = vi.fn();
const mockConstructorCalls: string[] = [];

vi.mock('../../repositories/widget-bundle.repo', () => {
  return {
    WidgetBundleRepository: class {
      constructor(_tenantId: string) {
        // Capture constructor calls for assertion
        mockConstructorCalls.push(_tenantId);
      }
      findAll = mockFindAll;
      findById = mockFindById;
      create = mockCreate;
      update = mockUpdate;
      updateStatus = mockUpdateStatus;
      softDelete = mockSoftDelete;
    },
  };
});

const mockEmitEvent = vi.fn().mockResolvedValue(undefined);
vi.mock('../../../../platform/dos/events/event-bus', () => ({
  emitEvent: (...args: unknown[]) => mockEmitEvent(...args),
}));

const mockSwallow = vi.fn();
vi.mock('../../../../utils/resilient-catch', () => ({
  swallow: (...args: unknown[]) => mockSwallow(...args),
  EC: { EVENT_BUS: 'EVENT_BUS' },
}));

vi.mock('../../events/widgets.events', () => ({
  WIDGETS_EVENT_TYPES: {
    RECORD_CREATED: 'widgets.record.created',
    RECORD_UPDATED: 'widgets.record.updated',
    RECORD_DELETED: 'widgets.record.deleted',
    STATUS_CHANGED: 'widgets.status.changed',
  },
}));

import { WidgetBundleService } from './widget-bundle.service';
import { NotFoundError } from '../../../../errors/index';

// ── Constants ─────────────────────────────────────────────────────────────

const TENANT_ID = 'test-tenant-001';
const USER_ID = 'user-abc-123';
const BUNDLE_ID = 'bundle-xyz-789';

/** Factory for a realistic bundle row returned by the repository. */
function makeBundleRow(overrides: Record<string, unknown> = {}) {
  return {
    bundle_id: BUNDLE_ID,
    name_en: 'Executive Dashboard Bundle',
    name_ar: 'حزمة لوحة المعلومات التنفيذية',
    description_en: 'Top-level KPI widgets for C-suite',
    description_ar: '',
    widget_ids: JSON.stringify(['w1', 'w2', 'w3']),
    layout: JSON.stringify([{ widgetId: 'w1', position: 0, colSpan: 2, rowSpan: 1 }]),
    status: 'draft',
    target_audience: 'executive',
    created_by: USER_ID,
    updated_by: USER_ID,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

// ── Test suite ────────────────────────────────────────────────────────────

describe('WidgetBundleService', () => {
  let service: WidgetBundleService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConstructorCalls.length = 0;
    service = new WidgetBundleService(TENANT_ID);
  });

  // ── list ──────────────────────────────────────────────────────────────

  describe('list', () => {
    it('delegates to repo.findAll with default empty filters', async () => {
      const expected = { rows: [makeBundleRow()], total: 1 };
      mockFindAll.mockResolvedValueOnce(expected);

      const result = await service.list();

      expect(mockFindAll).toHaveBeenCalledTimes(1);
      expect(mockFindAll).toHaveBeenCalledWith({});
      expect(result).toEqual(expected);
    });

    it('passes filters through to the repository', async () => {
      const filters = { status: 'published', targetAudience: 'executive', search: 'KPI' };
      const expected = { rows: [makeBundleRow({ status: 'published' })], total: 1 };
      mockFindAll.mockResolvedValueOnce(expected);

      const result = await service.list(filters);

      expect(mockFindAll).toHaveBeenCalledWith(filters);
      expect(result.total).toBe(1);
    });

    it('returns empty result set when no bundles match', async () => {
      mockFindAll.mockResolvedValueOnce({ rows: [], total: 0 });

      const result = await service.list({ status: 'archived' });

      expect(result.rows).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('propagates repository errors', async () => {
      mockFindAll.mockRejectedValueOnce(new Error('DB connection failed'));

      await expect(service.list()).rejects.toThrow('DB connection failed');
    });
  });

  // ── getById ───────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns the bundle row when found', async () => {
      const row = makeBundleRow();
      mockFindById.mockResolvedValueOnce(row);

      const result = await service.getById(BUNDLE_ID);

      expect(mockFindById).toHaveBeenCalledWith(BUNDLE_ID);
      expect(result).toEqual(row);
    });

    it('throws NotFoundError when repo returns null', async () => {
      mockFindById.mockResolvedValueOnce(null);

      await expect(service.getById('nonexistent-id')).rejects.toThrow(NotFoundError);
    });

    it('includes the bundle id in the error message', async () => {
      mockFindById.mockResolvedValueOnce(null);

      await expect(service.getById('missing-bundle')).rejects.toThrow(/missing-bundle/);
    });
  });

  // ── create ────────────────────────────────────────────────────────────

  describe('create', () => {
    const createData = {
      nameEn: 'Risk Overview Bundle',
      nameAr: 'حزمة نظرة عامة على المخاطر',
      descriptionEn: 'Core risk widgets',
      widgetIds: ['w10', 'w11'],
      layout: [{ widgetId: 'w10', position: 0, colSpan: 2, rowSpan: 1 }],
      targetAudience: 'risk_manager',
    };

    it('delegates to repo.create and returns the created bundle', async () => {
      const created = makeBundleRow({
        name_en: createData.nameEn,
        target_audience: 'risk_manager',
      });
      mockCreate.mockResolvedValueOnce(created);

      const result = await service.create(createData, USER_ID);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(createData, USER_ID);
      expect(result).toEqual(created);
    });

    it('emits a created event via swallow after successful create', async () => {
      const created = makeBundleRow({ bundle_id: 'new-bundle-id' });
      mockCreate.mockResolvedValueOnce(created);

      await service.create(createData, USER_ID);

      expect(mockSwallow).toHaveBeenCalledTimes(1);
      // Verify swallow receives the correct error category
      expect(mockSwallow.mock.calls[0][0]).toBe('EVENT_BUS');
      // Verify the emitEvent was called with correct payload shape
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          userId: USER_ID,
          module: 'widgets',
          event: 'created',
          entityType: 'widget_bundle',
          entityId: 'new-bundle-id',
          data: created,
        }),
      );
    });

    it('throws an error when repo.create returns null', async () => {
      mockCreate.mockResolvedValueOnce(null);

      await expect(service.create(createData, USER_ID)).rejects.toThrow('Failed to create bundle');
    });

    it('does not emit an event when creation fails', async () => {
      mockCreate.mockResolvedValueOnce(null);

      await expect(service.create(createData, USER_ID)).rejects.toThrow();
      expect(mockSwallow).not.toHaveBeenCalled();
      expect(mockEmitEvent).not.toHaveBeenCalled();
    });
  });

  // ── update ────────────────────────────────────────────────────────────

  describe('update', () => {
    const updateData = {
      nameEn: 'Updated Bundle Name',
      widgetIds: ['w1', 'w2', 'w3', 'w4'],
    };

    it('fetches existing bundle, delegates update to repo, and returns result', async () => {
      const before = makeBundleRow();
      const after = makeBundleRow({ name_en: 'Updated Bundle Name', updated_at: '2026-03-15T00:00:00Z' });
      mockFindById.mockResolvedValueOnce(before); // getById lookup
      mockUpdate.mockResolvedValueOnce(after);

      const result = await service.update(BUNDLE_ID, updateData, USER_ID);

      expect(mockFindById).toHaveBeenCalledWith(BUNDLE_ID);
      expect(mockUpdate).toHaveBeenCalledWith(BUNDLE_ID, updateData, USER_ID);
      expect(result).toEqual(after);
    });

    it('emits an updated event with before and after data', async () => {
      const before = makeBundleRow({ status: 'draft' });
      const after = makeBundleRow({ name_en: 'Renamed', updated_at: '2026-03-15T00:00:00Z' });
      mockFindById.mockResolvedValueOnce(before);
      mockUpdate.mockResolvedValueOnce(after);

      await service.update(BUNDLE_ID, updateData, USER_ID);

      expect(mockSwallow).toHaveBeenCalledTimes(1);
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          userId: USER_ID,
          module: 'widgets',
          event: 'updated',
          entityType: 'widget_bundle',
          entityId: BUNDLE_ID,
          data: after,
          previousData: before,
        }),
      );
    });

    it('throws NotFoundError if bundle does not exist before update', async () => {
      mockFindById.mockResolvedValueOnce(null);

      await expect(service.update('nonexistent', updateData, USER_ID)).rejects.toThrow(NotFoundError);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('throws an error when repo.update returns null', async () => {
      mockFindById.mockResolvedValueOnce(makeBundleRow());
      mockUpdate.mockResolvedValueOnce(null);

      await expect(service.update(BUNDLE_ID, updateData, USER_ID)).rejects.toThrow('Failed to update bundle');
    });

    it('does not emit an event when update fails', async () => {
      mockFindById.mockResolvedValueOnce(makeBundleRow());
      mockUpdate.mockResolvedValueOnce(null);

      await expect(service.update(BUNDLE_ID, updateData, USER_ID)).rejects.toThrow();
      expect(mockSwallow).not.toHaveBeenCalled();
    });
  });

  // ── transitionStatus ──────────────────────────────────────────────────

  describe('transitionStatus', () => {
    it('transitions from draft to published and returns updated bundle', async () => {
      const before = makeBundleRow({ status: 'draft' });
      const after = makeBundleRow({ status: 'published', updated_at: '2026-03-20T00:00:00Z' });
      mockFindById.mockResolvedValueOnce(before);
      mockUpdateStatus.mockResolvedValueOnce(after);

      const result = await service.transitionStatus(BUNDLE_ID, 'published', USER_ID);

      expect(mockFindById).toHaveBeenCalledWith(BUNDLE_ID);
      expect(mockUpdateStatus).toHaveBeenCalledWith(BUNDLE_ID, 'published', USER_ID);
      expect(result).toEqual(after);
    });

    it('emits a status_changed event with from/to status', async () => {
      const before = makeBundleRow({ status: 'draft' });
      const after = makeBundleRow({ status: 'in_review' });
      mockFindById.mockResolvedValueOnce(before);
      mockUpdateStatus.mockResolvedValueOnce(after);

      await service.transitionStatus(BUNDLE_ID, 'in_review', USER_ID);

      expect(mockSwallow).toHaveBeenCalledTimes(1);
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          userId: USER_ID,
          module: 'widgets',
          event: 'status_changed',
          entityType: 'widget_bundle',
          entityId: BUNDLE_ID,
          data: expect.objectContaining({
            bundle: after,
            fromStatus: 'draft',
            toStatus: 'in_review',
          }),
        }),
      );
    });

    it('throws NotFoundError if bundle does not exist', async () => {
      mockFindById.mockResolvedValueOnce(null);

      await expect(
        service.transitionStatus('missing', 'published', USER_ID),
      ).rejects.toThrow(NotFoundError);
      expect(mockUpdateStatus).not.toHaveBeenCalled();
    });

    it('throws an error when repo.updateStatus returns null', async () => {
      mockFindById.mockResolvedValueOnce(makeBundleRow());
      mockUpdateStatus.mockResolvedValueOnce(null);

      await expect(
        service.transitionStatus(BUNDLE_ID, 'archived', USER_ID),
      ).rejects.toThrow('Failed to update bundle status');
    });

    it('does not emit an event when status update fails', async () => {
      mockFindById.mockResolvedValueOnce(makeBundleRow());
      mockUpdateStatus.mockResolvedValueOnce(null);

      await expect(
        service.transitionStatus(BUNDLE_ID, 'archived', USER_ID),
      ).rejects.toThrow();
      expect(mockSwallow).not.toHaveBeenCalled();
    });

    it('correctly records the previous status from the fetched bundle', async () => {
      const before = makeBundleRow({ status: 'approved' });
      const after = makeBundleRow({ status: 'suspended' });
      mockFindById.mockResolvedValueOnce(before);
      mockUpdateStatus.mockResolvedValueOnce(after);

      await service.transitionStatus(BUNDLE_ID, 'suspended', USER_ID);

      const eventPayload = mockEmitEvent.mock.calls[0][0];
      expect(eventPayload.data.fromStatus).toBe('approved');
      expect(eventPayload.data.toStatus).toBe('suspended');
    });
  });

  // ── delete ────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('soft-deletes the bundle and returns void', async () => {
      const before = makeBundleRow();
      mockFindById.mockResolvedValueOnce(before);
      mockSoftDelete.mockResolvedValueOnce(true);

      const result = await service.delete(BUNDLE_ID, USER_ID);

      expect(result).toBeUndefined();
      expect(mockFindById).toHaveBeenCalledWith(BUNDLE_ID);
      expect(mockSoftDelete).toHaveBeenCalledWith(BUNDLE_ID, USER_ID);
    });

    it('emits a deleted event with previousData', async () => {
      const before = makeBundleRow();
      mockFindById.mockResolvedValueOnce(before);
      mockSoftDelete.mockResolvedValueOnce(true);

      await service.delete(BUNDLE_ID, USER_ID);

      expect(mockSwallow).toHaveBeenCalledTimes(1);
      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          userId: USER_ID,
          module: 'widgets',
          event: 'deleted',
          entityType: 'widget_bundle',
          entityId: BUNDLE_ID,
          previousData: before,
        }),
      );
    });

    it('throws NotFoundError if bundle does not exist before delete', async () => {
      mockFindById.mockResolvedValueOnce(null);

      await expect(service.delete('ghost-id', USER_ID)).rejects.toThrow(NotFoundError);
      expect(mockSoftDelete).not.toHaveBeenCalled();
    });

    it('throws an error when repo.softDelete returns false', async () => {
      mockFindById.mockResolvedValueOnce(makeBundleRow());
      mockSoftDelete.mockResolvedValueOnce(false);

      await expect(service.delete(BUNDLE_ID, USER_ID)).rejects.toThrow('Failed to delete bundle');
    });

    it('does not emit an event when soft-delete fails', async () => {
      mockFindById.mockResolvedValueOnce(makeBundleRow());
      mockSoftDelete.mockResolvedValueOnce(false);

      await expect(service.delete(BUNDLE_ID, USER_ID)).rejects.toThrow();
      expect(mockSwallow).not.toHaveBeenCalled();
    });
  });

  // ── Constructor ───────────────────────────────────────────────────────

  describe('constructor', () => {
    it('creates a repository instance with the provided tenantId', () => {
      // Clear accumulated constructor calls from prior beforeEach instantiations
      mockConstructorCalls.length = 0;

      const _svc = new WidgetBundleService('another-tenant');

      expect(mockConstructorCalls).toContain('another-tenant');
      expect(mockConstructorCalls[mockConstructorCalls.length - 1]).toBe('another-tenant');
    });
  });

  // ── Event resilience via swallow ──────────────────────────────────────

  describe('event resilience', () => {
    it('passes EVENT_BUS error category and context to swallow for create', async () => {
      mockCreate.mockResolvedValueOnce(makeBundleRow());

      await service.create({ nameEn: 'Test', widgetIds: ['w1'] }, USER_ID);

      expect(mockSwallow).toHaveBeenCalledWith(
        'EVENT_BUS',
        expect.any(Promise),
        expect.objectContaining({
          tenantId: TENANT_ID,
          operation: 'widgets.bundle.created',
        }),
      );
    });

    it('passes correct operation context to swallow for update', async () => {
      mockFindById.mockResolvedValueOnce(makeBundleRow());
      mockUpdate.mockResolvedValueOnce(makeBundleRow());

      await service.update(BUNDLE_ID, { nameEn: 'X' }, USER_ID);

      expect(mockSwallow).toHaveBeenCalledWith(
        'EVENT_BUS',
        expect.any(Promise),
        expect.objectContaining({
          tenantId: TENANT_ID,
          operation: 'widgets.bundle.updated',
        }),
      );
    });

    it('passes correct operation context to swallow for status change', async () => {
      mockFindById.mockResolvedValueOnce(makeBundleRow());
      mockUpdateStatus.mockResolvedValueOnce(makeBundleRow({ status: 'published' }));

      await service.transitionStatus(BUNDLE_ID, 'published', USER_ID);

      expect(mockSwallow).toHaveBeenCalledWith(
        'EVENT_BUS',
        expect.any(Promise),
        expect.objectContaining({
          tenantId: TENANT_ID,
          operation: 'widgets.bundle.status_changed',
        }),
      );
    });

    it('passes correct operation context to swallow for delete', async () => {
      mockFindById.mockResolvedValueOnce(makeBundleRow());
      mockSoftDelete.mockResolvedValueOnce(true);

      await service.delete(BUNDLE_ID, USER_ID);

      expect(mockSwallow).toHaveBeenCalledWith(
        'EVENT_BUS',
        expect.any(Promise),
        expect.objectContaining({
          tenantId: TENANT_ID,
          operation: 'widgets.bundle.deleted',
        }),
      );
    });
  });
});

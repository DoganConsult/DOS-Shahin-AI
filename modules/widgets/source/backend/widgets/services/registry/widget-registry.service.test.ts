/**
 * WidgetRegistryService — Unit Tests
 *
 * Verifies CRUD operations, event emission, duplicate-key guards,
 * status transitions, soft deletes, and delegation to WidgetRegistryRepository.
 *
 * @owner widgets
 * @module widgets
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock: WidgetRegistryRepository ────────────────────────────────────────
const mockRepo = {
  findAll: vi.fn(),
  findById: vi.fn(),
  findByKey: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateStatus: vi.fn(),
  softDelete: vi.fn(),
  countByStatus: vi.fn(),
};

vi.mock('../../repositories/widget-registry.repo', () => {
  return {
    WidgetRegistryRepository: class {
      constructor() {
        Object.assign(this, mockRepo);
      }
    },
  };
});

// ── Mock: Event bus ──────────────────────────────────────────────────────
const mockEmitEvent = vi.fn().mockResolvedValue(undefined);
vi.mock('../../../../platform/dos/events/event-bus', () => ({
  emitEvent: (...args: unknown[]) => mockEmitEvent(...args),
}));

// ── Mock: resilient-catch (swallow simply executes the promise) ──────────
vi.mock('../../../../utils/resilient-catch', () => ({
  swallow: vi.fn(),
  EC: { EVENT_BUS: 'EVENT_BUS' },
}));

// ── Mock: errors — mirrors real (entity, id) constructor signature ────────
vi.mock('../../../../errors/index', () => {
  class _NotFoundError extends Error {
    public statusCode = 404;
    public code = 'NOT_FOUND';
    constructor(entity: string, id: string) {
      super(`${entity} with id '${id}' not found`);
      this.name = 'NotFoundError';
    }
  }
  return { NotFoundError: _NotFoundError };
});

import { WidgetRegistryService } from './widget-registry.service';
import { swallow } from '@dos/platform-core/resilience';
import { NotFoundError } from '../../../../errors/index';
import type { WidgetCreateDTO, WidgetUpdateDTO } from '../../types/widget.types';

// ── Test constants ───────────────────────────────────────────────────────
const TENANT = 'tenant-abc';
const USER_ID = 'user-001';

const WIDGET_ROW = {
  widget_id: 'w-100',
  widget_key: 'risk_heatmap',
  name_en: 'Risk Heatmap',
  name_ar: '',
  description_en: 'Heat map widget',
  description_ar: '',
  category: 'risk',
  size: 'medium',
  icon: 'pi-chart-bar',
  status: 'draft',
  version: '1.0.0',
  data_sources: '[]',
  required_permissions: '[]',
  scope_rule: 'org',
  config: '{}',
  created_by: USER_ID,
  updated_by: USER_ID,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

const UPDATED_WIDGET_ROW = {
  ...WIDGET_ROW,
  name_en: 'Updated Heatmap',
  updated_at: '2026-03-02T00:00:00Z',
};

// ── Setup ────────────────────────────────────────────────────────────────
let service: WidgetRegistryService;

describe('WidgetRegistryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service = new WidgetRegistryService(TENANT);
  });

  it('instantiates without error', () => {
    // Service constructor creates a WidgetRegistryRepository internally.
    // If the constructor threw, service would be undefined.
    expect(service).toBeDefined();
  });

  // ── list ─────────────────────────────────────────────────────────────
  describe('list()', () => {
    it('delegates to repo.findAll with the provided filters', async () => {
      const expected = { rows: [WIDGET_ROW], total: 1 };
      mockRepo.findAll.mockResolvedValue(expected);

      const filters = { status: 'draft', category: 'risk' };
      const result = await service.list(filters);

      expect(mockRepo.findAll).toHaveBeenCalledWith(filters);
      expect(result).toEqual(expected);
    });

    it('passes empty object when no filters provided', async () => {
      const expected = { rows: [], total: 0 };
      mockRepo.findAll.mockResolvedValue(expected);

      const result = await service.list();

      expect(mockRepo.findAll).toHaveBeenCalledWith({});
      expect(result).toEqual(expected);
    });

    it('returns multiple rows with correct total', async () => {
      const secondRow = { ...WIDGET_ROW, widget_id: 'w-200', widget_key: 'compliance_gauge' };
      const expected = { rows: [WIDGET_ROW, secondRow], total: 2 };
      mockRepo.findAll.mockResolvedValue(expected);

      const result = await service.list({ category: 'risk' });

      expect(result.rows).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  // ── getById ──────────────────────────────────────────────────────────
  describe('getById()', () => {
    it('returns widget when found', async () => {
      mockRepo.findById.mockResolvedValue(WIDGET_ROW);

      const result = await service.getById('w-100');

      expect(mockRepo.findById).toHaveBeenCalledWith('w-100');
      expect(result).toEqual(WIDGET_ROW);
    });

    it('throws NotFoundError when widget does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getById('w-missing')).rejects.toThrow(NotFoundError);
    });

    it('includes widgetId in the error message', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getById('w-missing')).rejects.toThrow("Widget with id 'w-missing' not found");
    });
  });

  // ── getByKey ─────────────────────────────────────────────────────────
  describe('getByKey()', () => {
    it('returns widget when found by key', async () => {
      mockRepo.findByKey.mockResolvedValue(WIDGET_ROW);

      const result = await service.getByKey('risk_heatmap');

      expect(mockRepo.findByKey).toHaveBeenCalledWith('risk_heatmap');
      expect(result).toEqual(WIDGET_ROW);
    });

    it('throws NotFoundError when widget key does not exist', async () => {
      mockRepo.findByKey.mockResolvedValue(null);

      await expect(service.getByKey('nonexistent_key')).rejects.toThrow(NotFoundError);
    });

    it('includes widget key in the error message', async () => {
      mockRepo.findByKey.mockResolvedValue(null);

      await expect(service.getByKey('nonexistent_key')).rejects.toThrow("Widget with id 'nonexistent_key' not found");
    });
  });

  // ── create ───────────────────────────────────────────────────────────
  describe('create()', () => {
    const createDto: WidgetCreateDTO = {
      widgetKey: 'risk_heatmap',
      nameEn: 'Risk Heatmap',
      category: 'risk',
    };

    it('creates a widget and returns the result', async () => {
      mockRepo.findByKey.mockResolvedValue(null); // no duplicate
      mockRepo.create.mockResolvedValue(WIDGET_ROW);

      const result = await service.create(createDto, USER_ID);

      expect(mockRepo.findByKey).toHaveBeenCalledWith('risk_heatmap');
      expect(mockRepo.create).toHaveBeenCalledWith(createDto, USER_ID);
      expect(result).toEqual(WIDGET_ROW);
    });

    it('throws if widget key already exists (duplicate guard)', async () => {
      mockRepo.findByKey.mockResolvedValue(WIDGET_ROW); // duplicate

      await expect(service.create(createDto, USER_ID)).rejects.toThrow(
        "Widget key 'risk_heatmap' already exists",
      );
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('throws if repo.create returns null', async () => {
      mockRepo.findByKey.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(null);

      await expect(service.create(createDto, USER_ID)).rejects.toThrow('Failed to create widget');
    });

    it('emits created event via swallow after successful creation', async () => {
      mockRepo.findByKey.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(WIDGET_ROW);

      await service.create(createDto, USER_ID);

      expect(swallow).toHaveBeenCalledTimes(1);
      // Verify emitEvent was called with correct payload
      expect(mockEmitEvent).toHaveBeenCalledWith({
        tenantId: TENANT,
        userId: USER_ID,
        module: 'widgets',
        event: 'created',
        entityType: 'widget',
        entityId: 'w-100',
        data: WIDGET_ROW,
      });
    });

    it('does not emit event when duplicate key blocks creation', async () => {
      mockRepo.findByKey.mockResolvedValue(WIDGET_ROW);

      await expect(service.create(createDto, USER_ID)).rejects.toThrow();
      expect(mockEmitEvent).not.toHaveBeenCalled();
    });
  });

  // ── update ───────────────────────────────────────────────────────────
  describe('update()', () => {
    const updateDto: WidgetUpdateDTO = { nameEn: 'Updated Heatmap' };

    it('updates the widget and returns updated row', async () => {
      mockRepo.findById.mockResolvedValue(WIDGET_ROW);
      mockRepo.update.mockResolvedValue(UPDATED_WIDGET_ROW);

      const result = await service.update('w-100', updateDto, USER_ID);

      expect(mockRepo.findById).toHaveBeenCalledWith('w-100');
      expect(mockRepo.update).toHaveBeenCalledWith('w-100', updateDto, USER_ID);
      expect(result).toEqual(UPDATED_WIDGET_ROW);
    });

    it('throws NotFoundError if widget does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.update('w-missing', updateDto, USER_ID)).rejects.toThrow(NotFoundError);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('throws if repo.update returns null', async () => {
      mockRepo.findById.mockResolvedValue(WIDGET_ROW);
      mockRepo.update.mockResolvedValue(null);

      await expect(service.update('w-100', updateDto, USER_ID)).rejects.toThrow(
        'Failed to update widget',
      );
    });

    it('emits updated event with previousData set to the before-state', async () => {
      mockRepo.findById.mockResolvedValue(WIDGET_ROW);
      mockRepo.update.mockResolvedValue(UPDATED_WIDGET_ROW);

      await service.update('w-100', updateDto, USER_ID);

      expect(swallow).toHaveBeenCalledTimes(1);
      expect(mockEmitEvent).toHaveBeenCalledWith({
        tenantId: TENANT,
        userId: USER_ID,
        module: 'widgets',
        event: 'updated',
        entityType: 'widget',
        entityId: 'w-100',
        data: UPDATED_WIDGET_ROW,
        previousData: WIDGET_ROW,
      });
    });
  });

  // ── transitionStatus ─────────────────────────────────────────────────
  describe('transitionStatus()', () => {
    const publishedRow = { ...WIDGET_ROW, status: 'published' };

    it('transitions widget status and returns updated row', async () => {
      mockRepo.findById.mockResolvedValue(WIDGET_ROW);
      mockRepo.updateStatus.mockResolvedValue(publishedRow);

      const result = await service.transitionStatus('w-100', 'published', USER_ID);

      expect(mockRepo.findById).toHaveBeenCalledWith('w-100');
      expect(mockRepo.updateStatus).toHaveBeenCalledWith('w-100', 'published', USER_ID);
      expect(result).toEqual(publishedRow);
    });

    it('throws NotFoundError if widget does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        service.transitionStatus('w-missing', 'published', USER_ID),
      ).rejects.toThrow(NotFoundError);
      expect(mockRepo.updateStatus).not.toHaveBeenCalled();
    });

    it('throws if repo.updateStatus returns null', async () => {
      mockRepo.findById.mockResolvedValue(WIDGET_ROW);
      mockRepo.updateStatus.mockResolvedValue(null);

      await expect(
        service.transitionStatus('w-100', 'published', USER_ID),
      ).rejects.toThrow('Failed to update widget status');
    });

    it('emits status_changed event with fromStatus and toStatus', async () => {
      mockRepo.findById.mockResolvedValue(WIDGET_ROW);
      mockRepo.updateStatus.mockResolvedValue(publishedRow);

      await service.transitionStatus('w-100', 'published', USER_ID);

      expect(swallow).toHaveBeenCalledTimes(1);
      expect(mockEmitEvent).toHaveBeenCalledWith({
        tenantId: TENANT,
        userId: USER_ID,
        module: 'widgets',
        event: 'status_changed',
        entityType: 'widget',
        entityId: 'w-100',
        data: {
          widget: publishedRow,
          fromStatus: 'draft',
          toStatus: 'published',
        },
      });
    });

    it('correctly captures fromStatus from the before-state', async () => {
      const approvedRow = { ...WIDGET_ROW, status: 'approved' };
      const archivedRow = { ...WIDGET_ROW, status: 'archived' };
      mockRepo.findById.mockResolvedValue(approvedRow);
      mockRepo.updateStatus.mockResolvedValue(archivedRow);

      await service.transitionStatus('w-100', 'archived', USER_ID);

      expect(mockEmitEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fromStatus: 'approved',
            toStatus: 'archived',
          }),
        }),
      );
    });
  });

  // ── delete ───────────────────────────────────────────────────────────
  describe('delete()', () => {
    it('soft-deletes the widget and returns void', async () => {
      mockRepo.findById.mockResolvedValue(WIDGET_ROW);
      mockRepo.softDelete.mockResolvedValue(true);

      const result = await service.delete('w-100', USER_ID);

      expect(mockRepo.findById).toHaveBeenCalledWith('w-100');
      expect(mockRepo.softDelete).toHaveBeenCalledWith('w-100', USER_ID);
      expect(result).toBeUndefined();
    });

    it('throws NotFoundError if widget does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.delete('w-missing', USER_ID)).rejects.toThrow(NotFoundError);
      expect(mockRepo.softDelete).not.toHaveBeenCalled();
    });

    it('throws if repo.softDelete returns false', async () => {
      mockRepo.findById.mockResolvedValue(WIDGET_ROW);
      mockRepo.softDelete.mockResolvedValue(false);

      await expect(service.delete('w-100', USER_ID)).rejects.toThrow('Failed to delete widget');
    });

    it('emits deleted event with previousData', async () => {
      mockRepo.findById.mockResolvedValue(WIDGET_ROW);
      mockRepo.softDelete.mockResolvedValue(true);

      await service.delete('w-100', USER_ID);

      expect(swallow).toHaveBeenCalledTimes(1);
      expect(mockEmitEvent).toHaveBeenCalledWith({
        tenantId: TENANT,
        userId: USER_ID,
        module: 'widgets',
        event: 'deleted',
        entityType: 'widget',
        entityId: 'w-100',
        previousData: WIDGET_ROW,
      });
    });

    it('does not emit event when widget is not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.delete('w-missing', USER_ID)).rejects.toThrow();
      expect(mockEmitEvent).not.toHaveBeenCalled();
    });
  });

  // ── getStatusCounts ──────────────────────────────────────────────────
  describe('getStatusCounts()', () => {
    it('delegates to repo.countByStatus and returns the result', async () => {
      const counts = { draft: 5, published: 3, archived: 1 };
      mockRepo.countByStatus.mockResolvedValue(counts);

      const result = await service.getStatusCounts();

      expect(mockRepo.countByStatus).toHaveBeenCalledTimes(1);
      expect(result).toEqual(counts);
    });

    it('returns empty object when no widgets exist', async () => {
      mockRepo.countByStatus.mockResolvedValue({});

      const result = await service.getStatusCounts();

      expect(result).toEqual({});
    });
  });
});

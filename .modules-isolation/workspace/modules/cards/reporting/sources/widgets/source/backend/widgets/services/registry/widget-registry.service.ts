import { WidgetRegistryRepository } from '../../repositories/widget-registry.repo';
import { emitEvent } from '../../ports/events.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { NotFoundError } from '../../../../errors/index';
import type { WidgetCreateDTO, WidgetUpdateDTO, WidgetStatus } from '../../types/widget.types';
import type { GenericRow } from '@dos/types';
import { WIDGETS_EVENT_TYPES } from '../../events/widgets.events';
import { safeQuery } from "@dos/db";

export class WidgetRegistryService {
  private repo: WidgetRegistryRepository;
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.repo = new WidgetRegistryRepository(tenantId);
  }

  async list(filters: Record<string, string> = {}): Promise<{ rows: GenericRow[]; total: number }> {
    return this.repo.findAll(filters);
  }

  async getById(widgetId: string): Promise<GenericRow> {
    const widget = await this.repo.findById(widgetId);
    if (!widget) throw new NotFoundError('Widget', widgetId);
    return widget;
  }

  async getByKey(widgetKey: string): Promise<GenericRow> {
    const widget = await this.repo.findByKey(widgetKey);
    if (!widget) throw new NotFoundError('Widget', widgetKey);
    return widget;
  }

  async create(data: WidgetCreateDTO, userId: string): Promise<GenericRow> {
    const existing = await this.repo.findByKey(data.widgetKey);
    if (existing) throw new Error(`Widget key '${data.widgetKey}' already exists`);

    const widget = await this.repo.create(data, userId);
    if (!widget) throw new Error('Failed to create widget');

    swallow(EC.EVENT_BUS, emitEvent(({
          tenantId: this.tenantId, userId, module: 'widgets',
          event: 'created', entityType: 'widget', entityId: widget.widget_id,
          data: widget,
        } as any)), { tenantId: this.tenantId, operation: WIDGETS_EVENT_TYPES.RECORD_CREATED });

    return widget;
  }

  async update(widgetId: string, data: WidgetUpdateDTO, userId: string): Promise<GenericRow> {
    const before = await this.getById(widgetId);
    const widget = await this.repo.update(widgetId, data, userId);
    if (!widget) throw new Error('Failed to update widget');

    swallow(EC.EVENT_BUS, emitEvent(({
          tenantId: this.tenantId, userId, module: 'widgets',
          event: 'updated', entityType: 'widget', entityId: widgetId,
          data: widget, previousData: before,
        } as any)), { tenantId: this.tenantId, operation: WIDGETS_EVENT_TYPES.RECORD_UPDATED });

    return widget;
  }

  async transitionStatus(widgetId: string, newStatus: WidgetStatus, userId: string): Promise<GenericRow> {
    const before = await this.getById(widgetId);
    const widget = await this.repo.updateStatus(widgetId, newStatus, userId);
    if (!widget) throw new Error('Failed to update widget status');

    swallow(EC.EVENT_BUS, emitEvent(({
          tenantId: this.tenantId, userId, module: 'widgets',
          event: 'status_changed', entityType: 'widget', entityId: widgetId,
          data: { widget, fromStatus: before.status, toStatus: newStatus },
        } as any)), { tenantId: this.tenantId, operation: WIDGETS_EVENT_TYPES.STATUS_CHANGED });

    return widget;
  }

  async delete(widgetId: string, userId: string): Promise<void> {
    const before = await this.getById(widgetId);
    const deleted = await this.repo.softDelete(widgetId, userId);
    if (!deleted) throw new Error('Failed to delete widget');

    swallow(EC.EVENT_BUS, emitEvent(({
          tenantId: this.tenantId, userId, module: 'widgets',
          event: 'deleted', entityType: 'widget', entityId: widgetId,
          previousData: before,
        } as any)), { tenantId: this.tenantId, operation: WIDGETS_EVENT_TYPES.RECORD_DELETED });
  }

  async getStatusCounts(): Promise<Record<string, number>> {
    return this.repo.countByStatus();
  }
}

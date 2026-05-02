import { WidgetBundleRepository } from '../../repositories/widget-bundle.repo';
import { emitEvent } from '../../ports/events.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { NotFoundError } from '../../../../errors/index';
import type { BundleCreateDTO, BundleUpdateDTO, WidgetStatus } from '../../types/widget.types';
import type { GenericRow } from '@dos/types';
import { WIDGETS_EVENT_TYPES as _WIDGETS_EVENT_TYPES } from '../../events/widgets.events';
import { safeQuery } from "@dos/db";

export class WidgetBundleService {
  private repo: WidgetBundleRepository;
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.repo = new WidgetBundleRepository(tenantId);
  }

  async list(filters: Record<string, string> = {}): Promise<{ rows: GenericRow[]; total: number }> {
    return this.repo.findAll(filters);
  }

  async getById(bundleId: string): Promise<GenericRow> {
    const bundle = await this.repo.findById(bundleId);
    if (!bundle) throw new NotFoundError('Bundle', bundleId);
    return bundle;
  }

  async create(data: BundleCreateDTO, userId: string): Promise<GenericRow> {
    const bundle = await this.repo.create(data, userId);
    if (!bundle) throw new Error('Failed to create bundle');

    swallow(EC.EVENT_BUS, emitEvent(({
          tenantId: this.tenantId, userId, module: 'widgets',
          event: 'created', entityType: 'widget_bundle', entityId: bundle.bundle_id,
          data: bundle,
        } as any)), { tenantId: this.tenantId, operation: 'widgets.bundle.created' });

    return bundle;
  }

  async update(bundleId: string, data: BundleUpdateDTO, userId: string): Promise<GenericRow> {
    const before = await this.getById(bundleId);
    const bundle = await this.repo.update(bundleId, data, userId);
    if (!bundle) throw new Error('Failed to update bundle');

    swallow(EC.EVENT_BUS, emitEvent(({
          tenantId: this.tenantId, userId, module: 'widgets',
          event: 'updated', entityType: 'widget_bundle', entityId: bundleId,
          data: bundle, previousData: before,
        } as any)), { tenantId: this.tenantId, operation: 'widgets.bundle.updated' });

    return bundle;
  }

  async transitionStatus(bundleId: string, newStatus: WidgetStatus, userId: string): Promise<GenericRow> {
    const before = await this.getById(bundleId);
    const bundle = await this.repo.updateStatus(bundleId, newStatus, userId);
    if (!bundle) throw new Error('Failed to update bundle status');

    swallow(EC.EVENT_BUS, emitEvent(({
          tenantId: this.tenantId, userId, module: 'widgets',
          event: 'status_changed', entityType: 'widget_bundle', entityId: bundleId,
          data: { bundle, fromStatus: before.status, toStatus: newStatus },
        } as any)), { tenantId: this.tenantId, operation: 'widgets.bundle.status_changed' });

    return bundle;
  }

  async delete(bundleId: string, userId: string): Promise<void> {
    const before = await this.getById(bundleId);
    const deleted = await this.repo.softDelete(bundleId, userId);
    if (!deleted) throw new Error('Failed to delete bundle');

    swallow(EC.EVENT_BUS, emitEvent(({
          tenantId: this.tenantId, userId, module: 'widgets',
          event: 'deleted', entityType: 'widget_bundle', entityId: bundleId,
          previousData: before,
        } as any)), { tenantId: this.tenantId, operation: 'widgets.bundle.deleted' });
  }
}

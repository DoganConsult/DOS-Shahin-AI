import { eventBus } from '../ports/events.port';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type WidgetsEntityType = 'widget' | 'widget_bundle' | 'data_source' | 'render';
export type WidgetsAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'published' | 'unpublished' | 'activated' | 'suspended'
  | 'bundle_packaged' | 'bundle_activated' | 'bundle_deactivated'
  | 'data_refreshed' | 'data_stale' | 'data_disconnected'
  | 'rendered' | 'render_failed'
  | 'approved' | 'rejected' | 'escalated' | 'exported';

export interface WidgetsEventOptions {
  tenantId: string;
  entityType: WidgetsEntityType;
  entityId: string;
  action: WidgetsAction;
  triggeredBy: string;
  previousState?: string;
  newState?: string;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: WidgetsAction): 'info' | 'warning' | 'critical' {
  if (act === 'render_failed' || act === 'data_disconnected') return 'critical';
  if (act === 'data_stale' || act === 'suspended') return 'warning';
  return 'info';
}

export function emitWidgetsEvent(opts: WidgetsEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `widgets.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'widgets',
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

export function emitWidgetsStatusChange(
  tenantId: string, entityType: WidgetsEntityType, entityId: string,
  previousState: string, newState: string, triggeredBy: string,
  correlationId?: string,
): void {
  emitWidgetsEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitWidgetPublished(tenantId: string, widgetId: string, triggeredBy: string): void {
  emitWidgetsEvent({ tenantId, entityType: 'widget', entityId: widgetId, action: 'published', triggeredBy });
}

export function emitWidgetDataRefreshed(tenantId: string, widgetId: string, dataSourceId: string, triggeredBy: string): void {
  emitWidgetsEvent({ tenantId, entityType: 'data_source', entityId: widgetId, action: 'data_refreshed', triggeredBy, data: { dataSourceId } });
}

export function emitBundleActivated(tenantId: string, bundleId: string, widgetCount: number, triggeredBy: string): void {
  emitWidgetsEvent({ tenantId, entityType: 'widget_bundle', entityId: bundleId, action: 'bundle_activated', triggeredBy, data: { widgetCount } });
}

export function emitRenderFailed(tenantId: string, widgetId: string, errorReason: string, triggeredBy: string): void {
  emitWidgetsEvent({ tenantId, entityType: 'render', entityId: widgetId, action: 'render_failed', triggeredBy, data: { errorReason } });
}

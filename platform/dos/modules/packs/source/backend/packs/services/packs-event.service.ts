import { eventBus } from '../ports/events.port';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type PacksEntityType = 'pack' | 'installation' | 'catalog' | 'compatibility' | 'policy';
export type PacksAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'installed' | 'uninstalled' | 'install_failed' | 'updated_version'
  | 'catalog_synced' | 'compatibility_checked'
  | 'policy_evaluated' | 'health_check_completed'
  | 'approved' | 'rejected' | 'escalated' | 'exported';

export interface PacksEventOptions {
  tenantId: string;
  entityType: PacksEntityType;
  entityId: string;
  action: PacksAction;
  triggeredBy: string;
  previousState?: string;
  newState?: string;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: PacksAction): 'info' | 'warning' | 'critical' {
  if (act === 'install_failed' || act === 'uninstalled') return 'critical';
  if (act === 'compatibility_checked' || act === 'policy_evaluated') return 'warning';
  return 'info';
}

export function emitPacksEvent(opts: PacksEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `packs.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'packs',
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

export function emitPacksStatusChange(
  tenantId: string, entityType: PacksEntityType, entityId: string,
  previousState: string, newState: string, triggeredBy: string,
  correlationId?: string,
): void {
  emitPacksEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitPackInstalled(tenantId: string, packId: string, version: string, triggeredBy: string): void {
  emitPacksEvent({ tenantId, entityType: 'installation', entityId: packId, action: 'installed', triggeredBy, data: { version } });
}

export function emitPackInstallFailed(tenantId: string, packId: string, errorReason: string, triggeredBy: string): void {
  emitPacksEvent({ tenantId, entityType: 'installation', entityId: packId, action: 'install_failed', triggeredBy, data: { errorReason } });
}

export function emitCatalogSynced(tenantId: string, catalogId: string, packCount: number, triggeredBy: string): void {
  emitPacksEvent({ tenantId, entityType: 'catalog', entityId: catalogId, action: 'catalog_synced', triggeredBy, data: { packCount } });
}

export function emitCompatibilityChecked(tenantId: string, packId: string, isCompatible: boolean, triggeredBy: string): void {
  emitPacksEvent({ tenantId, entityType: 'compatibility', entityId: packId, action: 'compatibility_checked', triggeredBy, data: { isCompatible } });
}

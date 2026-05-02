import { eventBus } from '../ports/events.port';
import type { AssetStatus } from '@dos/types/asset';
import { randomUUID } from 'crypto';
import { safeQuery } from "@dos/db";

export type AssetEntityType = 'asset' | 'classification' | 'inventory_scan';
export type AssetAction =
  | 'created' | 'updated' | 'deleted' | 'status_changed'
  | 'assigned' | 'reassigned' | 'escalated'
  | 'classified' | 'reclassified' | 'declassified'
  | 'registered' | 'activated' | 'decommissioned' | 'disposed'
  | 'criticality_changed' | 'owner_changed' | 'environment_changed'
  | 'scan_completed' | 'scan_failed'
  | 'risk_linked' | 'control_linked'
  | 'review_overdue' | 'review_completed'
  | 'approved' | 'rejected'
  | 'bulk_updated' | 'exported';

export interface AssetEventOptions {
  tenantId: string;
  entityType: AssetEntityType;
  entityId: string;
  action: AssetAction;
  triggeredBy: string;
  previousState?: AssetStatus;
  newState?: AssetStatus;
  correlationId?: string;
  data?: Record<string, unknown>;
}

function severityForAction(act: AssetAction): 'info' | 'warning' | 'critical' {
  if (act === 'declassified' || act === 'scan_failed') return 'critical';
  if (act === 'review_overdue' || act === 'decommissioned' || act === 'reclassified' || act === 'criticality_changed') return 'warning';
  return 'info';
}

export function emitAssetEvent(opts: AssetEventOptions): void {
  try {
    const correlationId = opts.correlationId || randomUUID();
    const eventType = `asset.${opts.entityType}.${opts.action}` as string;
    eventBus.publish(({
          eventType,
          tenantId: opts.tenantId,
          sourceService: 'asset',
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

export function emitAssetStatusChange(
  tenantId: string, entityType: AssetEntityType, entityId: string,
  previousState: AssetStatus, newState: AssetStatus, triggeredBy: string,
  correlationId?: string,
): void {
  emitAssetEvent({ tenantId, entityType, entityId, action: 'status_changed', triggeredBy, previousState, newState, correlationId });
}

export function emitAssetClassified(tenantId: string, assetId: string, classification: string, triggeredBy: string): void {
  emitAssetEvent({ tenantId, entityType: 'asset', entityId: assetId, action: 'classified', triggeredBy, data: { classification } });
}

export function emitCriticalityChanged(tenantId: string, assetId: string, oldCriticality: string, newCriticality: string, triggeredBy: string): void {
  emitAssetEvent({ tenantId, entityType: 'asset', entityId: assetId, action: 'criticality_changed', triggeredBy, data: { oldCriticality, newCriticality } });
}

export function emitScanCompleted(tenantId: string, scanId: string, assetsFound: number, triggeredBy: string): void {
  emitAssetEvent({ tenantId, entityType: 'inventory_scan', entityId: scanId, action: 'scan_completed', triggeredBy, data: { assetsFound } });
}

export function emitOwnerChanged(tenantId: string, assetId: string, oldOwner: string, newOwner: string, triggeredBy: string): void {
  emitAssetEvent({ tenantId, entityType: 'asset', entityId: assetId, action: 'owner_changed', triggeredBy, data: { oldOwner, newOwner } });
}

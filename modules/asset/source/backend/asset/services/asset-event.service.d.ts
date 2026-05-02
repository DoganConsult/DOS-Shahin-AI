import type { AssetStatus } from '@dos/types/asset';
export type AssetEntityType = 'asset' | 'classification' | 'inventory_scan';
export type AssetAction = 'created' | 'updated' | 'deleted' | 'status_changed' | 'assigned' | 'reassigned' | 'escalated' | 'classified' | 'reclassified' | 'declassified' | 'registered' | 'activated' | 'decommissioned' | 'disposed' | 'criticality_changed' | 'owner_changed' | 'environment_changed' | 'scan_completed' | 'scan_failed' | 'risk_linked' | 'control_linked' | 'review_overdue' | 'review_completed' | 'approved' | 'rejected' | 'bulk_updated' | 'exported';
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
export declare function emitAssetEvent(opts: AssetEventOptions): void;
export declare function emitAssetStatusChange(tenantId: string, entityType: AssetEntityType, entityId: string, previousState: AssetStatus, newState: AssetStatus, triggeredBy: string, correlationId?: string): void;
export declare function emitAssetClassified(tenantId: string, assetId: string, classification: string, triggeredBy: string): void;
export declare function emitCriticalityChanged(tenantId: string, assetId: string, oldCriticality: string, newCriticality: string, triggeredBy: string): void;
export declare function emitScanCompleted(tenantId: string, scanId: string, assetsFound: number, triggeredBy: string): void;
export declare function emitOwnerChanged(tenantId: string, assetId: string, oldOwner: string, newOwner: string, triggeredBy: string): void;

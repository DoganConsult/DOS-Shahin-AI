export type AssetType = 'agent' | 'model' | 'prompt' | 'tool' | 'provider' | 'workflow' | 'binding';
export type ScopeType = 'global' | 'tenant';
export type LifecycleStatus = 'draft' | 'review' | 'approved' | 'active' | 'deprecated' | 'archived';
export type AssetStatus = 'enabled' | 'disabled' | 'suspended';
export type SourceType = 'seeded' | 'discovered' | 'manual' | 'system';
export interface AIAsset {
    asset_id: string;
    asset_type: AssetType;
    asset_key: string;
    display_name: string;
    description: string | null;
    scope_type: ScopeType;
    tenant_id: string;
    lifecycle_status: LifecycleStatus;
    status: AssetStatus;
    business_owner: string | null;
    technical_owner: string | null;
    governance_owner: string | null;
    source_type: SourceType;
    source_ref: string | null;
    metadata: Record<string, unknown>;
    tags: string[];
    created_by: string;
    updated_by: string | null;
    created_at: string;
    updated_at: string;
}
export interface CreateAssetInput {
    asset_type: AssetType;
    asset_key: string;
    display_name: string;
    description?: string;
    scope_type?: ScopeType;
    lifecycle_status?: LifecycleStatus;
    status?: AssetStatus;
    business_owner?: string;
    technical_owner?: string;
    governance_owner?: string;
    source_type?: SourceType;
    source_ref?: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
    created_by?: string;
}
export interface UpdateAssetInput {
    display_name?: string;
    description?: string;
    lifecycle_status?: LifecycleStatus;
    status?: AssetStatus;
    business_owner?: string;
    technical_owner?: string;
    governance_owner?: string;
    source_ref?: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
    updated_by?: string;
}
export interface AssetQuery {
    asset_type?: AssetType;
    scope_type?: ScopeType;
    lifecycle_status?: LifecycleStatus;
    status?: AssetStatus;
    source_type?: SourceType;
    tag?: string;
    search?: string;
    limit?: number;
    offset?: number;
}
export declare function createAsset(tenantId: string, input: CreateAssetInput): Promise<AIAsset>;
export declare function getAssetById(tenantId: string, assetId: string): Promise<AIAsset | null>;
export declare function getAssetByKey(tenantId: string, assetType: AssetType, assetKey: string, scopeType?: ScopeType): Promise<AIAsset | null>;
export declare function updateAsset(tenantId: string, assetId: string, input: UpdateAssetInput): Promise<AIAsset | null>;
export declare function listAssets(tenantId: string, q?: AssetQuery): Promise<{
    assets: AIAsset[];
    total: number;
}>;
export declare function deleteAsset(tenantId: string, assetId: string): Promise<boolean>;
export declare function upsertAsset(tenantId: string, input: CreateAssetInput): Promise<AIAsset>;
export declare function getLifecycleTransitions(current: LifecycleStatus): LifecycleStatus[];

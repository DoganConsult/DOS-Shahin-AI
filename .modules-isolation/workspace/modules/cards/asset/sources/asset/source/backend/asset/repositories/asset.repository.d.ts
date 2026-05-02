import type { GenericRow } from '@dos/types';
export interface CreateAssetInput {
    name: string;
    name_en?: string;
    name_ar?: string;
    type?: string;
    asset_category?: string;
    description?: string;
    criticality?: string;
    owner?: string;
    custodian_id?: string;
    department?: string;
    location?: string;
    ip_address?: string;
    mac_address?: string;
    os?: string;
    classification?: string;
    status?: string;
    lifecycle_stage?: string;
    business_service_id?: string;
    data_classification_id?: string;
    parent_asset_id?: string;
    cia_confidentiality?: number;
    cia_integrity?: number;
    cia_availability?: number;
    external_exposure?: boolean;
    cmdb_external_id?: string;
    valuation_amount?: number;
    valuation_currency?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    created_by?: string;
}
export interface ListAssetsFilter {
    search?: string;
    type?: string;
    category?: string;
    criticality?: string;
    classification?: string;
    status?: string;
    lifecycleStage?: string;
    ownerId?: string;
    serviceId?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'ASC' | 'DESC';
}
export declare class AssetRepository {
    private schema;
    constructor(tenantId: string);
    findById(assetId: string): Promise<GenericRow | null>;
    findAll(filters?: ListAssetsFilter): Promise<{
        rows: GenericRow[];
        total: number;
    }>;
    create(userId: string, data: CreateAssetInput): Promise<GenericRow | null>;
    update(assetId: string, updates: Partial<CreateAssetInput>): Promise<GenericRow | null>;
    softDelete(assetId: string): Promise<boolean>;
    bulkSoftDelete(assetIds: string[]): Promise<number>;
    getStats(): Promise<GenericRow | null>;
    count(filters?: {
        status?: string;
        criticality?: string;
    }): Promise<number>;
}
export declare class AssetDependencyRepository {
    private schema;
    constructor(tenantId: string);
    findAll(filters?: {
        source_type?: string;
        source_id?: string;
        target_type?: string;
        target_id?: string;
        dependency_type?: string;
        page?: number;
        pageSize?: number;
    }): Promise<{
        rows: GenericRow[];
        total: number;
    }>;
    create(userId: string, data: {
        source_type: string;
        source_id: string;
        target_type: string;
        target_id: string;
        dependency_type?: string;
        criticality?: string;
        direction?: string;
        notes?: string;
        metadata?: Record<string, unknown>;
    }): Promise<GenericRow | null>;
    softDelete(dependencyId: string): Promise<boolean>;
    getUpstreamChain(entityType: string, entityId: string, maxDepth?: number): Promise<GenericRow[]>;
    getDownstreamChain(entityType: string, entityId: string, maxDepth?: number): Promise<GenericRow[]>;
    getStats(): Promise<GenericRow | null>;
}

import type { AssetStatus } from './asset.types';
export interface AssetCreateDTO {
    title: string;
    description?: string;
    asset_code?: string;
    asset_type?: 'hardware' | 'software' | 'data' | 'service' | 'network' | 'cloud' | 'physical';
    asset_category?: string;
    classification?: 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret';
    criticality?: 'low' | 'medium' | 'high' | 'critical';
    business_value?: number;
    replacement_cost?: number;
    owner_department_id?: string;
    custodian_id?: string;
    location?: string;
    ip_address?: string;
    mac_address?: string;
    serial_number?: string;
    vendor_id?: string;
    vendor_name?: string;
    purchase_date?: string;
    warranty_expiry?: string;
    end_of_life_date?: string;
    assigned_to?: string;
    due_date?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
}
export interface AssetUpdateDTO {
    title?: string;
    description?: string;
    status?: AssetStatus;
    asset_type?: 'hardware' | 'software' | 'data' | 'service' | 'network' | 'cloud' | 'physical';
    asset_category?: string;
    classification?: 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret';
    criticality?: 'low' | 'medium' | 'high' | 'critical';
    business_value?: number;
    replacement_cost?: number;
    owner_department_id?: string;
    custodian_id?: string;
    location?: string;
    ip_address?: string;
    serial_number?: string;
    vendor_id?: string;
    last_scan_date?: string;
    vulnerability_count?: number;
    patch_status?: 'current' | 'pending' | 'overdue';
    compliance_status?: 'compliant' | 'non_compliant' | 'not_assessed';
    assigned_to?: string;
    due_date?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
}
export interface AssetResponseDTO {
    id: string;
    tenant_id: string;
    title: string;
    description?: string;
    status: AssetStatus;
    asset_code?: string;
    asset_type?: string;
    asset_category?: string;
    classification?: string;
    criticality?: string;
    business_value?: number;
    replacement_cost?: number;
    owner_department_id?: string;
    custodian_id?: string;
    location?: string;
    ip_address?: string;
    mac_address?: string;
    serial_number?: string;
    vendor_id?: string;
    vendor_name?: string;
    purchase_date?: string;
    warranty_expiry?: string;
    end_of_life_date?: string;
    last_scan_date?: string;
    vulnerability_count?: number;
    patch_status?: string;
    compliance_status?: string;
    created_at: string;
    updated_at: string;
    created_by: string;
}
export interface AssetListItemDTO {
    id: string;
    title: string;
    status: AssetStatus;
    asset_code?: string;
    asset_type?: string;
    classification?: string;
    criticality?: string;
    location?: string;
    vulnerability_count?: number;
    patch_status?: string;
    compliance_status?: string;
    created_at: string;
    updated_at: string;
}
export interface AssetDetailDTO extends AssetResponseDTO {
    assigned_to?: string;
    due_date?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    audit_trail?: Array<{
        action: string;
        actor: string;
        timestamp: string;
        details?: string;
    }>;
    linked_entities?: Array<{
        module: string;
        entity_id: string;
        entity_type: string;
    }>;
}
export interface AssetAdminDTO extends AssetDetailDTO {
    tenant_id: string;
    deleted_at?: string | null;
    internal_notes?: string;
    system_flags?: Record<string, boolean>;
}
export interface AssetImportDTO {
    title: string;
    description?: string;
    status?: string;
    asset_type?: string;
    classification?: string;
    criticality?: string;
    serial_number?: string;
    external_id?: string;
    metadata?: Record<string, unknown>;
}
export interface AssetExportDTO extends AssetResponseDTO {
    export_timestamp: string;
    export_format: 'csv' | 'xlsx' | 'json' | 'pdf';
}
export interface AssetSearchResultDTO {
    items: AssetListItemDTO[];
    total: number;
    page: number;
    pageSize: number;
    facets?: Record<string, Array<{
        value: string;
        count: number;
    }>>;
}
export interface AssetAuditDTO {
    entity_id: string;
    entity_type: string;
    action: string;
    actor_id: string;
    actor_type: 'user' | 'system' | 'ai_agent';
    timestamp: string;
    previous_state?: string;
    new_state?: string;
    changed_fields?: string[];
    ip_address?: string;
}
export interface AssetBulkOperationDTO {
    ids: string[];
    operation: 'update' | 'delete' | 'archive' | 'assign' | 'status_change' | 'classify' | 'scan';
    payload?: Record<string, unknown>;
}

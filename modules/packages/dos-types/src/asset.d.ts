/**
 * @dos/types — asset, inventory, and infrastructure types
 * Covers IT/OT assets, asset risk, CMDB, criticality
 */
export type AssetType = 'server' | 'workstation' | 'mobile_device' | 'network_device' | 'cloud_resource' | 'application' | 'database' | 'iot_device' | 'ot_device' | 'virtual_machine' | 'container' | 'api_endpoint' | 'data_store' | 'identity_provider' | 'saas_service' | 'other';
export type AssetStatus = 'active' | 'archived' | 'classified' | 'decommissioned' | 'decommissioning' | 'discovered' | 'inactive' | 'quarantined' | 'registered' | 'under_review';
export type AssetCriticality = 'critical' | 'high' | 'medium' | 'low';
export type AssetEnvironment = 'production' | 'staging' | 'development' | 'dr' | 'test';
export type DataClassification = 'top_secret' | 'secret' | 'confidential' | 'internal' | 'public';
export interface Asset {
    assetId: string;
    tenantId: string;
    workspaceId?: string;
    name: string;
    nameAr?: string;
    description?: string;
    type: AssetType;
    subtype?: string;
    status: AssetStatus;
    criticality: AssetCriticality;
    environment: AssetEnvironment;
    dataClassification?: DataClassification;
    ownerId?: string;
    ownerTeamId?: string;
    custodianId?: string;
    departmentId?: string;
    orgUnitId?: string;
    location?: AssetLocation;
    network?: AssetNetworkInfo;
    hardware?: AssetHardwareInfo;
    software?: AssetSoftwareInfo;
    cloud?: AssetCloudInfo;
    tags?: string[];
    relatedAssetIds?: string[];
    businessProcesses?: string[];
    regulations?: string[];
    riskScore?: number;
    vulnerabilityCount?: number;
    complianceStatus?: AssetComplianceStatus;
    maintenanceWindow?: MaintenanceWindow;
    lastInventoryAt?: string;
    decommissionedAt?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface AssetLocation {
    type: 'on_premise' | 'cloud' | 'colocated' | 'remote';
    datacenter?: string;
    rack?: string;
    zone?: string;
    region?: string;
    country?: string;
    cloudProvider?: 'azure' | 'aws' | 'gcp' | 'other';
    cloudRegion?: string;
    resourceGroup?: string;
}
export interface AssetNetworkInfo {
    hostname?: string;
    ipAddresses?: string[];
    macAddresses?: string[];
    subnet?: string;
    vlan?: string;
    fqdn?: string;
    ports?: AssetPort[];
    firewall?: string;
    networkZone?: string;
}
export interface AssetPort {
    number: number;
    protocol: 'tcp' | 'udp';
    service?: string;
    isOpen?: boolean;
}
export interface AssetHardwareInfo {
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    purchaseDate?: string;
    warrantyExpiresAt?: string;
    endOfLifeDate?: string;
    processorType?: string;
    memoryGB?: number;
    storageGB?: number;
    firmwareVersion?: string;
}
export interface AssetSoftwareInfo {
    operatingSystem?: string;
    osVersion?: string;
    patchLevel?: string;
    lastPatchedAt?: string;
    installedSoftware?: InstalledSoftware[];
}
export interface InstalledSoftware {
    name: string;
    vendor?: string;
    version?: string;
    licenseType?: string;
    installedAt?: string;
    endOfSupportDate?: string;
}
export interface AssetCloudInfo {
    provider?: 'azure' | 'aws' | 'gcp' | 'other';
    accountId?: string;
    subscriptionId?: string;
    resourceId?: string;
    resourceType?: string;
    region?: string;
    tags?: Record<string, string>;
    isManaged?: boolean;
    autoScalingEnabled?: boolean;
    backupEnabled?: boolean;
    monitoringEnabled?: boolean;
}
export interface AssetComplianceStatus {
    overallStatus: 'compliant' | 'non_compliant' | 'partially_compliant' | 'not_assessed';
    lastAssessedAt?: string;
    frameworks?: Record<string, 'compliant' | 'non_compliant' | 'partial'>;
    openFindings?: number;
    criticalFindings?: number;
}
export interface MaintenanceWindow {
    dayOfWeek?: number;
    startHour: number;
    endHour: number;
    timezone: string;
    blackoutDates?: string[];
}
export type CMDBRelationshipType = 'depends_on' | 'supports' | 'connects_to' | 'hosted_by' | 'uses' | 'provides' | 'owned_by' | 'backed_up_by';
export interface CMDBRelationship {
    relationshipId: string;
    tenantId: string;
    sourceAssetId: string;
    targetAssetId: string;
    type: CMDBRelationshipType;
    direction: 'unidirectional' | 'bidirectional';
    strength?: 'critical' | 'high' | 'medium' | 'low';
    description?: string;
    discoveredBy?: 'manual' | 'automated' | 'imported';
    discoveredAt?: string;
    validatedBy?: string;
    validatedAt?: string;
    isActive: boolean;
    createdAt: string;
}
export interface CMDBChangeRecord {
    changeId: string;
    assetId: string;
    tenantId: string;
    field: string;
    previousValue?: unknown;
    newValue?: unknown;
    changedBy: string;
    changedAt: string;
    source: 'manual' | 'automated_discovery' | 'api' | 'import';
    reason?: string;
}
export type DiscoveryScanStatus = 'scheduled' | 'running' | 'completed' | 'failed' | 'partial';
export interface AssetDiscoveryScan {
    scanId: string;
    tenantId: string;
    name?: string;
    scanner: string;
    scope?: string[];
    status: DiscoveryScanStatus;
    startedAt?: string;
    completedAt?: string;
    discoveredCount?: number;
    newAssets?: number;
    updatedAssets?: number;
    removedAssets?: number;
    errors?: string[];
    metadata?: Record<string, unknown>;
    scheduledAt?: string;
    createdBy: string;
    createdAt: string;
}
export interface AssetRiskProfile {
    assetId: string;
    tenantId: string;
    inherentRiskScore: number;
    residualRiskScore: number;
    criticality: AssetCriticality;
    threatExposure: 'high' | 'medium' | 'low';
    vulnerabilityRating: 'critical' | 'high' | 'medium' | 'low' | 'none';
    controlEffectiveness: 'effective' | 'partially_effective' | 'ineffective';
    linkedRiskIds?: string[];
    linkedControlIds?: string[];
    lastAssessedAt?: string;
    nextAssessmentDue?: string;
    calculatedAt: string;
}
export interface AssetFilter {
    type?: AssetType[];
    status?: AssetStatus[];
    criticality?: AssetCriticality[];
    environment?: AssetEnvironment[];
    dataClassification?: DataClassification[];
    ownerId?: string[];
    orgUnitId?: string;
    tags?: string[];
    cloudProvider?: string[];
}
export interface AssetInventoryStats {
    tenantId: string;
    totalAssets: number;
    activeAssets: number;
    criticalAssets: number;
    highRiskAssets: number;
    nonCompliantAssets: number;
    byType: Record<AssetType, number>;
    byEnvironment: Record<AssetEnvironment, number>;
    byCriticality: Record<AssetCriticality, number>;
    cloudVsOnPrem: {
        cloud: number;
        onPrem: number;
        colocated: number;
    };
    lastUpdatedAt: string;
}
export interface AssetRow {
    asset_id: string;
    tenant_id: string;
    name: string;
    description?: string;
    asset_type: string;
    classification: string;
    criticality: string;
    owner_id: string;
    location?: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by?: string;
    deleted_at?: string | null;
}
export interface AssetCreateInput {
    tenant_id: string;
    name: string;
    description?: string;
    asset_type: string;
    classification: string;
    criticality: string;
    owner_id: string;
    location?: string;
    created_by: string;
}
export interface AssetUpdateInput {
    name: string;
    description?: string;
    asset_type: string;
    classification: string;
    criticality: string;
    owner_id: string;
    location?: string;
    updated_by: string;
}
export interface AssetListFilter {
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'ASC' | 'DESC';
}
export interface AssetListResult {
    rows: Asset[];
    total: number;
}
export declare const ASSET_STATUSES: readonly AssetStatus[];
export type AssetSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export declare const ASSET_SOURCES: readonly AssetSource[];
export type AssetStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';
export interface AssetEventPayload {
    tenantId: string;
    entityType: string;
    entityId: string;
    moduleCode: 'asset';
    triggeredBy: string;
    timestamp: string;
    correlationId: string;
    eventVersion: number;
    previousState?: AssetStatus;
    newState?: AssetStatus;
    data: Record<string, unknown>;
}

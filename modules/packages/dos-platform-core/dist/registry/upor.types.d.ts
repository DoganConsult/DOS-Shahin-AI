/**
 * UPOR Types — Unified Platform Object Registry
 * Dr-Dogan-AGRC-OS / Shahin-AI GRC Platform
 *
 * Shared TypeScript types for the registry service, routes, and tests.
 */
export type PlatformObjectStatus = 'draft' | 'active' | 'beta' | 'disabled' | 'deprecated' | 'retired';
/** Statuses that can never be surfaced in effective output, even with a tenant override */
export declare const HARD_BLOCK_STATUSES: Set<PlatformObjectStatus>;
/** Statuses eligible for the effective resolver */
export declare const ELIGIBLE_STATUSES: Set<PlatformObjectStatus>;
export type LoaderStrategy = 'lazy' | 'eager' | 'remote';
export type DefaultEnableMode = 'on' | 'off';
export type ModuleActivationSource = 'component_overrides' | 'module_workflow_registry';
export type AuditChangeType = 'ENABLED' | 'DISABLED' | 'REORDERED' | 'CONFIG_CHANGED' | 'LABEL_CHANGED' | 'VERSION_BUMPED' | 'DEPRECATED';
export interface PlatformObject {
    uuid: string;
    id: string;
    code: string;
    name: string;
    type: string;
    kind: string;
    layer: string;
    ownerType: string;
    ownerCode: string;
    status: PlatformObjectStatus;
    version: string;
    registryVersion: number;
    description: string;
    scope: string;
    sourceOfTruth: string;
    specRef: string | null;
    dependsOn: string[];
    usedBy: string[];
    permissions: string[];
    featureFlags: string[];
    tags: string[];
    auditEnabled: boolean;
    telemetryEnabled: boolean;
    telemetryKey: string | null;
    introducedInBuild: string | null;
    retiredInBuild: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface ComponentCatalogRow {
    objectUuid: string;
    csn: string;
    componentKey: string;
    selector: string | null;
    routePath: string | null;
    parentObjectUuid: string | null;
    sortOrder: number;
    isRuntimeEnabled: boolean;
    isTenantOverridable: boolean;
    capabilities: Record<string, unknown>;
    uiMetadata: Record<string, unknown>;
    configSchemaRef: string | null;
    contractRef: string | null;
    loaderStrategy: LoaderStrategy;
    allowlistGroup: string | null;
    i18nKey: string | null;
    testId: string | null;
    defaultEnableMode: DefaultEnableMode;
    compatibilityRules: Record<string, unknown>;
    rolloutGroup: string | null;
    moduleActivationSource: ModuleActivationSource;
    createdAt: string;
    updatedAt: string;
}
export interface ComponentOverrideRow {
    uuid: string;
    tenantId: string;
    componentObjectUuid: string;
    isEnabled: boolean;
    sortOrder: number | null;
    configOverride: Record<string, unknown>;
    labelOverride: string | null;
    i18nKeyOverride: string | null;
    enabledAt: string | null;
    enabledBy: string | null;
    disabledAt: string | null;
    disabledBy: string | null;
    createdAt: string;
    updatedAt: string;
}
/**
 * Result of the 7-gate resolver. This is what the frontend receives.
 * Merges catalog defaults with tenant override values.
 */
export interface EffectiveComponent {
    csn: string;
    objectId: string;
    componentKey: string;
    routePath: string | null;
    name: string;
    type: string;
    kind: string;
    layer: string;
    ownerCode: string;
    sortOrder: number;
    loaderStrategy: LoaderStrategy;
    allowlistGroup: string | null;
    i18nKey: string | null;
    testId: string | null;
    capabilities: Record<string, unknown>;
    uiMetadata: Record<string, unknown>;
    configOverride: Record<string, unknown>;
    labelOverride: string | null;
    moduleActivationSource: ModuleActivationSource;
    specRef: string | null;
    rolloutGroup: string | null;
    _resolverGates: {
        catalogStatus: PlatformObjectStatus;
        runtimeEnabled: boolean;
        defaultEnableMode: DefaultEnableMode;
        moduleActive: boolean;
        tenantOverridePresent: boolean;
        tenantOverrideEnabled: boolean;
    };
}
export interface DependencyResult {
    objectId: string;
    csn: string | null;
    upstream: PlatformObject[];
    downstream: PlatformObject[];
}
export interface AuditWriteInput {
    tenantId: string;
    componentObjectUuid: string;
    csn: string;
    changeType: AuditChangeType;
    changedBy: string;
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
    reason?: string;
}
export interface CatalogSearchFilter {
    type?: string;
    layer?: string;
    ownerCode?: string;
    status?: PlatformObjectStatus;
    kind?: string;
    allowlistGroup?: string;
    moduleCode?: string;
    specRef?: string;
    tag?: string;
    rolloutGroup?: string;
    limit?: number;
    offset?: number;
}
export interface EnableComponentInput {
    tenantId: string;
    csn: string;
    changedBy: string;
    reason?: string;
}
export interface DisableComponentInput {
    tenantId: string;
    csn: string;
    changedBy: string;
    reason?: string;
}
export interface SetConfigOverrideInput {
    tenantId: string;
    csn: string;
    config: Record<string, unknown>;
    changedBy: string;
    reason?: string;
}
export interface ReorderComponentInput {
    tenantId: string;
    csn: string;
    sortOrder: number;
    changedBy: string;
}
export interface GetEffectiveInput {
    tenantId: string;
    layer?: string;
    type?: string;
    activeModules?: string[];
}

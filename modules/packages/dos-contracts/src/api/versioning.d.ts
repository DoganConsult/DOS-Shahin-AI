export type ApiVersionStatus = 'current' | 'deprecated' | 'sunset' | 'experimental';
export interface ApiVersion {
    version: string;
    status: ApiVersionStatus;
    releasedAt: string;
    deprecatedAt?: string;
    sunsetAt?: string;
    changelog?: string;
}
export interface VersionedApiContract {
    route: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    versions: ApiVersionEntry[];
    ownerScope: 'platform' | 'product' | 'module';
    moduleCode?: string;
}
export interface ApiVersionEntry {
    version: string;
    status: ApiVersionStatus;
    requestSchema?: string;
    responseSchema?: string;
    breaking?: boolean;
    migrationGuide?: string;
}
export interface ApiDeprecationPolicy {
    minDeprecationNoticeMs: number;
    sunsetGracePeriodMs: number;
    requireMigrationGuide: boolean;
    notifyOnDeprecatedUsage: boolean;
}
export declare const DEFAULT_DEPRECATION_POLICY: ApiDeprecationPolicy;
export interface VersionNegotiationResult {
    resolvedVersion: string;
    requestedVersion?: string;
    isDeprecated: boolean;
    sunsetDate?: string;
    warnings: string[];
}
export declare function negotiateVersion(contract: VersionedApiContract, requestedVersion?: string): VersionNegotiationResult;
export declare function validateDeprecation(entry: ApiVersionEntry, deprecationDate: Date, policy?: ApiDeprecationPolicy): string[];

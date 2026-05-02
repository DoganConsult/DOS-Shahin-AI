/**
 * Workspace Profile Runtime Service — Resolves workspace profiles at runtime.
 *
 * Provides the canonical resolution of a workspace's effective features, modules,
 * theme/branding config, and capabilities by combining product entitlements,
 * tenant config, and workspace-level overrides.
 *
 * An in-memory cache layer avoids repeated DB lookups for hot-path reads.
 */
export interface WorkspaceProfile {
    workspaceId: string;
    tenantId: string;
    displayName: string;
    description: string | null;
    locale: string;
    timezone: string;
    enabledModules: string[];
    features: Record<string, boolean>;
    theme: WorkspaceTheme;
    capabilities: string[];
    metadata: Record<string, unknown>;
    updatedAt: string;
}
export interface WorkspaceTheme {
    primaryColor: string | null;
    logoUrl: string | null;
    faviconUrl: string | null;
    brandName: string | null;
    customCss: string | null;
}
export interface WorkspaceCapability {
    capabilityCode: string;
    source: 'product' | 'module' | 'tenant_override';
    isEnabled: boolean;
}
/**
 * Resolve the full runtime profile for a workspace, including modules, features,
 * theme, and capabilities. Uses a short-lived in-memory cache.
 */
export declare function resolveWorkspaceProfile(tenantId: string, workspaceId: string): Promise<WorkspaceProfile | null>;
/**
 * Resolve effective feature flags for a workspace by merging tenant-level
 * flags with workspace-level overrides.
 */
export declare function getEffectiveFeatures(tenantId: string, workspaceId: string): Promise<Record<string, boolean>>;
/**
 * Get the list of module codes enabled for a workspace. Combines product-level
 * entitlements with workspace-level module enablement.
 */
export declare function getWorkspaceModules(tenantId: string, workspaceId: string): Promise<string[]>;
/**
 * Get the branding/theme configuration for a workspace. Falls back to
 * tenant-level branding if no workspace-specific theme is configured.
 */
export declare function getWorkspaceTheme(tenantId: string, workspaceId: string): Promise<WorkspaceTheme>;
/**
 * Update workspace profile fields. Only provided fields are updated.
 */
export declare function updateWorkspaceProfile(tenantId: string, workspaceId: string, profile: Partial<WorkspaceProfile>): Promise<WorkspaceProfile | null>;
/**
 * Clear the cached profile for a workspace, forcing the next resolve call
 * to read fresh data from the database.
 */
export declare function invalidateProfileCache(tenantId: string, workspaceId: string): void;
/**
 * Resolve the effective capabilities for a workspace by combining product-level
 * entitlements, module-granted capabilities, and tenant-level overrides.
 */
export declare function getWorkspaceCapabilities(tenantId: string, workspaceId: string): Promise<string[]>;

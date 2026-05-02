/**
 * Config Boundary — ownership classification for all configuration fields.
 *
 * HIERARCHY SEPARATION RULES:
 *   - environment/deployment: infrastructure, never tenant-visible
 *   - product: product defaults (Shahin-specific), separate from tenant overrides
 *   - tenant: per-customer overrides only (branding, toggles, preferences)
 *   - workspace: workspace-level settings (subset of tenant)
 *   - onboarding: onboarding-flow-specific settings
 *   - ai_provider: AI provider keys and model selection
 *
 * CRITICAL: tenant config ≠ product config ≠ environment config
 * See platform/hierarchy-contracts.ts for full hierarchy.
 */
export type ConfigOwner = 'environment' | 'deployment' | 'tenant' | 'workspace' | 'product' | 'onboarding' | 'ai_provider' | 'deprecated';
export interface DeprecationMetadata {
    removalVersion: string;
    replacementKey?: string;
    rationale: string;
}
export interface ConfigFieldEntry {
    key: string;
    owner: ConfigOwner;
    description: string;
    sensitive: boolean;
    mutable: boolean;
    deprecation?: DeprecationMetadata;
}
export declare const CONFIG_OWNERSHIP_MAP: ConfigFieldEntry[];
export declare const VALID_SERVER_ROLES: readonly ["web", "web+jobs", "jobs-only"];
export type ServerRole = typeof VALID_SERVER_ROLES[number];
export declare const VALID_TOPOLOGIES: readonly ["single-node", "multi-node"];
export type ProductionTopology = typeof VALID_TOPOLOGIES[number];
export declare function getServerRole(): ServerRole;
export declare function getProductionTopology(): ProductionTopology;
export declare function isSchedulerEnabled(): boolean;
export declare function isMigrationOwner(): boolean;
export declare function getConfigFieldsByOwner(owner: ConfigOwner): ConfigFieldEntry[];
export declare function getConfigFieldOwner(key: string): ConfigOwner | undefined;
export declare function isEnvironmentSecret(key: string): boolean;
export declare function isTenantVisibleConfig(key: string): boolean;
export declare function isTenantForbiddenConfig(key: string): boolean;
export declare function isProductConfig(key: string): boolean;
export declare function validateConfigBoundarySeparation(): string[];

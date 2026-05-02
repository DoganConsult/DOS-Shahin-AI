import type { DashboardConfig } from '../misc/analytics.types';
/**
 * Upserts a dashboard configuration for a user.
 * Uses INSERT ON CONFLICT to update if a config already exists for the user.
 */
export declare function saveDashboardConfig(tenantId: string, userId: string, config: DashboardConfig): Promise<void>;
/**
 * Retrieves the dashboard configuration for a user.
 * Returns null if no configuration exists.
 */
export declare function getDashboardConfig(tenantId: string, userId: string): Promise<DashboardConfig | null>;
/**
 * Serializes a DashboardConfig to a JSON string.
 * Produces a deterministic output with ordered keys.
 */
export declare function serializeDashboardConfig(config: DashboardConfig): string;
/**
 * Deserializes a JSON string back into a DashboardConfig object.
 */
export declare function deserializeDashboardConfig(json: string): DashboardConfig;

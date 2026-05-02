/**
 * Workspace Profile Runtime Service — Resolves workspace profiles at runtime.
 *
 * Provides the canonical resolution of a workspace's effective features, modules,
 * theme/branding config, and capabilities by combining product entitlements,
 * tenant config, and workspace-level overrides.
 *
 * An in-memory cache layer avoids repeated DB lookups for hot-path reads.
 */

import {  safeQuery, tenantSchema } from '@dos/db';
import { logger } from '../observability/logger';

// ── Types ──

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

// ── In-memory profile cache (keyed by tenantId:workspaceId) ──

const profileCache = new Map<string, { profile: WorkspaceProfile; cachedAt: number }>();
const CACHE_TTL_MS = 60_000; // 60 seconds

function cacheKey(tenantId: string, workspaceId: string): string {
  return `${tenantId}:${workspaceId}`;
}

function getCachedProfile(tenantId: string, workspaceId: string): WorkspaceProfile | null {
  const entry = profileCache.get(cacheKey(tenantId, workspaceId));
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    profileCache.delete(cacheKey(tenantId, workspaceId));
    return null;
  }
  return entry.profile;
}

function setCachedProfile(tenantId: string, workspaceId: string, profile: WorkspaceProfile): void {
  profileCache.set(cacheKey(tenantId, workspaceId), { profile, cachedAt: Date.now() });
}

// ── Service Functions ──

/**
 * Resolve the full runtime profile for a workspace, including modules, features,
 * theme, and capabilities. Uses a short-lived in-memory cache.
 */
export async function resolveWorkspaceProfile(
  tenantId: string,
  workspaceId: string,
): Promise<WorkspaceProfile | null> {
  const cached = getCachedProfile(tenantId, workspaceId);
  if (cached) return cached;

  try {
    // Load base workspace profile record
    const { rows } = await safeQuery(
      `SELECT workspace_id, tenant_id, display_name, description, locale, timezone,
              COALESCE(metadata, '{}'::jsonb) AS metadata, updated_at
       FROM workspace_profiles
       WHERE workspace_id = $1 AND tenant_id = $2
       LIMIT 1`,
      [workspaceId, tenantId],
    );

    // Fall back to workspace table if no dedicated profile record exists
    if (!rows[0]) {
      const { rows: wsRows } = await safeQuery(
        `SELECT workspace_id, tenant_id, name, settings, created_at
         FROM workspaces
         WHERE workspace_id = $1 AND tenant_id = $2 LIMIT 1`,
        [workspaceId, tenantId],
      );
      if (!wsRows[0]) return null;

      const ws = wsRows[0];
      const modules = await getWorkspaceModules(tenantId, workspaceId);
      const features = await getEffectiveFeatures(tenantId, workspaceId);
      const theme = await getWorkspaceTheme(tenantId, workspaceId);
      const capabilities = await getWorkspaceCapabilities(tenantId, workspaceId);

      const profile: WorkspaceProfile = {
        workspaceId: ws.workspace_id,
        tenantId: ws.tenant_id,
        displayName: ws.name ?? '',
        description: null,
        locale: 'en',
        timezone: 'UTC',
        enabledModules: modules,
        features,
        theme,
        capabilities,
        metadata: ws.settings ?? {},
        updatedAt: ws.created_at?.toISOString?.() ?? '',
      };
      setCachedProfile(tenantId, workspaceId, profile);
      return profile;
    }

    const r = rows[0];
    const modules = await getWorkspaceModules(tenantId, workspaceId);
    const features = await getEffectiveFeatures(tenantId, workspaceId);
    const theme = await getWorkspaceTheme(tenantId, workspaceId);
    const capabilities = await getWorkspaceCapabilities(tenantId, workspaceId);

    const profile: WorkspaceProfile = {
      workspaceId: r.workspace_id,
      tenantId: r.tenant_id,
      displayName: r.display_name ?? '',
      description: r.description ?? null,
      locale: r.locale ?? 'en',
      timezone: r.timezone ?? 'UTC',
      enabledModules: modules,
      features,
      theme,
      capabilities,
      metadata: r.metadata ?? {},
      updatedAt: r.updated_at?.toISOString?.() ?? r.updated_at ?? '',
    };
    setCachedProfile(tenantId, workspaceId, profile);
    return profile;
  } catch (err: any) {

    logger.error(`[WorkspaceProfileRuntime] Failed to resolve profile for workspace ${workspaceId}: ${err.message}`);
    return null;
  }
}

/**
 * Resolve effective feature flags for a workspace by merging tenant-level
 * flags with workspace-level overrides.
 */
export async function getEffectiveFeatures(
  tenantId: string,
  workspaceId: string,
): Promise<Record<string, boolean>> {
  const features: Record<string, boolean> = {};

  try {
    // Tenant-level feature flags (baseline)
    const schema = tenantSchema(tenantId);
    const { rows: tenantFlags } = await safeQuery(
      `SELECT feature_key, enabled FROM "${schema}".feature_flags
       WHERE (product_code IS NOT NULL OR product_code IS NULL)
       ORDER BY feature_key`,
      [],
    );
    for (const row of tenantFlags) {
      features[row.feature_key] = row.enabled === true;
    }
  } catch {
    // feature_flags table may not exist in tenant schema
  }

  try {
    // Workspace-level overrides take precedence
    const { rows: wsFlags } = await safeQuery(
      `SELECT feature_key, enabled FROM workspace_feature_overrides
       WHERE workspace_id = $1 AND tenant_id = $2
       ORDER BY feature_key`,
      [workspaceId, tenantId],
    );
    for (const row of wsFlags) {
      features[row.feature_key] = row.enabled === true;
    }
  } catch {
    // workspace_feature_overrides table may not exist
  }

  return features;
}

/**
 * Get the list of module codes enabled for a workspace. Combines product-level
 * entitlements with workspace-level module enablement.
 */
export async function getWorkspaceModules(
  tenantId: string,
  workspaceId: string,
): Promise<string[]> {
  try {
    // First try workspace-specific module assignments
    const { rows: wsModules } = await safeQuery(
      `SELECT module_code FROM workspace_modules
       WHERE workspace_id = $1 AND tenant_id = $2 AND is_enabled = TRUE
       ORDER BY module_code`,
      [workspaceId, tenantId],
    );
    if (wsModules.length > 0) {
      return wsModules.map(( r: Record<string, any>) => r.module_code);
    }

    // Fall back to tenant-level module entitlements
    const { rows: tenantModules } = await safeQuery(
      `SELECT module_code FROM public.module_operating_states
       WHERE tenant_id = $1 AND is_active = TRUE
       ORDER BY module_code`,
      [tenantId],
    );
    return tenantModules.map(( r: Record<string, any>) => r.module_code);
  } catch (err: any) {

    logger.error(`[WorkspaceProfileRuntime] Failed to get modules for workspace ${workspaceId}: ${err.message}`);
    return [];
  }
}

/**
 * Get the branding/theme configuration for a workspace. Falls back to
 * tenant-level branding if no workspace-specific theme is configured.
 */
export async function getWorkspaceTheme(
  tenantId: string,
  workspaceId: string,
): Promise<WorkspaceTheme> {
  const defaultTheme: WorkspaceTheme = {
    primaryColor: null,
    logoUrl: null,
    faviconUrl: null,
    brandName: null,
    customCss: null,
  };

  try {
    // Workspace-level theme
    const { rows: wsThemeRows } = await safeQuery(
      `SELECT primary_color, logo_url, favicon_url, brand_name, custom_css
       FROM workspace_themes
       WHERE workspace_id = $1 AND tenant_id = $2
       LIMIT 1`,
      [workspaceId, tenantId],
    );
    if (wsThemeRows[0]) {
      const t = wsThemeRows[0];
      return {
        primaryColor: t.primary_color ?? null,
        logoUrl: t.logo_url ?? null,
        faviconUrl: t.favicon_url ?? null,
        brandName: t.brand_name ?? null,
        customCss: t.custom_css ?? null,
      };
    }

    // Fall back to tenant-level branding
    const { rows: tenantThemeRows } = await safeQuery(
      `SELECT primary_color, logo_url, favicon_url, brand_name, custom_css
       FROM tenant_branding
       WHERE tenant_id = $1
       LIMIT 1`,
      [tenantId],
    );
    if (tenantThemeRows[0]) {
      const t = tenantThemeRows[0];
      return {
        primaryColor: t.primary_color ?? null,
        logoUrl: t.logo_url ?? null,
        faviconUrl: t.favicon_url ?? null,
        brandName: t.brand_name ?? null,
        customCss: t.custom_css ?? null,
      };
    }

    return defaultTheme;
  } catch (err: any) {

    logger.error(`[WorkspaceProfileRuntime] Failed to get theme for workspace ${workspaceId}: ${err.message}`);
    return defaultTheme;
  }
}

/**
 * Update workspace profile fields. Only provided fields are updated.
 */
export async function updateWorkspaceProfile(
  tenantId: string,
  workspaceId: string,
  profile: Partial<WorkspaceProfile>,
): Promise<WorkspaceProfile | null> {
  const sets: string[] = [];
  const params: unknown[] = [workspaceId, tenantId];
  let idx = 3;

  if (profile.displayName !== undefined) {
    sets.push(`display_name = $${idx++}`);
    params.push(profile.displayName);
  }
  if (profile.description !== undefined) {
    sets.push(`description = $${idx++}`);
    params.push(profile.description);
  }
  if (profile.locale !== undefined) {
    sets.push(`locale = $${idx++}`);
    params.push(profile.locale);
  }
  if (profile.timezone !== undefined) {
    sets.push(`timezone = $${idx++}`);
    params.push(profile.timezone);
  }
  if (profile.metadata !== undefined) {
    sets.push(`metadata = $${idx++}`);
    params.push(JSON.stringify(profile.metadata));
  }

  if (sets.length === 0) {
    return resolveWorkspaceProfile(tenantId, workspaceId);
  }

  sets.push(`updated_at = NOW()`);

  try {
    // Upsert: create profile record if it does not exist yet
    await safeQuery(
      `INSERT INTO workspace_profiles (workspace_id, tenant_id, display_name, updated_at)
       VALUES ($1, $2, '', NOW())
       ON CONFLICT (workspace_id, tenant_id) DO NOTHING`,
      [workspaceId, tenantId],
    );

    await safeQuery(
      `UPDATE workspace_profiles SET ${sets.join(', ')}
       WHERE workspace_id = $1 AND tenant_id = $2`,
      params,
    );

    logger.info(`[WorkspaceProfileRuntime] Updated profile for workspace ${workspaceId}`);

    // Invalidate cache after update
    invalidateProfileCache(tenantId, workspaceId);

    return resolveWorkspaceProfile(tenantId, workspaceId);
  } catch (err: any) {

    logger.error(`[WorkspaceProfileRuntime] Failed to update profile for workspace ${workspaceId}: ${err.message}`);
    throw err;
  }
}

/**
 * Clear the cached profile for a workspace, forcing the next resolve call
 * to read fresh data from the database.
 */
export function invalidateProfileCache(
  tenantId: string,
  workspaceId: string,
): void {
  const key = cacheKey(tenantId, workspaceId);
  const existed = profileCache.delete(key);
  if (existed) {
    logger.info(`[WorkspaceProfileRuntime] Cache invalidated for workspace ${workspaceId}`);
  }
}

/**
 * Resolve the effective capabilities for a workspace by combining product-level
 * entitlements, module-granted capabilities, and tenant-level overrides.
 */
export async function getWorkspaceCapabilities(
  tenantId: string,
  workspaceId: string,
): Promise<string[]> {
  const capabilitySet = new Set<string>();

  try {
    // Product-level capabilities from tenant entitlement
    const { rows: productCaps } = await safeQuery(
      `SELECT capability_code FROM product_capabilities
       WHERE tenant_id = $1 AND is_enabled = TRUE
       ORDER BY capability_code`,
      [tenantId],
    );
    for (const row of productCaps) {
      capabilitySet.add(row.capability_code);
    }
  } catch {
    // product_capabilities table may not exist
  }

  try {
    // Module-level capabilities based on enabled workspace modules
    const modules = await getWorkspaceModules(tenantId, workspaceId);
    if (modules.length > 0) {
      const placeholders = modules.map((_, i) => `$${i + 1}`).join(', ');
      const { rows: modCaps } = await safeQuery(
        `SELECT DISTINCT capability_code FROM module_capabilities
         WHERE module_code IN (${placeholders}) AND is_enabled = TRUE`,
        modules,
      );
      for (const row of modCaps) {
        capabilitySet.add(row.capability_code);
      }
    }
  } catch {
    // module_capabilities table may not exist
  }

  try {
    // Workspace-level capability overrides (can add or remove)
    const { rows: wsOverrides } = await safeQuery(
      `SELECT capability_code, is_enabled FROM workspace_capability_overrides
       WHERE workspace_id = $1 AND tenant_id = $2`,
      [workspaceId, tenantId],
    );
    for (const row of wsOverrides) {
      if (row.is_enabled === true) {
        capabilitySet.add(row.capability_code);
      } else {
        capabilitySet.delete(row.capability_code);
      }
    }
  } catch {
    // workspace_capability_overrides table may not exist
  }

  return Array.from(capabilitySet).sort();
}

/**
 * DAuth Admin Role Resolver — DB-driven admin role classification.
 *
 * Replaces hardcoded ADMIN_ROLES / FULL_ACCESS_PROFILES Sets scattered
 * across platform services. Queries access_profiles table with TTL cache.
 *
 * Law 3: Data-driven security.
 */
import { safeQuery, tenantSchema } from '@dos/db';

interface AdminRoleCache {
  adminProfiles: Set<string>;
  fullAccessProfiles: Set<string>;
  ts: number;
}

const CACHE_TTL = 120_000; // 2 minutes
const cache = new Map<string, AdminRoleCache>();

/** Fallback used during bootstrap when DB tables may not exist yet. */
const FALLBACK_ADMIN_PROFILES = new Set(['tenant_admin', 'platform_super_admin', 'owner', 'admin']);
const FALLBACK_FULL_ACCESS = new Set(['platform_super_admin', 'tenant_admin', 'module_admin']);

async function loadAdminRoles(tenantId: string): Promise<AdminRoleCache> {
  const cached = cache.get(tenantId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached;

  try {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT code, is_admin, grants_full_module_access
       FROM "${schema}".access_profiles
       WHERE (is_admin = TRUE OR grants_full_module_access = TRUE)`,
    );

    const adminProfiles = new Set<string>();
    const fullAccessProfiles = new Set<string>();

    for (const row of rows) {
      if (row.is_admin) adminProfiles.add(row.code);
      if (row.grants_full_module_access) fullAccessProfiles.add(row.code);
    }

    const entry: AdminRoleCache = { adminProfiles, fullAccessProfiles, ts: Date.now() };
    cache.set(tenantId, entry);
    return entry;
  } catch {
    return { adminProfiles: FALLBACK_ADMIN_PROFILES, fullAccessProfiles: FALLBACK_FULL_ACCESS, ts: 0 };
  }
}

/** Check if a profile code grants admin-level access. */
export async function isAdminProfile(tenantId: string, profileCode: string): Promise<boolean> {
  const { adminProfiles } = await loadAdminRoles(tenantId);
  return adminProfiles.has(profileCode);
}

/** Check if a profile code grants full module visibility. */
export async function isFullAccessProfile(tenantId: string, profileCode: string): Promise<boolean> {
  const { fullAccessProfiles } = await loadAdminRoles(tenantId);
  return fullAccessProfiles.has(profileCode);
}

/** Get all admin profile codes for a tenant. */
export async function getAdminProfiles(tenantId: string): Promise<Set<string>> {
  const { adminProfiles } = await loadAdminRoles(tenantId);
  return adminProfiles;
}

/** Get all full-access profile codes for a tenant. */
export async function getFullAccessProfiles(tenantId: string): Promise<Set<string>> {
  const { fullAccessProfiles } = await loadAdminRoles(tenantId);
  return fullAccessProfiles;
}

/** Invalidate cache. */
export function invalidateAdminRoleCache(tenantId?: string): void {
  if (tenantId) cache.delete(tenantId);
  else cache.clear();
}

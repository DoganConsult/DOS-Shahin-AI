/**
 * Role-Permission Lookup Service — DB-driven, cached
 *
 * REPLACES all hardcoded ROLE_PERMISSIONS maps across the codebase.
 * Canonical source: DAuth role_permissions + functional_roles + permissions tables.
 *
 * Law 3: Data-driven security — permissions from registries, not hardcoded.
 * Law 2: DAuth is the single owner of permission truth.
 *
 * @owner DAuth
 */
import { safeQuery, tenantSchema } from '@dos/db';
import { logger } from '@dos/platform-core/observability';

// ── In-memory cache with TTL ────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  permissions: string[];
  cachedAt: number;
}

/** tenantId::roleCode → permission codes */
const cache = new Map<string, CacheEntry>();

function cacheKey(tenantId: string, roleCode: string): string {
  return `${tenantId}::${roleCode}`;
}

function getCached(tenantId: string, roleCode: string): string[] | null {
  const entry = cache.get(cacheKey(tenantId, roleCode));
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    cache.delete(cacheKey(tenantId, roleCode));
    return null;
  }
  return entry.permissions;
}

function setCache(tenantId: string, roleCode: string, permissions: string[]): void {
  cache.set(cacheKey(tenantId, roleCode), { permissions, cachedAt: Date.now() });
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Get all permission codes for a functional role from DB.
 * Results are cached for 5 minutes per tenant+role.
 */
export async function getRolePermissionCodes(tenantId: string, roleCode: string): Promise<string[]> {
  const cached = getCached(tenantId, roleCode);
  if (cached) return cached;

  try {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT DISTINCT p.permission_code
       FROM "${schema}".role_permissions rp
       JOIN "${schema}".functional_roles fr ON fr.role_id = rp.role_id
       JOIN "${schema}".permissions p ON p.permission_code = rp.permission_code
       WHERE fr.role_code = $1 AND p.is_active = TRUE AND fr.is_active = TRUE
       ORDER BY p.permission_code`,
      [roleCode],
    );
    const codes = rows.map(( r: Record<string, any>) => r.permission_code as string);
    setCache(tenantId, roleCode, codes);
    return codes;
  } catch (err) {
    logger.warn(`[RolePermissionLookup] Failed to load permissions for role "${roleCode}": ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

/**
 * Check if a role has a specific permission (DB-driven).
 */
export async function hasRolePermission(tenantId: string, roleCode: string, permissionCode: string): Promise<boolean> {
  const codes = await getRolePermissionCodes(tenantId, roleCode);
  return codes.includes(permissionCode);
}

/**
 * Get all permission codes for multiple roles (union), useful for users with multiple roles.
 */
export async function getEffectivePermissionCodes(tenantId: string, roleCodes: string[]): Promise<string[]> {
  const allPerms = new Set<string>();
  for (const role of roleCodes) {
    const perms = await getRolePermissionCodes(tenantId, role);
    for (const p of perms) allPerms.add(p);
  }
  return Array.from(allPerms).sort();
}

/**
 * Invalidate cache for a tenant (call after role/permission changes).
 */
export function invalidateRolePermissionCache(tenantId?: string): void {
  if (tenantId) {
    for (const key of cache.keys()) {
      if (key.startsWith(`${tenantId}::`)) cache.delete(key);
    }
  } else {
    cache.clear();
  }
}

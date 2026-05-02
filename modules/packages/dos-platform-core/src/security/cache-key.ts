/**
 * Canonical tenant-prefixed cache key helper (Phase 11.1).
 *
 * Every Redis key that touches tenant-scoped data MUST flow through
 * `cacheKey()`. Tenant-agnostic caches (public config, global flags) use
 * `globalCacheKey()` so the `:global` segment is explicit — never implicit.
 *
 * Example:
 *   cacheKey('csrf', tenantId, 'policy')           → "csrf:tenant:<id>:policy"
 *   cacheKey('perm', tenantId, userId, 'module.X') → "perm:tenant:<id>:<user>:module.X"
 *   globalCacheKey('flags', 'captcha_required')    → "flags:global:captcha_required"
 */

export function cacheKey(namespace: string, tenantId: string, ...parts: Array<string | number>): string {
  if (!namespace || !tenantId) {
    throw new Error('cacheKey: namespace and tenantId are required');
  }
  const safeParts = parts.filter((p) => p !== undefined && p !== null && p !== '');
  return [namespace, 'tenant', tenantId, ...safeParts.map(String)].join(':');
}

export function globalCacheKey(namespace: string, ...parts: Array<string | number>): string {
  if (!namespace) {
    throw new Error('globalCacheKey: namespace is required');
  }
  const safeParts = parts.filter((p) => p !== undefined && p !== null && p !== '');
  return [namespace, 'global', ...safeParts.map(String)].join(':');
}

/**
 * Returns `true` when `key` is prefixed with `<ns>:tenant:<id>:` or
 * `<ns>:global:`. Use this in tests / audits to guard against raw keys.
 */
export function isNamespacedCacheKey(key: string): boolean {
  return /^[A-Za-z0-9._-]+:(tenant:[^:]+|global):/u.test(key);
}

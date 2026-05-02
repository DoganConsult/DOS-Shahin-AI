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
export declare function cacheKey(namespace: string, tenantId: string, ...parts: Array<string | number>): string;
export declare function globalCacheKey(namespace: string, ...parts: Array<string | number>): string;
/**
 * Returns `true` when `key` is prefixed with `<ns>:tenant:<id>:` or
 * `<ns>:global:`. Use this in tests / audits to guard against raw keys.
 */
export declare function isNamespacedCacheKey(key: string): boolean;

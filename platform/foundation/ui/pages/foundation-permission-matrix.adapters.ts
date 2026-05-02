/**
 * Pure-TS adapters for the Foundation Permission Matrix page.
 * Kept Angular-free so they can be unit-tested under a plain Node vitest
 * environment without pulling Angular partial-compiled bundles.
 *
 * The component (foundation-permission-matrix.component.ts) re-exports these
 * so existing import sites (spec files, consumers) keep working.
 */

/**
 * Raw role shape accepted by the adapter. The backend contract is
 * `{ roles: [...] }`. Legacy `profiles` is intentionally NOT accepted — a
 * typed adapter + real error state replace the previous silent multi-shape
 * guessing.
 */
export interface RawFoundationRole {
  id?: string;
  code?: string;
  name_en?: string;
  is_system?: boolean;
  // Inline `permissions` on the role response is deliberately ignored — it
  // was used as a silent fallback when /roles/:code/permissions failed and
  // masked backend contract drift.
  [k: string]: unknown;
}

/** Single documented place where `/foundation/roles` is normalized. */
export function normalizeFoundationRoles(res: unknown): RawFoundationRole[] {
  if (!res || typeof res !== 'object') return [];
  const roles = (res as { roles?: unknown }).roles;
  return Array.isArray(roles) ? (roles as RawFoundationRole[]) : [];
}

/** Pure adapter for `/roles/:code/permissions` — `{ permissions: [...] }`. */
export function normalizeRolePermissions(res: unknown): string[] {
  if (!res || typeof res !== 'object') return [];
  const perms = (res as { permissions?: unknown }).permissions;
  if (!Array.isArray(perms)) return [];
  return perms.map((p) => String(p));
}

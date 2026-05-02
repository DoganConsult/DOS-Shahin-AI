// Active-module truth source.
//
// Foundation Horizontal Closure removed the hardcoded
// `ACTIVE_MODULE_ALLOWLIST = ['foundation']` shortcut. The SPA must now
// resolve module visibility from canonical backend truth:
//   GET /api/access/my-permissions → { modules: [...] }
// surfaced as `AccessStore.visibleModules()` and consumed by every
// nav/module-card/route gate.
//
// `ACTIVE_MODULE_ALLOWLIST` is intentionally an empty constant kept only
// for symbol-level backward compatibility with legacy imports. It MUST
// NOT be used as a positive allowlist anywhere new — those callers are
// being migrated to AccessStore.canAccessModule(...).

export const ACTIVE_MODULE_ALLOWLIST: ReadonlyArray<string> = Object.freeze([]);

/**
 * Pure normalizer for caller-supplied module-code lists. The hardcoded
 * Foundation-only clamp has been removed; this function now only:
 *   - lowercases each entry
 *   - drops null/empty values
 *   - de-duplicates
 *   - fails closed on the literal wildcard '*' (never expands to "all")
 *
 * Visibility filtering is the responsibility of the caller — typically
 * `AccessStore.canAccessModule(...)` against backend-resolved entitlements.
 */
export function intersectActiveModules(
  modules: ReadonlyArray<string> | undefined | null,
): string[] {
  if (!modules || modules.length === 0) return [];
  const out = new Set<string>();
  for (const m of modules) {
    if (m == null) continue;
    const lc = String(m).toLowerCase().trim();
    if (!lc) continue;
    if (lc === '*') continue; // fail-closed: never leak "all"
    out.add(lc);
  }
  return Array.from(out);
}

/**
 * Backward-compatible boolean helper. With the hardcoded allowlist
 * removed, this returns `true` for any non-empty code — the actual
 * gating decision belongs to `AccessStore.canAccessModule(...)` and the
 * route/nav guards that consume backend truth. Kept as a no-op shim so
 * legacy imports continue to compile while migration completes.
 */
export function isActiveModule(code: string | undefined | null): boolean {
  if (code == null) return false;
  const lc = String(code).toLowerCase().trim();
  return lc.length > 0;
}

// Capability gates for optional, non-Foundation widgets/services.
// Workspace-home and other shell components must consult these BEFORE
// calling capability-bound APIs (nudges, ai-os, kpi, integrations,
// module-kickstart). During Foundation-only bring-up every capability
// below is OFF — fail-closed, never call the underlying endpoint.
export const ACTIVE_CAPABILITIES: Readonly<Record<string, boolean>> = {
  nudges: false,
  aiOs: false,
  kpi: false,
  connectorHealth: false,
  moduleKickstart: false,
  journey: false,
  // Optional capabilities consumed by Foundation pages — fail-closed during
  // Foundation-only bring-up. Each maps to whole product capabilities, not
  // page-internal toggles.
  workflow: false,
  assets: false,
  analytics: false,
  integrations: false,
  realtime: false,
  agent: false,
  nba: false,
  runtimeHealth: false,
  configCenter: false,
};

export function isCapabilityActive(capability: string): boolean {
  return ACTIVE_CAPABILITIES[capability] === true;
}

"use strict";
/**
 * Workspace navigation contract — Dos-prefixed types.
 *
 * Companion to NavigationItemContract / NavigationContract (data-shape
 * for module-owned routes/perms in `navigation-contract.ts`). The Dos*
 * types here are the runtime/UI surface consumed by `DosWorkspaceNav`,
 * `DosNavSection`, `DosNavItem`. Product navigation adapters in
 * downstream apps (e.g. Shahin) MUST output `DosNavGroup[]` shaped here
 * — the UI components do not accept ad-hoc shapes.
 *
 * Why a parallel surface:
 *   - `NavigationItemContract` is for canonical module manifests
 *     (modules/<module>/contracts/navigation/...).
 *   - `DosNavItem` adds runtime concerns (active, enabled, disabledReason,
 *     badge, group label) that don't belong in static contracts.
 *   - Adapters (product layer) join the two: read manifests + access state,
 *     return DosNavGroup[].
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=nav-contract.js.map
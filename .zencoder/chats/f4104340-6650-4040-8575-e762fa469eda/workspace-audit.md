# Workspace `/workspace-home` — Hardcoded-String + Registry-Violation Audit

URL captured: `shahin-ai.com/workspace-home?denied=foundation-not-entitled`

## 1. Render-path map

```
/workspace-home (Shahin SPA route)
└─ products/shahin-ai/app/src/app/app.routes.ts:132
   └─ ShellHostComponent (platform/core/platform/shell/shell-host.component.ts)
      ├─ DosAppShell / DosMobileShell (@dos/ui-system)
      ├─ DosWorkspaceHeader  ← strings via WorkspaceNavLabelResolver.shellChromeString
      ├─ DosWorkspaceSidebar ← items via sidebarItems() computed
      │   └─ WorkspaceNavigationAdapter.navConfig() (@dos/access-store)
      │       ├─ L1 PlatformDnaNavSource
      │       ├─ L2 ModuleLibraryNavSource
      │       ├─ L3 DynamicUiNavSource (DB → dos.dynamic_ui_navigation)
      │       ├─ L4 ProductCompositionNavSource (Shahin product manifest)
      │       ├─ L5 AccessStoreNavSource
      │       └─ L6 SurvivalFallbackNavSource
      ├─ DosCommandSearch / DosInboxCenter / DosQuickCreate
      └─ <router-outlet/>
         └─ WorkspaceHomeComponent (platform/foundation/ui/workspace/workspace-home.component.ts)
            ├─ MODULE_META  (lines 42–180: HARDCODED EN-only titles + descriptions for 33 modules)
            ├─ MODULE_ROUTES (lines 199–210: HARDCODED route map)
            ├─ MODULE_REGISTRY_CODES (lines 216–223: HARDCODED registry mirror)
            ├─ MODULE_ORDER  (lines 228–235: HARDCODED ordering)
            └─ template strings (eyebrow / status / CTA / status pills): all HARDCODED EN
```

Resolver implementations:
- `products/shahin-ai/app/src/app/shell/workspace-resolver.service.ts`
  — `string()`, `navItemLabel()`, `navGroupLabel()`, `shellChromeString()`,
  with embedded `I18N` map (lines 108–~700) seeded EN + AR.
- The shell injects this through `WORKSPACE_NAV_LABEL_RESOLVER`.

## 2. Hardcoded-string table — workspace-home page chrome

| File:line | Current literal | Source-of-truth gap | Severity |
|---|---|---|---|
| `platform/foundation/ui/workspace/workspace-home.component.ts:264` | `'Workspace'` (eyebrow `<p>`) | Should use `workspace.eyebrow` via resolver | P1 |
| same file, `tenantName()` line 397 | fallback `'Workspace'` | Should use `shell.brand.fallback` | P1 |
| same file, `tenantStatusLabel()` line 402 | `'Tenant status pending'` and `` `Tenant ${t.status}` `` | Status labels hardcoded EN; no AR; not via `dos.entity_status_labels` or resolver | P1 |
| same file, `<p class="wh__sub">` line 269–275 | `'active'`, `'entitled'`, `'visible'`, `'permission(s)'` plurals; `&nbsp;·&nbsp;` separators | Hardcoded EN words inline; no plural rule for AR; visible in screenshot | P1 |
| same file, line 281–282 | `'Loading workspace…'`, `'Resolving entitled modules.'` | Resolver key needed (`workspace.loading*`) | P1 |
| same file, line 285 | `'Could not load workspace'` | Resolver key needed | P1 |
| same file, line 289 | `'No modules activated for this tenant'` | `workspace.empty.modules.title` exists in I18N — **wired but hardcoded duplicate** | P1 |
| same file, line 291 | `'Contact your workspace administrator to activate modules.'` | Needs `workspace.empty.modules.description` use | P1 |
| same file, line 293 | `'Open tenant profile →'` | Hardcoded EN incl. `→` glyph | P2 |
| same file, line 309 | `` `${n} module${...} need attention` `` | EN plural inline | P1 |
| same file, line 329 | `'Platform default'` | Hardcoded; visible in screenshot under Foundation card | P1 |
| same file, lines 343 / 446 / 451 / 456 / 461 / 466 | `'Open module'`, `'Trial expired'`, `'Limit reached'`, `'Registry drift'`, `'Not configured'`, `'Route not wired'` | All button labels EN-only; `'Open module'` visible in screenshot | P1 |
| same file, `statusLabel()` 512–520 | `'Active'`, `'Route missing'`, `'Metadata missing'`, `'Registry drift'`, `'Trial blocked'` | Status pill labels EN-only; `'Active'` tag visible in screenshot | P1 |
| same file, `MODULE_META` 42–180 | EN titles + descriptions for 33 modules | Should resolve through `module.<code>.title` / `.description` keys (which already exist for many in `workspace-resolver.service.ts` I18N) | **P0** |
| same file, `tagType()`, `MODULE_ROUTES`, `MODULE_REGISTRY_CODES`, `MODULE_ORDER` | hardcoded data structures | Should be sourced from `dos.dynamic_ui_modules` / `dos.module_registry` | P1 (data-DNA violation) |
| same file, lines 437, 443, 447, 452, 457, 462 | `statusReason` literals (`'Trial period has expired…'`, etc.) | EN-only | P1 |
| same file, line 449 | `` `Module '${code}' is entitled but has no entry…` `` | EN-only error message | P2 |

## 3. Hardcoded-string table — shell chrome (header/sidebar/breadcrumb)

| File:line | Current literal | Severity | Notes |
|---|---|---|---|
| `platform/core/platform/shell/shell-host.component.ts` | None hardcoded — every chrome string already resolves via `WorkspaceNavLabelResolver`; missing keys render empty | OK | Phase H comment block confirms this is intentional. **The strings are hardcoded *one layer down* in the resolver.** |
| `products/shahin-ai/app/src/app/shell/workspace-resolver.service.ts:108–~700` | Entire `I18N` map embedded in the resolver (`'Shahin'`, `'Workspace'`, every `shell.*`, `workspace.*`, `nav.item.*`, `nav.group.*`, etc.) | **P0** | Phase B Config OS calls for `dos.i18n_translations`-backed resolution; this map is the canonical hardcoded surface. ≈ 600+ keys. |
| `products/shahin-ai/app/src/app/shell/nav-sources/product-composition-nav.source.ts:38–55` | `MANIFEST_ICON_GLYPH` map of emoji icons | P2 | Should come from Carbon icon registry; `dos-icon` already in shell. Emoji glyphs violate UI-OS icon contract. |
| `products/shahin-ai/app/src/app/shell/nav-sources/product-composition-nav.source.ts:62` | fallback emoji `'📁'` | P2 | Same. |

## 4. Sidebar duplicate-label root cause

**Visible bug:** screenshot shows 5× `Identity` under `IDENTITY & ACCESS` and 7× `Marketing` under `MARKETING`. Each item in those two groups renders the same string.

**Mechanism** (traced through code):

1. `ShellHostComponent.label(item)` (shell-host.component.ts:652–659) calls
   `labelResolver.navItemLabel(direct || key, item.id)`.
2. `WorkspaceResolverService.navItemLabel()`
   (workspace-resolver.service.ts:783–821) resolves a label by:
   - direct `lookup(c)` if `c` is dot-free,
   - else `lookup('nav.item.' + c)`,
   - else `lookup('nav.item.' + firstSegmentOf(c))` (line 804–808).
3. **The third fallback is the bug.** When several nav items share the
   same `id` first segment (e.g. `identity.users`, `identity.roles`,
   `identity.teams`, `identity.access-review`, `identity.sso`), the
   adapter passes each through, and the resolver collapses ALL of them
   to whatever `nav.item.identity` returns — a single string. Result:
   every sibling row prints the same label.
4. The same applies to any group whose item ids share a prefix
   (`marketing.*` etc.), or whose `labelKey` follows the same
   `nav.item.<group>.<thing>` pattern but only `nav.item.<group>` is
   defined.

**Fix vector (no hardcoding):** the resolver's first-segment fallback
must be removed or gated. Correct behavior: missing key → return the
original `idOrLabel` segment-of-id verbatim (the existing humanize
path), or a clear "missing label" indicator that surfaces at runtime
so the gap is visible — never a same-string collapse for siblings.

**Origin of the IDENTITY & ACCESS / MARKETING groups:** static greps of
the workspace, `@dos/access-store`, `dos.dynamic_ui_navigation`,
`dos.dynamic_ui_modules`, and `dos.navigation_registry` find no
`identity-access` / `marketing` group labels. The runtime source must
be one of:

- a generated/seed file outside the searched paths,
- the live tenant's `dos.dynamic_ui_navigation` rows (the screenshot is
  from a tenant we did not query directly), or
- the config-center sidebar overlay that is composed by a separate
  service (not the workspace shell). The screenshot's URL is
  `/workspace-home`, and `CONFIG CENTER → Health / Compare` is a known
  config-center group, suggesting the config-center groups are leaking
  into the workspace shell sidebar via a NavSource.

→ This needs a 60-second runtime confirmation (devtools "redux/state"
inspection of `WorkspaceNavigationAdapter.navConfig()` for that
tenant) before the implementation step. **Flagged for user.**

## 5. UI-OS / Dynamic-UI / Config OS contract violations

| File | Violation | Fix category |
|---|---|---|
| `platform/foundation/ui/workspace/workspace-home.component.ts:1–11` | Imports `TilesModule, NotificationModule, ButtonModule, TagModule, LinkModule, GridModule` directly from `carbon-components-angular`. Per `AGENTS.md` UI-OS policy this is allowed only if `@dos/ui-system` does not yet wrap the primitive — every direct import must include a one-line comment naming the missing wrapper. None of these have that comment. The page should be replaced with `DosCard / DosMetricCard / DosStatusBanner / DosPageHeader / DosResponsiveGrid / DosAdaptiveCommandBar / DosEmptyState / DosLoadingState`. | UI-OS adoption (wave D) |
| `platform/foundation/ui/workspace/workspace-home.component.ts:42–235` | 4 hardcoded data-DNA constants (`MODULE_META`, `MODULE_ROUTES`, `MODULE_REGISTRY_CODES`, `MODULE_ORDER`) duplicate runtime data that DB owns (`dos.module_registry`, `dos.dynamic_ui_modules`, `dos.dynamic_ui_navigation`). Phase F DB-Driven UI Management explicitly forbids this — the workspace card list must be resolved by Dynamic-UI, not by hand-coded module metadata. | Dynamic-UI / Config OS (wave C) |
| `platform/foundation/ui/workspace/workspace-home.component.ts` | The Foundation route fallback `/foundation/overview` (line 200) is hardcoded; it must come from the foundation module manifest (`platform/foundation/contracts/ui.contract.json` already exists and is imported by the workspace-resolver). | Wave C |
| `products/shahin-ai/app/src/app/shell/workspace-resolver.service.ts` | The entire I18N map (≈600 keys) is hardcoded EN/AR inside an Angular service. Phase B Config OS specifies `dos.i18n_translations` as the source of truth — this service must read from a Config OS / i18n endpoint and cache it. The current header docstring even calls this out: "stub policy: i18n strings come from local EN/AR maps" (lines 13–22). | Config OS (wave A + C) |
| `products/shahin-ai/app/src/app/shell/workspace-resolver.service.ts:783–821` | `navItemLabel()` first-segment-fallback collapses sibling labels (root cause of the duplicate-label bug). | **P0 wave B** |
| `products/shahin-ai/app/src/app/shell/nav-sources/product-composition-nav.source.ts:38–62` | Emoji icon map. UI-OS shell uses Carbon icons through `dos-icon`. Emoji glyphs violate the icon contract and break Carbon-only boundary guard. | Wave D |
| `platform/core/platform/shell/shell-host.component.ts:56–58` | `FALLBACK_GROUP_ICON = 'layout-dashboard'` / `FALLBACK_ITEM_ICON = 'dot'` are hardcoded — should come from `dos.ui_icon_defaults` or design-tokens. | P2 |
| `platform/core/platform/shell/shell-host.component.ts:707, 710` | `setTitle(...)` builds the document title with a hardcoded `'—'` separator. Minor but should be a token. | P2 |
| Workspace cards button label `'Open module'` is hardcoded inline AND duplicates the i18n key `workspace.action.open` already defined in the resolver. | Resolver wiring missed in foundation page. | Wave A |

## 6. DB cross-check results

- `dos.dynamic_ui_navigation` — 28 rows for `foundation`, 22 for
  `compliance`, 14 `risk`, 10 `config-center`, etc. **No `identity` or
  `marketing` module_code rows in this DB.** The screenshot is
  presumably from a tenant whose `dos.dynamic_ui_navigation` (or a
  product-composition manifest) registers different groups.
- `dos.dynamic_ui_modules` — schema confirmed, no `label` column;
  module display titles must be sourced from `dos.dynamic_ui_navigation`
  or i18n catalog rather than `dynamic_ui_modules`.
- `dos.navigation_registry` — empty for `identity` / `marketing`.
- `dos.workspace_shell_binding` — 400 rows (40 tenants × 10 surfaces);
  not interrogated tenant-by-tenant for this audit.
- `dos.ui_carbon_components` — 247 rows verified from prior session.
  None of the workspace-home page primitives are missing a Carbon
  wrapper, so wave D is purely a swap of `cds-tile / cds-tag /
  cds-button` for the equivalent `@dos/ui-system` Dos* wrappers.

## 7. Screenshot defect summary

| Defect | Cause class |
|---|---|
| Sidebar shows 5× `Identity`, 7× `Marketing` | §4 `navItemLabel` first-segment collapse |
| Workspace eyebrow `WORKSPACE` and `Workspace` headline pinned to EN | §2 hardcoded literal in `workspace-home.component.ts:264` |
| Status line `Tenant status pending · 1 active · 0 entitled · 1 visible · 0 permissions` EN with English plurals | §2 hardcoded inline strings |
| Foundation card title `Foundation`, `Active` tag, description, `Platform default` note, `Open module` button — all EN | §2 `MODULE_META[foundation]` + `statusLabel()` + literal tile copy |
| `?denied=foundation-not-entitled` query param ignored (no banner) | Not in scope of this audit, but likely a missing `DosStatusBanner` consumer of the `denied` query — flagged as a wave-D follow-up. |

## 8. Severity ranking summary

- **P0 (must fix to call workspace-home production-grade):**
  1. `navItemLabel` duplicate-collapse bug.
  2. Foundation `MODULE_META` Dynamic-UI/Config-OS migration (or at
     minimum: route through resolver i18n keys, no inline EN literals).
  3. The resolver's embedded I18N catalog is a Phase B violation, but
     migrating it backend-side is a multi-package change. Acceptable
     intermediate: every workspace-home literal must reference a
     resolver key (no inline EN), even though the resolver itself
     temporarily still serves from the embedded map.
- **P1:**
  - All inline status / button / empty-state strings on workspace-home.
  - Direct `carbon-components-angular` imports without UI-OS
    wrapper-missing comment.
- **P2:**
  - Emoji icon map.
  - Hardcoded fallback icon names / title separator.
  - `?denied=…` query banner missing.

---

**Next step (per plan):** wait for user approval of the fix plan
(Step 2). The implementation must NOT begin until the user confirms
the wave breakdown and confirms whether wave A scope includes only the
foundation `workspace-home` page or also the resolver wiring within
the I18N catalog.

---

## 9. Implementation notes (Step 3)

### Wave B — sidebar duplicate-label root cause (P0) — DONE
- `products/shahin-ai/app/src/app/shell/workspace-resolver.service.ts:778-836`
- Removed the legacy `lookup('nav.item.' + firstSegmentOfId)` collapse in
  `navItemLabel()`. New behaviour: missing key → humanize the LAST
  meaningful segment of the dotted id (skips generic suffixes
  `title`, `label`, `name`, `caption`). Siblings sharing a prefix now
  render distinct labels.

### Wave A — workspace-home page chrome i18n externalization — DONE
- `products/shahin-ai/app/src/app/shell/workspace-resolver.service.ts:386-428` (EN)
  and `:700-740` (AR) — added 32 `workspace.home.*` keys covering
  eyebrow, tenant status, metrics (active/entitled/visible/permission
  singular+plural), separator, loading + error notification copy,
  empty-state title/body/CTA, attention summary singular+plural, card
  CTAs, status pill labels, status reasons, fallback subtitles.
- `platform/foundation/ui/workspace/workspace-home.component.ts:18,397-444,460-505,548-553`
  - injected `WORKSPACE_NAV_LABEL_RESOLVER` (optional);
  - added `i18n(key)` helper + `sep()` computed;
  - replaced every hardcoded EN literal in template + class with
    `i18n(...)` calls;
  - `tenantStatusLabel()` now resolves `status.tenant.<status>` via the
    catalog (existing `status.tenant.active`/`platform_dna`/
    `trial_expired`/`suspended` keys);
  - `cards()` resolver titles/descriptions consult `nav.item.<code>`
    + `module.<code>.description` first (resolver path), falling back
    to `MODULE_META`;
  - `statusLabel()` resolves `workspace.home.status.<state>`;
  - all 5 status reasons + 5 CTA labels now resolve through catalog
    keys.

### Wave D-light — UI-OS direct-import comments — DONE
- `platform/foundation/ui/workspace/workspace-home.component.ts:4-17`
  added `// missing-wrapper:` comments next to each
  `carbon-components-angular` import (TilesModule, NotificationModule,
  ButtonModule, TagModule, LinkModule, GridModule) per AGENTS.md UI-OS
  policy. Documents the missing `@dos/ui-system` wrapper for each.

### Out of scope (deferred)
- **Phase F — MODULE_META → DB-driven**: requires `dos.dynamic_ui_modules`
  resolver wiring and backend reads. Not in this patch.
- **Phase B — embedded I18N catalog → backend `dos.i18n_translations`**:
  multi-package change touching backend service. Not in this patch.
- **Tenant `IDENTITY & ACCESS` / `MARKETING` group origin**: requires
  live `dos.dynamic_ui_navigation` query against the tenant id from the
  screenshot. Static greps confirmed no source in code or DB rows we
  inspected; runtime confirmation deferred.
- **`?denied=foundation-not-entitled` banner**: needs a
  `DosStatusBanner` consumer wired to the `denied` query param. Not in
  this patch.

## 10. Validation (Step 4)

- `pnpm --filter @dos/module-foundation build` → PASS (5.8s, 0 TS errors)
- `pnpm --filter shahin-ai-grc-frontend build` → PASS (18.2s, bundle generated)
  - 2 unrelated pre-existing warnings (NG8113 unused import in
    marketing-home.page.ts; CommonJS bailout for @dos/design-tokens).

---

**Verdict**: COMPLETE WITH NON-BLOCKING FOLLOW-UP. The P0 sidebar
duplicate-label collapse is fixed at source. Every visible workspace-home
chrome string now flows through the resolver/i18n catalog with EN+AR
translations registered. Direct Carbon imports carry the required
UI-OS missing-wrapper annotations. Phase B (catalog → backend) and
Phase F (MODULE_META → DB) migrations remain deferred to backend work.

# Phase 3A — dos-command-search Caller Audit (Read-Only)

**Date**: 2026-05-06  
**Status**: READ-ONLY — no implementation, no fixes, no DB mutations  
**Scope**: every `<dos-command-search>` template caller; every `cds-search` caller reachable from the workspace shell; every `commandSearchLabel`/`ariaLabel` data path  

---

## 0. Key Finding: Zero Active `<dos-command-search>` Template Callers

A full repo-wide grep for the selector `<dos-command-search` (and the class
`DosCommandSearchComponent`) in all `.ts` and `.html` files outside `dist/`
and `node_modules/` returns **zero external template callers**. The selector
only appears in the component's own CSS class names and host listener.

```
grep -rn "<dos-command-search" --include="*.ts" --include="*.html" . | grep -v "node_modules|dist/|\.zencoder|docs/"
# → zero lines
```

```
grep -rn "DosCommandSearchComponent" --include="*.ts" . | grep -v "node_modules|dist/|docs/"
# → only: platform/ui-system/dos-ui-system/src/shell/command-search.component.ts (definition)
#          platform/ui-system/dos-ui-system/src/shell/workspace-host-kit.ts (re-export)
#          platform/ui-system/dos-ui-system/src/index.ts (barrel re-export)
```

`DosCommandSearchComponent` is defined, exported, and available for use — but
**no Angular component template in the codebase currently instantiates it**.

**Implication for Phase 3B**: fixing `dos-command-search`'s own `[ariaLabel]`
wiring is strictly correct but has zero live impact until a template caller
is added. The Class B violations raised in the accessibility audit come from
direct `cds-search` usages in shell module templates, not from
`dos-command-search`.

---

## 1. Caller Inventory

### 1.1 `DosCommandSearchComponent` itself (internal `cds-search`)

| Field | Value |
|-------|-------|
| **File** | `platform/ui-system/dos-ui-system/src/shell/command-search.component.ts:54-64` |
| **Route / surface** | Not mounted — no active template caller |
| **Inputs passed to `cds-search`** | `[label]="searchCarbonLabel()"`, `[placeholder]="sanitizedPlaceholder()"`, `[expandable]="expandable"`, `[value]="query"`, `[autocomplete]="'off'"` |
| **`ariaLabel` source** | `@Input() ariaLabel: string \| null = null` — must be passed by caller; no DB default; no hardcoded fallback |
| **`label` source** | `searchCarbonLabel()` → `sanitizeAccessibleText(ariaLabel ?? '')` → returns `undefined` if empty; Carbon omits the label entirely |
| **`placeholder` source** | `sanitizedPlaceholder()` → `sanitizeAccessibleText(placeholder)` → Input `@Input() placeholder = ''`; no hardcoded fallback string |
| **`hasSearchChrome()` gate** | `cds-search` only rendered when `sanitizedPlaceholder().length > 0` — fail-closed; no chrome = no element |
| **Carbon accessible label** | `cds-search [label]` is `undefined` if `ariaLabel` is not provided → Carbon renders the input with no visible label; **Class B risk when a caller passes no `ariaLabel`** |
| **Fallback / hardcoded string** | None — component correctly refuses to render with empty chrome |
| **Risk classification** | **NO-LIVE-USAGE** — no template caller exists; component correctly fail-closes |

---

### 1.2 `DosWorkspaceHeaderComponent` — command search trigger button

| Field | Value |
|-------|-------|
| **File** | `platform/ui-system/dos-ui-system/src/shell/workspace-header.component.ts:65-70, 305` |
| **Route / surface** | Workspace shell header zone (all authenticated routes) |
| **Element** | `<button type="button" [attr.aria-label]="commandSearchLabel \|\| null" (click)="commandSearchOpen.emit()">` — a trigger button, NOT `<dos-command-search>` |
| **`commandSearchLabel` input** | `@Input() commandSearchLabel = ''` (default empty) |
| **`ariaLabel` source** | `commandSearchLabel` Input, populated by UI-OS resolver from DB |
| **UI-OS resolver path** | `services/ui-os-service/src/routes/workspace-shell.routes.ts:709,767` reads `chrome['shell.header.commandSearch.label']` from `dos.ui_workspace_chrome` and emits it as `commandSearchLabel` on `workspace.header` surface props |
| **DB data** | `dos.ui_workspace_chrome.chrome_key = 'shell.header.commandSearch.label'`, `value_json = "Search (Ctrl+K)"` — **confirmed present for all tenants** in live DB |
| **`dos-icon [ariaLabel]`** | `<dos-icon name="search" [size]="20" [ariaLabel]="commandSearchLabel">` — icon receives same label |
| **Hardcoded fallback** | `@Input() commandSearchLabel = ''` — if DB row is missing, `commandSearchLabel = ''` → `attr.aria-label` → null → button has no accessible label |
| **Carbon `cds-search` involved?** | **No** — this is a plain `<button>` trigger, not a search input |
| **Risk classification** | **SAFE-TO-FAIL-CLOSED** — DB data confirmed present; button suppresses aria-label via `\|\| null` when label is empty; icon also passes the label. If DB row is removed, the button loses its label (regression risk but not a live violation) |

---

### 1.3 Direct `cds-search` callers (module shell templates)

These are the files identified as Class B violations in the prior accessibility audit. They use Carbon's `cds-search` directly — NOT via `dos-command-search`.

#### 1.3.1 `module-audit-trail.template.ts`

| Field | Value |
|-------|-------|
| **File** | `platform/core/platform/shell/templates/module-audit-trail.template.ts:110-112` |
| **Route / surface** | Workspace module surface: audit trail template |
| **`cds-search` binding** | `id="audit-trail-search"`, `placeholder="Search actor, entity, action..."` |
| **`[label]` binding** | **ABSENT** — no `[label]` attribute |
| **`ariaLabel` source** | None |
| **`placeholder` source** | **Hardcoded string literal** `"Search actor, entity, action..."` |
| **Carbon accessible label** | Carbon `cds-search` renders no visible label → screen-reader announces input with no label or falls back to `placeholder` (Carbon 11 behaviour: `placeholder` is NOT an accessible name substitute) |
| **Hardcoded fallback** | Yes — `placeholder` is a TS string literal, not DB/runtime data |
| **Risk classification** | **BLOCKED-NEEDS-DB-DATA-FIRST** — `[label]` absent; `placeholder` is hardcoded; no DB-backed `ariaLabel` data path exists; Phase 3B implementation requires DB seed before wiring |

#### 1.3.2 `module-heatmap.template.ts`

| Field | Value |
|-------|-------|
| **File** | `platform/core/platform/shell/templates/module-heatmap.template.ts:76` |
| **Route / surface** | Workspace module surface: heatmap template |
| **`cds-search` binding** | `[placeholder]="'Find item...'"`, `size="md"` |
| **`[label]` binding** | **ABSENT** — no `[label]` attribute |
| **`ariaLabel` source** | None |
| **`placeholder` source** | **Hardcoded string literal** `'Find item...'` (via Angular `[prop]="'literal'"` syntax) |
| **Carbon accessible label** | No visible label; same Carbon 11 limitation as above |
| **Hardcoded fallback** | Yes |
| **Risk classification** | **BLOCKED-NEEDS-DB-DATA-FIRST** |

#### 1.3.3 `module-records.template.ts`

| Field | Value |
|-------|-------|
| **File** | `platform/core/platform/shell/templates/module-records.template.ts:93-98` |
| **Route / surface** | Workspace module surface: records template |
| **`cds-search` binding** | `[placeholder]="searchPlaceholder"`, `size="md"`, `class="dmt-search"` |
| **`[label]` binding** | **ABSENT** — no `[label]` attribute |
| **`ariaLabel` source** | None |
| **`placeholder` source** | `@Input() searchPlaceholder = 'Search...'` — Input with **hardcoded default** `'Search...'` |
| **Carbon accessible label** | No label; same Carbon 11 limitation |
| **Hardcoded fallback** | Yes — Input default is a hardcoded string |
| **Risk classification** | **BLOCKED-NEEDS-DB-DATA-FIRST** — `searchPlaceholder` Input would need a DB/runtime source before the default can be removed |

---

### 1.4 Other `cds-search` callers (non-workspace-shell, for completeness)

#### 1.4.1 `ModuleAuditTrailPanelComponent` (config-center)

| Field | Value |
|-------|-------|
| **File** | `platform/config-center/shared/components/module-chrome/module-page-chrome.ts:352` |
| **Route / surface** | Config-center audit trail panel (sidebar/panel, config-center scope — NOT workspace shell) |
| **`cds-search` binding** | `[placeholder]="'Search audit...'"`, `size="sm"` |
| **`[label]`** | **ABSENT** |
| **`placeholder` source** | Hardcoded string literal |
| **Risk classification** | **BLOCKED-NEEDS-DB-DATA-FIRST** (no label; hardcoded placeholder; outside workspace shell scope) |

#### 1.4.2 `foundation-register.component.ts`

| Field | Value |
|-------|-------|
| **File** | `platform/foundation/ui/pages/foundation-register.component.ts:49-53` |
| **Route / surface** | `/foundation/register` — Foundation admin page |
| **`cds-search` binding** | `[placeholder]="i18n.tr('foundation.register.search', 'Search users...')"`, `size="sm"` |
| **`[label]`** | **ABSENT** |
| **`placeholder` source** | `i18n.tr()` with hardcoded fallback `'Search users...'` |
| **`ariaLabel` source** | None |
| **Risk classification** | **BLOCKED-NEEDS-DB-DATA-FIRST** (no label; i18n placeholder with hardcoded fallback is better than bare literal but `[label]` still absent) |

#### 1.4.3 `foundation-module-audit.component.ts`

| Field | Value |
|-------|-------|
| **File** | `platform/foundation/ui/pages/foundation-module-audit.component.ts:48-52` |
| **Route / surface** | `/foundation/audit` — Foundation audit page |
| **`cds-search` binding** | `[placeholder]="i18n.tr('foundation.audit.searchPlaceholder', 'Search events...')"`, `size="sm"` |
| **`[label]`** | **ABSENT** |
| **`placeholder` source** | `i18n.tr()` with hardcoded fallback |
| **Risk classification** | **BLOCKED-NEEDS-DB-DATA-FIRST** |

#### 1.4.4 `CarbonSearchRenderer` (registry primitive)

| Field | Value |
|-------|-------|
| **File** | `platform/dos/registry/carbon-primitive-renderers.ts:543` |
| **Route / surface** | Dynamic registry renderer (`app-carbon-search`) — used only when `dynamic_ui_component_registry` emits a surface with `renderer_key='carbon.search'` or equivalent |
| **`cds-search` binding** | `[placeholder]="placeholder"`, `[size]="size"` |
| **`[label]`** | **ABSENT** |
| **`placeholder` source** | `@Input() placeholder = 'Search'` — hardcoded default |
| **Live emission** | No workspace surface currently has `renderer_key` pointing to `app-carbon-search` (not in COMPONENT_MAP resolver path for workspace shell) |
| **Risk classification** | **NO-LIVE-USAGE** for workspace shell — not emitted by current resolver; hardcoded default would violate doctrine if activated |

#### 1.4.5 `DosCarbonSearchComponent` (`dos-carbon-search`)

| Field | Value |
|-------|-------|
| **File** | `platform/ui-system/dos-ui-system/src/carbon/dos-carbon-search.component.ts:17-31` |
| **Route / surface** | Carbon wrapper (`dos-carbon-search`) — general-purpose, used wherever imported |
| **`cds-search` binding** | `[placeholder]="placeholder"`, `[label]="label"` |
| **`[label]` source** | `@Input() label = 'Search'` — **hardcoded fallback default** |
| **`placeholder` source** | `@Input() placeholder = ''` |
| **`ariaLabel` source** | None on the component; `[label]` serves as the Carbon accessible label |
| **Carbon accessible label** | `[label]` IS wired — but with a hardcoded default `'Search'` which violates no-fallback doctrine |
| **Active callers of `dos-carbon-search`** | None found in current workspace shell templates |
| **Risk classification** | **BLOCKED-NEEDS-DB-DATA-FIRST** — the `label` default `'Search'` is a hardcoded fallback. Any caller that doesn't pass `[label]` gets the hardcoded value. No active workspace shell callers found, but the component is exported and available. Phase 3B must either remove the default (fail-closed) or ensure all callers pass a DB/runtime-backed label. |

#### 1.4.6 `CarbonIconPickerComponent`

| Field | Value |
|-------|-------|
| **File** | `platform/ui-system/dos-ui-system/src/icons/carbon-icon-picker.component.ts:67-73` |
| **Route / surface** | Internal admin/dev tool — UI-system component picker (not a user-facing workspace surface) |
| **`cds-search` binding** | `[placeholder]="searchPlaceholder"`, `[label]="searchPlaceholder"` |
| **`[label]` source** | `[label]="searchPlaceholder"` → `@Input() searchPlaceholder = 'Search icons (name, alias, friendly name)…'` — hardcoded default but **`[label]` IS bound** |
| **`ariaLabel` source** | `[attr.aria-label]="ariaLabel"` on outer `<section>` → `@Input() ariaLabel = 'Carbon icon picker'` |
| **Carbon accessible label** | Present — `[label]` is wired even if the value is a hardcoded fallback |
| **Risk classification** | **SAFE-TO-FAIL-CLOSED** — not a user-facing workspace surface; label is present; the hardcoded fallback is appropriate for a dev tool |

---

## 2. Summary Table

| # | File (line) | Route / Surface | `[label]` present? | `ariaLabel` source | Placeholder source | Risk |
|---|-------------|-----------------|--------------------|--------------------|-------------------|------|
| 1 | `dos-command-search` component (definition) | No active mount | `undefined` if `ariaLabel` not passed | `@Input() ariaLabel = null` (no caller) | `@Input() placeholder = ''` (no caller) | **NO-LIVE-USAGE** |
| 2 | `workspace-header.component.ts:68` (trigger `<button>`) | All authenticated workspace routes | N/A (button, not search input) | `commandSearchLabel` ← DB `shell.header.commandSearch.label` = `"Search (Ctrl+K)"` | N/A | **SAFE-TO-FAIL-CLOSED** |
| 3 | `module-audit-trail.template.ts:110` | Workspace audit-trail template | **ABSENT** | ~~None~~ → **DB KEY SEEDED** `shell.module-audit-trail.search.ariaLabel` EN="Search audit trail" AR="البحث في سجل التدقيق" | Hardcoded `"Search actor, entity, action..."` | ~~BLOCKED-NEEDS-DB-DATA-FIRST~~ → **DB-DATA-AVAILABLE — NEEDS-RESOLVER-WIRING (Phase 3B)** |
| 4 | `module-heatmap.template.ts:76` | Workspace heatmap template | **ABSENT** | ~~None~~ → **DB KEY SEEDED** `shell.module-heatmap.search.ariaLabel` EN="Search heatmap items" AR="البحث في عناصر خريطة الحرارة" | Hardcoded `'Find item...'` | ~~BLOCKED-NEEDS-DB-DATA-FIRST~~ → **DB-DATA-AVAILABLE — NEEDS-RESOLVER-WIRING (Phase 3B)** |
| 5 | `module-records.template.ts:93` | Workspace records template | **ABSENT** | ~~None~~ → **DB KEY SEEDED** `shell.module-records.search.ariaLabel` EN="Search records" AR="البحث في السجلات" | `@Input() searchPlaceholder = 'Search...'` (hardcoded default) | ~~BLOCKED-NEEDS-DB-DATA-FIRST~~ → **DB-DATA-AVAILABLE — NEEDS-RESOLVER-WIRING (Phase 3B)** |
| 6 | `module-page-chrome.ts:352` | Config-center audit panel | **ABSENT** | ~~None~~ → **DB KEY SEEDED** `shell.module-page-chrome.search.ariaLabel` EN="Search audit log" AR="البحث في سجل التدقيق" | Hardcoded `'Search audit...'` | ~~BLOCKED-NEEDS-DB-DATA-FIRST~~ → **DB-DATA-AVAILABLE — NEEDS-RESOLVER-WIRING (Phase 3B)** |
| 7 | `foundation-register.component.ts:49` | `/foundation/register` | **ABSENT** | ~~None~~ → **DB KEY SEEDED** `shell.foundation-register.search.ariaLabel` EN="Search users" AR="البحث عن المستخدمين" | `i18n.tr()` with hardcoded fallback `'Search users...'` | ~~BLOCKED-NEEDS-DB-DATA-FIRST~~ → **DB-DATA-AVAILABLE — NEEDS-RESOLVER-WIRING (Phase 3B)** |
| 8 | `foundation-module-audit.component.ts:48` | `/foundation/audit` | **ABSENT** | ~~None~~ → **DB KEY SEEDED** `shell.foundation-module-audit.search.ariaLabel` EN="Search events" AR="البحث عن الأحداث" | `i18n.tr()` with hardcoded fallback `'Search events...'` | ~~BLOCKED-NEEDS-DB-DATA-FIRST~~ → **DB-DATA-AVAILABLE — NEEDS-RESOLVER-WIRING (Phase 3B)** |
| 9 | `carbon-primitive-renderers.ts:543` (`CarbonSearchRenderer`) | Registry renderer (no active workspace surface) | **ABSENT** | None | `@Input() placeholder = 'Search'` (hardcoded default) | **NO-LIVE-USAGE** |
| 10 | `dos-carbon-search.component.ts:17` | General wrapper (no active workspace caller) | `[label]="label"` → `@Input() label = 'Search'` (hardcoded) | ~~None~~ → **DB KEY SEEDED** `shell.dos-carbon-search.search.ariaLabel` EN="Search" AR="بحث" | `@Input() placeholder = ''` | ~~BLOCKED-NEEDS-DB-DATA-FIRST~~ → **DB-DATA-AVAILABLE — NEEDS-RESOLVER-WIRING (Phase 3B)** |
| 11 | `carbon-icon-picker.component.ts:67` | Internal dev tool | `[label]="searchPlaceholder"` present | `searchPlaceholder` (hardcoded but dev-tool scope) | `@Input() searchPlaceholder = 'Search icons...'` | **SAFE-TO-FAIL-CLOSED** |

---

## 3. Risk Summary

| Risk | Count | Files |
|------|-------|-------|
| **NO-LIVE-USAGE** | 2 | `dos-command-search` component (not instantiated); `CarbonSearchRenderer` (not in resolver) |
| **SAFE-TO-FAIL-CLOSED** | 2 | `workspace-header` trigger button (DB data confirmed); `CarbonIconPickerComponent` (dev tool, label present) |
| ~~**BLOCKED-NEEDS-DB-DATA-FIRST**~~ → **DB-DATA-AVAILABLE — NEEDS-RESOLVER-WIRING** | 7 | `module-audit-trail`, `module-heatmap`, `module-records`, `module-page-chrome`, `foundation-register`, `foundation-module-audit`, `dos-carbon-search` — all 7 chrome keys seeded by `20260509_0240_search_aria_label_chrome_keys.sql` |

---

## 4. Phase 3B Pre-Conditions

Per user decision #4 (2026-05-06): Phase 3B implementation must only proceed
after confirming **every active caller already has a runtime/i18n/DB-backed
`ariaLabel`**. Based on this audit:

- ~~**7 callers are BLOCKED-NEEDS-DB-DATA-FIRST**~~ → **RESOLVED (Phase 3B-0)**
  Migration `20260509_0240_search_aria_label_chrome_keys.sql` seeded all 7 chrome
  keys into `dos.ui_workspace_chrome` across all 43 active tenants.
- **The specific fix per AGENTS.md doctrine**:
  1. ~~Identify the correct DB table for each caller's label/aria text~~ → DONE: `dos.ui_workspace_chrome`
  2. ~~Add migration + seed rows~~ → DONE: `20260509_0240_search_aria_label_chrome_keys.sql`
  3. Wire UI-OS resolver to emit these labels as surface props. **(Phase 3B)**
  4. Wire the templates to consume the runtime-emitted label (no hardcoded
     string survives Phase 3B). **(Phase 3B)**
  5. ONLY THEN remove the hardcoded fallback strings. **(Phase 3B)**

**Phase 3B is now UNBLOCKED** — DB data exists for all 7 callers.
The remaining Phase 3B work is resolver wiring + component wiring only.
`DosCommandSearchComponent` itself can be implemented at any time.

---

## 5. `commandSearchLabel` DB Data Proof

```sql
-- Live query (test DB, 2026-05-06):
SELECT chrome_key, value_json
FROM dos.ui_workspace_chrome
WHERE chrome_key LIKE '%commandSearch%' OR chrome_key LIKE '%command%';
--    chrome_key                       | value_json
-- -------------------------------------+-------------------
--  shell.header.commandSearch.label   | "Search (Ctrl+K)"
--  shell.commandSearch.placeholder    | "Search…"
--  (repeated for all active tenants)
```

Both `shell.header.commandSearch.label` and `shell.commandSearch.placeholder`
are present in `dos.ui_workspace_chrome` for all active tenants. The
workspace-header trigger button receives a valid aria-label from DB via
the UI-OS resolver.

**The `shell.commandSearch.placeholder` chrome key is NOT currently wired
to `DosCommandSearchComponent`** — no template caller passes it as the
`[placeholder]` input. This is not a bug today (no live caller), but when
Phase 3B instantiates `dos-command-search`, it must consume this DB value
rather than a hardcoded string.

---

## 6. Verdict per User Decision #4

> Phase 3B implement only if every active caller already has runtime/i18n/
> DB-backed `ariaLabel`.

**Verdict: UNBLOCKED. All 7 callers now have DB-backed ariaLabel data.**

Migration `20260509_0240_search_aria_label_chrome_keys.sql` applied to `shahin_grc`
(test DB) on 2026-05-06. All 7 keys seeded across all 43 active tenants. Idempotent
re-run confirmed clean.

| Pre-condition | Status |
|---|---|
| DB migration + seed for module template search labels (3 keys) | **DONE** |
| DB migration + seed for config-center chrome panel (1 key) | **DONE** |
| DB migration + seed for foundation page i18n labels (2 keys) | **DONE** |
| DB migration + seed for `dos-carbon-search` label (1 key) | **DONE** |
| UI-OS resolver wiring to emit new keys as surface props | **DONE (Phase 3B)** — `loadChrome()` returns raw JSONB; FE `runtimeChromeLocalized()` selects locale |
| Component wiring to consume runtime-emitted ariaLabel | **DONE (Phase 3B)** — all 7 callers wired via `<dos-carbon-search ariaLabelKey>` |
| Hardcoded fallback string removal | **DONE (Phase 3B)** — `dos-carbon-search` `'Search'` default removed; CI guard active |

**Phase 3B is COMPLETE.** Verdict: `PHASE_3B_SEARCH_ARIA_LABEL_PASS`.

### Phase 3B Resolver Wiring Path (per caller)

The resolver at `services/ui-os-service/src/routes/workspace-shell.routes.ts`
must be extended to read the new keys from `chrome[key]` (already loaded by
`loadChrome()`) and emit them on the appropriate surface props. Value shape is
`{"en":"...","ar":"..."}` — resolver must resolve locale from `req.principal.locale`
or `Accept-Language` and emit a scalar string.

| Chrome key | Surface | Prop name to emit | Caller file |
|---|---|---|---|
| `shell.module-audit-trail.search.ariaLabel` | module-audit-trail surface | `searchAriaLabel` | `module-audit-trail.template.ts:110` |
| `shell.module-heatmap.search.ariaLabel` | module-heatmap surface | `searchAriaLabel` | `module-heatmap.template.ts:76` |
| `shell.module-records.search.ariaLabel` | module-records surface | `searchAriaLabel` | `module-records.template.ts:93` |
| `shell.module-page-chrome.search.ariaLabel` | module-page-chrome surface | `searchAriaLabel` | `module-page-chrome.ts:352` |
| `shell.foundation-register.search.ariaLabel` | foundation-register surface | `searchAriaLabel` | `foundation-register.component.ts:49` |
| `shell.foundation-module-audit.search.ariaLabel` | foundation-module-audit surface | `searchAriaLabel` | `foundation-module-audit.component.ts:48` |
| `shell.dos-carbon-search.search.ariaLabel` | `DosCommandSearchComponent` input | `ariaLabel` Input | `dos-carbon-search.component.ts:17` |

# Compliance Module UI vs IBM Carbon (Original) vs DOS UI System Wrappers

> Three-way audit. Source of truth for each:
> - **IBM Carbon Angular** = `node_modules/carbon-components-angular/` (63 primitive directories)
> - **DOS UI System** = `platform/ui-system/dos-ui-system/src/carbon/` (47 `dos-carbon-*` wrappers)
> - **Compliance module** = `modules/compliance/ui/**/*.component.ts` (113 components)
> - **DB registry** = `dos.dynamic_ui_component_registry` (compliance rows: 0)

Generated 2026-05-02.

---

## A. Headline numbers

| Source | Count |
|---|---|
| IBM Carbon canonical primitive directories | **63** |
| DOS UI System Carbon wrappers (`dos-carbon-*`) | **47** |
| DOS UI System non-Carbon components | ~25 (PageMasthead, CommandCenter, AgentWorkbenchPanel, etc.) |
| Compliance UI Angular components | **113** |
| Compliance components importing `@dos/ui-system` | **1** |
| Compliance components importing `@carbon/*` directly | **0** |
| Compliance components importing `primeng/*` | **~75** files / 440 imports |
| Compliance rows in `dos.dynamic_ui_component_registry` | **0** |
| Compliance keys in `db/seeds/dynamic-ui/index.json#componentKeys` | 63 |

---

## B. IBM Carbon primitive ↔ DOS wrapper ↔ Compliance usage

| IBM Carbon primitive | DOS wrapper exists? | Compliance uses (which path)? | Migration target |
|---|---|---|---|
| accordion | ✅ `dos-carbon-accordion` | — | wrap in `dos-carbon-accordion` |
| ai-label | ❌ no wrapper | — | platform-side: build `dos-carbon-ai-label` |
| aspect-ratio | ❌ no wrapper | — | platform-side: build `dos-carbon-aspect-ratio` |
| breadcrumb | ✅ `dos-carbon-breadcrumb` | — | use wrapper |
| button | ✅ `dos-carbon-button` | ❌ uses `primeng/button` (55 imports) | `<p-button>` → `<dos-carbon-button>` |
| checkbox | ✅ `dos-carbon-checkbox` | — (rare) | use wrapper |
| code-snippet | ✅ `dos-carbon-code-snippet` | — | use wrapper |
| combo-button | ❌ no wrapper | — | platform-side |
| combobox | ✅ `dos-carbon-combo-box` | — | use wrapper |
| contained-list | ✅ `dos-carbon-contained-list` | — | use wrapper |
| content-switcher | ✅ `dos-carbon-content-switcher` | — | use wrapper |
| context-menu | ❌ no wrapper | — | platform-side |
| datepicker | ✅ `dos-carbon-date-picker` | — | use wrapper |
| datepicker-input | (covered by date-picker) | — | n/a |
| dialog | ❌ no wrapper (`dos-carbon-modal` is closest) | ❌ uses `primeng/dialog` (30 imports) | `<p-dialog>` → `<dos-carbon-modal>` |
| dropdown | ✅ `dos-carbon-dropdown` | ❌ uses `primeng/dropdown` (29 imports) | `<p-dropdown>` → `<dos-carbon-dropdown>` |
| file-uploader | ✅ `dos-carbon-file-uploader` | — | use wrapper |
| grid | ✅ `dos-carbon-grid` | — | use wrapper |
| icon | ✅ `dos-carbon-icon` | — (`pi pi-*` icons in PrimeNG land) | replace with `dos-carbon-icon` |
| inline-loading | ✅ `dos-carbon-inline-loading` | — | use wrapper |
| input | ✅ `dos-carbon-text-input` (renamed) | ❌ uses `primeng/inputtext` (28) + `primeng/inputtextarea` (17) | wrap input + add `dos-carbon-text-area` if missing |
| layer | ✅ `dos-carbon-layer` | — | use wrapper |
| layout | (used via `@carbon/layout` SCSS, not a component) | — | n/a |
| link | ✅ `dos-carbon-link` | — | use wrapper |
| list | ❌ no wrapper (Carbon `list` directives, not a component) | — | n/a |
| loading | ✅ `dos-carbon-loading` | — | use wrapper |
| menu-button | ❌ no wrapper | ❌ uses `primeng/menu` (4) | platform-side: build `dos-carbon-menu-button` |
| modal | ✅ `dos-carbon-modal` | (see dialog above) | wrap |
| notification | ✅ `dos-carbon-notification` | ❌ uses `primeng/toast` (27) | `<p-toast>` → `<dos-carbon-notification>` |
| number-input | ✅ `dos-carbon-number-input` | ❌ uses `primeng/inputnumber` (3) | wrap |
| pagination | ✅ `dos-carbon-pagination` | — | use wrapper |
| popover | ✅ `dos-carbon-popover` | — | use wrapper |
| progress-bar | ✅ `dos-carbon-progress-bar` | ❌ uses `primeng/progressbar` (20) | `<p-progressBar>` → `<dos-carbon-progress-bar>` |
| progress-indicator | ✅ `dos-carbon-progress-indicator` | — | use wrapper |
| radio | ✅ `dos-carbon-radio` | ❌ uses `primeng/radiobutton` (3) | wrap |
| search | ✅ `dos-carbon-search` | — | use wrapper |
| select | ✅ `dos-carbon-select` | (also covers dropdown) | use wrapper |
| skeleton | ✅ `dos-carbon-skeleton` (also `dos-skeleton`) | ❌ uses `primeng/skeleton` (16) | `<p-skeleton>` → `<dos-skeleton>` (already in @dos/ui-system) |
| slider | ✅ `dos-carbon-slider` | — | use wrapper |
| structured-list | ✅ `dos-carbon-structured-list` | — | use wrapper |
| table | ✅ `dos-carbon-data-table` | ❌ uses `primeng/table` (38) | `<p-table>` → `<dos-carbon-data-table>` (column shape rewrite) |
| tabs | ✅ `dos-carbon-tabs` (also `dos-tabs`) | ❌ uses `primeng/tabview` (10) | `<p-tabView>` → `<dos-tabs>` |
| tag | ✅ `dos-carbon-tag` | ❌ uses `primeng/tag` (49) | `<p-tag>` → `<dos-carbon-tag>` |
| tiles | ✅ `dos-carbon-tile` | ❌ uses `primeng/card` (18) | `<p-card>` → `<dos-carbon-tile>` |
| timepicker / timepicker-select | ✅ `dos-carbon-time-picker` | — | use wrapper |
| toggle | ✅ `dos-carbon-toggle` | — | use wrapper |
| toggletip | ✅ `dos-carbon-toggle-tip` | — | use wrapper |
| tooltip | ✅ `dos-carbon-tooltip` | ❌ uses `primeng/tooltip` (32) | drop `pTooltip` → native `title=` or `<dos-carbon-tooltip>` |
| treeview | ✅ `dos-carbon-treeview` | — | use wrapper |
| ui-shell | (covered by `dos-carbon-header-shell` + `dos-carbon-side-nav`) | — | use wrapper |

---

## C. PrimeNG used by compliance — by import-count

| PrimeNG module | Imports | DOS wrapper available? | Migration verdict |
|---|---|---|---|
| `primeng/button` | 55 | ✅ `dos-carbon-button` | mechanical |
| `primeng/tag` | 49 | ✅ `dos-carbon-tag` | mechanical |
| `primeng/table` | 38 | ✅ `dos-carbon-data-table` | column-shape rewrite |
| `primeng/tooltip` | 32 | ✅ `dos-carbon-tooltip` | drop directive → native `title=` (lossy) |
| `primeng/api` | 31 | partial — `MessageService` → app toast | service swap |
| `primeng/dialog` | 30 | ✅ `dos-carbon-modal` | mechanical w/ `[(visible)]` → `[isOpen]` |
| `primeng/dropdown` | 29 | ✅ `dos-carbon-dropdown` | options-shape rewrite |
| `primeng/inputtext` | 28 | ✅ `dos-carbon-text-input` | mechanical |
| `primeng/toast` | 27 | ✅ `dos-carbon-notification` | service swap |
| `primeng/progressbar` | 20 | ✅ `dos-carbon-progress-bar` | mechanical |
| `primeng/card` | 18 | ✅ `dos-carbon-tile` | mechanical |
| `primeng/inputtextarea` | 17 | ⚠️ no direct wrapper (use native `<textarea>` or build `dos-carbon-text-area`) | platform-side: build wrapper, then mechanical |
| `primeng/toolbar` | 16 | ❌ no wrapper (use `dos-carbon-grid`) | flexbox/grid rewrite |
| `primeng/skeleton` | 16 | ✅ `dos-skeleton` | mechanical (lossy on borderRadius/styleClass) |
| `primeng/tabview` | 10 | ✅ `dos-tabs` / `dos-carbon-tabs` | mechanical |
| `primeng/menu` | 4 | ⚠️ no wrapper | platform-side: build `dos-carbon-menu-button` |
| `primeng/radiobutton` | 3 | ✅ `dos-carbon-radio` | mechanical |
| `primeng/inputnumber` | 3 | ✅ `dos-carbon-number-input` | mechanical |
| `primeng/confirmdialog` | 3 | ⚠️ map to `DosDecisionPreviewPanel` | semantic upgrade (better than direct port) |
| `primeng/badge` | 3 | ✅ `dos-carbon-tag` w/ kind=badge | mechanical |

---

## D. Carbon primitives MISSING from DOS wrappers (must build platform-side)

These are IBM Carbon primitives compliance MIGHT need but DOS UI System has not yet wrapped:

1. **`ai-label`** (Carbon AI label/chip) — useful for the §19.1 AI Trust Layer surfaces
2. **`aspect-ratio`** (responsive box) — useful for thumbnails
3. **`combo-button`** (split-action button) — used by `Approve / Approve & Notify` patterns
4. **`context-menu`** (right-click menu) — useful for table row actions
5. **`menu-button`** (dropdown action menu) — replaces `primeng/menu` (4 uses in compliance)
6. **`text-area`** wrapper — for the 17 `primeng/inputtextarea` uses (or use native `<textarea>` with token classes)
7. **`dialog`** distinct from `modal` — Carbon has both; DOS uses `modal` for everything

---

## E. DB registry status

`dos.dynamic_ui_component_registry`:

```
Column          Type
component_key   text PK
bundle_url      text (URL of compiled component bundle)
schema_version  text
metadata        jsonb
created_at      timestamptz
```

**Compliance rows:** **0**.

The seed manifest (`db/seeds/dynamic-ui/index.json#componentKeys`) declares 63 component keys but they aren't loaded into `dynamic_ui_component_registry`. The seed only registers them in `dynamic_ui_routes` (path → componentKey mapping). The actual code-bundle registry is empty for compliance — meaning the SPA cannot resolve `componentKey → bundle URL` at runtime via this table.

**Honest gap:** there's no seed that POPULATES `dynamic_ui_component_registry` for compliance. The runtime resolver path either (a) reads bundle URLs from elsewhere, or (b) has never been wired end-to-end. Per spec §1, this table is the canonical component-bundle registry — it should be populated.

---

## F. Summary verdict

| Question | Answer |
|---|---|
| Does compliance use IBM Carbon directly? | **No.** 0 `@carbon/*` imports in compliance UI. |
| Does compliance use DOS UI System (wrapped Carbon)? | **Barely.** 1 file out of 113. |
| Does compliance use PrimeNG (legacy)? | **Yes overwhelmingly.** ~75 files / 440 imports. |
| Are compliance components registered in the DB? | **No.** 0 rows in `dynamic_ui_component_registry`. The seed manifest declares names but the registry table is empty. |
| Is the canonical Carbon → DOS wrapper coverage complete? | **Mostly.** 47 of 63 Carbon primitives wrapped; 7 missing (ai-label, aspect-ratio, combo-button, context-menu, menu-button, text-area, dialog-distinct). |

The compliance module is **not on Carbon today**. To get there:

1. Use the existing 47 DOS wrappers (covers ~85% of compliance's PrimeNG needs)
2. Build the missing 7 wrappers (platform-side)
3. Populate `dynamic_ui_component_registry` with bundle URLs (platform-side, after build pipeline emits per-component bundles)
4. Migrate compliance pages PrimeNG → DOS wrappers per the codemap

Each step is independently verifiable: `@carbon/*` import count > 0 OR `@dos/ui-system` import count > 1 OR `dynamic_ui_component_registry` rows > 0.

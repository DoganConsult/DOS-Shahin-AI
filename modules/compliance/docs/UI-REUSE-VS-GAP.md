# Compliance Module — UI Reuse vs Gap (DB-registered Carbon + IBM primitives)

> User question: "What components in the DB (for IBM Carbon) can be reused
> for our components, and what IBM components are not added to the DB but
> we need?"
>
> Answer split across two registry layers:
> - **DB widgets** = `dos.dynamic_ui_widgets` (60 rows, route-level compositions)
> - **DB component registry** = `dos.dynamic_ui_component_registry` (5 rows, bundle URLs)
> - **DOS Carbon wrappers** = `platform/ui-system/dos-ui-system/src/carbon/*` (47 files)
> - **IBM Carbon primitives** = `node_modules/carbon-components-angular/*` (63 dirs)

Generated 2026-05-02.

---

## A. What compliance can REUSE (already-built things compliance should consume, not rebuild)

### A.1 Cross-module DB-registered widgets (proven shareable)

These are widgets in `dos.dynamic_ui_widgets` already used by ≥ 2 modules → safe to keep using.

| Widget key | Modules using it | What it is | Compliance currently routes it to |
|---|---|---|---|
| `foundation-command-center` | **11 routes across all modules** | Universal §26.2 Command Center (KPI + work-queue + readiness + AI recs) | `/compliance/overview` |
| `lifecycle-board` | 6 routes | Universal lifecycle/Kanban board (gap remediation, assessment lifecycle) | `/compliance/assessments`, `/compliance/roadmap` |
| `controls-coverage-grid` | 3 modules (compliance + controls + policy) | Universal control-coverage matrix | `/compliance/frameworks`, `/compliance/gaps`, `/compliance/obligations` |
| `forensic-timeline` | 3 modules | Universal audit/forensic timeline | `/compliance/findings` |

**Reuse verdict:** all 4 are already wired for compliance. **Keep using; do not duplicate.**

### A.2 DOS UI System Carbon wrappers (already coded, importable)

47 `dos-carbon-*` components live in `platform/ui-system/dos-ui-system/src/carbon/`. These are IBM-Carbon-Angular wrappers compliance can `import` directly:

| Carbon primitive | DOS wrapper to use | Replaces compliance's PrimeNG |
|---|---|---|
| accordion | `dos-carbon-accordion` | (not used) |
| breadcrumb | `dos-carbon-breadcrumb` | (not used) |
| button | `dos-carbon-button` | `<p-button>` × 55 |
| checkbox | `dos-carbon-checkbox` | (rare) |
| code-snippet | `dos-carbon-code-snippet` | (not used) |
| combo-box | `dos-carbon-combo-box` | (covers some `<p-dropdown>` cases) |
| contained-list | `dos-carbon-contained-list` | (semantic upgrade) |
| content-switcher | `dos-carbon-content-switcher` | (not used) |
| data-table | `dos-carbon-data-table` | `<p-table>` × 38 |
| date-picker | `dos-carbon-date-picker` | (not used) |
| dropdown | `dos-carbon-dropdown` | `<p-dropdown>` × 29 |
| file-uploader | `dos-carbon-file-uploader` | (not used) |
| grid | `dos-carbon-grid` | layout replacement for `<p-toolbar>` × 16 |
| header-action | `dos-carbon-header-action` | (shell) |
| header-shell | `dos-carbon-header-shell` | (shell) |
| icon | `dos-carbon-icon` | replaces `pi pi-*` icon classes |
| inline-loading | `dos-carbon-inline-loading` | (not used) |
| layer | `dos-carbon-layer` | (not used) |
| link | `dos-carbon-link` | (not used) |
| loading | `dos-carbon-loading` | (not used) |
| modal | `dos-carbon-modal` | `<p-dialog>` × 30 |
| multi-select | `dos-carbon-multi-select` | (better than dropdown for multi) |
| notification | `dos-carbon-notification` | `<p-toast>` × 27 |
| number-input | `dos-carbon-number-input` | `<p-inputNumber>` × 3 |
| overflow-menu | `dos-carbon-overflow-menu` | better than `<p-menu>` |
| pagination | `dos-carbon-pagination` | (covers table pagination) |
| password-input | `dos-carbon-password-input` | (not used) |
| popover | `dos-carbon-popover` | (better than `<p-tooltip>` for rich) |
| progress-bar | `dos-carbon-progress-bar` | `<p-progressBar>` × 20 |
| progress-indicator | `dos-carbon-progress-indicator` | (workflow steps) |
| radio | `dos-carbon-radio` | `<p-radioButton>` × 3 |
| search | `dos-carbon-search` | (search inputs) |
| select | `dos-carbon-select` | (alt for dropdown) |
| side-nav | `dos-carbon-side-nav` | (shell) |
| skeleton | `dos-carbon-skeleton` (+ `dos-skeleton`) | `<p-skeleton>` × 16 |
| slider | `dos-carbon-slider` | (not used) |
| structured-list | `dos-carbon-structured-list` | (definition lists) |
| tabs | `dos-carbon-tabs` (+ `dos-tabs`) | `<p-tabView>` × 10 |
| tag | `dos-carbon-tag` | `<p-tag>` × 49 |
| text-area | `dos-carbon-text-area` | `<p-inputTextarea>` × 17 (FOUND ✅ wrapper exists) |
| text-input | `dos-carbon-text-input` | `<p-inputText>` × 28 |
| tile | `dos-carbon-tile` | `<p-card>` × 18 |
| time-picker | `dos-carbon-time-picker` | (not used) |
| toggle | `dos-carbon-toggle` | (not used) |
| toggle-tip | `dos-carbon-toggle-tip` | (semantic upgrade) |
| tooltip | `dos-carbon-tooltip` | `<p-tooltip>` × 32 (or drop to native `title=`) |
| treeview | `dos-carbon-treeview` | (not used) |

**Total reusable:** 47 wrappers covering ~95% of compliance's PrimeNG surface area.

### A.3 DOS Universal Advanced Components (built last session, reusable)

| Component | Replaces | Compliance use |
|---|---|---|
| `dos-page-masthead` | (header rail) | every page |
| `dos-command-center` | (dashboard composite) | overview + posture pages |
| `dos-entity-360-panel` | (object 360 view) | controls/:id, regulator |
| `dos-agent-workbench-panel` | (AI side-panel) | every page (agentEnabled=true on 12 of 13 routes) |
| `dos-recommendation-card` | (AI card) | gaps, regulator, posture |
| `dos-decision-preview-panel` | `<p-confirmDialog>` × 3 | risky writes (10 declared in contract) |
| `dos-workflow-canvas` | (workflow strip) | assessments, gaps, attestations |
| `dos-audit-timeline` | (history view) | object pages, regulator, reports |
| `dos-side-drawer` | (Evidence Drawer) | evidence, controls/:id |
| `dos-trust-layer` | (AI trust badge) | every AI output |
| `dos-why-chip` | ("Why am I seeing this?") | gated surfaces |
| `dos-empty-state` | (empty UI placeholder) | already used by compliance ✅ (1 file) |

**Total reusable:** 12 advanced components.

---

## B. What's MISSING from DB and DOS wrappers (compliance needs but cannot reuse)

### B.1 Carbon primitives WITHOUT a DOS wrapper (must build platform-side)

These IBM Carbon Angular primitives exist in `node_modules/carbon-components-angular/` but **NO `dos-carbon-*` wrapper exists**. Compliance needs them but can't import them yet:

| Carbon primitive (path) | Compliance need | Build action |
|---|---|---|
| `carbon-components-angular/ai-label` | §19.1 AI Trust Layer chips, AI confidence pills | build `dos-carbon-ai-label.component.ts` |
| `carbon-components-angular/aspect-ratio` | thumbnails, framework cards, evidence previews | build `dos-carbon-aspect-ratio.component.ts` |
| `carbon-components-angular/combo-button` | "Approve" / "Approve & Notify" split actions on attestations | build `dos-carbon-combo-button.component.ts` |
| `carbon-components-angular/context-menu` | right-click row actions on data tables | build `dos-carbon-context-menu.component.ts` |
| `carbon-components-angular/menu-button` | dropdown action menu (replaces `<p-menu>` × 4) | build `dos-carbon-menu-button.component.ts` |
| `carbon-components-angular/dialog` | distinct from modal — finer-grained popovers | build `dos-carbon-dialog.component.ts` (alongside modal) |
| `carbon-components-angular/list` (directives) | (Carbon's `cds-list` is directives, not a component — non-blocking) | n/a |
| `carbon-components-angular/utils` | shared utilities | non-blocking |

**Total: 6 wrappers to build** (combo-button + ai-label + aspect-ratio + context-menu + menu-button + dialog).

### B.2 Compliance signature widgets NOT in `dos.dynamic_ui_widgets`

Per `contracts/ui.contract.json#moduleStyleTokens.signatureWidgets`, compliance declares 7 signature widgets. Cross-checking against `dos.dynamic_ui_widgets`:

| Contract signature widget | Registered in DB widgets table? | Currently scaffolded in code? |
|---|---|---|
| `control-library-matrix` | ❌ NO | ✅ scaffolded (`modules/compliance/ui/components/widgets/control-library-matrix.component.ts`) |
| `obligation-map` | ❌ NO | ✅ scaffolded |
| `assessment-cockpit` | ❌ NO | ✅ scaffolded |
| `evidence-binder` | ❌ NO | ✅ scaffolded |
| `gap-remediation-board` | ❌ NO | ✅ scaffolded |
| `framework-mapping` | ❌ NO | ✅ scaffolded |
| `report-composer` | ❌ NO | ✅ scaffolded |

**Drift:** the DB has compliance using 4 different shared widgets (`foundation-command-center`, `controls-coverage-grid`, `forensic-timeline`, `lifecycle-board`), while the contract declares 7 compliance-specific signature widgets. Need to either:
- (a) Register the 7 contract widgets in `dos.dynamic_ui_widgets` (per-route assignments), OR
- (b) Update the contract to reuse the 4 shared widgets already in DB

**Recommendation:** (a) — the 7 contract widgets are compliance-specific (control library matrix, obligation map etc.), not generic. They should be registered as `widget_key='control-library-matrix'` rows in `dos.dynamic_ui_widgets` per route. The 4 shared ones STAY as they are (cross-module reuse is fine).

### B.3 Component bundle URLs missing from `dos.dynamic_ui_component_registry`

Current state: 5 rows total (all DAuth: audit-timeline.dauth, command-center.identity-summary, matrix.permissions, smart-grid.roles, smart-grid.users).

Compliance has **0 entries**. The seed manifest declares 63 component keys but they aren't in this canonical bundle-registry. Per spec §1, the SPA's renderer resolves `componentKey → bundle URL` via this table.

**Action:** populate `dynamic_ui_component_registry` with bundle URLs for compliance's 63 component keys. This requires the build pipeline to emit per-component bundles first (platform-side concern).

---

## C. Honest answer to your question

> What in the DB for IBM Carbon can be reused for compliance?

**Nothing IBM-Carbon-specific is in the DB.** The DB tracks:
- 5 composite components (DAuth-specific)
- 60 widget assignments (route-level uses of shared widgets)

What CAN be reused:
1. **47 DOS Carbon wrappers** in `@dos/ui-system` — directly importable (covers ~95% of compliance's PrimeNG migration target)
2. **4 shared platform widgets** already used by compliance: `foundation-command-center`, `lifecycle-board`, `controls-coverage-grid`, `forensic-timeline`
3. **12 DOS universal advanced components** built last session

> What IBM components are NOT added to the DB but compliance needs?

Two categories:

**(B.1) Carbon primitives missing DOS wrappers** — 6 platform-side builds:
- ai-label, aspect-ratio, combo-button, context-menu, menu-button, dialog (distinct)

**(B.2) Compliance signature widgets missing from `dos.dynamic_ui_widgets`** — 7 DB rows to insert:
- control-library-matrix, obligation-map, assessment-cockpit, evidence-binder, gap-remediation-board, framework-mapping, report-composer

**(B.3) Compliance component bundles missing from `dos.dynamic_ui_component_registry`** — 63 bundle-URL rows to insert (after build pipeline emits per-component bundles).

---

## D. Priority order to close the gaps

| Priority | Gap | Owner | Verifiable |
|---|---|---|---|
| 1 | Insert the 7 compliance signature widgets into `dos.dynamic_ui_widgets` | this module | `psql ... WHERE widget_key='control-library-matrix' AND module_code='compliance'` returns rows |
| 2 | Build the 6 missing Carbon wrappers in `@dos/ui-system` | platform | `ls platform/ui-system/dos-ui-system/src/carbon/dos-carbon-{ai-label,aspect-ratio,combo-button,context-menu,menu-button,dialog}.component.ts` |
| 3 | Migrate compliance PrimeNG → 47 DOS wrappers | this module | regression-guards ratchet drops below 440 |
| 4 | Populate `dynamic_ui_component_registry` with bundle URLs | platform (build pipeline) | `psql ... WHERE component_key LIKE 'Compliance%'` returns 13 rows |

**Lowest-hanging:** priority 1 — pure SQL inserts in a new seed file, no code changes. Drops the contract-vs-DB drift to zero.

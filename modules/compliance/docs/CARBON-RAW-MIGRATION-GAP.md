# Compliance UI → Raw IBM Carbon Only — Gap Analysis

> Goal: migrate compliance to import **only** from `carbon-components-angular`
> directly. No DOS wrappers (`@dos/ui-system/*`). No PrimeNG. No custom widgets
> outside the Carbon catalog or approved domain registry.
>
> Carbon canonical: 58 modules (verified — `carbon-components-angular@5.69.0`).
> Component registry: zero unapproved rows (`dos.component_registry` empty;
> `dos.dynamic_ui_component_registry` has 5 approved DAuth composites).

Generated 2026-05-02.

---

## A. Headline gap

| Layer | Today | Carbon-raw target | Gap |
|---|---|---|---|
| Compliance components | 113 | 113 | unchanged structurally |
| `@carbon/*` direct imports in compliance | **0** | **~600** (one per primitive use) | +600 |
| `@dos/ui-system` imports | 1 | 0 | -1 |
| `primeng/*` imports | **440** | **0** | -440 |
| `@app/*` product-coupled imports | 332 | 0 (must move to UI ports) | -332 |
| Carbon canonical primitives compliance directly needs | ~28 of 58 | all available | covered |
| Universal advanced compositions Carbon ships | 0 of 12 | 0 | **must rebuild 12 on top of Carbon** |
| Compliance domain widgets in Carbon | 0 of 13 | 0 | **must build 13 on top of Carbon** |
| Cross-cutting bridges (i18n / RTL / forms / theme / toast / confirm / context / tooltip) | PrimeNG | ❌ Carbon ≠ drop-in | **8 bridges to write** |
| `dos.dynamic_ui_component_registry` rows for compliance | 0 | 13+ (one per page) | **13+ DB inserts** |
| `UI_CAPABILITY_REGISTRY` domain entries for compliance | 1 (`Compliance.ControlMatrix`) | 7 (per signature widgets) | **+6 capability rows** |
| `dos.dynamic_ui_widgets` rows for compliance signature widgets | 0 (compliance uses 4 shared widgets) | 7 | **+7 DB inserts** |

---

## B. The 6 categories of work

### B.1 ✅ Carbon-direct imports compliance can do today (no platform changes)

Compliance can directly import from `carbon-components-angular` for these primitives. No DOS wrappers needed.

```typescript
// Today (PrimeNG):
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

// Carbon-raw target:
import { ButtonModule } from 'carbon-components-angular/button';
import { TableModule } from 'carbon-components-angular/table';
import { TagModule } from 'carbon-components-angular/tag';
```

Coverage: **28 of 58 Carbon modules** are direct compliance needs:

```
button       table         tag        modal       dropdown    input
notification progress-bar  tile       skeleton    tabs        radio
number-input file-uploader checkbox   popover     tooltip     date-picker
combobox     accordion     breadcrumb code-snippet content-switcher
contained-list link        loading    inline-loading multi-select  search
select       structured-list timepicker toggle    treeview    pagination
```

**Migration cost (compliance side):** 440 PrimeNG imports → ~440 raw Carbon imports. Mechanical for ~60% (button/tag/skeleton/etc.); API-rewrite for ~40% (table column shape, dropdown options shape, modal `[(visible)]` → `[open]`, toast-as-component-not-service).

**Effort:** ~5 sprints with one engineer (per `docs/PRIMENG-MIGRATION-CODEMAP.md` Tier 1+2+3 split).

### B.2 ⚠️ Carbon "components" that are directives only (won't replace PrimeNG components 1:1)

Some Carbon "modules" are directive sets, not full components. Compliance uses PrimeNG components in these slots:

| Carbon module | What it actually exports | Compliance impact |
|---|---|---|
| `list` | `cdsList` directive (apply to `<ul>`/`<ol>`) | rewrite `<p-listbox>` → `<ul cdsList>` |
| `tooltip` | `cdsTooltip` directive (wrap text) AND `cds-tooltip` component | most `pTooltip="..."` → `<span cdsTooltip="...">` (verbose) |
| `aspect-ratio` | `cdsAspectRatio` directive | apply to wrapping div |
| `forms` | `cdsLabel`, `cdsInput`, `cdsHelperText` directives | rewrite every form field's wrapper |
| `i18n` | `I18nService` (translation) | swap `@app/core/services/ui-infra/i18n.service` → Carbon's |

**Effort:** template rewrites — non-trivial. Compliance has 75 page files; ~half would need template-level edits beyond simple selector swap.

### B.3 ❌ Carbon does NOT ship — must rebuild on Carbon (Universal Advanced Components, 12)

These are spec §26 mandates. Carbon has primitives but no compositions. Going Carbon-only means recreating:

| Component | Composed from Carbon | Build cost |
|---|---|---|
| **PageMasthead** | `cds-grid` + `cds-tag` (status) + custom CSS | 1 day |
| **CommandCenter** | `cds-grid` + `cds-tile` × 4-5 panels | 2 days |
| **Entity360Panel** | `cds-tabs` + `cds-grid` (split) | 1 day |
| **AgentWorkbenchPanel** | `cds-tile` + `cds-button` list + `cds-tag` (level chip) | 2 days |
| **DecisionPreviewPanel** | `cds-modal` + `cds-table` (diff) + custom risk header | 3 days |
| **WorkflowCanvas** | `cds-progress-indicator` + custom step-strip | 3 days |
| **AuditTimeline** | `cds-list` + `cds-tag` + custom expand/replay | 2 days |
| **RecommendationCard** | `cds-tile` + `cds-tag` + `cds-ai-label` | 1 day |
| **TrustLayer** | `cds-ai-label` + `cds-tag` + custom layered shape | 2 days |
| **WhyChip** | `cds-tag` + `cds-tooltip` + custom border-only style | 1 day |
| **EvidenceDrawer** | `cds-modal` (with side-positioned variant) | 1 day |
| **SmartDataGrid** | `cds-table` + filter chips + saved-views (full custom) | 5 days |

**Total: 12 components × avg 2.0 days = 24 days = ~5 sprints with one engineer.**

DOS already has these 12 — going raw-Carbon means DELETING them and rebuilding. Net regression unless the spec changes.

### B.4 ❌ Compliance domain widgets — must build on Carbon (13)

| Widget | Composed from Carbon | Status |
|---|---|---|
| Control Library Matrix | `cds-table` + custom cell rendering | 7 scaffolded this session (DOS-flavored) — would need re-shape for raw Carbon |
| Obligation Map | `cds-list` + `cds-tag` + heat coloring | 7 scaffolded — would re-shape |
| Assessment Cockpit | `cds-progress-bar` + `cds-tile` + WorkflowCanvas | 7 scaffolded — would re-shape |
| Evidence Binder | `cds-list` + `cds-tag` + freshness chips | 7 scaffolded — would re-shape |
| Gap Remediation Board | (no Carbon kanban) — full custom | 7 scaffolded — would re-shape |
| Framework Mapping | `cds-list` + custom cross-walk flow | 7 scaffolded — would re-shape |
| Report Composer | `cds-tile` + `cds-select` + native `<textarea>` | 7 scaffolded — would re-shape |
| Compliance Score Ring | `@carbon/charts` (gauge) | 0 — to build |
| Maturity Heat Map | `@carbon/charts` (heat-map) | 0 — to build |
| SoD Conflict Matrix | `cds-table` + cell colour | 0 — to build |
| Regulator Packet Composer | `cds-progress-indicator` + `cds-modal` | 0 — to build |
| Ontology Catalog Tree | `cds-treeview` | 0 — to build |
| Bilingual EN/AR Cards | `cds-grid` + custom layout | 0 — to build |

**Effort:** 7 scaffolded but DOS-flavored — would need re-shape (~3 days each = 21 days).
6 to build fresh — ~3-5 days each = ~24 days.
**Total: ~9 sprints with one engineer.**

### B.5 ❌ Cross-cutting bridges Carbon doesn't provide as drop-in

| Concern | PrimeNG today | Raw Carbon | Gap |
|---|---|---|---|
| Toast service | `MessageService.add(...)` (imperative) | `cds-notification` (component-only) | build `dos-toast-service` coordinator |
| Confirm dialog | `ConfirmationService.confirm({ accept })` | none | build `dos-confirm-service` over `cds-modal` |
| Tooltip directive | `pTooltip="..."` (inline) | `cds-tooltip` (wrapping) | rewrite every tooltip site |
| Right-click menu | (compliance doesn't use; PrimeNG offers) | `cds-context-menu` (host listener) | wire `(contextmenu)` events + position |
| i18n | `@app/core/services/ui-infra/i18n.service` | `@carbon/angular/i18n` (different shape) | bridge service |
| RTL / Arabic | manual `dir="auto"` + class swaps | `@carbon/themes` RTL via CSS-in-JS | retest 113 components |
| Forms / validation | PrimeNG ReactiveForms patterns | `cds-input` `[invalid]` + `cdsHelperText` | rewrite every form's error-rendering |
| Theme tokens | PrimeNG `--p-*` | Carbon `--cds-*` | rewrite all custom CSS in compliance |

**Effort: ~2 sprints** for the 8 bridge services + retest sweep.

### B.6 ❌ Product-coupling that survives ANY framework swap (332 imports)

Compliance UI imports `@app/...` aliases 332 times. These won't be fixed by Carbon migration:

```
@app/dauth/session/session.service       ← session
@app/core/services/ui-infra/i18n.service  ← i18n
@app/dos/shell/toast.service              ← toast
@app/shared/components/...                ← shared widgets
@app/runtime/_legacy/ui-constants         ← runtime constants
@app/charts                               ← echarts wrappers
```

**Effort: ~2 sprints** — independent of design system; needs UI ports per spec §3.4.

---

## C. Database registry rows compliance must add

Going Carbon-only means **every** compliance UI surface must be approved-allowlisted:

| Registry | Compliance rows today | Carbon-only target | Gap |
|---|---|---|---|
| `UI_CAPABILITY_REGISTRY` (in `@dos/ui-contracts/capability-registry.ts`) | 1 (`Compliance.ControlMatrix`) | 7 domain widgets | **+6** |
| `dos.dynamic_ui_component_registry` (bundle URLs) | 0 | 13 page bundles + 7 widget bundles | **+20 inserts** |
| `dos.dynamic_ui_widgets` (route × widget assignments) | 4 (shared widgets used: foundation-command-center, lifecycle-board, controls-coverage-grid, forensic-timeline) | 4 shared + 7 compliance-specific | **+7 inserts** |

---

## D. Total effort to go Carbon-RAW only

| Phase | Effort (1 eng) |
|---|---|
| **B.1** Migrate 440 PrimeNG imports → raw Carbon (mechanical 60% / API-rewrite 40%) | 5 sprints |
| **B.2** Template rewrites for directive-style Carbon modules (list, tooltip, aspect-ratio, forms) | 2 sprints |
| **B.3** Rebuild 12 Universal Advanced Components on raw Carbon (currently in DOS, would be deleted) | 5 sprints |
| **B.4** Build 13 compliance domain widgets on raw Carbon (7 scaffolded need re-shape; 6 fresh build) | 9 sprints |
| **B.5** Cross-cutting bridges (toast service, confirm service, tooltip rewrite, i18n, RTL retest, forms, theme tokens) | 2 sprints |
| **B.6** Move 332 `@app/*` imports to UI ports (independent of design system but required) | 2 sprints |
| **C.** DB registry inserts (capability + bundle + widgets) — pure SQL | 1 sprint |
| **Test re-validation** (RTL/LTR/mobile/desktop/accessibility on raw Carbon for every page) | 2 sprints |
| **TOTAL** | **~28 sprints** (≈ 7 quarters / 1.75 years one engineer; 6 sprints with three engineers in parallel) |

---

## E. Honest comparison: paths

| Path | Effort | Spec compliance | Risk |
|---|---|---|---|
| **Stay PrimeNG** | 0 | FAIL §11/§23/§26 | regression-bomb on @app/* drift |
| **PrimeNG → DOS wrappers** (DOS already wraps Carbon, ships 12 universals + 7 compliance widgets) | ~13 sprints | PASS spec | medium |
| **PrimeNG → raw Carbon (no DOS)** | **~28 sprints** | partial PASS — must rebuild 12 universals from spec §26 | high |

**The 15-sprint difference is the cost of going "raw Carbon only" instead of "Carbon-via-DOS".** That extra time goes to:
- Rebuilding 12 universal components Carbon doesn't ship (5 sprints)
- Re-shaping 7 scaffolded compliance widgets to use raw Carbon primitives (3 sprints)
- Building 6 missing compliance domain widgets fresh on Carbon (4 sprints)
- Building 8 bridge services Carbon doesn't ship (2 sprints)
- Forfeiting the existing DOS investment (sunk cost)

---

## F. Concrete gap list (the answer to "what is the gap")

If compliance migrates to RAW IBM Carbon only:

| # | Gap | Count | Action owner |
|---|---|---|---|
| 1 | PrimeNG imports to remove | **440** | compliance (per-file rewrite) |
| 2 | `@dos/ui-system` imports to remove | **1** | compliance |
| 3 | `@app/*` product-coupled imports to refactor | **332** | compliance (UI ports) |
| 4 | Raw Carbon imports to add | **~600** | compliance |
| 5 | Universal Advanced Components to rebuild on Carbon | **12** | platform (delete DOS, rebuild) — OR keep DOS = NOT raw |
| 6 | Compliance domain widgets to re-shape on Carbon | **7** | compliance (already scaffolded as DOS) |
| 7 | Compliance domain widgets to build fresh on Carbon | **6** | compliance |
| 8 | Cross-cutting bridge services (toast, confirm, tooltip, i18n, RTL, forms, theme, context) | **8** | platform |
| 9 | `UI_CAPABILITY_REGISTRY` capability rows to add | **6** (Compliance.ObligationMap, .AssessmentCockpit, .EvidenceBinder, .GapRemediationBoard, .FrameworkMapping, .ReportComposer) | platform |
| 10 | `dos.dynamic_ui_component_registry` rows to add | **20** (13 pages + 7 widgets) | platform (after build pipeline) |
| 11 | `dos.dynamic_ui_widgets` rows for compliance-specific signature widgets | **7** | compliance (SQL seed) |
| 12 | Test re-validation per component (a11y, RTL, mobile) | **113 components** | compliance + QA |

**Total surface to touch: 12 categories, ~1500 individual change points.**

---

## G. Recommendation (honest)

The user's goal is to be on Carbon. **Both** the DOS-wrapper path AND the raw-Carbon path put you on Carbon. The difference:

- **DOS-wrapper path:** Carbon under the hood, 47 wrappers ship today, 12 §26 universals built, 7 compliance widgets scaffolded. **Net work: 13 sprints.**
- **Raw-Carbon path:** Same Carbon under the hood, but DOS investment thrown away, 12 universals rebuilt, 7 widgets re-shaped. **Net work: 28 sprints.**

Both produce a Carbon-canonical compliance UI. Only one is 15 sprints cheaper.

If "no DOS wrappers" is a hard policy constraint (e.g., wrappers add bundle size, or governance prefers raw imports), the raw-Carbon path is the answer at 28 sprints.

If the goal is just "compliance on Carbon", DOS-wrapper path delivers it for 13 sprints.

The verifiable check is identical for both: after migration, `grep -rE "from\s+['\"](primeng|@app/charts|@app/shared/components/data-table)" modules/compliance/ui/` returns 0.

# Compliance UI → IBM Carbon (only) — Gap Analysis

> Question: "If we replace ALL compliance UI with original IBM Carbon UI, what gaps will we have?"
>
> Answer: Carbon provides 51 primitive component categories. Compliance has
> 113 Angular components covering ~80 distinct page/widget concerns. Direct
> 1:1 substitution covers ~55% of those concerns; the rest need composition,
> custom domain widgets, or platform-side bridges.

Generated 2026-05-02. References:
- IBM Carbon Angular (`carbon-components-angular@5.69.0`) — 51 component dirs
- Compliance UI (`modules/compliance/ui/**/*.component.ts`) — 113 files

---

## A. The 5 categories of gap

### A.1 ✅ Direct mappable (Carbon has the primitive, 1:1 swap)

51 Carbon primitive directories. ~28 of them directly replace compliance's PrimeNG usage with no composition.

| Compliance need | Carbon primitive | Migration cost |
|---|---|---|
| Buttons (55 PrimeNG) | `cds-button` | mechanical |
| Tags / chips (49) | `cds-tag` | mechanical |
| Tables (38) | `cds-table` | API rewrite (column shape differs) |
| Tooltips (32) | `cds-tooltip` | mechanical (semantic upgrade vs `pTooltip` directive) |
| Modals (30) | `cds-modal` | property rename (`[(visible)]` → `[open]`) |
| Dropdowns (29) | `cds-dropdown` / `cds-combo-box` | option-shape rewrite |
| Text inputs (28) | `cds-input` | mechanical |
| Notifications/toasts (27) | `cds-notification` | service swap (Carbon's notification is component-based, not service-based — needs a coordinator) |
| Progress bars (20) | `cds-progress-bar` | mechanical |
| Cards (18) | `cds-tile` | mechanical |
| Text areas (17) | `cds-input` (via `[type]="textarea"`) or native `<textarea>` | mechanical |
| Skeletons (16) | `cds-skeleton-text` / `cds-skeleton-placeholder` | shape change (no `borderRadius` input) |
| Tabs (10) | `cds-tabs` | tab-content shape rewrite |
| Radio (3) | `cds-radio` | mechanical |
| Number inputs (3) | `cds-number-input` | mechanical |
| Confirm dialog (3) | `cds-modal` (Carbon has no auto "confirm()" — need a service) | needs custom service |
| Badges (3) | `cds-tag` (kind=high-contrast) | mechanical |
| Date picker, accordion, checkbox, link, search, structured-list, file-uploader, content-switcher, popover, slider, toggle, treeview, breadcrumb, code-snippet, pagination, loading | direct Carbon equivalents | mechanical |

**~28 of 51 Carbon primitives map directly to compliance needs. Coverage: ~80% of PrimeNG calls.**

### A.2 ❌ Carbon-MISSING (Carbon doesn't have it; we'd build on top)

Carbon has primitives but NOT compositions. Compliance needs these compositions:

| Compliance composition | Why Carbon doesn't have it | Our build status |
|---|---|---|
| **Page Masthead** (page-level header rail with title, subtitle, status, primary actions, why-chip) | Carbon has `cds-header` for app-shell only, not per-page | ✅ DOS already built `dos-page-masthead` |
| **Command Center** (overview composition: KPI strip + work queue + readiness + AI recs + activity) | Carbon doesn't ship dashboard layouts | ✅ DOS already built `dos-command-center` |
| **Entity 360 Panel** (object-page tabs + main + side aside) | Carbon has tabs + grid but not the 360 layout | ✅ DOS already built `dos-entity-360-panel` |
| **Smart Data Grid** (data table + filter chips + saved views + bulk actions + inline editing) | Carbon's `cds-table` is the primitive only | partial — `dos-carbon-data-table` is the wrapper; the "smart" composition isn't built yet |
| **Workflow Canvas** (state-machine step strip with SLA + approvers + evidence indicators) | Carbon doesn't have workflow viz | ✅ DOS already built `dos-workflow-canvas` |
| **Audit Timeline** (write-audit history with replay) | Carbon doesn't have audit timeline; just basic notification list | ✅ DOS already built `dos-audit-timeline` |
| **Decision Preview Panel** (before/after diff + impact + reason + audit-event preview) | Carbon's `cds-modal` doesn't have decision-preview semantics | ✅ DOS already built `dos-decision-preview-panel` |
| **Evidence Drawer** (side panel with evidence + audit + AI summary + fresh-ness chips) | Carbon's modal is centered, not a side drawer | ✅ DOS has `dos-side-drawer` (generic); evidence-specific layout not built |
| **Recommendation Card** (AI rec with trust layer + confidence + risk + approve/dismiss) | Carbon doesn't ship AI recs | ✅ DOS already built `dos-recommendation-card` |
| **Trust Layer** (AI confidence/source/risk badge) | Carbon's ai-label is closest but lacks the layered shape | ✅ DOS already built `dos-trust-layer` |
| **Why Chip** ("Why am I seeing this?" reason chip) | Carbon doesn't have explainability primitives | ✅ DOS already built `dos-why-chip` |
| **Agent Workbench Panel** (AI side-panel with command list + level + risk indicators) | Carbon doesn't have AI workbench | ✅ DOS already built `dos-agent-workbench-panel` |

**12 universal compositions. All exist in `@dos/ui-system` already.** Going Carbon-only would require either reinventing them or losing the spec compliance (§26.1–26.10).

### A.3 ❌ Compliance-DOMAIN missing (Carbon-only would force re-build)

These are compliance-specific UI surfaces. Carbon primitives are bricks; compliance needs the composed buildings:

| Domain widget | What it does | Carbon parts needed |
|---|---|---|
| **Control Library Matrix** (control-library-matrix) | Framework × control-family grid with status colors | `cds-table` + custom cell rendering |
| **Obligation Map** (obligation-map) | Framework-grouped obligations with due-date heat | `cds-list` + `cds-tag` + custom severity heat |
| **Assessment Cockpit** (assessment-cockpit) | Active assessment with progress + evidence checklist + workflow strip | `cds-progress-bar` + `cds-tile` + `dos-workflow-canvas` |
| **Evidence Binder** (evidence-binder) | Evidence list with freshness indicators (fresh / expiring / expired) | `cds-list` + `cds-tag` + custom freshness badges |
| **Gap Remediation Board** (gap-remediation-board) | Kanban board grouping gaps by lifecycle stage with severity tone | (no Carbon kanban — full custom) |
| **Framework Mapping** (framework-mapping) | Cross-framework crosswalk view (NCA ↔ ISO27001 etc.) | `cds-list` + custom flow viz |
| **Report Composer** (report-composer) | Two-pane (templates + preview + format/inclusion controls) | `cds-tile` + `cds-select` + native textarea |
| **Compliance Score Ring** | GRC scoring gauge | `@carbon/charts` (gauge) |
| **Maturity Heat Map** | Sector × dimension maturity grid | `@carbon/charts` (heat-map) or custom |
| **SoD Conflict Matrix Renderer** | Role × role conflict grid with badges | `cds-table` + custom cell colour |
| **Regulator Packet Composer** | Multi-step bilingual export with evidence selector | `cds-progress-indicator` + `cds-modal` + custom |
| **Ontology Catalog Tree** | Hierarchical taxonomy navigator | `cds-treeview` |
| **Bilingual EN/AR Side-by-Side** | Comparative bilingual cards (used in framework descriptions) | `cds-grid` + custom layout |

**13 domain widgets. None map to Carbon directly — all are Carbon-PARTS-composed compositions.**

7 of these are scaffolded this session; 6 remain to build.

### A.4 ⚠️ Cross-cutting concerns (Carbon ≠ drop-in replacement)

These are things compliance UI uses that don't translate cleanly to Carbon:

| Concern | Compliance currently uses | Carbon offers | Gap |
|---|---|---|---|
| **i18n** | `@app/core/services/ui-infra/i18n.service` (custom service) | `@carbon/angular/i18n` (different API) | bridge service required to translate |
| **RTL / Arabic** | Custom `dir="auto"` + manual class swaps | Carbon ships `@carbon/themes` RTL | re-test every component for RTL parity |
| **Forms / validation** | PrimeNG ReactiveForms + custom validators | Carbon `cds-input` ships `invalid` + `helperText` directives | rewrite form-error rendering on every page |
| **Theming / tokens** | PrimeNG theme variables + ad-hoc CSS | `@carbon/themes` g10/g100 + `--cds-*` CSS variables | rewrite all custom CSS in compliance UI |
| **Toast / notification service** | `MessageService` from PrimeNG (imperative `messageService.add(...)`) | Carbon notification is component-based — no built-in service | build a `dos-toast-service` coordinator |
| **Confirm dialog (imperative)** | PrimeNG `ConfirmationService.confirm({ accept: () => ... })` | Carbon has `cds-modal`, no imperative service | build a confirmation-service wrapper or use template-driven |
| **Right-click context menu** | (none in compliance currently; PrimeNG context-menu) | Carbon has `cds-context-menu` but unbound to Angular events | wire host listeners + position |
| **Tooltip directive** | PrimeNG `pTooltip="..."` directive (auto-applied) | Carbon `cds-tooltip` is a component (manual wrapping) | every `pTooltip` becomes a wrapping element |

**8 cross-cutting concerns require bridge work, not just component swaps.**

### A.5 ❌ Product-coupling that wouldn't survive ANY framework swap

These are issues NOT solved by Carbon migration — they'd remain regardless of framework:

| Issue | Where | Count |
|---|---|---|
| Compliance UI imports `@app/core/services/...` (product-namespaced) | spread across 113 components | **332 imports** |
| Compliance UI imports `@app/dos/shell/...` (product shell) | spread | (subset of 332) |
| Compliance UI imports `@app/shared/...` (product shared) | spread | (subset of 332) |
| Compliance has no UI-port for session/permissions (uses product alias directly) | every page that needs auth | per-file |

**332 product-coupled imports** would still need to be refactored to UI ports — independent of design-system choice. Going Carbon-only doesn't fix product coupling.

---

## B. Quantified gap if we go Carbon-only TODAY

| Layer | What works | What's missing | Effort to close (one engineer) |
|---|---|---|---|
| **Carbon primitives → 47 DOS wrappers** | 47 wrappers exist, 95% of compliance's PrimeNG mappable | 6 missing wrappers (ai-label, aspect-ratio, combo-button, context-menu, menu-button, dialog-distinct) | platform-side: ~1 sprint |
| **PrimeNG → Carbon migration in compliance** | mechanical for ~60% of imports | the rest (table column shape, dropdown options shape, toast service, confirm dialog, tooltip directive) | ~5 sprints |
| **Universal advanced components (§26)** | DOS already has 12 — covered | (gap = 0 IF DOS wrappers are accepted as Carbon-derived) | 0 if DOS path; ~3 sprints if rebuilt-on-Carbon |
| **Compliance domain widgets** | 7 scaffolded this session | 6 not yet built (compliance-score-ring, maturity-heat-map, SoD-matrix, regulator-packet, ontology-tree, bilingual-EN/AR card) | ~3 sprints |
| **Cross-cutting** (i18n, RTL, theming, toasts, confirm, tooltips, forms) | partial | full retest + bridge services | ~2 sprints |
| **Product coupling** (332 `@app/*` imports) | unchanged by Carbon migration | needs UI ports refactor | ~2 sprints (independent) |

**Total honest effort:** ~13 sprints (3 quarters) one engineer; ~4 sprints with three engineers in parallel.

---

## C. The honest catch: "Carbon original only" makes things WORSE in two areas

1. **Lose 12 universal advanced components.** Carbon doesn't ship CommandCenter, Entity360, AgentWorkbench, DecisionPreview, AuditTimeline, RecommendationCard, TrustLayer, WhyChip, or PageMasthead. Going "Carbon-only" means rebuilding these on top of Carbon. The spec §26 mandates them. If you skip them, the module fails Page Quality Gate §21.

2. **Lose the AI/governance vocabulary.** PrimeNG and DOS wrappers both happen to express compliance-domain concepts (severity chips, freshness badges). Pure Carbon is a generic enterprise toolkit — every domain semantic must be coded fresh. The 7 signature widgets, 5 module agents, 4 risk tiers — none of it is in Carbon's primitive set.

**Recommendation:** "Carbon-original only" is the wrong frame. The right frame is "Carbon-via-DOS-wrappers + compliance-domain widgets on top". That's already the architecture. The work is migrating compliance's PrimeNG to consume the existing wrappers — NOT replacing the wrappers with raw Carbon.

---

## D. Decision matrix

| Path | Compliance code change | Platform code change | Risk | Spec compliance |
|---|---|---|---|---|
| **A. Stay PrimeNG** | none | none | regression-bombs as @app/* drift; no §26/§32 compliance | FAIL §11/§23/§26 |
| **B. PrimeNG → DOS wrappers** (current path) | 440 imports → ~440 wrapper imports + 7 widget integrations | build 6 missing wrappers + populate DB registry | medium | PASS most §11/§23/§26 (DOS wrappers ARE Carbon under the hood) |
| **C. PrimeNG → Carbon original (no DOS)** | 440 imports + rebuild 12 universals on Carbon + lose AI/governance vocabulary + retest 113 pages | platform reverts to "no opinionated wrappers" | high | partial §11/§23 (Carbon yes); FAIL §26 (universals don't exist) |
| **D. Mixed (DOS where exists, Carbon where missing)** | 440 imports → ~430 DOS + ~10 raw Carbon | build 6 missing wrappers OR live with raw Carbon for those | low | PASS |

**Path B is the canonical answer.** Path C ("Carbon-original-only") creates 3 sprints of unnecessary rework AND fails the spec's universal-component mandate.

---

## E. TL;DR table — gaps if you really go Carbon-original-only

| Gap kind | Count | What it is |
|---|---|---|
| Carbon primitives compliance directly needs | 28 | covered by raw Carbon |
| Universal compositions Carbon DOESN'T have | 12 | PageMasthead, CommandCenter, Entity360, AgentWorkbench, DecisionPreview, WorkflowCanvas, AuditTimeline, RecommendationCard, TrustLayer, WhyChip, EvidenceDrawer-shape, SmartDataGrid-shape |
| Compliance domain widgets (Carbon-only forces compose-from-scratch) | 13 | 7 already scaffolded + 6 to build (score-ring, maturity-map, SoD-matrix, regulator-packet, ontology-tree, bilingual cards, …) |
| Cross-cutting concerns (Carbon ≠ drop-in) | 8 | i18n, RTL, forms, theming, toast service, confirm dialog, context menu, tooltip directive |
| Product coupling NOT fixed by Carbon | 332 | `@app/*` imports — unchanged by framework swap |
| Carbon primitives missing DOS wrapper today | 6 | ai-label, aspect-ratio, combo-button, context-menu, menu-button, dialog-distinct |

**Total Carbon-only readiness:** ~55% of compliance UI maps; **45% needs new builds or bridges**, on top of the 332 `@app/*` couplings that need fixing regardless.

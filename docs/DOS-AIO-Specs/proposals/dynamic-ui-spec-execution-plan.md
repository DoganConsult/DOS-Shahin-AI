# Dynamic UI — Spec → Implementation Execution Plan

**Source spec:** [dynamic-ui-enrollment-page-experience-widgets-spec.md](../dynamic-ui-enrollment-page-experience-widgets-spec.md) (3340 lines, 36 sections)
**Date:** 2026-04-30
**Goal:** Ship the Dynamic UI factory so every module enrolls once and renders correctly with no shell edits — fulfilling every line of the spec.

---

## Context

The spec is the authoritative contract for **UI Dynamic Spaces**: enrollment, page experience, widgets, dynamic agent UI, and the Shahin SPA shell. This plan maps every § of the spec to the current code state and to a concrete deliverable, then groups deliverables into sequenced **Build Waves** so we can land production-grade UI module by module.

The Dynamic UI is the **production engine** for every module. If the factory does not fulfill the spec, no module can claim "enrolled" (Hard Gates §10) or pass the Page Quality Gate (§21).

---

## Current State Snapshot (read at plan time)

### Already built (don't re-do)

| Spec § | Deliverable | File |
|---|---|---|
| §2 | Module UI Contract types (TS) | [platform/dynamic-ui/src/contracts/module-record.ts](../../platform/dynamic-ui/src/contracts/module-record.ts), [route-record.ts](../../platform/dynamic-ui/src/contracts/route-record.ts) |
| §3 | PageExperienceContract types | [platform/dynamic-ui/src/contracts/page-experience.ts](../../platform/dynamic-ui/src/contracts/page-experience.ts) |
| §3.1 | UserContext type | [platform/dynamic-ui/src/contracts/user-context.ts](../../platform/dynamic-ui/src/contracts/user-context.ts) |
| §3.3 | Backend resolver | [platform/dynamic-ui/src/domain/resolvers.ts](../../platform/dynamic-ui/src/domain/resolvers.ts), [page-experience-resolver.ts](../../platform/dynamic-ui/src/domain/page-experience-resolver.ts) |
| §3.3 | SPA-side resolver | [products/shahin-ai/app/src/app/blueprint/ui-blueprint-resolver.service.ts](../../products/shahin-ai/app/src/app/blueprint/ui-blueprint-resolver.service.ts), [effective-ui-state.service.ts](../../products/shahin-ai/app/src/app/blueprint/effective-ui-state.service.ts) |
| §6 | Renderer registry skeleton (overview only) | [products/shahin-ai/app/src/app/blueprint/shared/dynamic-ui/registry/page-renderers.ts](../../products/shahin-ai/app/src/app/blueprint/shared/dynamic-ui/registry/page-renderers.ts) |
| §7.2 | 25-widget catalog declarations | [platform/dynamic-ui/ui/registry/widget-registry.ts](../../platform/dynamic-ui/ui/registry/widget-registry.ts) |
| §7.2 | SPA WIDGET_KEY_MAP (lazy components) | [products/shahin-ai/app/src/app/blueprint/shared/dynamic-ui/registry/widget-key-map.ts](../../products/shahin-ai/app/src/app/blueprint/shared/dynamic-ui/registry/widget-key-map.ts) |
| §8 | DB schema (modules / routes / widgets / actions / agents) | [platform/dynamic-ui/db/public/migrations/001..007.sql](../../platform/dynamic-ui/db/public/migrations/) |
| §10 | Hard Gates (HTTP layer) | [services/dynamic-ui-service](../../services/dynamic-ui-service/) — `/contract/:moduleCode` returns unified bundle |
| §18.1 | Command palette component | [products/shahin-ai/app/src/app/blueprint/shared/command-palette/command-palette.component.ts](../../products/shahin-ai/app/src/app/blueprint/shared/command-palette/command-palette.component.ts) |
| §19.4 | AI panel (partial workbench) | [products/shahin-ai/app/src/app/blueprint/shared/ai-panel/ai-panel.component.ts](../../products/shahin-ai/app/src/app/blueprint/shared/ai-panel/ai-panel.component.ts) |
| §26.1 | Page chrome (masthead-like) | [products/shahin-ai/app/src/app/blueprint/shared/components/page-chrome/](../../products/shahin-ai/app/src/app/blueprint/shared/components/page-chrome/) |
| §26.3 | Smart data grid (base) | [products/shahin-ai/app/src/app/blueprint/shared/components/tables-data/grc-data-table.component.ts](../../products/shahin-ai/app/src/app/blueprint/shared/components/tables-data/grc-data-table.component.ts) |
| §32 (3 of 34) | Foundation/Compliance/AI-OS module style seeds | [platform/dynamic-ui/db/public/seeds/001..011](../../platform/dynamic-ui/db/public/seeds/) |
| Tests | 9 vitest contract tests | [platform/dynamic-ui/tests/](../../platform/dynamic-ui/tests/) |
| Service | PM2 port 4015 | [services/dynamic-ui-service/ecosystem.config.cjs](../../services/dynamic-ui-service/ecosystem.config.cjs) |

### Missing or incomplete

- **§6**: 6 of 7 generic renderers (list/object/workflow/analytics/audit/settings) fall back to `ShellHostComponent` — they don't drive layout off `PageExperienceContract`.
- **§26.x**: 10 Universal Advanced Components canonical names are not present; equivalents exist under module-specific names (page-shell, module-masthead, grc-data-table, raci-panel, etc.).
- **§31**: `moduleStyleTokens` contract type not persisted in DB; no publisher writes it.
- **§32**: 31 of 34 modules have no style seed.
- **§15.2 / §26.7**: `DecisionPreviewPanel` not built.
- **§16 / §26.8**: `EvidenceDrawer` not built (evidence-vault *widget* exists, drawer chrome does not).
- **§17**: Time Machine / History Replay not built.
- **§18.2**: Global Work Queue exists as a workflow widget (`my-work-queue`), not as the cross-module unified queue the spec requires.
- **§18.3**: Trust Center not built.
- **§19.1 / §19.2**: AI Trust Layer & Action Receipt — partial via `ai-badge`/`ai-reasoning-trace`, not enforced as wrapper.
- **§20.6**: 10 Reusable Agent UI components — partial (4–5 of 10 exist).
- **§21**: Page Quality Gate is documented but not automated as a CI test.

---

## Spec § → Deliverable Map (every section has a row)

> Status legend: ✅ done · 🟡 partial · ❌ missing · 📜 doc-only (no code needed)

| § | Title | Status | Deliverable | Path |
|---|---|---|---|---|
| 0 | Scope | 📜 | — | — |
| 0.1 | Non-goals | 📜 | — | — |
| 0.2 | Implementation Plan (Aligned) | 📜 | — | — |
| 1 | Canonical Architecture | 🟡 | Wire Module Contract → Publisher → DB → API → SPA Bootstrap end-to-end | (cross-cutting) |
| 1.1 | Shell knowledge boundary | 🟡 | Lint rule blocking `if (moduleCode === 'foundation')` etc. in shell code | `tools/lint/no-shell-module-name.ts` |
| 2.1 | Contract file location | 🟡 | Each module ships `contracts/ui.contract.json` (foundation has it; 33 modules don't) | `<Module>/contracts/ui.contract.json` |
| 2.2 | Contract schema (minimum) | 🟡 | ajv schema + publisher validation | `platform/contracts/module/ui.contract.schema.json` (new) |
| 2.3 | Route contract fields (required) | ✅ | — | already enforced by check constraints |
| 3.1 | Normalized UserContext | ✅ | — | type complete; SPA wires from `/api/auth/oidc/session` + `/api/access/my-permissions` |
| 3.2 | PageExperienceContract | ✅ | — | DB + TS done |
| 3.3 | Resolver | ✅ | — | backend & SPA both have resolvers |
| 3.4 | Rendering rule (hard law) | ❌ | ESLint rule banning role checks in components | `tools/lint/no-role-conditional-in-template.ts` |
| 3.5 | Page Experience gates | 🟡 | Automated test that every active route passes 10 gates | `platform/dynamic-ui/tests/page-experience-gates.contract.test.ts` |
| 4.1 | KPI strip rule | 🟡 | Shell respects `kpiScope === 'module-overview'` only on overview | `layout/app-shell.component.ts` (verify + test) |
| 4.2 | Layout rule | ✅ | — | enforced via PAGE_RENDERERS |
| 4.3 | Titles | 🟡 | Lint rule banning raw i18n keys in HTML | `tools/lint/no-raw-i18n-key.ts` |
| 5 | Theme tokens | 🟡 | Runtime applier sets `--module-accent`, `data-module`, `data-page-type`, `data-layout` | `core/runtime/module-theme-applier.service.ts` (new) |
| 6 | Renderer Registry | 🟡 | Build 6 missing generic page renderers (list/object/workflow/analytics/audit/settings) | `shared/dynamic-ui/renderers/{generic-list,generic-object,generic-workflow,generic-analytics,generic-audit,generic-settings}.component.ts` |
| 7.1 | Signature widget rule | 🟡 | Publisher enforces every route has `signatureWidget` OR explicit `generic-fallback` flag | `platform/dynamic-ui/src/contracts/contract-publisher.ts` (new) |
| 7.2 | 25 core widget types | ✅ catalog · 🟡 implementations | Build/canonicalize 25 widgets (some exist, some are partial) | `shared/widgets/<widget-key>/<widget-key>.component.ts` (×25) |
| 7.3 | Widget contract shape | ✅ | — | DB column `dos.dynamic_ui_widgets` |
| 7.4 | Widget selection rules by pageType | 🟡 | Publisher rule + lint | publisher (above) |
| 7.5 | Agent actions on widgets | 🟡 | Wire `agentActions` from contract into each widget chrome | wave 4 |
| 8 | Data Model `dynamic_ui_*` | 🟡 | Add `dos.dynamic_ui_module_style_tokens` (§31) and `dos.dynamic_ui_i18n_keys` | `platform/dynamic-ui/db/public/migrations/008_module_style_tokens.sql`, `009_i18n_keys.sql` |
| 9 | Enrollment Flow | 🟡 | CLI: `pnpm dynamic-ui:publish <Module>` (validate → seed → smoke → route-catalog check) | `platform/dynamic-ui/generators/publish.ts` |
| 10 | Hard Gates | 🟡 | Automate the 11 gates as a single CI script | `tools/ci/dynamic-ui-hard-gates.mjs` |
| 11.1 | Typography | 📜 | global SCSS tokens already in design-tokens.css | verify |
| 11.2 | Color & semantics | 📜 | Tailwind config already covers semantic colors | verify |
| 11.3 | Spacing & layout | 📜 | — | verify |
| 11.4 | Responsive rules | 🟡 | Each widget must declare `mobileVariant`; CI fails when missing | publisher |
| 11.5 | Accessibility WCAG AA | 🟡 | Per-widget axe-core test in playwright | `tests/a11y/widgets.spec.ts` |
| 12 | Persona-Oriented Workspace | ✅ contract · 🟡 enforcement | Resolver respects `audienceProfiles`; visibleActions filtered by profile | wave 2 (resolver hardening) |
| 13.1 | `realtimeEnabled` flag | ✅ | — | DB column `realtime_channels` |
| 13.2 | Real-time signals | 🟡 | SSE channel binding service; widgets subscribe via `realtime` capability | `core/runtime/realtime-channel.service.ts` (new) |
| 13.3 | Real-time rules | 🟡 | Tenant scope + permission scope on SSE subscription | above |
| 14.1 | Workflow states surfaced | 🟡 | Workflow ribbon already exists; verify it shows all 9 states | `shared/components/module-chrome/module-workflow-ribbon.component.ts` |
| 14.2 | Action validity law | 🟡 | Resolver checks `permissions + workflow step + SoD + tenant scope` | resolver hardening |
| 15.1 | "Why am I seeing this?" | 🟡 | `why-how-popover` exists; needs explicit "blocked because" + remediation path | `shared/components/domain-panels/why-how-popover.component.ts` (extend) |
| 15.2 | Decision Preview | ❌ | **Build DecisionPreviewPanel** | `shared/components/decision-preview/decision-preview.component.ts` (new) |
| 16 | Evidence Fabric | ❌ | **Build EvidenceDrawer** + middleware that auto-creates evidence rows | `shared/components/evidence-drawer/evidence-drawer.component.ts` (new) |
| 17 | Time Machine | ❌ | **Build HistoryReplayDrawer** with as-of/diff views | `shared/components/history-replay/history-replay.component.ts` (new) |
| 18.1 | Command palette | 🟡 | Wire commands from enrolled contracts (today: hardcoded list) | extend `command-palette.component.ts` to source from contract |
| 18.2 | Global work queue | ❌ | **Build cross-module GlobalWorkQueue** (approvals + tasks + reviews + delegations) | `shared/components/global-work-queue/global-work-queue.component.ts` (new) |
| 18.3 | Trust center | ❌ | **Build TrustCenter page** (system/auth/audit/tenant/SoD/backup/SLA/data-residency/integrations) | `pages/trust-center/trust-center.component.ts` (new) |
| 19.1 | AI Trust Layer | 🟡 | Wrapper component enforces source/confidence/reasoning/data/updated/scope/risk/approval on every AI output | `shared/components/ai/ai-trust-wrapper.component.ts` (new) |
| 19.2 | AI action receipt | 🟡 | Receipt drawer auto-opens after AI-assisted writes | `shared/components/ai/ai-action-receipt.component.ts` (new) |
| 19.3 | AI decision preview | ❌ | Routes through §15.2 panel — gate enforced via `requires_approval` flag | resolver |
| 19.4 | AI Workbench per page | 🟡 | Extend `ai-panel` into full workbench (Ask/Explain/Summarize/DetectGaps/Generate/Compare/Simulate/PrepareApproval/CreateTask) | `shared/components/ai/ai-workbench.component.ts` (new) |
| 19.5 | Arabic-first AI | 🟡 | Verify all AI prompts and responses honor `dir="rtl"` and `lang="ar"` | wave 6 (i18n sweep) |
| 19.6 | AI memory governance | ❌ | Memory inspector page (visible/editable/audited) | `pages/ai-memory/ai-memory.component.ts` (new) |
| 19.7 | Risk-aware UI | 🟡 | `risk_level` column on actions drives confirm strength | resolver+UI |
| 20.1 | Agent hierarchy L0–L5 | ✅ | — | DB schema present |
| 20.2 | Module agent contract | 🟡 | Each module ships `contracts/agent.contract.json` (only foundation has) | per module |
| 20.3 | Page-level agent experience | 🟡 | Resolver + AI Workbench surfaces page-specific agent actions | wave 4 |
| 20.4 | Workflow agents | 🟡 | Workflow contract step → agent action mapping | wave 5 |
| 20.5 | Squad agents | 🟡 | Squad runner + handoff log | wave 5 |
| 20.6 | Reusable Agent UI components (10) | 🟡 | Canonicalize 10: AgentWorkbenchPanel, AgentRecommendationCard, AgentWorkflowCanvas, SquadRunTimeline, DecisionPreviewPanel, AIEvidenceDrawer, AgentActionReceipt, AgentCommandPalette, AgentInbox, AgentGuardrailBanner | `shared/components/agent/<name>.component.ts` (×10) |
| 20.7 | Agent data model | ✅ | — | migration 007 |
| 20.8 | Agent permission levels (L0–L6) | 🟡 | Resolver enforces level vs requested action | resolver hardening |
| 20.9 | Agent gates (PASS/FAIL) | ❌ | Automated test per module agent.contract.json | `tools/ci/agent-gates.mjs` |
| 21 | Page Quality Gate (30 checks) | ❌ | **Single CI script that scores every active route 0–30** | `tools/ci/page-quality-gate.mjs` |
| 22 | Phase order | 📜 | — | This document follows it |
| 23 | Enterprise design system + module personality | 📜 | — | wave 1 (tokens) |
| 24.1 | Core direction | 📜 | — | tailwind config |
| 24.2 | Global layout skeleton | 🟡 | Verify app-shell/page-shell composition | verify |
| 24.3 | Global tokens (baseline) | 🟡 | CSS vars for the spec's exact 14 colors | `styles/dos-tokens.css` (new or extend `design-tokens.css`) |
| 24.4 | Shape & sizing | 🟡 | Tailwind preset matching spec radii | tailwind config |
| 24.5 | Interaction states (8) | 🟡 | Mixin/util that every interactive surface includes | `styles/interaction-states.css` (new) |
| 25 | Module personality tokens (4 worked examples) | 🟡 | Seed examples in DB | wave 1 |
| 26.1 | Page Masthead | 🟡 | Canonicalize as `<dos-page-masthead>` (today: page-header) | `shared/components/page-chrome/dos-page-masthead.component.ts` (rename/canonicalize) |
| 26.2 | Command Center | 🟡 | Build canonical `<dos-command-center>` (overview only) | `shared/components/command-center/dos-command-center.component.ts` (new) |
| 26.3 | Smart Data Grid | 🟡 | Promote `grc-data-table` to `<dos-smart-data-grid>` (with saved views, advanced filters, bulk actions, mobile cards) | `shared/components/smart-data-grid/dos-smart-data-grid.component.ts` |
| 26.4 | Entity 360 Panel | 🟡 | Build `<dos-entity-360>` (profile + relationships + ownership + workflow + audit + evidence + AI) | `shared/components/entity-360/dos-entity-360.component.ts` (new) |
| 26.5 | Agent Workbench Panel | 🟡 | Same as §19.4 — canonicalize | (above) |
| 26.6 | Recommendation Card | 🟡 | Promote `ai-recommendation-list` items to `<dos-recommendation-card>` | `shared/components/ai/dos-recommendation-card.component.ts` |
| 26.7 | Decision Preview Panel | ❌ | (= §15.2) | (above) |
| 26.8 | Evidence Drawer | ❌ | (= §16) | (above) |
| 26.9 | Workflow Canvas | 🟡 | `module-workflow-ribbon` is partial; need full canvas | `shared/components/workflow-canvas/dos-workflow-canvas.component.ts` (new) |
| 26.10 | Audit Timeline | 🟡 | `forensic-timeline` widget exists; canonicalize as `<dos-audit-timeline>` | `shared/components/audit-timeline/dos-audit-timeline.component.ts` |
| 27 | Page Archetypes | 🟡 | Each generic renderer uses the archetype's required components | wave 3 |
| 28.1–4 | Foundation/Risk/Workflow/Compliance illustrative mappings | 🟡 | 4 modules' `ui.contract.json` follow archetype mapping | wave 7 (per-module rollout) |
| 29 | Implementation instruction | 📜 | — | drives wave plan |
| 30.1 | Resolver-only gating | ❌ | Lint rule + automated test | wave 0 |
| 30.2 | Backend RLS authority | 📜 | — | already enforced |
| 30.3 | Generic renderer + signature composition | 🟡 | Renderers compose signature + secondary widgets from contract | wave 3 |
| 30.4 | Strict KPI hierarchy | 🟡 | (= §4.1) | wave 0 |
| 30.5 | Command palette from enrolled contracts | 🟡 | (= §18.1) | wave 4 |
| 30.6 | Evidence/audit middleware | ❌ | Backend middleware on all governed-write routes | `services/_shared/governed-action-middleware.ts` (new) |
| 31 | ModuleStyleTokens contract | ❌ | DB table + TS type + publisher validation + shell consumer | wave 1 |
| 32.1–34 | All-Module Style Map (34 modules) | 🟡 (3 of 34) | Seed 31 missing modules | `platform/dynamic-ui/db/public/seeds/0NN_seed_<module>_style.sql` (×31) |
| 33 | Agent tone families (4 groups) | 🟡 | Tone enum on `dos.dynamic_ui_agents` already exists; map per module | seed |
| 34 | All-module agent instruction | 📜 | — | drives wave 7 |
| 35.1–6 | ModuleStyleTokens JSON examples | 📜 | Use as seed source for §32 | wave 1 |
| 36 | Shahin SPA Shell Incident Playbook | 📜 | Operational runbook (no build) | already documented |

---

## Build Waves (sequenced, no skipping)

Each wave has: **goal**, **deliverables**, **exit gate**. Waves don't move forward until the previous wave's exit gate passes.

### Wave 0 — Hard-Gate Plumbing (1 sprint)

**Goal:** Stop drift before we build more. Every gate the spec defines is automated and CI-enforced.

**Deliverables**
1. `tools/ci/dynamic-ui-hard-gates.mjs` — runs all 11 §10 gates, exit 1 on fail.
2. `tools/ci/page-quality-gate.mjs` — runs the 30-check §21 score per active route.
3. `tools/lint/no-shell-module-name.ts` — ESLint rule banning `moduleCode === '<name>'` patterns in shell code.
4. `tools/lint/no-role-conditional-in-template.ts` — ESLint rule banning `*ngIf="user.role === ..."` and equivalents in component templates (rule §3.4).
5. `tools/lint/no-raw-i18n-key.ts` — ESLint rule banning raw i18n keys in templates (rule §4.3).
6. CI wires all four into `pnpm test:ci`.

**Exit gate:** All four checks pass on current main branch (or block PRs that violate).

---

### Wave 1 — Module Style Tokens & Theme Application (1 sprint)

**Goal:** §31 + §32 + §5 + §24 in code. Every module declares its personality via tokens; the shell applies them at runtime.

**Deliverables**
1. Migration `008_module_style_tokens.sql` — `dos.dynamic_ui_module_style_tokens` (module_code PK, accent, accent_secondary, icon, mood, page_density, surface_style, signature_widgets[], agent_tone, default_page_layout, mobile_variant).
2. TS contract type `ModuleStyleTokens` in `platform/dynamic-ui/src/contracts/module-style-tokens.ts`.
3. Backend resolver: extend `/contract/:moduleCode` to include `moduleStyleTokens`.
4. SPA service `core/runtime/module-theme-applier.service.ts` — sets `--module-accent`, `data-module`, `data-page-type`, `data-layout` on `<body>` per spec §5.
5. Seed all 34 modules' tokens (uses §35.1–6 JSON as starting point; rest filled per §32).
6. `styles/dos-tokens.css` — extend with the spec's exact 14 colors and semantic mappings.
7. Tailwind preset for spec radii (cards 16–20, panels 20–24, buttons/inputs 10–12).

**Exit gate:** `GET /api/dynamic-ui/contract/<any-module>` returns non-empty `moduleStyleTokens`; SPA `<body>` shows `data-module="<code>"` after navigation.

---

### Wave 2 — Resolver Hardening & Persona Enforcement (1 sprint)

**Goal:** §3.4 + §3.5 + §12 + §14.2 + §20.8.

**Deliverables**
1. Extend `UiBlueprintResolverService` to compute `visibleActions` strictly from `permissions + workflow_step + SoD + dataScope + audienceProfiles`. Return `hiddenActions` with reason codes (`hidden_by_permission`, `hidden_by_profile`, `hidden_by_workflow_state`, `hidden_by_sod`).
2. New service `core/runtime/why-am-i-seeing-this.service.ts` — exposes localized explanations for any element's visibility (§15.1).
3. Test `platform/dynamic-ui/tests/page-experience-gates.contract.test.ts` — every active route is asserted against the 10 gates of §3.5.
4. Test `platform/dynamic-ui/tests/agent-permission-levels.contract.test.ts` — no agent action without permission key (§20.9).

**Exit gate:** `pnpm --filter @dos/platform-dynamic-ui test` passes; both new tests are green; ESLint `no-role-conditional-in-template` reports zero violations.

---

### Wave 3 — Generic Page Renderers & Universal Components (2 sprints)

**Goal:** §6 + §26.1–10 + §27.

**Deliverables (renderers):**
- `shared/dynamic-ui/renderers/generic-overview.component.ts` — composes `<dos-command-center>` from contract.
- `shared/dynamic-ui/renderers/generic-list.component.ts` — composes `<dos-smart-data-grid>` + signature widget.
- `shared/dynamic-ui/renderers/generic-object.component.ts` — composes `<dos-entity-360>` + `<dos-audit-timeline>` + workflow panel.
- `shared/dynamic-ui/renderers/generic-workflow.component.ts` — composes `<dos-workflow-canvas>` + SLA tracker + decision preview.
- `shared/dynamic-ui/renderers/generic-analytics.component.ts` — heatmap/trend/scorecard.
- `shared/dynamic-ui/renderers/generic-audit.component.ts` — `<dos-audit-timeline>` forensic.
- `shared/dynamic-ui/renderers/generic-settings.component.ts` — `<dos-tenant-control-center>`.
- Wire into `PAGE_RENDERERS` map.

**Deliverables (10 universal components):**
| # | Component | Path |
|---|---|---|
| 1 | dos-page-masthead | `shared/components/page-chrome/dos-page-masthead.component.ts` |
| 2 | dos-command-center | `shared/components/command-center/dos-command-center.component.ts` |
| 3 | dos-smart-data-grid | `shared/components/smart-data-grid/dos-smart-data-grid.component.ts` |
| 4 | dos-entity-360 | `shared/components/entity-360/dos-entity-360.component.ts` |
| 5 | dos-agent-workbench | `shared/components/ai/dos-agent-workbench.component.ts` |
| 6 | dos-recommendation-card | `shared/components/ai/dos-recommendation-card.component.ts` |
| 7 | dos-decision-preview | `shared/components/decision-preview/dos-decision-preview.component.ts` |
| 8 | dos-evidence-drawer | `shared/components/evidence-drawer/dos-evidence-drawer.component.ts` |
| 9 | dos-workflow-canvas | `shared/components/workflow-canvas/dos-workflow-canvas.component.ts` |
| 10 | dos-audit-timeline | `shared/components/audit-timeline/dos-audit-timeline.component.ts` |

Each component:
- has spec, test, AR/EN labels, RTL test, mobile variant, loading/empty/error/readonly states.
- consumes only the resolved contract (no role logic).
- emits audit events for governed actions.

**Exit gate:** All 7 generic renderers + 10 components in registry; foundation overview, list, object, workflow, audit, settings render via the generic path; visual regression tests pass.

---

### Wave 4 — Signature Widgets (3 sprints, 5 widgets each)

**Goal:** §7.2 — all 25 signature widgets are real components, not placeholder fallbacks.

**Sprint 4a (5 widgets):** foundation-command-center · org-graph-canvas · identity-360 (list+object) · permission-matrix · raci-canvas
**Sprint 4b (5 widgets):** decision-room · authority-simulator · ownership-heatmap · campaign-cockpit · evidence-vault
**Sprint 4c (5 widgets):** lifecycle-board · ropa-map · taxonomy-editor · forensic-timeline · tenant-control-center
**Sprint 4d (5 widgets):** business-units-grid · departments-grid · positions-board · risk-heatmap · controls-coverage-grid
**Sprint 4e (5 widgets):** policy-lifecycle-board · vendor-risk-portfolio · workspace-home-cockpit · geo-coverage-map · workflow-designer-canvas

Each widget:
- Lazy-loaded via `WIDGET_KEY_MAP`.
- Capability declaration in `SIGNATURE_WIDGET_CATALOG`.
- Real data via `dataResource` binding (no fake data — §21 #22).
- Permission-aware actions surfaced from contract.
- Mobile variant (or explicit `mobile: false` and CI-allow).
- AR/EN labels; RTL test; a11y test.

**Exit gate:** `GET /api/dynamic-ui/contract/<module>` returns `widgets[]` non-empty for every active module; SPA renders all signature widgets without 404; bundle-size budget respected.

---

### Wave 5 — Agent Layer & Workflow Layer (2 sprints)

**Goal:** §20 + §14 + §19.

**Deliverables**
1. **Agent orchestrator** in ai-engine: `prompt_template_ref` resolution, agent-action invocation, HITL gating from `requires_human_approval`. (Cross-cuts AI Phase 3 from earlier proposal.)
2. **AgentWorkbench full features**: Ask, Explain, Summarize, Detect gaps, Generate draft, Compare, Simulate, Prepare approval, Create task — each command checks permission and scope.
3. **AI Trust Wrapper** — every AI output rendered through `<dos-ai-trust-wrapper>` with source/confidence/reasoning/data/last-updated/scope/risk/approval.
4. **AI Action Receipt drawer** — auto-opens after AI-assisted writes (§19.2).
5. **Squad Run Timeline component** + `dos.agent_runs` ledger writes.
6. **Workflow Canvas wiring** — workflow contract step → agent action mapping (§20.4).
7. **Module agent.contract.json** for foundation, risk, compliance, workflow (4 starter modules).

**Exit gate:** Agent autonomy=0 test — agent invoked at level > permission level returns refusal with audit row; AI write without approval is blocked; `agent-gates.mjs` CI passes.

---

### Wave 6 — Cross-Module Surfaces (1 sprint)

**Goal:** §17 + §18.1 + §18.2 + §18.3 + §19.6.

**Deliverables**
1. **Time Machine drawer** (`<dos-history-replay>`) — as-of view + diff for any entity supporting it.
2. **Command Palette extension** — sources commands from `/api/dynamic-ui/route-catalog` + module agent contracts; permission-checked.
3. **Global Work Queue page + dock** (`/work-queue`) — aggregates approvals, tasks, access reviews, delegations, evidence requests, AI recommendations from per-module endpoints.
4. **Trust Center page** (`/trust`) — system/auth/audit/tenant/SoD/backup/SLA/data-residency/integrations health.
5. **AI Memory inspector** (`/ai-memory`) — visible/editable/audited per spec §19.6.

**Exit gate:** All 5 cross-module surfaces render with real data; permission gates verified via Playwright.

---

### Wave 7 — Per-Module Rollout (rolling, ~5 modules per sprint)

**Goal:** Apply all of §32 to every module. Each module gets:

For each of the 34 modules (§32.1 → §32.34):
1. `<Module>/contracts/ui.contract.json` (§2.1)
2. `<Module>/contracts/agent.contract.json` (§20.2) where agents apply
3. Style seed `0NN_seed_<module>_style.sql` (§35-style JSON)
4. Per-route page-experience entries (signatureWidget mapped from §32.x list)
5. Module-specific signature widgets (some are shared 25; some new) — bundled with per-module proof pages from §28
6. Agent contract entries with appropriate `agentTone`
7. Workflow contract entries
8. CI runs Page Quality Gate and stops if score < 30/30

Sequence (priority order; matches user-impact + dependency):
- **Sprint A:** foundation, dauth, user-profile, config-center (governance/identity baseline)
- **Sprint B:** workflow, notifications (operations baseline)
- **Sprint C:** risk, compliance, policy, evidence (GRC core)
- **Sprint D:** audit-trail, dsoc, dnoc (audit + ops)
- **Sprint E:** ai-governance, ai-engine, mcp (AI cluster)
- **Sprint F:** vendor, asset, bcp, training, action, dora, journey, privacy (extended GRC)
- **Sprint G:** analytics, reporting, executive, agrc-os (executive cluster)
- **Sprint H:** records, integrations, portals, widgets, product, platform-admin (platform cluster)

**Exit gate:** Page Quality Gate score 30/30 for every active route across all 34 modules.

---

### Wave 8 — Mobile + a11y + i18n Sweep (1 sprint)

**Goal:** §11.4 + §11.5 + §19.5 + §21 (#16, #17, #18, #19, #20, #21).

**Deliverables**
1. Mobile variant for every signature widget (or CI-allow).
2. axe-core passes on every renderer + widget.
3. RTL Playwright sweep for AR.
4. Keyboard navigation tested per §11.5.
5. Reduced-motion compliance verified.

**Exit gate:** Lighthouse + axe-core CI green for every route.

---

## Concrete Deliverable Counts

| Wave | New files | Modified files | DB migrations | Tests |
|---|---|---|---|---|
| 0 | 5 | 1 (CI config) | 0 | 0 |
| 1 | 8 | 3 | 2 | 2 |
| 2 | 3 | 2 | 0 | 2 |
| 3 | 17 (7 renderers + 10 components) | 1 (PAGE_RENDERERS) | 0 | 17 specs |
| 4 | 25 widgets (some are wrappers around existing) | 1 (WIDGET_KEY_MAP) | 0 | 25 specs |
| 5 | 7 | ai-engine src | 0 | 4 contract tests |
| 6 | 5 | 1 (router) | 0 | 5 specs |
| 7 | 34 ui.contract.json + 31 style seeds + per-route entries | per-module | 0 | 34 page-quality runs |
| 8 | 0 | many | 0 | a11y suite |
| **Total** | **~110** | **~50** | **2** | **~90** |

---

## Risk & Sequencing Notes

- **Cannot skip Wave 0.** Without CI gates, every later wave drifts.
- **Wave 4 widgets depend on Wave 3 components** (e.g., a signature widget renders inside `<dos-page-masthead>` + `<dos-command-center>`).
- **Wave 5 agent layer depends on AI Phase 3 stubs** (see earlier platform proposal). If those aren't ready, Wave 5 can land UI-only with mocked agent runtime, but the gate "agent autonomy=0 enforcement" must wait.
- **Wave 7 is parallelizable** across modules. Recommend assigning module owners.
- **All waves enforce: no shell hardcoding, no per-module CSS, no frontend-only auth.**

---

## What I'm Asking

1. **Start order**: my recommendation is **Wave 0 → 1 → 2 → 3** in strict order. Wave 4 widgets and Wave 7 module rollout can then run in parallel tracks.
2. **First concrete code task**: I propose starting Wave 0 today with the four CI gates + lint rules so nothing else can drift. Alternative: jump straight to Wave 1 (module style tokens) so we get visible module-personality wins.
3. **Module priority for Wave 7**: confirm sprint sequence A→H or reorder.

If you confirm Wave 0 first, I'll start by writing `tools/ci/dynamic-ui-hard-gates.mjs` and the three lint rules, wire them into `pnpm test:ci`, and prove they fail on a known violation before fixing.

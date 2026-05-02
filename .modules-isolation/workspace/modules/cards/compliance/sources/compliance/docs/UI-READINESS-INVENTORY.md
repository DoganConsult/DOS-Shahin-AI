# Compliance Module — UI Readiness Inventory

> What must be registered in **3 systems** for the module to be truly "ready":
> 1. **DB** — `dynamic_ui_*` tables (Spec §1, §8, §10)
> 2. **UI System** — `@dos/ui-system` Carbon-based primitives + universal components (Spec §6, §26)
> 3. **Dynamic UI** — runtime resolver registry (Spec §6 + §3.3)
>
> Until all three are in sync, the module cannot be claimed enrolled (§10 hard gates fail).

---

## ⛔ DO-NOT-SHIP rules (strict — anything off-spec fails the gates)

User policy 2026-05-02: nothing that does not follow the canonical spec ships.
The §10 hard-gates are **blocking**. The list below is a snapshot of every current artifact
in the module that fails the spec — any one of these prevents claiming "enrolled".

| # | Off-spec artifact | Spec violation | Verdict |
|---|---|---|---|
| 1 | **441 PrimeNG imports** in 75 pages | §6 + §26 require `@dos/ui-system` (Carbon-based) primitives. PrimeNG is non-canonical. | **DO NOT SHIP** until all 441 are migrated. |
| 2 | **0 `@dos/ui-system` imports** in compliance UI | §6: Renderer registry must be the only source of components. | **DO NOT SHIP** any UI page until adopted. |
| 3 | **62 of 75 page components** are not in the contract (only 13 are) | §10: every active route must be in the route-catalog. | **DO NOT EXPOSE** the 62 surplus pages — either add to contract or archive. |
| 4 | **7 signature widgets** declared in `moduleStyleTokens.signatureWidgets` but **none built** as registered ui-system components | §7.1: each pageType requires its signature widget. | **DO NOT SHIP** any list/object/workflow page until its signature widget exists. |
| 5 | **10 Universal Advanced Components** not verified in `@dos/ui-system` | §26 (PageMasthead, CommandCenter, SmartDataGrid, Entity360Panel, AgentWorkbenchPanel, RecommendationCard, DecisionPreviewPanel, EvidenceDrawer, WorkflowCanvas, AuditTimeline) | **PLATFORM BLOCKER** — escalate before shipping any module. |
| 6 | `/api/dynamic-ui/contract/compliance` not wired | §10 hard gate | **MODULE NOT ENROLLED** until reachable. |
| 7 | `/api/dynamic-ui/route-catalog` not aggregating compliance | §10 hard gate | Same. |
| 8 | **i18n key sweep not done** — ~94 keys referenced by contract | §11.1 (no raw translation keys at runtime) | **DO NOT SHIP** until both en and ar files cover every key. |
| 9 | Any **frontend-only role check** (`if (role==='admin')`) | §3.4 hard law: components render from resolved contract. | **GREP-AND-FIX** before ship. |
| 10 | Any **direct Keycloak / Auth call** outside DAuth port | Substrate-needs §1+§2 | **REJECT IN REVIEW**. |
| 11 | Any **direct AI gateway call** bypassing `ports/ai.port` | Substrate-needs §5 | **REJECT IN REVIEW** (already swept this session — 0 violations). |
| 12 | Any **cross-module direct SQL** (evidence, findings) | DB-usage §9 + Patch 06 §2.5 | **REJECT IN REVIEW** (still 8 + 6 violations open). |
| 13 | `_inbound/` or `_legacy/` paths in built artifacts | Self-enclosure rule | **REJECT IN REVIEW** (already untracked this session). |

### Default ship verdict for compliance UI today: **DO NOT SHIP**.

13 gates total. Currently green: 3. To unblock all 13 — see Section F (critical-path order).


Generated 2026-05-02. Cross-tabbed with `contracts/ui.contract.json` (13 routes, 6 signature widgets).

---

## Headline numbers

| Surface | Count | Status |
|---|---|---|
| Total `*.component.ts` files in `ui/` | **105** | — |
| Page components (route-level) | 75 | partial — 13 mapped in contract |
| Widget / tab / drawer components (composable) | 37 | partial — 15 in contract |
| Routes in `ui.contract.json` | **13** | ✅ all 4 hard fields present |
| Distinct `componentKey`s in contract | 13 | ⏳ none registered yet |
| Signature widgets declared (§35.3) | 6 | ⏳ none implemented in `@dos/ui-system` |
| Secondary widgets referenced | 9 (15 total incl. signature) | ⏳ |
| `@dos/ui-system` imports | **0** | ❌ design-system not adopted |
| `@carbon/*` imports | **0** | ❌ |
| `primeng` imports (legacy) | **441** | ❌ wrong design system |

---

## A. DB registration — `dynamic_ui_*` tables

Per Spec §1, §8: 11 metadata tables (per `MEMORY.md` "DB-driven UI Management"). Compliance must seed rows in each:

| Table | Rows compliance must seed | Source data |
|---|---|---|
| `dynamic_ui_modules` | **1** | `moduleCode='compliance'`, name, owner, version |
| `dynamic_ui_module_style_tokens` | **1** | from `contracts/ui.contract.json#moduleStyleTokens` |
| `dynamic_ui_routes` | **13** | one row per `routes[]` entry in contract |
| `dynamic_ui_page_experiences` | **13** | one row per route (we have 6 explicit, 7 default) |
| `dynamic_ui_navigation` | **11** | one row per `navigation[]` entry |
| `dynamic_ui_components` (renderer registry / allowed keys) | **13 page keys + 15 widgets = 28** | from `componentKey` + signature/secondary widgets |
| `dynamic_ui_actions` | **~16** | sum of `primaryActions[]` + `secondaryActions[]` across pageExperiences |
| `dynamic_ui_widgets` | **15** | distinct widget names referenced by any route |
| `dynamic_ui_agent_experience` | **5** | `agentExperience.moduleAgents[]` |
| `dynamic_ui_workflow_experience` | **9 transitions** | `workflowExperience.transitions[]` |
| `dynamic_ui_evidence_experience` | **1** | `evidenceExperience` block |
| `dynamic_ui_audit_experience` | **1** | `auditExperience` block + 5 write-audit transitions |
| `dynamic_ui_tenant_overrides` (created on-demand) | 0 baseline | — |
| `dynamic_ui_user_overrides` (created on-demand) | 0 baseline | — |

**Total seed rows for compliance: ~85 baseline (excluding tenant/user overrides).**

### Seed file shape (one per module)

`db/seeds/dynamic-ui/index.json` already exists per the manifest's `dynamicUI.seedManifest`. It must contain 12 keyed sections matching the 12 tables above.

---

## B. UI-System (`@dos/ui-system`) registration

Per Spec §6 (Renderer Registry, generic-first, custom-second) + §26 (10 Universal Advanced Components).

### B.1 Universal Advanced Components — must exist in `@dos/ui-system`

These are **platform-side**, not module-side. The module consumes them. If missing in `@dos/ui-system`, every module is blocked.

| # | Component (§26) | Used by compliance routes |
|---|---|---|
| 1 | `PageMasthead` (§26.1) | ALL 13 routes |
| 2 | `CommandCenter` (§26.2) | `/compliance` (overview only) |
| 3 | `SmartDataGrid` (§26.3) | `frameworks`, `obligations`, `controls`, `evidence`, `attestations`, `diagnostics`, `ksa` |
| 4 | `Entity360Panel` (§26.4) | `controls/:id`, `regulator` |
| 5 | `AgentWorkbenchPanel` (§26.5) | ALL 13 (via `agentEnabled: true` on 12 of 13) |
| 6 | `RecommendationCard` (§26.6) | `gaps`, `regulator` |
| 7 | `DecisionPreviewPanel` (§26.7) | `assessments`, `gaps`, `attestations` (3 risky-write routes) |
| 8 | `EvidenceDrawer` (§26.8) | `controls/:id`, `evidence`, `regulator`, `reports` |
| 9 | `WorkflowCanvas` (§26.9) | `assessments`, `gaps`, `attestations` |
| 10 | `AuditTimeline` (§26.10) | `controls/:id`, `regulator`, `reports`, `diagnostics` |

> **Status check (do these exist in `@dos/ui-system` today?):** must be verified by the `@dos/ui-system` package owner. Per `MEMORY.md` ("UI-OS corrective action"), the workspace shell uses ui-system primitives but the universal-component set is not yet enumerated.

### B.2 Compliance signature widgets — must exist as registered components

Per Spec §7 (one signature per pageType) + §32.3 (compliance domain widgets). Custom but reusable.

| Widget key (kebab-case) | Component class name | Used by routes | Built? |
|---|---|---|---|
| `control-library-matrix` | `ControlLibraryMatrixComponent` | `/controls` | ⏳ to build |
| `obligation-map` | `ObligationMapComponent` | `/obligations`, `/compliance` (secondary) | ⏳ to build |
| `assessment-cockpit` | `AssessmentCockpitComponent` | `/assessments` | ⏳ to build |
| `evidence-binder` | `EvidenceBinderComponent` | `/evidence` | ⏳ to build |
| `gap-remediation-board` | `GapRemediationBoardComponent` | `/gaps`, `/compliance` (secondary) | ⏳ to build |
| `framework-mapping` | `FrameworkMappingComponent` | `/frameworks`, `/regulator`, `/ksa` | ⏳ to build |
| `report-composer` | `ReportComposerComponent` | `/reports` | ⏳ to build |

These must be registered with `@dos/ui-system`'s component registry so the dynamic renderer can instantiate them by key. They live in `modules/compliance/ui/components/widgets/<widget-key>/` and self-register at module bootstrap via `register-components.ts`.

### B.3 13 page components — must each register their `componentKey`

| componentKey (contract) | Current page file | Migration |
|---|---|---|
| `ComplianceOverviewPage` | `compliance-core-pages/compliance-core/compliance-page.component.ts` (or similar) | needs identification + ui-system rebuild |
| `ComplianceFrameworksPage` | `frameworks-group/frameworks/frameworks.component.ts` | PrimeNG → ui-system |
| `ComplianceObligationsPage` | `regulatory-group/compliance-regulatory/compliance-obligations-page.component.ts` | PrimeNG → ui-system |
| `ComplianceControlsPage` | `controls-group/compliance-controls-monitoring/compliance-controls-page.component.ts` | PrimeNG → ui-system |
| `ComplianceControlDetailPage` | `controls-group/control-testing/control-testing.component.ts`? | needs split |
| `ComplianceAssessmentsPage` | `assessments-group/compliance-assessments-findings/compliance-assessments-page.component.ts` | PrimeNG → ui-system |
| `ComplianceEvidencePage` | `controls-group/compliance-controls-monitoring/compliance-evidence-ops-page.component.ts` | PrimeNG → ui-system |
| `ComplianceGapsPage` | `assessments-group/compliance-assessments-findings/compliance-gaps-page.component.ts` | PrimeNG → ui-system |
| `ComplianceAttestationsPage` | `assessments-group/compliance-assessments-findings/compliance-attestations-page.component.ts` | PrimeNG → ui-system |
| `ComplianceReportsPage` | `compliance-core-pages/compliance-core/compliance-reports-page.component.ts` | PrimeNG → ui-system |
| `ComplianceRegulatorPage` | new — `compliance-core-pages/compliance-core/compliance-admin-page.component.ts`? | new build |
| `ComplianceKsaPage` | `ksa-hub/ksa-hub.component.ts` | PrimeNG → ui-system |
| `ComplianceDiagnosticsPage` | new — none yet | new build |

### B.4 Migration cost

- **441 PrimeNG imports** in the existing 75 pages → must be replaced with `@dos/ui-system` primitives (DataTable, Button, Tag, Modal, Drawer, Tabs, Form controls).
- All other 60+ pages currently in `ui/features/compliance/pages/` that are **not in the contract** are out-of-scope-for-readiness — they must be either added to the contract, archived, or merged into the 13 canonical page components.

---

## C. Dynamic UI runtime registration

Per Spec §3.3 (`DynamicPageExperienceResolver`) + §6 (Renderer Registry) + §1 (bootstrap flow).

### C.1 Component registry entries (`application/ui/register-components.ts`)

Module bootstrap registers via the dynamic-ui port:

| Type | Entry count | Source |
|---|---|---|
| Pages | 13 | `componentKey` per route |
| Signature widgets | 7 | `signatureWidget` of each route (deduped — 6 distinct + report-composer) |
| Secondary widgets | 9 | `secondaryWidgets[]` deduped (audit-timeline, command-center, decision-preview-panel, entity-360, evidence-drawer, recommendation-card, smart-data-grid, workflow-canvas + report-composer) |
| **Total** | **~28** | |

### C.2 Resolver inputs the runtime needs

Resolver pulls from:
- The 13 route contracts (already in `ui.contract.json`)
- The 6 page experiences (already in `ui.contract.json`)
- Module style tokens (already there)
- AccessStore — for permission filtering (1 per route × 5 declared permissions)
- Workflow runtime — for `workflowExperience.transitions` state binding
- Persona resolver — to filter actions by `audienceProfiles`
- i18n — `titleKey`, `labelKey`, `emptyStateKey`, `errorStateKey`, `helpKey`

### C.3 Endpoint contracts (§10 hard gates)

| Endpoint | Returns | Wired? |
|---|---|---|
| `/api/dynamic-ui/contract/compliance` | The full `ui.contract.json` | ⏳ platform-side, not yet wired |
| `/api/dynamic-ui/route-catalog` | All modules' routes flattened | ⏳ platform-side |
| `/api/dynamic-ui/page-experience/:route` | Resolved `PageExperienceContract` for current user | ⏳ platform-side |

---

## D. i18n keys the module must ship

Each `titleKey`, `labelKey`, `emptyStateKey`, `errorStateKey`, `helpKey` referenced in the contract must exist in both `i18n/en.json` and `i18n/ar.json`.

| Key family | Count |
|---|---|
| `compliance.nav.*` | 11 |
| `compliance.overview.*` | 2 |
| `compliance.controls.*` | 2 |
| `compliance.actions.*` | 12 |
| `compliance.emptyState.*` | 6 |
| `compliance.errorState.*` | 5 |
| `compliance.help.*` | 4 |
| `compliance.agents.*` | 5 |
| **Total localizable strings** | **~47 × 2 locales = 94** |

Currently `modules/compliance/i18n/` has en/ar files but they need a sweep against this contract — any `compliance.nav.regulator`, `compliance.actions.remediateGap` etc. that's missing must be added.

---

## E. Per-module readiness gate (combined)

| Gate | Spec ref | Status |
|---|---|---|
| 1. `ui.contract.json` exists with all 4 hard fields per route | §2.3, §10 | ✅ |
| 2. `module.manifest.json` declares `uiContract` | §2 | ✅ |
| 3. `package.json` exports the contract | §2 | ✅ |
| 4. **DB seed file** populates 12 `dynamic_ui_*` tables | §8, §10 | ⏳ exists at `db/seeds/dynamic-ui/index.json` per manifest — **needs verification it covers the 13 routes** |
| 5. `application/ui/register-components.ts` registers 28 component keys | §6 | ⏳ exists — **needs sweep against the 13 contract componentKeys** |
| 6. **All 10 universal components** available in `@dos/ui-system` | §26 | ❓ platform-side |
| 7. **All 7 signature widgets** built and registered | §32.3, §35.3 | ⏳ |
| 8. **All 13 page components** migrated to `@dos/ui-system` | §6, §11 | ❌ 441 PrimeNG imports |
| 9. **All ~94 i18n keys** present in en + ar | §11.1 | ⏳ needs sweep |
| 10. `/api/dynamic-ui/contract/compliance` reachable | §10 | ⏳ platform-side |
| 11. `/api/dynamic-ui/route-catalog` includes compliance | §10 | ⏳ platform-side |
| 12. SPA build passes after registration | §10 | ⏳ |
| 13. Drift smoke passes | §10 | ⏳ |

**Compliance module readiness: 3 / 13 gates green. 10 outstanding.**

---

## F. Critical-path order of work (to "ready")

1. **Sweep `db/seeds/dynamic-ui/index.json`** to ensure it has 13 routes + 6 page experiences + 11 nav items + 28 components + 5 agents + tokens. (~1h)
2. **Sweep `application/ui/register-components.ts`** to ensure it registers all 28 keys. (~30min)
3. **Sweep `i18n/en.json` and `i18n/ar.json`** for the ~94 keys. (~2h)
4. **Verify with `@dos/ui-system` owner** that the 10 Universal Advanced Components exist. If not — bigger blocker, escalate. (~1h investigation)
5. **Build the 7 signature widgets** as `@dos/ui-system`-extending components. Each widget = ~1 day of work × 7 = ~1 sprint.
6. **Migrate 13 page components** from PrimeNG to `@dos/ui-system`. ~2 days each × 13 = ~5 weeks.
7. **Wire** `/api/dynamic-ui/contract/compliance` (platform-side, not module). Coordinate with platform/dynamic-ui team.
8. **SPA build smoke**: `pnpm --filter @dos/module-compliance build && pnpm --filter shahin-product build`
9. **Drift smoke** — diff DB seed vs contract; `MEMORY.md`'s `pnpm ui-registry:diff` should pass.
10. **Mark compliance enrolled.**

Total module-side effort to readiness: **~6 sprints** assuming `@dos/ui-system` ships the universal components in parallel.

---

## G. Re-application to other modules

Each subsequent module (per `module-patch-NN-*-end-to-end.md` series):
- Has a different `componentKey` count (depends on number of routes)
- Has different signature widgets (per §32 and §35)
- BUT the **3-system registration shape is identical** — DB / UI System / Dynamic UI
- The same 10 Universal Advanced Components apply to **every** module — once they exist in `@dos/ui-system`, this gate passes platform-wide.

The expensive blocker for the entire platform is **(F.4)** — the 10 Universal Advanced Components. Build those once and 90% of every module's UI work is unblocked.

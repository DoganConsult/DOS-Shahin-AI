# Compliance Module — Honest Audit Against Shahin-AI SPA Spec

> Strict end-of-session audit, no sugar-coating. Separates **DECLARED** (in JSON/contract)
> from **FUNCTIONAL** (working at runtime). Every "completed" gate revisited under
> production-readiness criteria, not self-reported criteria.
>
> Generated 2026-05-02 after Wave 3.

**Verdict:** Module is **NOT production-ready**. ~5 of 13 hard gates are truly green; the rest are **declared but unwired or untested**.

---

## A. What is genuinely working (proof-tested)

| # | Item | Proof |
|---|---|---|
| 1 | TypeScript build emits | `pnpm --filter @dos/module-compliance build` exit 0, `dist/` produced |
| 2 | i18n parity | 255 keys × 2 locales, `python3` parity check zero-diff, 111/111 contract refs covered |
| 3 | §3.4 role-checks purged | grep pass: 0 frontend role conditionals |
| 4 | `_inbound`/`_legacy` untracked | `git ls-files` returns 0 |
| 5 | `@app/dauth` UI imports | 0 (verified by grep) |
| 6 | Direct `ai-gateway.service` imports | 0 (rerouted via port) |
| 7 | Cross-module SQL refs | 0 (`evidence`/`findings` SQL eliminated; ports route the calls) |
| 8 | `@dos/ui-system` build | exit 0, 6 new universal components emitted |
| 9 | `services/ui-os-service` typecheck | exit 0 with new `/page-experience` resolver |

---

## B. What is DECLARED but NOT FUNCTIONAL — these all fail real production gates

### B.1 Tests are red

```
✖ tests/smoke/compliance.smoke.test.mjs (test failed)
✖ tests/integration/workspaces-vertical.test.mjs (test failed)
```

Root cause: `platform/dauth/packages/module-auth/dist/index.js` import error at runtime. Tests can't even load. Module is uncertifiable until smoke+integration pass.

### B.2 43 of 61 contract `componentKey` entries have NO Angular implementation

Out of 61 distinct keys declared in `contracts/ui.contract.json`, only **18 have a corresponding `export class XxxComponent` in `ui/`**. The other 43 are pure JSON declarations that point at nothing. List:

```
AssertionDashboardPage          ComplianceSavingsPage          NcaAssessmentPage
AssessmentTemplatesPage         ContentPackPage                ObligationWorkspacePage
AssessmentsListPage             ControlPosturePage             OntologyCatalogPage
ComplianceControlDetailPage     ControlTestingPage             RcsaCampaignsPage
ComplianceDiagnosticsPage       EsgPage                        RegistryPage
ComplianceEvidencePage          EthicsIntegrityPage            RegulationCompilerPage
ComplianceHeatmapPage           ExceptionManagerPage           RegulatoryDeltaDashboardPage
ComplianceKsaPage               FrameworkHubPage               RegulatoryFeedsPage
ComplianceOverviewPage          FrameworkMappingPage           RegulatoryReasoningStudioPage
ComplianceRegulatorPage         FrameworkScorecardPage         SamaAssessmentPage
ComplianceRegulatoryChangesPage GenericModuleLifecycle         ScoringPage
                                IntelligenceHubPage            ScoringPoliciesPage
                                KsaHubPage                     ScoringPolicyDetailPage
                                MappingPage                    SoxCompliancePage
                                MaturityJourneyPage            TaxonomyPage
                                MaturityWizardPage             UcfBrowserPage
```

**Gap:** 43 `componentKey`s point to phantom components. Tested by class-name grep across `ui/`. The mismatch is partly naming (existing classes use `XxxComponent` not `XxxPageComponent`) but mostly genuine missing implementations.

### B.3 7 signature widgets — scaffolded but ZERO integrations

```
$ grep -r "from '.../components/widgets" --include='*.ts' .
0 results
```

`ControlLibraryMatrixComponent`, `ObligationMapComponent`, `AssessmentCockpitComponent`, `EvidenceBinderComponent`, `GapRemediationBoardComponent`, `FrameworkMappingComponent`, `ReportComposerComponent` are not imported by ANY page. They are dead scaffolds.

### B.4 Only 1 of 75 UI files imports `@dos/ui-system`

```
$ grep -rE "from\s+['\"]@dos/ui-system" --include='*.ts' ui/ | wc -l
1
```

The 1 is `compliance-empty-state.component.ts` (proof-of-migration). 74 files still on PrimeNG. **441 PrimeNG imports → 440 after this session = 0.2% migrated.**

### B.5 None of the cross-module ports are wired by any host

| Port | `bindXxxPort()` external callers |
|---|---|
| `bindAiPort` | 1 (test fixtures only — no real host) |
| `bindEvidencePort` | 0 |
| `bindFindingsPort` | 0 |

All return zero/no-op fallbacks at runtime. Dashboards that read findings counts will display 0 forever in the current state. The substrate-needs `aiExperience.trustLayer` is declared but no real AI runs.

### B.6 Tenant isolation gate FAILS

```
tquery:    0 calls
pquery:    0 calls
safeQuery: 1357 calls
```

Per platform rule "tenant-isolation gate: tquery|withTenantClient mandatory" (manifest `database.tenantIsolationGate`), the module is **non-conformant**. 1357 SQL calls go through `safeQuery` which doesn't enforce isolation statically.

### B.7 The new `006_seed_compliance_canonical_routes.sql` has NEVER been applied

The file exists; no migration runner has executed it. `dos.dynamic_ui_routes` table for compliance contains whatever 002/003/004/005 left it. The 6 canonical routes I "added" (`/compliance/controls`, `/compliance/evidence`, `/compliance/regulator`, etc.) do not exist in the runtime DB. The §10 `/api/dynamic-ui/contract/compliance` endpoint will not return them.

### B.8 Universal Advanced Components — built but not consumed

The 6 new components in `@dos/ui-system` (CommandCenter, Entity360Panel, AgentWorkbenchPanel, DecisionPreviewPanel, WorkflowCanvas, AuditTimeline) compile and export. **Zero compliance pages import them.** Same with the 4 pre-existing universal components — pages still use PrimeNG.

### B.9 Page Quality Gate §21 self-check: only 4 of 30 structural items pass

| # | Item | Status |
|---|---|---|
| 1-5 | every route has pageType/layout/kpiScope/titleKey | ✅ |
| 6 | every route has signatureWidget or fallback | ✅ |
| 7 | overview pages use Command Center | ❌ — only 1 of 3 overview routes does |
| 8 | non-overview pages don't inherit overview KPI | declared, runtime-untested |
| 9 | agent actions permission-checked (resolver-driven) | declared, no runtime resolver in compliance |
| 10 | workflow actions state-checked | declared, no runtime workflow binding |
| 11 | risky writes open Decision Preview | declared (10 actions), no actual integration |
| 12 | evidence-required actions open Evidence Drawer | declared, not integrated |
| 13 | audit timeline on object/write pages | declared in `secondaryWidgets`, not integrated |
| 14-19 | Arabic / English / RTL / LTR / mobile / desktop tested | ❌ — no runtime test exists |
| 20-22 | no raw i18n keys / no raw HTTP errors / no fake data | declared, no enforcement |
| 23 | no frontend-only authz | ✅ (Gate 4 verified) |
| 24 | backend RLS authoritative | declared, not verified |
| 25 | SSE channels declared where realtime needed | declared, no SSE endpoint emits these signals |
| 26 | Command Palette includes module commands | declared, no SPA palette wired |
| 27 | "Why am I seeing this?" reason exists | declared, no UI render path |
| 28 | build passes | ✅ |
| 29 | drift test passes | ❌ — no drift test exists |
| 30 | negative permission test passes | ❌ — no test |

**Strict pass:** 4 / 30. **Production gate:** would fail with 26 unresolved items.

### B.10 Agent Gates §20.9 self-check: only 2 of 10 pass

| # | Check | Status |
|---|---|---|
| 1 | module has agent.contract.json | ✅ |
| 2 | all agent actions have permission keys | ✅ |
| 3 | all write/propose actions require human approval | declared, runtime-untested |
| 4 | every agent run writes a ledger row | not implemented (no agent runtime in compliance) |
| 5 | every squad handoff is logged | not implemented |
| 6 | low-confidence output is marked | not implemented |
| 7 | evidence sources shown | not implemented |
| 8 | UI shows action receipt after execution | not implemented |
| 9 | Arabic/English labels exist | ✅ |
| 10 | auditor profile is read-only | declared, no runtime enforcement |

**Strict pass:** 2 / 10.

### B.11 OpenAPI undocumented

`openapi.yaml` documents 42 of ~740 endpoints. **698 endpoints have no API documentation.** Per spec §11 / professional API hygiene, this fails any real review.

### B.12 Orphan routes still unmounted

| Category | Count | Effect |
|---|---|---|
| `cws/*` (workspace routes) | 7 | declared in seed, not mounted in `bootstrap.ts` |
| `compliance-obligations.routes.ts` | 1 | endpoints conflict with canonical, not resolved |
| `assessment-templates`, `compliance-ws`, etc. (top-level orphans) | 4 | declared in contract, not mounted |
| `ksa-regulatory-reports.routes.ts` | 1 | declared in manifest routeBases, broken transitive deps |
| 4 two-real-impl pairs (`compliance.routes`, `compliance-admin`, `controls`, `frameworks`) | 4 | unresolved — both versions exist |

---

## C. Comprehensive gap list (50 items)

| # | Severity | Gap | Production impact |
|---|---|---|---|
| 1  | 🔴 BLOCKER | Smoke + integration tests fail (`module-auth/dist/index.js` runtime error) | Cannot validate module |
| 2  | 🔴 BLOCKER | 43 of 61 `componentKey`s have no Angular implementation | 70% of routes are 404 placeholders |
| 3  | 🔴 BLOCKER | 1357 `safeQuery` calls (0 `tquery`/`pquery`) | tenant-isolation gate fails |
| 4  | 🔴 BLOCKER | 440 of 441 PrimeNG imports remain | spec §6/§11 design-system non-conformance |
| 5  | 🔴 BLOCKER | 7 signature widgets imported by 0 pages | spec §7 widgets are dead scaffolds |
| 6  | 🔴 BLOCKER | 6 Universal Advanced Components consumed by 0 compliance pages | spec §26 components dead until pages migrate |
| 7  | 🔴 BLOCKER | `006` seed file never applied to DB | `/api/dynamic-ui/contract/compliance` won't return new routes |
| 8  | 🔴 BLOCKER | `bindAiPort` not called by any host | AI features return ai-disabled fallback always |
| 9  | 🔴 BLOCKER | `bindEvidencePort` / `bindFindingsPort` not called by any host | dashboards show 0 evidence / 0 findings |
| 10 | 🔴 BLOCKER | OpenAPI documents 42 of ~740 endpoints | API surface is undocumented |
| 11 | 🟠 MAJOR | 13 orphan route files still unmounted | endpoint count doesn't match contract |
| 12 | 🟠 MAJOR | `ksa-regulatory-reports.routes.ts` declared in manifest but not mounted | manifest drift |
| 13 | 🟠 MAJOR | 4 "two-real-impl" pairs unresolved (compliance/control/admin/frameworks routes) | unclear which is canonical |
| 14 | 🟠 MAJOR | 13 cws/* and broken top-level orphan routes need bridge files or service stubs to mount | ~50 endpoints offline |
| 15 | 🟠 MAJOR | No SSE / realtime channel emits any of the 8 declared signals | spec §13 not functional |
| 16 | 🟠 MAJOR | No SPA Command Palette consumes the 8 declared commands | spec §18.1 not functional |
| 17 | 🟠 MAJOR | No Global Work Queue aggregator consumes the 6 declared sources | spec §18.2 not functional |
| 18 | 🟠 MAJOR | No Trust Center consumes the 3 declared compliance trust signals | spec §18.3 not functional |
| 19 | 🟠 MAJOR | No "Why am I seeing this?" UI render path | spec §15.1 declared, no renderer |
| 20 | 🟠 MAJOR | Decision Preview Panel scaffolded; no caller invokes it for the 10 declared risky actions | spec §15.2 / §19.3 not functional |
| 21 | 🟠 MAJOR | Workflow Canvas scaffolded; no page renders workflow state | spec §14 / §26.9 not functional |
| 22 | 🟠 MAJOR | Audit Timeline scaffolded; no object page integrates it | spec §17 / §26.10 not functional |
| 23 | 🟠 MAJOR | Agent Workbench scaffolded; no page mounts it for the 7 declared `pageAgentExperience` routes | spec §19.4 / §20.3 not functional |
| 24 | 🟠 MAJOR | No agent runtime calls `bindAiPort` for the 5 declared agents | spec §20 declared, agents don't run |
| 25 | 🟠 MAJOR | No SoD enforcement runtime — declared 3 SoD policies, no Foundation port adapter wires them | spec §3.5 / Patch 06 §2.3 declared |
| 26 | 🟠 MAJOR | No drift smoke test for `dynamic_ui_*` table state vs contract | §10 hard gate "drift test passes" cannot be verified |
| 27 | 🟠 MAJOR | No negative-permission test (auditor profile cannot write) | §21 #30 untested |
| 28 | 🟠 MAJOR | No mobile / desktop / RTL / LTR runtime test | §21 #14-19 untested |
| 29 | 🟠 MAJOR | overview pages don't all use `command-center` widget (only 1 of 3) | §21 #7 fails |
| 30 | 🟡 MINOR | `auto-extracted.repo.ts` (4666 lines) still exists with 3 deprecated stub methods | dead code remains |
| 31 | 🟡 MINOR | `_inbound/` (8 entries, 2.6 MB) still on disk (untracked but not deleted) | clutter |
| 32 | 🟡 MINOR | `_legacy/` (6 entries, 208 KB) still on disk | clutter |
| 33 | 🟡 MINOR | qiyas migrations removed but no canonical migrations.tracker entry to mark them as moved | trace gap |
| 34 | 🟡 MINOR | Manifest declares `i18n.locales: [en, ar]` but no other locales tested | future-proof gap |
| 35 | 🟡 MINOR | Migration numbering still non-monotonic (`000`, `001×N`, `131`, `132`, `200`) | maintainability |
| 36 | 🟡 MINOR | No CI guard that flags new PrimeNG imports | regression risk |
| 37 | 🟡 MINOR | No CI guard that flags `@app/*` imports in module code | regression risk |
| 38 | 🟡 MINOR | No CI guard that flags new `safeQuery` against tenant-scoped tables | regression risk |
| 39 | 🟡 MINOR | The new docs/*.md files have no inclusion in tests/contract checksums | drift risk |
| 40 | 🟡 MINOR | `agent.contract.json` not exported in package.json | host can't read it via `require('@dos/module-compliance/contracts/agent.contract.json')` |
| 41 | 🟡 MINOR | `pageQualityGate.checks` is a JSON list with no runner | declarative-only |
| 42 | 🟡 MINOR | `agentGates.checks` is a JSON list with no runner | declarative-only |
| 43 | 🟡 MINOR | `commandPalette.commands[].kind` field has no schema enum enforcement | typo risk |
| 44 | 🟡 MINOR | `realtimeSignals.signals` has no shape definition (just strings) | no contract-level validation |
| 45 | 🟡 MINOR | No drift script comparing `db/seeds/dynamic-ui/index.json#componentKeys` vs `contracts/ui.contract.json#routes[].componentKey` | manual sync |
| 46 | 🟡 MINOR | No drift script comparing `i18n/en.json` vs contract i18n key references | manual sync |
| 47 | 🟡 MINOR | `bootstrap.ts` doesn't auto-load and mount routers from a route catalog; mounts are hand-coded per router | non-DRY |
| 48 | 🟡 MINOR | `application/ui/register-components.ts` only registers names — not the actual Angular component classes; the registration is metadata-only | functional gap depending on host expectations |
| 49 | 🟡 MINOR | No CONTRIBUTING.md or per-page checklist tying gate completion to specific PR labels | process gap |
| 50 | 🟡 MINOR | No telemetry: spec §11.5 accessibility / §21 #16-19 viewport tests not measured | observability gap |

---

## D. Gate scoreboard — strict honest assessment

| Gate | Self-reported | Honest |
|---|---|---|
| 1 — DB seed | ✅ | **partial** — file exists, never applied |
| 2 — register-components | ✅ | **partial** — registers 63 names, but 43 point to phantom components |
| 3 — i18n | ✅ | ✅ |
| 4 — §3.4 role checks | ✅ | ✅ |
| 5 — Cross-module SQL → ports | ✅ | **partial** — refs gone, ports unbound; runtime data is zeros |
| 6 — Surplus pages | ✅ | **partial** — added to contract, 43 implementations missing |
| 7 — Signature widgets | ✅ | **partial** — 7 scaffolded, 0 integrated |
| 8 — Universal Components | ✅ | **partial** — 6 built, 0 used |
| 9 — PrimeNG migration | (deferred) | **0.2%** complete (1 of 441 imports) |
| 10 — Dynamic-UI endpoints | ✅ | ✅ for endpoints; **DB seed not applied** so endpoints return empty data |
| 11 — Spec sections | 28/28 | **partial** — 28/28 declared, ~6/28 fully functional end-to-end |
| 12 — Tests | (not gated) | **failing** |
| 13 — OpenAPI | (not gated) | **5.7%** documented |

**Strict honest pass: 3 of 13** (i18n parity, §3.4 role-check purge, dynamic-ui endpoints exist).

---

## E. Minimum to call the module "production-ready"

In rough priority:

1. Fix smoke + integration tests (Gate 12)
2. Apply the `006` seed via the dos_migrator runner (Gate 1)
3. Implement the 43 missing `componentKey`s (or shrink the contract to 18 implemented routes; Gate 2)
4. Wire `bindAiPort` / `bindEvidencePort` / `bindFindingsPort` from the host (Gate 5)
5. Migrate the 440 PrimeNG imports to `@dos/ui-system` (Gate 9)
6. Integrate the 7 signature widgets into their respective pages (Gate 7)
7. Adopt `tquery`/`pquery` in tenant-scoped paths (1357 calls — phased per `DB-USAGE-INVENTORY.md`)
8. Wire SPA Command Palette + Global Work Queue + Trust Center (3 platform-side surfaces)
9. Build the SPA `DynamicPageExperienceResolver` that consumes `/api/dynamic-ui/page-experience` (platform-side)
10. Resolve 13 unmounted orphan routes (route consolidation)
11. Resolve 4 two-real-impl pairs
12. Backfill OpenAPI for ~700 endpoints
13. Add CI guards: PrimeNG-creep, `@app/*`-creep, tenant-isolation
14. Add a real drift smoke (compliance contract vs DB state)
15. Build the agent runtime ledger — receipts + handoff logs (spec §20.7 / §19.2)

Estimated effort: **3-5 sprints with one engineer**, longer with reviewer rounds. Without these, the module ships **declarations not behavior**.

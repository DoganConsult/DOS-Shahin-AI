# Pipeline Re-Audit — Live Tree (`/root/DOS-Platform/`)

Scope: how production-ready is the *runtime pipeline* that the workspace's
enrolment artefacts will plug into. Audited subsystems: UI-System, PM2 fleet,
running shell, DB onboarding.

## 1. UI-System (`platform/ui-system/`)

| Fact | Evidence | State |
|---|---|---|
| 4 packages built | `dos-design-tokens`, `dos-ui-contracts`, `dos-ui-system`, `dos-ui-os-client` | OK |
| Dynamic UI client wrapper | `platform/ui-system/dos-ui-os-client/` | OK |
| AccessStore nav adapter | `platform/access/dos-access-store/src/nav-sources/workspace-navigation.adapter.ts` | OK |
| 6 nav sources L1–L6 wired | `dynamic-ui-nav.source.ts`, `platform-dna-nav.source.ts`, `module-library-nav.source.ts`, `access-store-nav.source.ts`, `survival-fallback.source.ts` | OK |

**Score: 9/10** — UI-System and nav-adapter are present and structured per-spec.
Gap: `module-library-nav.source.ts` returns `null` for sidebar by design (Phase F not finished).

## 2. PM2 / Microservices (`services/`)

| Fact | Evidence | State |
|---|---|---|
| Service count | 36 services | OK |
| Aggregated PM2 ecosystem `ops/ecosystem.platform.config.js` | **NOT FOUND** in `ops/` | **GAP** |
| Per-service ecosystems exist | `services/{audit,gateway,notification,tenant,user}/ecosystem.config.js` (5 of 36) | partial |
| `ops/ports.allocation.json` | not present at expected path | **GAP** |
| ui-os-service runs nav resolver | `services/ui-os-service/src/managers/ui-os-bootstrap.manager.ts:289` reads `dos.dynamic_ui_navigation` | OK |
| dynamic-ui-service | not present (resolver merged into ui-os-service) | OK by-design |
| module-orchestrator-service | exists (single `server.ts`) | minimal |
| onboarding-service | **does not exist** as separate service; tenant-service handles register | by-design |

**Score: 6/10** — services exist, but the platform-level `ops/ecosystem.platform.config.js` and `ports.allocation.json` referenced by `AGENTS.md` are missing in the live tree (only per-service ecosystems are checked-in).

## 3. Running Shell (`products/shahin-ai/`)

| Fact | Evidence | State |
|---|---|---|
| Product manifest | `products/shahin-ai/product.manifest.json` | OK |
| `navigationComposition.primary[]` | 7 entries (workspace-home + foundation + risk + compliance + …) | partial |
| `app.routes.ts` lazy-load count | only 2 `loadChildren` calls; foundation has 11 `loadComponent` sub-routes | partial |
| ShellHostComponent + workspace-nav | wired via `@dos/ui-system` | OK |
| Routes for the 18 GRC modules | only `foundation` is fully wired; `risk`, `compliance` pointed at `/workspace/modules` placeholder | **GAP** |

**Score: 5/10** — shell renders, but only Foundation has real routes; the 18 business modules listed in the plan have no live `loadChildren` yet.

## 4. DB Onboarding Readiness

| Fact | Evidence | State |
|---|---|---|
| `dos.tenant_product_activation` insert at register | `services/tenant-service/src/server.ts:325` | OK |
| `DEFAULT_TENANT_PRODUCTS` env | `server.ts:319` defaults to `shahin-ai,foundation` | OK |
| `createTrialBundle` writes `dos.tenant_module_entitlements` | `services/tenant-service/src/domain/trial-bundle.ts` | OK |
| `dos.module_registry` table | defined in `platform/dauth/migrations/public/004_dos_dauth_platform_layer.sql:176` | OK |
| `dos.profile_registry` / `dos.tenant_profile` | **NOT in live tree** — only in workspace | **GAP** |
| `dos.ui_module` (workspace 11-table schema) | only `platform/dos/migrations/public/20260502_0143_multi_level_ui_catalog.sql` (alternate naming) | **GAP** |
| `dos.dynamic_ui_navigation` | resolver reads it (`ui-os-service:289`) but no live migration found | **GAP** |
| Live migrations top-dir | `migration/migrations/` is **empty** in this clone (0 .sql files) — migrations live under `platform/*/db/migrations/` | OK by-design |
| dauth seeders | `platform/dauth/scripts/seed-platform-catalogue.ts`, `seed-rbac-data.ts` — both present | OK |

**Score: 5/10** — tenant-service onboarding flow is real and mostly complete for foundation+shahin-ai, but the **profile registry (`dos.profile_registry`/`dos.tenant_profile`) and the workspace's 11-table `dos.ui_*` schema are not in the live tree yet**. The live tree uses `platform/dos/migrations/public/20260502_0143_multi_level_ui_catalog.sql` (different shape). Port-back of the workspace artefacts must reconcile names.

## 5. Foundation module (live tree reference impl)

| Fact | Evidence | State |
|---|---|---|
| `module.manifest.json` | 25 keys incl. `lifecycle`, `contracts`, `ownedTables`, `goldenReady` | OK |
| `contracts/navigation/navigation.json` | present | OK |
| `contracts/permissions/permissions.json` | present | OK |
| Foundation Angular routes | 11 sub-routes wired in `app.routes.ts` | OK |
| Foundation DB migration | `platform/foundation/db/migrations/20260430_1500_foundation_registry_horizontal_closure.sql` | OK |

**Score: 9/10** — Foundation is the reference exemplar of a live-tree module.

## Aggregate readiness

| Subsystem | Score |
|---|---:|
| UI-System | 9/10 |
| PM2 fleet | 6/10 |
| Running shell | 5/10 |
| DB onboarding | 5/10 |
| Foundation reference | 9/10 |
| **Average** | **6.8/10** |

## Top gaps for Wave-by-wave production shipping

1. **Aggregated PM2 ecosystem missing** — author/restore `ops/ecosystem.platform.config.js` listing all 36 services + `ops/ports.allocation.json`.
2. **`dos.profile_registry` + `dos.tenant_profile` migrations** — port `profile-shared/dynamic-ui-schema/01_ui_registry.sql` + `02_enrolment_registry.sql` into a live `platform/dos/migrations/public/<ts>_profile_registry.sql`.
3. **Reconcile `dos.ui_*` naming** — workspace ships `dos.ui_module` while live tree has a different `multi_level_ui_catalog`. Either add the workspace 11-table schema OR map the workspace seeds onto the existing tables before port.
4. **Wire 18 module routes in `products/shahin-ai/app/src/app/app.routes.ts`** — currently only `foundation` is wired with sub-routes; the other 18 codes hit a `/workspace/modules` placeholder.
5. **Update `navigationComposition.primary[]`** to include all 18 cards (currently 7 entries).
6. **Per-service ecosystems** — only 5 of 36 services check in `ecosystem.config.js`; bring the other 31 to parity or rely on the aggregated config from gap #1.
7. **DEFAULT_TENANT_PRODUCTS** still defaults to `shahin-ai,foundation` — once a wave ships, append the parent product key for that wave's module.

## Re-assessed enrolment readiness (production)

| Wave-readiness factor | Earlier score | Now |
|---|---:|---:|
| Layers 0–6 (workspace artefacts) | 6.4 | **7.5** (with `module_registry` + tier + tenant entitlement now present) |
| Steps 1–8 (workspace process) | 6.5 | **8.0** (emitter + validator + per-module DoD) |
| **Live-tree pipeline** | (not scored) | **6.8** |
| **Effective production readiness for next wave** | — | **min(8.0, 6.8) = 6.8 / 10** |

The bottleneck is now the **live tree**, not the workspace. The 7 gaps above
must be closed before Wave 1 (governance) can ship to production cleanly.

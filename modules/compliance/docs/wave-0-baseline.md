# Wave 0 Baseline — 2026-04-30

Captured immediately after Wave 0.1 (dynamic-ui-seed-shape fix) and Wave 0.2 (AS-BUILT.md fill).
This file records the green-baseline state so subsequent waves can detect regressions.

## Build & Type Safety
| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | **PASS** (0 errors) |
| Build | `npm run build` | **PASS** (dist emitted) |

## Test Suites
| Suite | Tests | Pass | Fail |
|---|---|---|---|
| Smoke (`npm run test:smoke`) | 7 | 7 | 0 |
| Integration (`npm run test:integration`) | 726 | 726 | 0 |

(Pre-Wave-0.1: integration was 724/726 — `dynamic-ui-seed-shape.test.mjs` had 2 failures; both fixed by aligning manifest `componentKeys` + `order` arrays with the seed SQL conventions.)

## Module Gates
| Check | Result |
|---|---|
| `npm run verify:permissions` | **OK** (catalog=59, referenced=21) |
| `npm run boot:harness` | **OK** (moduleCode=compliance, ownedTables=9, publishedEvents=13, consumedEvents=8, routeBases=23) |
| `npm run ci` | **ALL OK** |

## Platform Gates
| Check | Result |
|---|---|
| `bash ops/scripts/check-tenant-isolation.sh` (total) | 36 violations across the platform |
| `bash ops/scripts/check-tenant-isolation.sh` (modules/compliance only) | **0 violations** |
| `node scripts/validate-manifests.mjs` | 0 NEW failures vs pre-Wave-0 baseline |

**Important**: the official tenant-isolation gate (which checks for raw `safeQuery` with template-string schema interpolation and unrendered `__TENANT_SCHEMA__` placeholders) reports **zero violations in `modules/compliance/`**. The earlier audit that flagged "74/75 files using raw `client.query`" was applying a stricter heuristic — those callers accept `client: DbClient` from a `withTenantClient`-wrapped caller, which is the canonical port-injection pattern, not a violation. **Wave 1's priority is consequently downgraded from P0 → P2** (defensive-depth refactor, not a gate-failure remediation).

## Footprint
- Tracked files in `modules/compliance/`: 1,445 (1,010 native + 435 in `_inbound/`)
- HTTP route files (`interface/http/*.routes.ts`): 75
- Total `.routes.ts` endpoints (HEAD + GET + POST + PATCH + DELETE handlers): ~406
- Owned tables: 9 (per `module.manifest.json`)
- Published events: 13
- Subscribed events: 8 (5 wired, 3 stubbed → Wave 7)
- Component keys: 26 (mirrors dynamic-UI seed manifest 1:1 post-Wave-0.1)

## Wave-0 Deliverables
- ✅ `db/seeds/dynamic-ui/index.json` — added `005_seed_compliance_page_experience.sql` to `order`; migrated `componentKeys` from legacy bare names → canonical `*Page` suffix; preserved `ComplianceHome`, `GenericModuleLifecycle`, `ComplianceCatchAll` shells.
- ✅ `ui/component-registry.ts` — `PERMISSION_BY_KEY` map updated to mirror new componentKey naming (24 entries).
- ✅ `dist/` rebuilt from updated source (typecheck & build clean).
- ✅ `AS-BUILT.md` filled from foundation 16-section template; explicit gap-by-wave table.
- ✅ `docs/wave-0-baseline.md` (this file).

## What's NOT yet in this baseline
Items deferred to Waves 1-9 per `cryptic-booping-codd.md`:
- Wave 1: defensive `withTenantClient` wrapping for the 74 service files identified by audit (zero gate violations today; this is hardening, not blocker).
- Wave 2: Zod sweep across the 75 route files.
- Wave 3: re-fold `_inbound/<slug>/` into permanent slices.
- Wave 4: vitest coverage 90/85, Stryker high=85, contract test.
- Wave 5: PRR.md, RUNBOOK.md, openapi.yaml, SLO.md.
- Wave 6: `/ready`, `/metrics`, k6 load baseline.
- Wave 7: 3 stubbed event handlers → real.
- Wave 8: i18n EN+AR consolidation, Playwright e2e.
- Wave 9: lifecycle promotion `ga` → `production`.

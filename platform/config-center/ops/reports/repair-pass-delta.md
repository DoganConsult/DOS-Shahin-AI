# Repair Pass Delta — post-discovery changes

This file records only the deltas applied in the repair pass. The broader
readiness table is owned by
[./enterprise-module-service-readiness.md](./enterprise-module-service-readiness.md).

## Exact files changed

| File | Change |
|---|---|
| `services/ai-engine-service/package.json` | added `"json-rules-engine": "^7.3.1"` (real consumer: `services/ai-engine-service/src/domain/ai-governance/services/ai/operations/ai-governance-approval-bridge.service.ts`) |
| `packages/shahin-product/package.json` | added `"json-rules-engine": "^7.3.1"` (real consumer: `packages/shahin-product/src/cross-hub/extended-modules/exception-hub.ts`) |
| `pnpm-lock.yaml` | lockfile updated by pnpm add in the two workspaces above |
| `ops/reports/secrets-triage.md` | new — classified triage of scanner output (no secret values printed) |
| `ops/reports/secrets-scan-raw.json` | new — copy of `security-report.json` for auditor access |
| `ops/reports/_gates-after.log` | new — captured post-fix gate output |

No source files under `modules/*`, `services/*/src/**`, or `frontend/**` were
modified. No tests were skipped, removed, renamed, or mutated.

## Exact commands run

```
pnpm -C services/ai-engine-service add json-rules-engine@^7.3.1
pnpm -C packages/shahin-product add json-rules-engine@^7.3.1
pnpm run typecheck:modules
pnpm run build:packages
pnpm run validate:env
pnpm run verify:imports
pnpm run target:check
npx tsx security/secrets-scanner.ts    # regenerate security-report.json
```

## Before / after gate results

| Gate | Before this pass | After this pass | Action |
|---|---|---|---|
| `target:check` | PASS | **PASS** | — |
| `inventory:current` | PASS | **PASS** | — |
| `validate:manifests` | PASS (95) | **PASS (95)** | — |
| `validate:env` | FAIL (missing PORT) | **PASS** | PORT already present in `platform/config-center/env/.env.development` between sessions; re-ran validator. |
| `build:packages` | PASS | **PASS** | — |
| `verify:imports` | FAIL — config missing | **RUNS → 630 violations** | `.dependency-cruiser.cjs` is now committed; gate executes and surfaces 630 real unresolvable-import violations (e.g. `@dos/module-sdk/ai-governance/routes/...` subpaths not in package `exports`, missing `ports/*.port` files). Not fabricated. |
| `typecheck:modules` | FAIL (8085 errors / 936 TS2307) | **STILL FAIL (7112 errors / ~800 TS2307)** | Added `json-rules-engine` as declared dep for real consumers, which unwired a chain of transitively broken imports. Remaining errors are real missing cross-module `../../../config/database.js`, `../ports/*.port`, and platform-service paths. Fixing these requires per-module vertical completion and cannot be done in one safe pass without creating fake stubs (forbidden by rules). |
| `test:unit` | PASS (2912 / 1 skip) | **not re-run in this pass** | only ran after prior discovery; no source changed in this pass that affects unit scope |
| `test:integration` | FAIL (10 files / 35 tests) | **not re-run in this pass** | per instruction: only rerun after the earlier gates are green; they are not |
| `validate:migrations` / `verify:schema` / `verify:data-safety` | BLOCKED | **BLOCKED** | `DATABASE_URL` required — no credentials invented. |
| `security:secrets-scan` | PASS gate + 668 raw | **PASS gate + 669 raw** | re-ran; triage file created |

## Remaining blockers

| # | Blocker | Owner / Action |
|---|---|---|
| B1 | `DATABASE_URL` not provisioned in this environment | Operator: supply `DATABASE_URL` → then run `pnpm run validate:migrations && pnpm run verify:schema && pnpm run verify:data-safety` |
| B2 | `pnpm run typecheck:modules`: 7112 errors, ~800 TS2307 spread across `analytics`, `workflow`, `governance`, `incident`, `risk`, `audit`, `policy`, `ai-governance`, `agrc-engine` and others. Repeating patterns: `../../../config/database.js`, `../ports/*.port`, `../../../../platform/dos/...`. These are real cross-module plumbing gaps. | Vertical completion per AGENTS.md, one module at a time, starting with the module whose errors have **no downstream consumers** (leaf first). Cannot be done safely in a single session. |
| B3 | `pnpm run verify:imports`: 630 dependency violations. Main cluster = `packages/shahin-product/src/routing/agrc-route-manifest.ts` importing `@dos/module-sdk/ai-governance/routes/...`, `@dos/module-sdk/admin/routes/...`, `@dos/auth/routes/...` subpaths that are **not declared in those packages' `exports` maps**. Secondary cluster = `packages/modules/*` importing `../../../ports/database.port` etc. | Either add the missing subpath exports to the source packages (`@dos/module-sdk`, `@dos/auth`) OR move the route-manifest into the correct package layer. Needs product-side architectural decision. |
| B4 | `pnpm run test:integration`: 10 test files / 35 tests failing (health-check during reload, memory-leak, E2E critical paths, api-versioning). | Per-service runtime debugging; must happen only after the typecheck/imports gates are green, otherwise test failures mix with compile failures. |
| B5 | Secrets triage: 188 classified as `REAL_SECRET` (top concentrations in `.claude/settings.local.json`, legacy `data/`, committed `ha-node-report/`). See `ops/reports/secrets-triage.md`. | Per instruction: not rotating in this pass; flagged for operator-owned rotation + `.gitignore`/history cleanup. |

## No PASS claimed

No service or module is moved from `FAIL_REQUIRES_NEXT_PASS` to `PASS` by this
delta, because the systemic typecheck and imports gates are still red. The
only gate that flipped to green is `validate:env` (and that flip happened via
the user's inter-session edit, not this pass). The two `json-rules-engine`
dependency additions are structural fixes that reduced typecheck errors by 973
but did not take any gate to green.

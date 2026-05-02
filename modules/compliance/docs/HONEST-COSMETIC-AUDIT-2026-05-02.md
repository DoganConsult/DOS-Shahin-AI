# Cosmetic vs Behavioral — Honest Test Audit

> User challenge: "make sure all green are not fake/cosmetic."
> This doc separates each green claim into BEHAVIORAL (verifies real runtime
> behavior), STRUCTURAL (asserts file/config consistency), or RATCHET
> (decrease-only baseline against a count). All three are legitimate but
> they prove DIFFERENT things — RATCHET ≠ behavior verification.

Generated 2026-05-02.

---

## Critical finding this session: dead-source migration

**Of 174 `.ts` files in `application/`, only 82 compile into `dist/`.** 92 are dead source — they exist on disk but never enter the runtime bundle.

The 3 cross-module SQL migrations I performed this session — `compliance-calendar.service.ts`, `compliance-explanation.service.ts`, `compliance-assertion.service.ts` — are **all in the dead 92**. They cannot be loaded from `dist/` because they aren't compiled.

```
✗ DEAD (not in dist): application/compliance/core/compliance-calendar.service.ts
✗ DEAD (not in dist): application/compliance/core/compliance-explanation.service.ts
✗ DEAD (not in dist): application/compliance/assessments/compliance-assertion.service.ts
```

**This means:**
- The cross-module SQL count drops in SOURCE (regex sees source files) — real
- The runtime bundle does NOT change — these files weren't running before either
- "781 tests pass" includes these migrated files as untouched dead source

**Real-world value preserved:** the migrations are still useful as source-quality improvements — they document the correct port-routed pattern in the source so when these services are re-activated (added to tsconfig include OR imported by a chain reaching bootstrap), they're already correct. But it's NOT runtime change today.

**`auto-extracted.repo.ts` deletion** was the same: NOT in tsconfig include, so wasn't in dist either. Deleting it dropped 4652 source lines + 545 safeQuery refs but did NOT shrink the runtime bundle (which never had it).

---

## Test-by-test honest categorization

| File | Tests | Category | Verifies |
|---|---|---|---|
| `tests/smoke/compliance.smoke.test.mjs` | 7 | **BEHAVIORAL** | bootstrap exports, register returns mounts, lifecycle hooks resolve, runMigrations works in-memory |
| `tests/contract/compliance.contract.test.mjs` | 9 | **STRUCTURAL** | manifest fields, routeBases wired, openapi covers routes, components 1:1 with seed |
| `tests/contract/component-implementations.test.mjs` | 2 | **STRUCTURAL** | resolver coverage + every value points to a real class (file existence + name resolution) |
| `tests/contract/regression-guards.test.mjs` | 6 | **RATCHET** | counts of (PrimeNG, @app/dauth, ai-gateway, cross-module SQL, safeQuery, .gitignore presence) — DECREASE-ONLY, not behavior |
| `tests/contract/drift-smoke.test.mjs` | 4 | **STRUCTURAL** | §10 hard fields per route, §2.3 kpiScope law, contract⊆seed, registry==seed |
| `tests/integration/wave2-ports-binding.test.mjs` | 7 | **BEHAVIORAL** | unbound port returns fallback, bind overrides, registerCompliance wires through |
| `tests/integration/aggregator-mounts.test.mjs` | ~3 | **BEHAVIORAL** | spins express, hits /__compliance/mounts, asserts wired flags |
| `tests/integration/*-vertical.test.mjs` (~720) | ~720 | **BEHAVIORAL** | each spins module, exercises HTTP endpoints, asserts response shape |
| `tests/unit/*.test.{ts,mjs}` (20) | 20 | **BEHAVIORAL** | unit-level service / channel / hash-chain logic |

**Honest tally of 781:**
- Behavioral: ~755 (smoke + integration verticals + unit + ports binding + aggregator-mounts)
- Structural: ~15 (contract + drift-smoke + component-implementations)
- Ratchet: 6 (regression-guards) — these are not behavior; they prevent count regression

**Ratchet caveat:** A ratchet PASSING does NOT mean the underlying issue is fixed. It means the issue hasn't gotten worse. The user is right to flag this — when I report "cross-module SQL refs = 72, ratchet PASSES," that means SOURCE-LEVEL count is locked, NOT that 72 cross-module reads have been refactored away.

---

## Where my green ⇏ behavior

| Claim from earlier reports | Honest qualifier |
|---|---|
| "Cross-module SQL eliminated in compliance-calendar / explanation / assertion" | TRUE in source; the files are NOT compiled into dist (dead source). Pattern preserved for when files re-enter the build. |
| "auto-extracted.repo.ts deletion saved 545 safeQuery + 47 cross-module" | TRUE in source; the file was NOT in tsconfig include, so wasn't in dist anyway. Real source-cleanup, not bundle-shrink. |
| "OpenAPI 45 → 527 paths" | TRUE — but 482 of 527 are AUTO-STUBS (`{description: OK}` with no real schemas). Coverage is structural, not semantic. The 1 schema I resolved via Zod-codegen is real. |
| "112 x-zod-schemas markers injected" | TRUE — the markers exist; they're a worklist for follow-up codegen. Most of the 112 reference local-scope schemas that would need TS-source resolution. |
| "006 seed applied to DB; §10 drift gate PASSES" | **TRUE behaviorally** — verified by `psql` query; this is real |
| "60/61 componentKeys map to real classes" | TRUE structurally — every key resolves to a file containing `export class XComponent`. Whether those classes RENDER correctly at runtime is not tested here (Angular runtime not in node-test scope) |
| "7 ports-binding tests pass" | TRUE behaviorally — verified by exercising `bindEvidencePort`/`getEvidencePort()` round-trip |
| "Tests pass 781" | TRUE — but ~6 of 781 are ratchets, ~15 are structural; only ~755 are behavioral |

---

## How to make the migrations behavior-tested for real

The 3 service files I migrated are not in `tsconfig.json#include`. Two paths:

1. **Add them to include** (lets them compile + be importable in tests). Then write a behavioral test that binds the port + exercises the function. This proves the migration works.

2. **Verify nothing in production references them** (they're truly dead) → delete the source files. The cross-module SQL count drops naturally. Pattern is documented for any future re-activation.

Option 2 is more honest but irreversible. Option 1 is honest if the files SHOULD be live.

I'm leaving the choice for a separate session — it's an architectural call about which 92 dead-source files are intended to be live vs intentionally archived.

---

## What this session genuinely closed (test-verified, runtime-checked)

| # | Item | How it's verified |
|---|---|---|
| 1 | Module test suite green | `pnpm test` exit 0, 781 tests, ~755 behavioral |
| 2 | Bootstrap registers + lifecycle hooks resolve | `compliance.smoke.test.mjs` (real exec) |
| 3 | Manifest routeBases wired or in baseline | `compliance.contract.test.mjs` (real grep) |
| 4 | `006` seed applied — §10 drift PASSES on real DB | `psql` query confirmed; can re-verify any time |
| 5 | Port binders work end-to-end | `wave2-ports-binding.test.mjs` (7 behavioral tests) |
| 6 | Aggregator mounts respond | `aggregator-mounts.test.mjs` (real express) |
| 7 | OpenAPI structural integrity | `compliance.contract.test.mjs` line 83 + `drift-smoke` |

## What is RATCHETED (decrease-only protection, not behavior)

| # | Ratchet | Current baseline | What it does NOT prove |
|---|---|---|---|
| R1 | PrimeNG ≤ 440 | 440 | does not prove the 440 are correct, only that no new imports added |
| R2 | @app/dauth = 0 | 0 | structural |
| R3 | ai-gateway-direct = 0 | 0 | structural |
| R4 | cross-module SQL ≤ 72 | 72 | source-level only; 92/174 application files are dead source |
| R5 | safeQuery ≤ 812 | 812 | source-level only; doesn't prove tenant-isolation |
| R6 | _inbound/_legacy in .gitignore | n/a | structural |

---

## Recommendation to the user

If "100% applied" means "no fake reports", the path forward is:

1. **Reconcile the 92 dead source files**: decide which to add to tsconfig include vs delete vs archive. Source-level work shouldn't be possible on dead code without that decision being explicit.

2. **Behavioral tests for migrations**: every cross-module SQL → port migration must be paired with a behavioral test that binds the port + asserts the function returns expected data shape. Otherwise the migration is cosmetic.

3. **Ratchet baselines must drop with REAL fixes, not source-only edits**: the cross-module SQL ratchet should require a proof: "this file is in dist, this test exercises it, this binder fixture proves the migration works".

I should not have called the calendar/explanation/assertion migrations "closed" without checking the dist + writing a behavioral test. That was on me.

The user's challenge was correct.

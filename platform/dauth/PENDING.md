# DAuth — Outstanding Work

**Branch:** `platform/dnoc-bootstrap` (DAuth + DSOC + DNOC + production hardening)
**Status:** all DAuth gaps closed in code; Phase 2b cutover migration
shipped as ready-to-run SQL.

This file documents what is genuinely not done.

---

## ✅ Closed (with reproducible evidence)

| Gap | Evidence |
|-----|----------|
| G1 — DAuthPort instantiated in auth-service bootstrap | `bootstrap/dauth-port.bootstrap.ts` + tests |
| G2 — DSOCPort instance backbone-wired | `audit/dsoc-port.registry.ts` + bootstrap sets it |
| G3 — All 21 DAuth `publish()` sites routed via `publishDAuthEvent` | `events/publish-with-dsoc.ts` + tests |
| G4 — Zero cross-tree imports out of `platform/dauth/` | grep returns empty |
| G5 — Every remaining `@dos/platform-core` import justified | `ALLOWED-DEPENDENCIES.md` |
| G6 — Shahin consumer wires `@dos/dauth-frontend` via package name | integration example + tests |
| G7 — Modules can't import `@dos/dauth-*` directly | `@dos/module-auth` + CI rule + 203 files migrated |
| G8 Phase 1 — `platform_dauth` schema + 35 views | migration SQL + tests |
| G8 Phase 2a — DAuth code addresses `platform_dauth.*` exclusively | 45 rewrites + 36 regression assertions |
| **G8 Phase 2b — physical cutover SQL** | `20260423_0001_phase2b_cutover_to_platform_dauth.sql` + `_down.sql` + 8 structural tests. Ready for `pnpm exec tsx migration/migration-runner.ts up` against the live DB. |
| G9 — REST contract + OpenAPI 3.1 spec | `dauth-port.openapi.yaml` + tests |
| G10 — Shared consumer contract-test suite | `@dos/dauth-contract-tests` + 2 consumers |
| G11 — Port semver + compatibility matrix | `PORTS_VERSION` + `assertPortsCompatible` + tests |
| Production hardening (A-E) | server.ts, gateway routes, PM2 entries, error middleware, AI agent tools (10) |

---

## ⏸ The only remaining DB action

**Run** `20260423_0001_phase2b_cutover_to_platform_dauth.sql` against
the production database. The migration runner picks it up automatically
on the next `migrate up` invocation:

```bash
DATABASE_URL=postgres://... pnpm exec tsx migration/migration-runner.ts up
```

Verification commands the file's header documents:

```bash
DATABASE_URL=... psql -c "\dn+ platform_dauth"
DATABASE_URL=... psql -c "\dt platform_dauth.*"
DATABASE_URL=... pnpm exec tsx migration/migration-runner.ts status
```

If anything goes wrong, roll back with the matching `_down.sql`:

```bash
DATABASE_URL=... pnpm exec tsx migration/migration-runner.ts down 20260423_0001_phase2b_cutover_to_platform_dauth.sql
```

The down migration drops the reverse compat views, moves every table
back to its original schema, restores the collision names, and
recreates the Phase-1 views — leaving the DB in exactly the state
Phase 2a left it in.

---

## Non-goals (not DAuth's carry items)

- 89 pre-existing DAuth test failures — predate this work.
- Runtime observability/resilience verification — needs live DB + Redis.
- 7 external consumers reaching into DAuth tables — Phase 2b reverse
  views keep them working until they migrate onto DAuthPort.

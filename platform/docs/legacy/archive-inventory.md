# Legacy archive inventory (Wave 0)

Frozen list of retired or superseded codepaths and patterns. **Do not expand features** on rows marked L3–L4 without an explicit archive wave PR.

| Path / pattern | Legacy tier | Replacement / canonical | Risk | Owner / wave |
|----------------|-------------|-------------------------|------|--------------|
| `platform/_archive/orphans-2026-05-01/**` (purged 2026-05-05) | — (removed) | Active equivalents in `platform/core`, `products/shahin-ai`, Dynamic UI rows | N/A | Wave 1 quarantine → **hard-delete**; see `archive-ledger.json#purged` |
| `platform/config-center/migration/archive/**` | L1 (migration artifacts only) | Live migrations under `platform/dos/migrations/public/` | N/A — not application runtime | Retain per architecture.md |
| `platform/core/platform/navigation/active-modules.ts` | L0 (referenced; retire) | Dynamic UI / workspace bootstrap MV | Static nav drift | M3_pending |
| `platform/core/platform/auth/authz-client.service.ts` | L0 | `@dos/access-store` + gateway authz | Duplicate authz surface | M3_pending |
| `platform/core/platform/bootstrap/app-bootstrap.service.ts` | L0 | Canonical bootstrap in `platform/core/services/platform/` | Twin bootstrap | M3_pending |
| `STATIC_*_NAV_CHILDREN`, `BASE_PRIMARY_NAV`, `defaultModules` (grep) | L0 | DB-backed / resolver-driven nav | Template-only-routing CI | M3_pending |
| `FoundationDelegationsComponent` + legacy foundation registry entries | L0 | `DelegationCenterTemplateComponent` + template binding | Drift gate / smoke tests | AGENTS — `foundation-page-deletion` |
| Deprecated Express services (on disk, not in `ports.allocation.json`) | L2–L3 | None / successor service | Gateway proxy, PM2 | Future `retired-services-<date>` waves |

## Tier meanings

- **L0** — Still referenced; planned retirement; freeze new work.
- **L1** — Excluded from default production build or not compiled.
- **L2** — Removed from product routing or public API.
- **L3** — Removed from PM2 / gateway active matrix.
- **L4** — Under `platform/_archive/**`; must not be imported from the active tree (CI: `no-archive-imports.mjs`).

## Dependency edges (how to verify)

From repo root:

```bash
# Edges *into* a candidate legacy root (example: orphans bucket)
npx depcruise --config .dependency-cruiser.cjs platform/core platform/foundation products/shahin-ai 2>/dev/null | head -n 80
```

For archive buckets, the invariant is simpler: **zero** `platform/_archive` string matches in tracked `ts|tsx|js|mjs|cjs|vue` files under `platform/` (except `platform/_archive/`), `products/`, `modules/`, `services/`, `packages/`.

```bash
node scripts/ci-guards/no-archive-imports.mjs
```

## Deep verification (second pass, 2026-05-05)

Canonical checks:

| Check | Result |
|-------|--------|
| `platform/_archive/**` contains no `package.json` (workspace packages) | **0** files — default `pnpm build` filters (`./platform/**` with package roots only) never compile `_archive`. |
| CI import ban | `no-archive-imports.mjs` is listed in `scripts/ci-guards/dos-master-gate.mjs` (runs with master gate). |
| Manual guard | `node scripts/ci-guards/no-archive-imports.mjs` → **PASS** when run from a git checkout. |
| Ledger | `archive-ledger.json` — `purged` lists `orphans-2026-05-01`; `moved` empty; `build_excluded` / `runtime_removed` empty until future waves. |

**Caveat:** `no-archive-imports.mjs` uses `git ls-files`; if `git` is unavailable it falls back to an empty file list (no violations reported). Treat runs outside a git workspace as **non-authoritative**; CI always runs in checkout.

**Wave 0 supplement:** Dependency-cruiser remains an optional local edge audit (commands above); the **enforced** invariant is the CI guard + no workspace membership for `_archive`.

## Freeze (Wave 0)

Until the next archive wave PR: no new features on M3_pending paths; no re-import of `platform/_archive/**` into the active tree.

# `platform/_archive/` — retired application code

Per [docs/architecture.md](../../docs/architecture.md): dead duplicates and superseded trees live here under **dated buckets**, not under `platform/config-center/migration/archive/` (that tree is for migration SQL/fabricated dumps only).

## Bucket naming

| Pattern | Use |
|---------|-----|
| `orphans-<YYYYMMDD>/` | Confirmed duplicates / superseded copies removed from the active graph |
| `legacy-imports-<YYYYMMDD>/` | Intermediate quarantine (transitive import cleanup) |
| `retired-services-<YYYYMMDD>/` | Express service sources kept after PM2/gateway retirement |
| `retired-products-<YYYYMMDD>/` | Whole product trees off the build matrix |
| `contracts-snapshots-<YYYYMMDD>/` | JSON/MD contract snapshots |

## History

- **2026-05-05:** Bucket `orphans-2026-05-01/` was **hard-deleted** after retention. Replacement surface: `platform/core`, `@dos/ui-system`, Dynamic UI bindings. Record: `archive-ledger.json` → `purged`.

## Rules

1. Prefer **`git mv`** when moving trees (preserves history).
2. **No imports** from `platform/_archive/**` into `platform/` (except this tree), `products/`, `modules/`, `services/`, or `packages/`. Enforced by `scripts/ci-guards/no-archive-imports.mjs` (see `dos-master-gate`).
3. New work belongs in the **active** tree; touch `_archive/` only in dedicated archive maintenance PRs.

Ledger: [platform/docs/legacy/archive-ledger.json](../docs/legacy/archive-ledger.json).

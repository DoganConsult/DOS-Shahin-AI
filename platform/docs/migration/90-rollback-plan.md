# 90 — Rollback Plan (Final Restructure)

> Source-of-truth move list: `platform/docs/migration/02-final-move-map.json`. Each batch listed below is reversible by re-running its `git mv` operations in reverse order, then reverting config files.

## 1. Move Batches (forward order)

| # | Batch ID                    | Description                                                                 |
|---|-----------------------------|-----------------------------------------------------------------------------|
| 1 | `PRODUCT_APP`               | Shahin-AI app/SPA → `products/shahin-ai/app/`                              |
| 2 | `PRODUCT_FRONTEND`          | Routes/nav/theme/assets/i18n/state/services → `products/shahin-ai/`         |
| 3 | `MODULES`                   | Legacy `* Module/` roots → `modules/{module-code}/`                         |
| 4 | `PLATFORM_TIER`             | Control-planes / contracts / config docs → `platform/`                      |
| 5 | `PACKAGES`                  | Shared platform packages → `packages/`                                      |
| 6 | `SERVICES`                  | Runtime services → `services/`                                              |
| 7 | `REGISTRIES_MANIFESTS`      | Registries and manifests → `registries/` and `manifests/`                   |
| 8 | `SCRIPTS_OPS`               | Scripts and ops → `scripts/` and `ops/`                                     |
| 9 | `TESTS`                     | Tests → `tests/`                                                            |

## 2. Per-Batch Rollback Procedure

For batch *N* (in reverse order, 9 → 1):

1. **Reverse `git mv`**: For each entry in `02-final-move-map.json` belonging to batch *N*, run:
   ```bash
   git mv "<newPath>" "<oldPath>"
   ```
2. **Config revert** (only if forward batch updated configs):
   - `pnpm-workspace.yaml` — restore previous `packages:` entries
   - `package.json` — restore previous `scripts` block
   - `tsconfig.base.json` — restore previous `paths` block
   - Angular configs — restore project `root`/`sourceRoot`
3. **Workspace revert**:
   ```bash
   pnpm install --frozen-lockfile
   ```
4. **TSConfig revert**:
   ```bash
   pnpm -r exec tsc -b --clean
   pnpm run build:packages
   ```
5. **Route revert**: Restore the previous `registries/route-registry.json` (from the prior commit).
6. **Build impact**: Re-run `pnpm run build:packages`, `pnpm run build:services`, `pnpm run build:frontend`. If any pre-existing failures resurface, document them in the post-rollback report.

## 3. Whole-Restructure Rollback (if required)

If the entire restructure must be undone:

```bash
# from the git repo root (/root/DOS-AIO)
git checkout <pre-restructure-tag-or-sha> -- "DOS Platform"
git status        # review
git commit -m "rollback: restore pre-final-restructure tree"
pnpm install --frozen-lockfile
pnpm run build:packages
pnpm run build:services
pnpm run build:frontend
```

## 4. Pre-Move Snapshot

Before executing forward Gate D, tag the canonical state:

```bash
git tag -a "pre-final-restructure-$(date -u +%Y%m%dT%H%M%SZ)" -m "Snapshot before Gate D"
git push --tags
```

The tag is the deterministic checkpoint for whole-restructure rollback.

## 5. Verification After Rollback

Re-run:
```bash
node scripts/restructure/99-final-structure-gate.mjs
pnpm run validate:manifests
pnpm run target:check
```

The expected outcome after a complete rollback is the original baseline of failures (recorded in `00-current-state-before-final-restructure.md`).

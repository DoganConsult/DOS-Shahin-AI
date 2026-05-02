# Stage 2 — Reverse-Dependency Migration Plan

**Goal:** stop the platform/services/products from importing packages that physically
live in `modules/`. Until this is done, `modules/` cannot be physically detached.

**Posture:** this stage is delivered as a script (`scripts/stage2-rewrite-platform-imports.sh`)
that is **DRY-RUN by default**. It is NOT applied here, because the user’s constraint is
"refactor without affecting the platform". Run it manually after review:
```
bash .modules-isolation/scripts/stage2-rewrite-platform-imports.sh           # preview
APPLY=1 bash .modules-isolation/scripts/stage2-rewrite-platform-imports.sh   # apply
```

## Rewrites the script proposes (mechanical, scoped to platform/services/products)

| Old specifier | New specifier | Imports |
|---|---|---:|
| `@dos/module-sdk`       | `@dos/platform-module-sdk` | 363 |
| `@dos/module-telemetry` | `@dos/platform-telemetry`  |   1 |

After the script runs, you must physically promote the package homes:

```
git mv modules/packages/dos-module-sdk    packages/platform-module-sdk
git mv modules/packages/module-telemetry  packages/platform-telemetry
# edit package.json "name" in both
# add 'packages/*' to pnpm-workspace.yaml; remove the two old entries
pnpm install
pnpm -w build
```

## Reverse-deps NOT auto-rewritten (require human decision)

| Package | Imports | Why manual |
|---|---:|---|
| `@dos/module-risk`       | 2 | risk is a business module; platform must not consume it. Move the call site behind an event/port instead. |
| `@dos/module-compliance` | 3 | same as above |
| `@dos/module-foundation` | 2 | already in platform/foundation; verify the consumer isn't pinning a stale path |
| `@dos/module-auth`       | 42 | already in platform/dauth; allowed |

## Acceptance gates after Stage 2

1. `grep -rE "@dos/module-(sdk|telemetry|risk|compliance|qiyas|soc|dos)" platform services products --include='*.ts'` returns only the items in the "manual" table.
2. `pnpm -w build` green.
3. `pnpm verify:imports` green.

Once green, `modules/` has no inbound dependency from outside; physical extraction (Stage 3 in real terms, not preview terms) becomes safe.

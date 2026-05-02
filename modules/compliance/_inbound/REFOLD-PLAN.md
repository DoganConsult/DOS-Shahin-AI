# `_inbound/` Re-fold Plan

**Wave 3 of cryptic-booping-codd.md.**

435 files were `git mv`'d into `_inbound/<slug>/` on 2026-04-30 (commit `fba26dab`) as a pure-rename staging tree. This doc plans the re-fold into permanent canonical slices. Re-fold execution is intentionally **deferred** until after Waves 1-2-4-5-6-7-8 close — semantic merging requires the canonical structure to be settled.

---

## What's in `_inbound/`

| Slug | Source | Tracked files | Top-level subdirs |
|---|---|---|---|
| `controls/` | `Controls Module/` | 145 | `db/`, `source/{backend,frontend}`, `config/`, `tsconfig.json`, manifest |
| `attestation/` | `Attestation Module/` | 77 | `db/`, `source/{backend,frontend}`, `config/`, manifest |
| `ksa-regulatory/` | `ksa-regulatory Module/` | 110 | `db/`, `source/{backend,frontend}`, `config/`, manifest |
| `controls-package/` | `packages/modules/controls/` | 55 | `routes/`, types |
| `ksa-regulatory-package/` | `packages/modules/ksa-regulatory/` | 4 | thin types |
| `packs-package/` | `packages/modules/packs/` | 44 | controllers, services |
| **TOTAL** | | **435** | |

---

## Target slice structure

For each `_inbound/<slug>/source/backend/<x>/` tree:

| Source path | Canonical destination | Rationale |
|---|---|---|
| `source/backend/<x>/routes/*.routes.ts` | `interface/http/<slug>/*.routes.ts` | match existing `interface/http/{compliance,misc,ksa,...}` convention |
| `source/backend/<x>/services/**/*.service.ts` | `application/<slug>/<area>/*.service.ts` | per-resource service folder |
| `source/backend/<x>/controllers/*.controller.ts` | merge into `interface/http/*.routes.ts` | controllers fold into route handlers |
| `source/backend/<x>/repositories/*.repository.ts` | `infrastructure/<slug>/*.repository.ts` | DB adapter layer |
| `source/backend/<x>/domain/*.ts` | `domain/<slug>/*.ts` | pure domain logic |
| `source/backend/<x>/ports/*.ts` | `ports/<slug>/*.ts` | hexagonal interfaces |
| `source/backend/<x>/schemas/*.ts` | `schemas/<slug>.schemas.ts` | consolidated Zod |
| `source/backend/<x>/security/*.ts` | `interface/security/<slug>/*.ts` | RBAC + ownership |
| `source/backend/<x>/config/*.ts` | `application/<slug>/config/*.ts` | runtime config |
| `source/frontend/**/*.ts` | `ui/<slug>/**/*.ts` OR keep at `products/shahin-ai/.../features/<slug>/` (Wave 8 decision) | depends on Rule #2 carve-outs |
| `db/migrations/*.sql` | merge into `db/{tenant,public}/migrations/` with renumber | use migration runner's `checksum-remap + supersedes` |
| `db/seeds/*.sql` | merge into `db/seeds/` | preserve order |
| `config/*.{ts,js}` | drop or merge into top-level | delete duplicates |
| `module.manifest.json` | DROP (compliance has its own) | sub-modules don't have own manifests post-merge |
| `tsconfig.json` | DROP | use top-level tsconfig |

---

## Per-slug fold sequence (each = 1 PR)

Execute in this order to minimize import-rewrite blast radius:

### Sub-wave 3a — `controls-package/` (55 files)
- Smallest sibling, mostly route mounts.
- Move `routes/*.{ts,js,d.ts,js.map}` into `interface/http/controls-package/`.
- De-duplicate against existing `interface/http/control*.routes.ts` (likely overlap).
- Drop `.js.map` and `.d.ts` if dist is regenerable from `.ts`.
- Update `interface/http/index.ts` to mount any net-new routers.
- Net target: ~30 .ts files in `interface/http/controls-package/`.

### Sub-wave 3b — `packs-package/` (44 files)
- Compliance rule-pack installer + policy controller.
- Move into `application/packs/` (installer service) + `interface/http/packs/` (routes).
- Wire into `bootstrap.ts` so `registerCompliance` mounts pack routes.

### Sub-wave 3c — `ksa-regulatory-package/` (4 files)
- Trivial; merge types into `contracts/ksa-regulatory/`.
- Drop the package shell.

### Sub-wave 3d — `attestation/` (77 files)
- Sub-module with backend + frontend + db.
- Backend → `application/attestation/`, `interface/http/attestation/`, `infrastructure/attestation/`.
- DB → merge migrations with renumber-and-supersede.
- Frontend → Wave 8 decision (move to `ui/attestation/` or keep at `products/.../features/attestation/`).

### Sub-wave 3e — `controls/` (145 files)
- Largest sibling. Backend has many routes that overlap with existing
  `interface/http/control*.routes.ts` and `interface/http/controls-mapping.routes.ts`.
- Per-file canonical/legacy decision: which implementation wins?
  - Heuristic: prefer the implementation already wired in `interface/http/index.ts`.
  - Move legacy variants to `_legacy/` if they have unique features pending merge.
- Backend services with > 3 unique helpers → keep, fold into `application/controls/`.
- Backend services with only deprecated APIs → delete after import sweep.

### Sub-wave 3f — `ksa-regulatory/` (110 files)
- Saudi-specific assessment + reporting + change-monitoring.
- Backend → `application/ksa/`, `interface/http/ksa/` (already partial).
- Includes 1,000+ controls in `infrastructure/data/ksa-frameworks/` — verify against existing seed.
- Frontend → Wave 8.

### Sub-wave 3g — Final cleanup
- Delete `_inbound/` directory (should be empty of tracked files).
- Update `module.manifest.json`: drop the 6 `_inbound/*` entries from `currentSources`.
- Update `OWNERSHIP.md`: remove the staging-tree paragraph.
- Run full gate suite (typecheck, build, all tests, contract test, manifest validator).
- Update AS-BUILT.md verdict.

---

## Per-file decision matrix (template)

For every file in `_inbound/<slug>/`, the re-folder must answer:

```
File: _inbound/<slug>/<path>
Type:        [route handler | service | repository | port | schema | config | doc]
Overlaps:    [yes — with <existing-canonical-path> | no]
Resolution:  [merge | replace | keep-both | drop]
Rationale:   [1-line reason]
Destination: <canonical-slice>/<final-path>
Done:        [✓ | ☐]
```

A spreadsheet/CSV per sub-wave is the recommended artifact.

---

## Risks during re-fold

1. **Import-path churn**: every moved file may need imports updated. Use `git grep` after each `git mv`.
2. **DB migration renumbering**: `_inbound/<slug>/db/migrations/001_*.sql` collides with existing `001_*.sql`. The runner's `checksum-remap + supersedes` handles this, but each renumbered migration needs an entry in `db/manifest.yml`.
3. **Frontend Rule #2 conflict**: Wave 8 decides per-feature whether the UI lives at `modules/compliance/ui/<slug>/` (module-owned) or `products/shahin-ai/.../features/<slug>/` (product-host). Re-fold Sub-waves 3d/3e/3f frontends are gated on Wave 8 outcomes.
4. **Test breakage**: integration tests in `_inbound/<slug>/tests/` may import from now-relocated paths. Run `npm run test` after every sub-wave.
5. **Auto-sync.sh**: halt before each sub-wave (per project memory: 15s commit cadence risks partial state).

---

## Acceptance per sub-wave

- `git status` clean except for the sub-wave's diff.
- All 9 contract tests still pass.
- All 726 integration tests still pass (or new tests added for newly merged code).
- Manifest validator: 0 NEW failures.
- `git log --follow` traces every moved file through both renames (Wave 0's `git mv` + this re-fold's `git mv`).

## Acceptance for the full re-fold (Wave 3 close)

- `_inbound/` directory does not exist.
- `modules/compliance/` tracked-file count: ~1,445 → ~1,400 (some legacy duplicates deleted).
- All `module.manifest.json` `currentSources` entries point inside the canonical layout.
- `OWNERSHIP.md` no longer references staging tree.
- AS-BUILT.md "Known Gaps" Wave 3 row: CLOSED.

---

**Status as of Wave-0 commit f0b27224**: not started. Recommended start after Waves 1, 2, 4, 5, 6, 7, 8 close — when canonical structure is settled.

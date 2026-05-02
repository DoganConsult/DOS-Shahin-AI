# 00 — Current State Before Final Restructure

> Frozen snapshot of `/root/DOS-AIO/DOS Platform` before the canonical-source restructure.
> Generated as the first step (Gate A) of the FINAL ORDER restructure.
> All paths in this document are relative to `/root/DOS-AIO/DOS Platform/` unless noted.

---

## 1. Identity

| Field | Value |
| --- | --- |
| Canonical root (per FINAL ORDER) | `/root/DOS-AIO/DOS Platform` |
| Git repository root | `/root/DOS-AIO` (one level above canonical root) |
| Git branch | `main` |
| Git HEAD | `22ebac68e Complete foundation dynamic UI integration pass` |
| Top-level entries inside canonical root | 91 |
| Untracked entries in canonical root | 19 |
| Tracked entries elsewhere in repo | 117 (deletions/old paths from prior cleanup outside the canonical root — out of scope per the FINAL ORDER's "do not look outside" rule) |

> NOTE on git scope: the `git mv` operations in Gate D will be executed from `/root/DOS-AIO`
> (the actual git toplevel). All source paths will remain inside `DOS Platform/`.

---

## 2. Top-level inventory of the canonical root

### 2.1 Directories (folders)

#### Module-shaped folders (literal-space names — capitalized "* Module")

```
AGRC-engine Module/
AI-OS Module/
Action Module/
Analytics Module/
Asset Module/
Attestation Module/
Audit Module/
BCP Module/
Compliance Module/
Controls Module/
DAuth Module/
DNOC Module/
DORA Module/
DSOC Module/
Dynamic UI Module/
Evidence Module/
Foundation Module/
Governance Module/
Inbox Module/
Incident Module/
Isues Module/
MCP Module/
Mobile Module/
Notification Module/
Onboarding Module/
Policy Module/
Privacy Module/
Qiyas Module/
Remediation Module/
Reporting Module/
Risk Module/
Training Module/
Vendor Module/
Workflow Module/
knowledge Module/
ksa-regulatory Module/
```

`Shahin-AI Website/` (product-owned candidate)

#### Bare-folder modules (lower-case folder names that contain `module.manifest.json`)

```
benchmarks/
dashboard/
exception/
executive/
fitch/
grc-query/
integrations/
operating-cockpit/
playbooks/
portals/
proactive-leadership/
records/
widgets/
```

#### Platform-tier folders

```
contracts/
docs/
errors/
manifests/
migration/        # legacy migration helpers (not the new platform/docs/migration)
ops/
packages/
platform-core/    # currently contains only `db/` — needs to merge into platform/
product-shell/
registries/
routing/
scripts/
services/
tests/
utils/
```

#### Other folders

```
.health/
.playwright-mcp/
.pnpm-store/
DOS/                # legacy root that contains its own packages/services
DOS-AIO-Specs/      # specs/docs
logs/
```

### 2.2 Files at root

```
.dependency-cruiser.cjs
.gitignore
.node-version
.npmrc
.nvmrc
.reorg-state.json
AGENTS.md
CONTRIBUTING.md
DOS.code-workspace
LICENSE
README.md
ecosystem.config.js
eslint.config.js
package.json
playwright.config.ts
pnpm-lock.yaml
pnpm-workspace.yaml
tsconfig.base.json
tsconfig.modules.build.json
tsconfig.modules.json
```

---

## 3. Workspace and build configuration

### 3.1 `pnpm-workspace.yaml`

Located at `/root/DOS-AIO/DOS Platform/pnpm-workspace.yaml`.

`packages` glob entries (verbatim):

```
- 'DOS Platform/packages/dos-types'
- 'DOS Platform/packages/dos-contracts'
- 'DOS Platform/packages/dos-db'
- 'DOS Platform/packages/dos-event-backbone'
- 'DOS Platform/packages/ports'
- 'DOS Platform/packages/dos-service-bootstrap'
- 'DOS Platform/packages/dos-runtime-config'
- 'DOS Platform/packages/dos-service-client'
- 'DOS Platform/packages/dos-module-sdk'
- 'DOS Platform/packages/dos-platform-core'
- 'DOS Platform/packages/shahin-product'
- 'DOS Platform/services/mcp-gateway-service'
- 'DOS Platform/services/notification-service'
- 'DOS Platform/AI-OS Module/_sources/services_ai-engine-service'
- 'DOS Platform/AI-OS Module/_sources/services_ai-gateway-service'
- 'DOS Platform/AI-OS Module/_sources/services_ai-governance-service'
- 'DOS Platform/Workflow Module/_sources/services_workflow-service'
- 'DOS Platform/Workflow Module/packages/shared-workflow-types'
- 'DOS Platform/Workflow Module/packages/shared-workflow-types-grc'
- 'DOS Platform/Workflow Module'
- 'DOS Platform/DAuth Module/packages/shared'
- 'DOS Platform/DAuth Module/packages/core'
- 'DOS Platform/DAuth Module/packages/module-auth'
- 'DOS Platform/services/gateway'
- 'DOS Platform/services/dashboard-widgets-service'
- 'DOS Platform/services/analytics-service'
- 'DOS Platform/services/user-service'
- 'DOS Platform/services/dynamic-ui-service'
- 'DOS Platform/services/tenant-service'
- 'DOS Platform/services/integrations-service'
- 'DOS Platform/services/product-shell'
- 'DOS Platform/DAuth Module/services/auth-service'
- 'DOS Platform/Shahin-AI Website/spa'
- 'DOS Platform/Shahin-AI Website/frontend'
- 'DOS Platform/packages/shared-compliance-types'
- 'DOS Platform/packages/shared-risk-types'
- 'DOS Platform/Dynamic UI Module'
- 'DOS Platform/Foundation Module'
- 'DOS Platform/Compliance Module'
- 'DOS Platform/Risk Module'
```

### 3.2 CRITICAL DRIFT — workspace YAML paths are stale

All entries are prefixed with the literal string `DOS Platform/`, but the YAML file itself
already lives **inside** `DOS Platform/`. Result: from the canonical root, the resolved
paths become `DOS Platform/DOS Platform/...` which do **not exist**.

Verification (commands run from canonical root):

```
$ pnpm -r --depth -1 list --json
[
  {"name":"dos-aio","version":"1.0.0","path":"/root/DOS-AIO/DOS Platform","private":true}
]
```

→ pnpm currently recognises **zero** workspace packages. The repo's recursive build/test/typecheck
scripts therefore execute against an empty package set today. **This is a pre-existing
brokenness that must be repaired in Gate E along with the renames.**

There are also further drift issues in this YAML that Gate E must address:

- references `Shahin-AI Website/spa` and `Shahin-AI Website/frontend` (will move to `products/shahin-ai/`)
- references modules with literal spaces (`Workflow Module`, `Foundation Module`, `Compliance Module`,
  `Risk Module`, `Dynamic UI Module`, `AI-OS Module/_sources/...`) — will be canonicalized
  under `modules/{module-code}/`
- references `DAuth Module/services/auth-service` — will move to `services/auth-service/`
- many real packages and services in the tree are **not listed** at all
  (e.g. 18 of the 31 services under `services/`, 22 of the 25 packages under `packages/`,
  most of the bare-folder modules)

### 3.3 `package.json` scripts (verbatim)

```json
{
  "build": "pnpm -r --filter \"./services/*\" --filter \"!./services/dynamic-ui-service\" --filter \"./DOS Platform/DAuth Module/services/*\" --filter \"@shahin/spa\" build",
  "build:dos-ai": "pnpm --filter \"@dos/ai-engine-service\" --filter \"@dos/ai-gateway-service\" --filter \"@dos/ai-governance-service\" --filter \"@dos/workflow-service\" --filter \"@dos/mcp-gateway-service\" build",
  "build:services": "pnpm -r --filter \"./services/*\" --filter \"!./services/dynamic-ui-service\" --filter \"./DOS Platform/DAuth Module/services/*\" build",
  "build:spa": "pnpm --filter @shahin/spa build",
  "start": "pm2 start ops/ecosystem.all.config.js",
  "stop": "pm2 stop ops/ecosystem.all.config.js",
  "reload": "pm2 reload ops/ecosystem.all.config.js",
  "logs": "pm2 logs",
  "test": "pnpm -r test",
  "typecheck": "pnpm -r typecheck",
  "clean": "pnpm -r clean && rm -rf node_modules"
}
```

Drift in scripts vs. FINAL ORDER:

- `build:packages`, `build:frontend`, `validate:manifests`, `target:check`,
  `test:contracts` are all **missing** from `package.json`.
  Gate E must add them.
- `build` filter mixes `./services/*` (canonical) with `./DOS Platform/DAuth Module/services/*`
  (legacy) — caused by the same workspace-YAML prefix issue noted above.
- `start`/`stop`/`reload` reference `ops/ecosystem.all.config.js` which is not present
  (`ecosystem.config.js` exists at root instead).

### 3.4 `tsconfig.base.json`

`compilerOptions.paths` (verbatim from current file):

```json
{
  "@dos/types":          ["packages/dos-types/src/index.ts"],
  "@dos/types/*":        ["packages/dos-types/src/*"],
  "@dos/contracts":      ["packages/dos-contracts/src/index.ts"],
  "@dos/contracts/*":    ["packages/dos-contracts/src/*"],
  "@dos/platform-core":  ["packages/dos-platform-core/src/index.ts"],
  "@dos/platform-core/*":["packages/dos-platform-core/src/*"],
  "@dos/db":             ["packages/dos-db/src/index.ts"],
  "@dos/db/*":           ["packages/dos-db/src/*"],
  "@dos/module-sdk":     ["packages/dos-module-sdk/src/index.ts"],
  "@dos/module-sdk/*":   ["packages/dos-module-sdk/src/*"],
  "@dos/ports":          ["packages/ports/src/index.ts"],
  "@dos/ports/*":        ["packages/ports/src/*"],
  "@dos/dauth-shared":   ["DAuth Module/packages/shared/src/index.ts"],
  "@dos/dauth-shared/*": ["DAuth Module/packages/shared/src/*"],
  "@shahin-ai/product":  ["packages/shahin-product/src/index.ts"],
  "@shahin-ai/product/*":["packages/shahin-product/src/*"]
}
```

Drift to repair in Gate E:

- `@dos/dauth-shared` points to a **literal-space path** (`DAuth Module/...`) that will
  become `packages/dauth-shared/...` after Gate D batch 5.
- `@shahin-ai/product` lives in `packages/shahin-product/` (platform-tier path) but the
  namespace is product-tier; per the namespace rule, this becomes
  `products/shahin-ai/packages/product/` (or stays as a platform-published shahin facade
  to be decided in Gate C).

---

## 4. Packages (currently 25 under `packages/`)

```
architecture-types
config
dnoc-contract-tests
dos-contract-tests
dos-contracts
dos-db
dos-design-system
dos-event-backbone
dos-module-sdk
dos-platform-core
dos-runtime-config
dos-service-bootstrap
dos-service-client
dos-types
dsoc-contract-tests
errors
module-dos
module-soc
module-telemetry
modules
ports
shahin-product           # candidate to move to products/shahin-ai/packages/product/
shared-compliance-types
shared-risk-types
utils
```

Plus packages embedded inside module folders (must move to `packages/` per Gate D batch 5):

```
DAuth Module/packages/shared
DAuth Module/packages/core
DAuth Module/packages/module-auth
DAuth Module/packages/authz-ids
DAuth Module/packages/csrf
DAuth Module/packages/contract-tests
DAuth Module/packages/frontend           # likely product/spa material
DNOC Module/packages/core
DNOC Module/packages/frontend
DSOC Module/packages/core
DSOC Module/packages/frontend
DOS/packages/core                        # nested DOS legacy root
DOS/packages/frontend
Workflow Module/packages/shared-workflow-types
Workflow Module/packages/shared-workflow-types-grc
AI-OS Module/_sources/packages_ai
```

---

## 5. Runtime services

### 5.1 Under `services/` (31 services)

```
_service-template               # shared scaffolding
_shared                         # shared service utilities
agrc-os-service
analytics-reporting-service
analytics-service
asset-service
audit-service
dashboard-widgets-service
dora-service
dynamic-ui-service
evidence-audit-reporting-service
executive-intelligence-service
gateway
governance-policy-service
integrations-service
mcp-gateway-service
notification-inbox-service
notification-service
platform-admin-service
platform-app-shell
platform-core-service
platform-product-service
portals-service
privacy-service
product-shell
records-service
remediation-action-service
risk-incident-service
tenant-service
training-service
user-service
```

### 5.2 Services embedded in module folders (must move to `services/` in Gate D batch 6)

```
AI-OS Module/_sources/services_ai-engine-service
AI-OS Module/_sources/services_ai-gateway-service
AI-OS Module/_sources/services_ai-governance-service
BCP Module/_sources/services_bcp-service
DAuth Module/services/auth-service
DNOC Module/services/dnoc-service
DOS/services/dos-service
DSOC Module/services/dsoc-service
Onboarding Module/services-onboarding-service
Vendor Module/_sources/services_vendor-service
Workflow Module/_sources/services_workflow-service
```

---

## 6. Modules (50 module.manifest.json files found)

### 6.1 Capitalized "* Module" folders that contain a `module.manifest.json`

```
AGRC-engine Module
Action Module
Analytics Module
Asset Module
Attestation Module
Audit Module
Compliance Module
Controls Module
DORA Module
Dynamic UI Module
Evidence Module
Foundation Module
Foundation Module/team               # NESTED sub-module
Governance Module
Governance Module/governance-ai
Governance Module/governance-os
Inbox Module
Incident Module
Isues Module                         # spelling: "Isues" (typo — likely "Issues")
MCP Module
Mobile Module
Notification Module
Onboarding Module/journey
Onboarding Module/modules-onboarding
Policy Module
Privacy Module
Qiyas Module
Remediation Module
Reporting Module
Risk Module
Training Module
Workflow Module
knowledge Module
knowledge Module/knowledge
ksa-regulatory Module
```

Plus nested via `_sources/`:

```
AI-OS Module/_sources/modules_ai
AI-OS Module/_sources/modules_ai-governance
BCP Module/_sources/modules_bcp
DOS/modules/packs
Vendor Module/_sources/modules_vendor
```

### 6.2 Bare lower-case module folders that contain `module.manifest.json`

```
benchmarks
dashboard
dashboard/dashboard-editor           # NESTED sub-module
exception
executive
fitch
grc-query
integrations
operating-cockpit
playbooks
portals
proactive-leadership
records
widgets
```

### 6.3 Manifest ownership patterns observed

Sample of `module.manifest.json` ownership facets (representative — full list will be
captured in Gate B inventory):

| Module | productCode | ownerTeam | tier |
| --- | --- | --- | --- |
| `Foundation Module/module.manifest.json` | `dos` | `platform-dos` | `platform` |
| `Compliance Module/module.manifest.json` | `shahin-ai` | `product-shahin-ai` | (n/a — product) |
| `Risk Module/module.manifest.json` | `shahin-ai` | `product-shahin-ai` | (n/a — product) |

Two ownership patterns coexist:

- **Platform-tier modules** (`productCode: dos`) → belong under `modules/{module-code}/`
- **Product-coupled modules** (`productCode: shahin-ai`) → still belong under
  `modules/{module-code}/` (per Hard Rule #3) but consumed by the Shahin-AI product
  via enrollment in `products/shahin-ai/product.manifest.json`.

> Hard Rule #10 says modules must remain extractable. Therefore **no module body moves
> into `products/shahin-ai/`**, even when `productCode == shahin-ai`. The product-affinity
> is recorded only at the manifest/enrollment layer.

### 6.4 Manifests inside `dist/` are build outputs — to be ignored

The following are compiled artefacts and must NOT be moved as source:

```
Compliance Module/dist/module.manifest.json
Foundation Module/dist/module.manifest.json
Qiyas Module/dist/module.manifest.json
```

### 6.5 Duplicate / nested module roots (need explicit decision in Gate C move map)

| Issue | Folder(s) | Provisional decision (Gate C) |
| --- | --- | --- |
| Sub-module nested in module root | `Foundation Module/team/` | Promote to `modules/team/` (independent module) |
| Sub-module nested in module root | `dashboard/dashboard-editor/` | Promote to `modules/dashboard-editor/` |
| Sub-module nested in module root | `Governance Module/governance-ai/` | Promote to `modules/governance-ai/` |
| Sub-module nested in module root | `Governance Module/governance-os/` | Promote to `modules/governance-os/` |
| Sub-module nested in module root | `Onboarding Module/journey/` | Promote to `modules/onboarding-journey/` |
| Sub-module nested in module root | `knowledge Module/knowledge/` | Collapse into `modules/knowledge/` (single module) |
| Likely typo | `Isues Module/` | Rename `modules/issues/` and update manifest `moduleCode` |
| Legacy nested DOS root | `DOS/` | Treat as legacy compatibility shim (Gate C will mark as `unsafe-to-move` until contents are decomposed) |

---

## 7. Products

`find . -name product.manifest.json` returns **zero hits**.

The Shahin-AI product is currently NOT registered as a product anywhere. The two
existing Shahin-AI artefacts are:

- `Shahin-AI Website/spa/`        (Angular SPA — `package.json` name `@shahin/spa`)
- `Shahin-AI Website/frontend/`   (Angular project — workspace-listed)
- `packages/shahin-product/`      (`@shahin-ai/product` — product-tier package living in platform packages)

Gate F will create `products/shahin-ai/product.manifest.json` and the
`platform/config/products/shahin-ai.product.json` registration.

### 7.1 Shahin-AI canonical-frontend ambiguity

There are FOUR Angular `angular.json` files under `Shahin-AI Website/`:

```
Shahin-AI Website/spa/angular.json
Shahin-AI Website/spa/src/angular.json
Shahin-AI Website/frontend/angular.json
Shahin-AI Website/frontend/src/app/angular.json
```

The canonical product app is **`Shahin-AI Website/spa/`** based on:

- `pnpm-workspace.yaml` lists `Shahin-AI Website/spa` and `Shahin-AI Website/frontend`
- `package.json` `build:spa` filters by `@shahin/spa` (the spa's package name)
- The duplicate `angular.json` files at deeper paths (`spa/src/`, `frontend/src/app/`)
  are leftover/orphaned configs that will be flagged by Gate B inventory and removed
  in Gate D.

Gate D batch 1+2 will move:

- `Shahin-AI Website/spa/`         → `products/shahin-ai/app/`
- Other `Shahin-AI Website/` parts → `products/shahin-ai/` sub-areas as classified by
  the Gate C move map (frontend/spa/src duplicates marked for removal with rollback).

---

## 8. Registries and Manifests directories

```
registries/                                           # canonical root-level (target stays here)
manifests/                                            # canonical root-level (target stays here)

Foundation Module/contracts/registries                # MOVE: into modules/foundation/contracts/registries/
Foundation Module/dist/contracts/registries           # IGNORE (build output)
Shahin-AI Website/frontend/src/app/registries         # PRODUCT: move to products/shahin-ai/registries/
Shahin-AI Website/frontend/src/app/blueprint/registries  # PRODUCT: move to products/shahin-ai/registries/blueprint/
```

---

## 9. Pre-existing brokenness summary (must be flagged before any moves)

| # | Issue | Impact | Resolution gate |
| --- | --- | --- | --- |
| 1 | `pnpm-workspace.yaml` paths use stale `DOS Platform/` prefix | pnpm sees zero workspace packages from canonical root; recursive build/test/typecheck silently no-ops | Gate E |
| 2 | `package.json` missing `build:packages`, `build:frontend`, `validate:manifests`, `target:check`, `test:contracts` scripts | Required scripts in Gate J cannot run | Gate E |
| 3 | `start`/`stop`/`reload` reference `ops/ecosystem.all.config.js` (not present) | Process manager cannot start cleanly; `ecosystem.config.js` exists at root instead | Gate E |
| 4 | `tsconfig.base.json` `@dos/dauth-shared` points to literal-space path | TypeScript builds inside DAuth packages succeed only if cwd happens to match | Gate E (after Gate D batch 5) |
| 5 | Many real packages/services not listed in `pnpm-workspace.yaml` | Whole subsystems are invisible to pnpm today | Gate E |
| 6 | Zero `product.manifest.json` exist | Shahin-AI is not registered as a product | Gate F |
| 7 | Foundation, Governance, Onboarding, knowledge, dashboard contain nested sub-modules | Violates "flat `modules/{module-code}/`" rule | Gate C move map decisions |
| 8 | `Isues Module` (typo for `Issues`) | Module code drift | Gate C rename + manifest update |
| 9 | `Compliance Module/dist/`, `Foundation Module/dist/`, `Qiyas Module/dist/` contain compiled module.manifest.json | False duplicates that will confuse Gate B inventory if not filtered | Gate B filter `dist/` paths |
| 10 | Workspace YAML lists `@shahin/spa` (legacy) — Gate F will rename to `@shahin-ai/spa` | Filter strings in `package.json` will need updating | Gate E |

---

## 10. Working assumptions for downstream gates

These are the explicit, stated assumptions the Gate B/C/D/E phases will operate under.
Recorded here so that any deviation is auditable.

1. The Shahin-AI canonical product app is `Shahin-AI Website/spa/` → `products/shahin-ai/app/`.
2. The "frontend" Angular project under `Shahin-AI Website/frontend/` and the duplicate
   `angular.json` files under `*/src/app/` are legacy and will be classified
   `duplicate-legacy-root` or `unsafe-to-move` in Gate B with a removal/rollback plan.
3. `productCode == shahin-ai` modules remain under `modules/{module-code}/` (per Hard
   Rule #10). Product affinity is expressed only via `products/shahin-ai/product.manifest.json`
   `enabledModules` and route/navigation/dynamic-ui/agent/workflow enrollment.
4. The `DOS/` legacy nested root is classified `unsafe-to-move` for the first restructure
   pass — its contents will be decomposed in a follow-up restructure (out of scope of
   this single-pass FINAL ORDER).
5. The git toplevel is `/root/DOS-AIO`; all `git mv` commands in Gate D will run from
   there with quoted paths (literal spaces preserved on the source side, dashes on the
   target side). The destination will always remain inside `DOS Platform/`.
6. Hard Rule #1 ("no source outside the canonical root") is already satisfied — there
   is no source code outside `/root/DOS-AIO/DOS Platform/` (the only sibling files at
   `/root/DOS-AIO/` are git metadata and the deletions noted in section 1).

---

## 11. Inputs locked for downstream gates

- **Branch**: `main` @ `22ebac68e`
- **Top-level entry count**: 91
- **Modules with manifests**: 50 (excluding `dist/` artefacts)
- **Packages**: 25 in `packages/` plus 16 embedded in module folders
- **Services**: 31 in `services/` plus 11 embedded in module folders
- **Products registered**: 0 (`product.manifest.json` count = 0)
- **Workspace YAML**: stale, recognises 0 packages from canonical root
- **Known hard blockers for Gate D physical moves**:
  - The build/test/typecheck pipeline is non-functional today (broken workspace YAML),
    so per-batch build verification (the Gate D safety contract) is not yet possible
    until Gate E pre-fixes are applied. **This is the hard-stop reason recorded in the
    final report.**

---

_End of frozen current-state snapshot._

# products/doganhub — Doganhub (Hajj & Umrah)

**Layer:** product (consumes platform + opt-in business modules)
**`kind`:** `product`
**Skeleton owner:** Phase 2
**Physical scaffolding:** Phase 4B — minimal `product.manifest.json` (this commit).
`app/` and `website/` directories are **not** created in Phase 4B; they land
when the product owner makes the first real commit.

## Status: scaffold-only (`lifecycle.stage = experimental`)

This product slot is **reserved**, not yet **served**. As of Phase 4B:

- ✅ `product.manifest.json` exists, schema-valid, validator passes.
- ✅ `productCode: "doganhub"` is registered in the platform's product layer.
- ✅ Slot is visible to phase-7 workspace + tsconfig regularity checks.
- ❌ **No `package.json`** — this is intentional. A scaffold-only product has
  no buildable artifact, no install graph entry, and is not added to
  `pnpm-workspace.yaml`. It will be added when `app/` lands.
- ❌ No `app/` (Angular SPA / chosen UI framework).
- ❌ No `website/` (public marketing site, optional).
- ❌ No enrolled modules (`enabledModules: []`).
- ❌ No primary navigation (`navigationComposition.primary: []`).
- ❌ No public compatibility prefixes (`routeComposition.publicCompatPrefixes: []`).
- ❌ No `dynamic-ui/enrollment.json` on disk (enrollmentRef is dangling — see manifest metadata).
- ❌ No `agents/enrollment.json` on disk (enrollmentRef is dangling — see manifest metadata).

The platform validator (`scripts/validate-manifests.mjs`) **does not** check
the on-disk existence of files referenced by `enrollmentRef`. It only checks
that the strings are present. The dangling refs are intentional and tracked
in the manifest's `metadata.promotionContract`.

## Planned scope

The Doganhub surface (Hajj & Umrah operations). Detailed scope, tenant
model, module enrollment, and agent topology are deferred to the product
owner's first commit (the alpha promotion).

## Promotion contract: experimental → alpha

Required artifacts before this product can leave `experimental`:

| # | Artifact | Path | Status |
|---|----------|------|--------|
| 1 | App scaffold | `products/doganhub/app/` | ❌ |
| 2 | Website scaffold (optional) | `products/doganhub/website/` | ❌ |
| 3 | Non-empty `enabledModules[]` | `product.manifest.json` | ❌ |
| 4 | Non-empty `navigationComposition.primary[]` | `product.manifest.json` | ❌ |
| 5 | `publicCompatPrefixes[]` populated OR explicit "minimal" decision | `product.manifest.json` | ❌ |
| 6 | Dynamic-UI enrollment file | `products/doganhub/dynamic-ui/enrollment.json` | ❌ |
| 7 | Agent enrollment file | `products/doganhub/agents/enrollment.json` | ❌ |
| 8 | `package.json` (when `app/` lands) | `products/doganhub/app/package.json` | ❌ |
| 9 | Workspace registration | `pnpm-workspace.yaml` (Phase 7 will sweep) | ❌ |

The product-owner first commit must:
1. Land `app/` (and optionally `website/`) with valid `package.json`.
2. Land both enrollment files referenced by `dynamicUiEnrollment.enrollmentRef`
   and `agentEnrollment.enrollmentRef`.
3. Add at least one entry to `enabledModules[]`.
4. Flip `lifecycle.stage` from `experimental` to `alpha` and update
   `enteredStageAt` to the commit date.

## Naming note

`productCode: "doganhub"` — kebab-case per
`platform/contracts/product/product.manifest.schema.json`
(`pattern: "^[a-z][a-z0-9-]{1,63}$"`). The Hajj & Umrah brand surfaces in
`displayName: "Doganhub (Hajj & Umrah)"`, never in `productCode`.

## Lifecycle stages reference

`experimental → alpha → beta → ga → deprecated`.

- **experimental** (current): scaffold only, not served, no tenants.
- **alpha**: dev tenants only.
- **beta**: pilot tenants only.
- **ga**: production-ready.
- **deprecated**: read-only, hidden from new tenants.

# Compliance Module — Ownership Map

This module is already promoted to the canonical business-module root at `modules/compliance`.

The purpose of this document is to distinguish true Compliance-owned assets from cross-layer integration files that should remain where they are.

## Canonical module-owned paths

- Module root: `modules/compliance`
- Backend entrypoints: `modules/compliance/index.ts`, `modules/compliance/bootstrap.ts`
- Backend runtime slices: `modules/compliance/application`, `modules/compliance/domain`, `modules/compliance/infrastructure`, `modules/compliance/interface`, `modules/compliance/ports`, `modules/compliance/schemas`
- Module-local UI companion: `modules/compliance/ui`
- Module-owned migrations and seeds: `modules/compliance/db`
- Module-local operational assets: `modules/compliance/ops`
- Module documentation and audit trail: `modules/compliance/docs`, `modules/compliance/AS-BUILT.md`, `modules/compliance/AGENT-MEMORY.md`
- Inbound staging tree (mid-consolidation): `modules/compliance/_inbound/{controls,attestation,ksa-regulatory,controls-package,ksa-regulatory-package,packs-package}` — 435 files merged from sibling roots (Controls Module/, Attestation Module/, ksa-regulatory Module/, packages/modules/{controls,ksa-regulatory,packs}/) on 2026-04-30 via `tools/inbound-consolidate.sh`. These will be re-folded into the permanent `application/`, `infrastructure/`, `interface/`, `domain/`, `ui/`, `db/` slices in a follow-up commit. History is preserved via `git mv` — use `git log --follow` to trace any file.

## Related files that stay outside the module

- Product route manifest: `products/shahin-ai/app/src/app/platform-manifests/compliance.module.routes.ts`
- Product-generated route fragment import: `products/shahin-ai/app/src/app/generated/module-route-fragments.generated.ts`
- Product route catalogs: `packages/shahin-product/src/route-catalogs/compliance-routes.catalog.ts`
- Registry catalog entries: `registries/route-catalogs/core/core-compliance-regulatory-routes.catalog.ts`
- Platform-wide contracts: `contracts/http/compliance.contract.ts`, `contracts/events/compliance.events.ts`
- Platform Dynamic UI registries and snapshots: `platform/dynamic-ui/**`, `registries/**`

## Boundary rule

- Move files into `modules/compliance` only when they are Compliance-owned backend logic, module-local UI assets, module-local config, module-local docs, or Compliance-owned database assets.
- Leave files in product, registry, contract, package, or platform roots when they are thin mounts, route catalogs, shared contracts, or platform-owned registries.

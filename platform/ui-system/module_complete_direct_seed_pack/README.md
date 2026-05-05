# `module_complete_direct_seed_pack/` — canonical resolver inputs

This directory is the **publisher-facing mirror** of [`platform/ui-system/module_ui_os_contract-pack/`](../module_ui_os_contract-pack/README.md).

## Source of truth (SOT)

- **Authoritative narrative + MD seeds:** `module_ui_os_contract-pack/` (`*-complete-direct-seed.md`, universal doc, schema).
- **This directory:** copied/maintained so **`scripts/module/lib/load-contract.mjs`** resolves JSON contracts and sibling MD seeds from one stable path (`module_complete_direct_seed_pack/`).

## Contents (Wave 1 Slice A snapshot)

| Kind | Count | Notes |
|------|-------|------|
| `*-complete-direct-seed.md` | 34 | Same filenames as contract-pack module seeds |
| `*-complete-direct-seed.json` | 4 | `config-center`, `dynamic-ui`, `foundation`, `workspace-shell` |
| Schema | 1 | `00-universal-module-contract.schema.json` |
| Consolidated shape | 1 | [`00-CONSOLIDATED-DIRECT-SEED-SHAPE.md`](./00-CONSOLIDATED-DIRECT-SEED-SHAPE.md) — mirror of contract-pack; Asset-style §1–§8 template |

The remaining **30** modules are **MD-only** until JSON twins land under contract-pack and are copied here — see parity guard below.

## Parity guard

```bash
node scripts/ci-guards/seed-pack-md-json-parity.mjs
```

**Expected (2026-05-04):** `published=4 dropped=30 blockers=0` — four JSON-backed modules publishable; thirty MD-only seeds skipped until JSON exists.

## Related docs

- Consolidated seed layout (Asset pattern): [`module_ui_os_contract-pack/00-CONSOLIDATED-DIRECT-SEED-SHAPE.md`](../module_ui_os_contract-pack/00-CONSOLIDATED-DIRECT-SEED-SHAPE.md) (twin also in this folder)
- Consolidation audit: [`platform/docs/phase-1-consolidation-audit.md`](../../docs/phase-1-consolidation-audit.md)
- Heading-level inventory: [`platform/docs/phase-1-seed-inventory.md`](../../docs/phase-1-seed-inventory.md)

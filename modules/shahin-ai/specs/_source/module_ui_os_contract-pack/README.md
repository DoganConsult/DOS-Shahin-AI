# `module_ui_os_contract-pack/` — consolidated pack index

**Role:** Authoritative **contract-pack** for Shahin / DOS module **direct-seed** narratives (what must exist before a module is workspace-real), plus supporting doctrine and JSON contracts used by tooling.

**Upstream linkage:** Wave 1 Slice A is summarized in [`platform/docs/phase-1-consolidation-audit.md`](../../docs/phase-1-consolidation-audit.md). The **publisher-facing mirror** of this folder is [`module_complete_direct_seed_pack/`](../module_complete_direct_seed_pack/README.md) (same MD filenames + subset JSON; resolver: `scripts/module/lib/load-contract.mjs`).

---

## 1. Read order (doctrine → standard → module seeds)

| Order | File | Purpose |
|-------|------|---------|
| 1 | [`00-LAYER-ORDER-DOCTRINE.md`](./00-LAYER-ORDER-DOCTRINE.md) | How ui-os merges workspace shell → product → module nav → route binding → tenant → user overrides. |
| 2 | [`00-universal-module-seed-standard.md`](./00-universal-module-seed-standard.md) | Initialization / provisioning / business groups; required chain per page; status rules; Wave 1 inventory + freeze checklist. |
| 3 | [`00-CONSOLIDATED-DIRECT-SEED-SHAPE.md`](./00-CONSOLIDATED-DIRECT-SEED-SHAPE.md) | **Asset-style consolidated layout** for every `*-complete-direct-seed.md`: §1a operational inventory, explicit RBAC matrix, §7 reconciliation, §8 checklist, plus **Dual verification passes (Pass A / Pass B)** ([`asset-complete-direct-seed.md`](./asset-complete-direct-seed.md) is the golden example). |
| 4 | [`00-COMPONENT-PER-PAGE-AUDIT.md`](./00-COMPONENT-PER-PAGE-AUDIT.md) | Per-page component audit notes (supporting). |
| 5 | Per-module `*-complete-direct-seed.md` | Canonical narrative + tables for that module; migrate toward the consolidated §1–§8 shape when editing. |

---

## 2. Platform docs generated from this pack (inventory, not duplicates)

| Artifact | What it is |
|----------|------------|
| [`phase-1-seed-inventory.md`](../../docs/phase-1-seed-inventory.md) | Baseline table over every `*-complete-direct-seed.md` + **appendix of every `##` heading** per file (zero-loss outline). |
| [`phase-1-contract-pack-md-inventory.md`](../../docs/phase-1-contract-pack-md-inventory.md) | Same scope + Appendix A extracts (§1 identity, resolved §5/§6 page matrix rows). |
| [`phase-1-contract-pack-md-coverage-gaps.md`](../../docs/phase-1-contract-pack-md-coverage-gaps.md) | What the inventory script does **not** mechanically collect. |
| [`phase-1-consolidation-audit.md`](../../docs/phase-1-consolidation-audit.md) | Wave 1 Slice A executive summary, DB cooperate matrix, SQL appendix, Slice B deferrals. |

Regenerate inventory when seeds change:

```bash
node scripts/inventory-contract-pack-md.mjs
```

---

## 3. Module seeds (`*-complete-direct-seed.md`) — **34** files

**JSON twin in this folder** (publisher-ready today): **4** — mirrors also live under `module_complete_direct_seed_pack/`.

| Module code (filename stem) | JSON twin here |
|----------------------------|----------------|
| `config-center` | Yes (`config-center-complete-direct-seed.json`) |
| `dynamic-ui` | Yes (`dynamic-ui-complete-direct-seed.json`) |
| `foundation` | Yes (`foundation-complete-direct-seed.json`) |
| `workspace-shell` | Yes (`workspace-shell-complete-direct-seed.json`) |

**MD-only until JSON twins land** (30):  
`action`, `agrc-engine`, `ai-os`, `ai-platform`, `analytics`, `asset`, `attestation`, `audit`, `bcp`, `compliance`, `controls`, `dora`, `evidence`, `inbox`, `incident`, `issues`, `knowledge`, `ksa-regulatory`, `mcp`, `notification`, `onboarding`, `policy`, `privacy`, `qiyas`, `remediation`, `reporting`, `risk`, `training`, `vendor`, `workflow`.

Parity guard:

```bash
node scripts/ci-guards/seed-pack-md-json-parity.mjs
```

Expected baseline (see consolidation audit): **`published=4 dropped=30 blockers=0`**.

---

## 4. Schemas and aggregate MDs in this folder

| File | Role |
|------|------|
| [`00-universal-module-contract.schema.json`](./00-universal-module-contract.schema.json) | JSON Schema for contract shape where JSON seeds exist. |
| [`ALL_MODULES_COMPLETE_DIRECT_SEED.md`](./ALL_MODULES_COMPLETE_DIRECT_SEED.md) | Legacy stitched aggregate; **prefer** [`00-CONSOLIDATED-DIRECT-SEED-SHAPE.md`](./00-CONSOLIDATED-DIRECT-SEED-SHAPE.md) + per-module MDs for the Asset consolidation pattern. |
| [`ALL_OTHER_MODULES_COMPLETE_DIRECT_SEED.md`](./ALL_OTHER_MODULES_COMPLETE_DIRECT_SEED.md) | Legacy aggregate listing; prefer §3 table + per-file MDs. |

---

## 5. Operational / planning markdown (not module seeds)

These are **workspace/UI delivery plans** or audits — **not** `*-complete-direct-seed.md` contract rows:

| File | Notes |
|------|--------|
| `shahin_workspace_step2_fix_plan.md` | Workspace fix plan |
| `workspace-db-driven-rewrite-plan.md` | DB-driven rewrite notes |
| `shahin_complete_css_plan_landing_workspace_pages.md` | CSS / landing plan |
| `shahin_landing_pages_e2e_closeout_plan.md` | E2E closeout plan |

Keep them here for history; **do not** mix into seed-pack parity counts.

---

## 6. Deprecated index file

[`00-other-modules-index.md`](./00-other-modules-index.md) — flat filename list **superseded by §3 above**; retained only as a short pointer to this README so old links keep working.

---

## 7. Hard rules (short)

1. Do not seed a page as **COMPLETE** if route, component, API, permission, role binding, or tenant scope is missing — see universal standard status enums.
2. `dos.dynamic_ui_component_registry` rows must respect **`trg_carbon_only_runtime`** (`vendor = ibm-carbon`, valid `carbon_key`).
3. Permission keys on `dos.dynamic_ui_routes` must satisfy **`chk_perm_dot_form_dynamic_ui_routes`** (3+ dot segments).
4. Prefer shared `module.*` page `component_key`s before inventing new per-module page keys.

---

## Document history

| Date | Change |
|------|--------|
| 2026-05-04 | Consolidated README: full pack map, 34 seeds, 4 JSON twins, doc links, parity guard, non-seed plans split out |

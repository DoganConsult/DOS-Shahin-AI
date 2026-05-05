# Consolidated direct-seed document shape (Asset pattern)

## Purpose

This file is the **single consolidated reference** for how every  
`*-complete-direct-seed.md` module narrative should be structured when “Wave  
Asset consolidation” is applied: operational counts first, explicit RBAC matrix,  
reconciliation math, and a checklist that ties bindings back to the matrix.

**Golden example:** [`asset-complete-direct-seed.md`](./asset-complete-direct-seed.md).

**Older aggregates:** [`ALL_MODULES_COMPLETE_DIRECT_SEED.md`](./ALL_MODULES_COMPLETE_DIRECT_SEED.md) is a legacy stitched narrative — prefer **this shape + per-module files** for new edits.

### Minimum-bar editorial rule (additive-only)

`*-complete-direct-seed.md` specs are the **floor**, not a mirror of whatever shipped last week.

- **Do:** add §1a / §7 / §8 lines, extend matrices with new rows, raise counts, add appendices, add `VERIFY_*` until gates pass.
- **Do not:** remove normative seed rows, shrink §2 tables to match partial hosts, or drop documented permissions/components without an explicit traceable supersession appendix.

---

## Required sections (order)

| § | Heading | Required content |
|---|---------|------------------|
| 1 | `## 1. Module identity` | `module_code`, `product_key`, `route_base`, `owner_service`, status, names, category — aligned with live `dos.module_registry` where verified |
| 1a | `## 1a. Operational inventory (counts by component / type / key / role / route)` | One table: counts + named identifiers per category (nav keys, routes, `component_key`s, Angular names, APIs, DB tables, **distinct permission codes**, **distinct role codes**, Carbon/vendor/approval note). Prefer integers over prose |
| 2 | `## 2. Initialization group` | Real-column tables for `dos.module_registry`, `dos.navigation_registry`, `dos.dynamic_ui_routes`, `dos.dynamic_ui_component_registry`, **`platform_dauth.permissions`**. Then **explicit `role_code → permission_code` binding rows** (and optional summary-by-role table). No vague “admin gets everything” |
| 3 | `## 3. Provisioning group per tenant` | `tenant_product_activation`, entitlements, membership, trials/subscriptions, tuple stores |
| 4 | `## 4. Business / operations group` | Tenant-scoped business tables backing APIs/pages |
| 5 | `## 5. Page seed matrix` | Row-per-page: `page_key`, route, i18n titles, Angular, API, DB, permission, `COMPLETE` / `VERIFY_*` |
| 6 | `## 6. Direct SQL seed skeleton` | Comment-only transaction sketch naming UPSERT targets; **mention binding row count** from §2 |
| 7 | `## 7. Final count reconciliation` | Buckets: permission count, role count, **binding row count**, route/component counts, approx unique identifiers, concrete vs VERIFY split |
| 8 | `## 8. Validation checklist` | Universal chain checks **plus** parity lines: matrix row count, Carbon VERIFY resolution, entitlement gates where applicable — **and** the dual verification passes below (Pass A / Pass B); do not paste duplicate module registries here |

---

## Dual verification passes (Pass A / Pass B)

Use **before** treating a module as publisher-ready or production-candidate. This supplements universal checklist rows inside each module’s `## 8. Validation checklist`; **do not** maintain a second 34-row registry — JSON twin counts and parity baseline live in [`README.md`](./README.md) §3 and **`pnpm module:gates`**.

| Pass | Direction | Question |
|------|-----------|----------|
| **Pass A** | Spec → truth | Does everything the MD promises exist in JSON / DB / loaders / gateway-backed APIs? |
| **Pass B** | Truth → spec | Does everything deployed for this module appear in the MD (or an explicit deferral)? |

### Pass A — forward (MD → reality)

- **§1 / §1a** — Counts and identifiers match intent (routes, `component_key`s, permission codes, APIs listed).
- **§2** — Every permission has matrix coverage or explicit reserved/future.
- **§5 page matrix** — Each `COMPLETE` row: route → loader/archetype chain resolvable (`pnpm dynamic-ui:gates`, template-binding registry / customer-gate when enforced).
- **JSON twin** — Where `<module>-complete-direct-seed.json` exists: MD and JSON stay in lockstep ([`00-universal-module-seed-standard.md`](./00-universal-module-seed-standard.md) parity rule).
- **Parity guard** — `node scripts/ci-guards/seed-pack-md-json-parity.mjs`; enforced CI path: `pnpm module:gates`.
- **Gaps** — MD promises X but JSON row, DB row, loader, or API is missing (*gap type A*).

### Pass B — backward (reality → MD)

- Export or query **live** `dos.dynamic_ui_routes`, `dos.ui_route_template_binding`, `dos.dynamic_ui_component_registry` (and nav rows) scoped to `module_code`; reconcile to **§2 + §5** or tagged deferral.
- Gateway / service — prefixes for APIs listed in §1a / §5 appear in manifests or smoke proofs.
- **Gaps** — Production routes/APIs not reflected in MD (*gap type B*) → extend MD (additive) or remove orphan implementation.

### Mechanical aids

| Artifact | Use |
|----------|-----|
| [`phase-1-seed-inventory.md`](../../docs/phase-1-seed-inventory.md) | Heading outline per MD; regen: `node scripts/inventory-contract-pack-md.mjs` |
| [`phase-1-contract-pack-md-inventory.md`](../../docs/phase-1-contract-pack-md-inventory.md) | Script extracts §1 + resolved §5/§6 page rows |
| `pnpm module:gates` | `SEED_PACK_PARITY_ENFORCE` seed parity + module template approval guards |

Without a JSON twin, Pass A is **manual/partial** for publisher automation until `<module>-complete-direct-seed.json` lands.

---

## §1a category checklist (copy as empty scaffold)

Use every row that applies; use `0` or `N/A` with one-line rationale when not applicable:

- Module code  
- Product key  
- Route base  
- Navigation keys (count + list)  
- Route paths (count + list; note parent vs leaf if mixed)  
- Dynamic UI `component_key`s  
- Angular page components  
- Page keys / logical pages  
- API endpoints (method + path)  
- DB tables (schema-qualified)  
- Permission keys (distinct codes)  
- Role codes (distinct; align names with `platform_dauth.functional_roles` where possible)  
- Carbon keys (verified count vs `VERIFY_CARBON_KEY`)  
- Vendor / approval (usually `ibm-carbon` + `approved`)

---

## §2 binding matrix rules

1. Every permission declared in §2 must appear on **at least one** `(role_code, permission_code)` row **or** be explicitly marked reserved / future with no binding yet.  
2. Duplicate `(role_code, permission_code)` pairs are forbidden.  
3. If the module uses **`standard_user`** or similar broad roles, document **provisioning / entitlement gates** (when the row is seeded vs omitted).  
4. Prefer aligning `role_code` with existing platform functional roles (`tenant_admin`, etc.); if `tenant_owner` vs `tenant_admin` mismatch exists, add a **one-line caveat** under the matrix.

---

## §7 reconciliation rules

- **Binding row count** must equal the number of rows in the §2 matrix (not “about N”).  
- **Approx. unique operational identifiers** may overlap across layers; state that §1a + matrices are source of truth.  
- Split **concrete** vs **blocking VERIFY** (Carbon, missing API, etc.) so publishers know what gates CI/DB.

---

## Module conformance snapshot (Wave Asset shape)

Regenerate this table only when migrating modules or changing inventory tooling — **do not hand-maintain counts** beyond Y/N flags below.

| Module slug | §1a ops inventory | §7 reconciliation | §8 matrix parity line |
|-------------|-------------------|-------------------|------------------------|
| action | — | — | — |
| agrc-engine | — | — | — |
| ai-os | — | — | — |
| ai-platform | — | — | — |
| analytics | — | — | — |
| asset | **Y** | **Y** | **Y** |
| attestation | — | — | — |
| audit | — | — | — |
| bcp | — | — | — |
| compliance | — | — | — |
| config-center | — | — | — |
| controls | — | — | — |
| dora | — | — | — |
| dynamic-ui | — | — | — |
| evidence | — | — | — |
| foundation | — | — | — |
| incident | — | — | — |
| inbox | — | — | — |
| issues | — | — | — |
| knowledge | — | — | — |
| ksa-regulatory | — | — | — |
| mcp | — | — | — |
| notification | — | — | — |
| onboarding | — | — | — |
| policy | — | — | — |
| privacy | — | — | — |
| qiyas | — | — | — |
| remediation | — | — | — |
| reporting | — | — | — |
| risk | — | — | — |
| training | — | — | — |
| vendor | — | — | — |
| workflow | — | — | — |
| workspace-shell | — | — | — |

**Totals:** 1 / 34 at full Wave Asset parity (`asset-complete-direct-seed.md`).

---

## Migration note (remaining module seeds)

The **34** files under this folder need not all match this shape immediately. When touching a module seed:

1. Add **§1a** after §1.  
2. Replace vague role language with the **explicit matrix**.  
3. Add **§7** + extend **§8** checklist lines for matrix and VERIFY parity.  
4. Flip **Y** in the conformance snapshot table above for that slug.  
5. Honor **Minimum-bar editorial rule** (under Purpose): additive enhancements only—never remove normative seed rows or shrink matrices to match partial implementation.

Regenerate headings inventory after bulk edits:

```bash
node scripts/inventory-contract-pack-md.mjs
```

---

## Document history

| Date | Change |
|------|--------|
| 2026-05-04 | Initial consolidated shape doc (Asset reference pattern) |
| 2026-05-05 | Module conformance snapshot table + migration step 4 |
| 2026-05-05 | Minimum-bar / additive-only editorial rule under Purpose; migration checklist step 5 |
| 2026-05-05 | Dual verification passes (Pass A / Pass B) — canonical checklist format (removed stray `00-MD-DUAL-VERIFICATION-CHECKLIST.md`) |

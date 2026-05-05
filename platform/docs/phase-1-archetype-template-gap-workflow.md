# Phase 1 — Archetype ↔ template preparation gaps (step‑1 workflow)

**Goal:** Before tightening `*-complete-direct-seed.md` narratives (Wave Asset shape), decide whether each **route / page row** is aligned with the **archetype‑approved template chain**. That comparison is the **first** gap pass for “template preparations.”

**Out of scope here:** Marketing/public archetypes (`marketing-landing`, …) that are **not** in the 32‑entry workspace `ARCHETYPE_REGISTRY`; treat those under marketing migrations + `dynamic-template-page` docs.

---

## 1. Canonical approved triple (source of truth)

For workspace pages, the approved mapping is:

| Layer | Artifact | What to trust |
|-------|-----------|----------------|
| **Types + Carbon** | `platform/core/platform/shell/templates/module-template.types.ts` | `ARCHETYPE_REGISTRY`: `archetype` → `componentKey` → `carbonKey` (32 rows); `ARCHETYPE_ENHANCEMENT_MATRIX` must cover every archetype |
| **Loader / export name** | `platform/core/platform/shell/template-binding.registry.ts` | Lazy `*TemplateComponent` export per archetype |
| **UI registry / seeds** | `scripts/ui-registry/lib/archetype-map.mjs` | `component_key` → `{ archetype, template_export }` for import/diff/seed tooling |
| **DB contract** | `dos.chk_archetype` + `dos.ui_route_template_binding` | Stored `archetype` on bindings must match resolver + registry |

If these disagree, fix **code/DB first**, then reflect the truth in seed Markdown.

---

## 2. Step 1 — Build the checklist row set (no MD edits yet)

1. **Export** the 32 rows from `ARCHETYPE_REGISTRY` (archetype, componentKey, carbonKey).
2. **Verify** each `componentKey` returns a non‑null `{ archetype, template_export }` from `archetype-map.mjs` logic (same archetype as column 1).
3. **Verify** each `template_export` exists in `template-binding.registry.ts`.
4. **Optional DB proof:**  
   `SELECT route_path, archetype, component_key FROM dos.ui_route_template_binding WHERE …`  
   joined to `dos.dynamic_ui_component_registry` — archetype column must match step 1 expectation for customer‑bound routes.

Any failure in 2–4 is a **platform gap** (not a seed wording gap).

---

## 3. Step 2 — Diff module seed preparations against the checklist

For each `*-complete-direct-seed.md`:

| Seed evidence | Compare to |
|---------------|------------|
| §2 / supplementary tables: `component_key`, `route_path`, implied archetype | `ARCHETYPE_REGISTRY` + archetype-map resolution |
| §5 / §6 page matrix: route, loader, archetype column (if present) | Same + `template_export` name if documented |
| `VERIFY_*` / placeholder carbon | `dos.ui_carbon_components.runtime_status` + registry gates |

**Gap labels (examples):**

- **G1 — Unknown archetype:** seed or DB uses a string not in `PageArchetype` / `chk_archetype`.
- **G2 — Key drift:** `component_key` in seed ≠ registry row for that archetype.
- **G3 — Missing loader:** archetype ok but `template_export` not registered in `template-binding.registry.ts`.
- **G4 — Resolver mismatch:** ui-os / binding resolver returns different archetype than seed claims for the same route.
- **G5 — Carbon / VERIFY:** `carbon_key` not active or still VERIFY in CI.

---

## 4. Order of work (recommended)

1. **This doc — archetype/template chain parity** (steps 1–2).
2. **Wave Asset MD shape** (`00-CONSOLIDATED-DIRECT-SEED-SHAPE.md`): §1a counts, explicit RBAC matrix, §7 reconciliation.
3. **Inventory regeneration:** `node scripts/inventory-contract-pack-md.mjs`.

---

## 5. Related docs

- `platform/docs/phase-1-contract-pack-md-coverage-gaps.md` — what the inventory script extracts vs ignores.
- `platform/ui-system/module_ui_os_contract-pack/00-CONSOLIDATED-DIRECT-SEED-SHAPE.md` — seed narrative shape.
- `platform/docs/phase-1-consolidation-audit.md` — consolidation status.

---

## 6. Automated repro (chain parity)

**Script:** `scripts/archetype-template-gap-report.mjs`

**Commands:**

```bash
# Human-readable + exit code
node scripts/archetype-template-gap-report.mjs

# Machine-readable JSON only
node scripts/archetype-template-gap-report.mjs --json
```

**PASS when:**

- Process **exit code `0`**.
- JSON (if used): **`gaps`: []**, **`docDrift`: []**.
- Meta aligns with registry: **`registry_rows`** = **`allowed_archetypes_count`** = **32**, **`allowed_comment_says_31`**: **false**.

**What it checks:** `ARCHETYPE_REGISTRY` triples vs `mapComponentKeyToArchetype()` from `scripts/ui-registry/lib/archetype-map.mjs` vs lazy-export keys in `template-binding.registry.ts` (`LOADERS`).

**Known fix (2026-05-04):** Universal slugs ending in `.detail.page`, `.create.page`, `.advisor.page` must resolve in `archetype-map.mjs` (not only `.detail` / `.create` / `.advisor`), or three rows drift to `command-home`. After that fix, repro above stays green.

**Not covered by this script:** per-route **props/seeds**, **Foundation** concrete components vs bindings, or **marketing-landing** rows — use §2 seed diff + DB queries + per-page coverage tags separately.

---

## 7. After repro is green — next 4 questions

Ask these **in order** before expanding seed narrative work:

1. **Per-route coverage:** For each customer-bound route in `dos.ui_route_template_binding` (or `PAGE_REGISTRY`), does the row have the **right `component_key`** and **`archetype`**, and do **props tables** satisfy `props-coverage` / customer-gate for that archetype (not only loader parity)?
2. **Reuse vs uniqueness:** Which routes **share** the same archetype and differ only by **props / module context**? (Avoid inventing a 33rd archetype unless the layout truly cannot be expressed.)
3. **Foundation / static pages:** For routes that load **`Foundation*Component`** (or other non-`module.*.page` keys), is there an explicit **binding + resolver contract**, or an documented **STATIC_OR_LEGACY** exception?
4. **Enforcement:** Should **`archetype-template-gap-report.mjs`** be wired into **`pnpm platform:customer-gate`** (or a CI job) so regressions cannot merge?

---

## Document history

| Date | Change |
|------|--------|
| 2026-05-05 | Initial workflow (archetype‑approved template chain as step‑1 gap finder); §6 automated repro + archetype-map `.page` slug note; §7 next four questions after green repro |

# Contract-pack MD → Inventory — coverage gaps

**Source of truth for mechanics:** `scripts/inventory-contract-pack-md.mjs`  
**Output:** `platform/docs/phase-1-contract-pack-md-inventory.md` (Appendix A + summaries)

**Before relying on Appendix A for “template readiness”:** run the **archetype ↔ approved template** gap pass — see [`phase-1-archetype-template-gap-workflow.md`](./phase-1-archetype-template-gap-workflow.md) (step 1: compare seeds and DB bindings to `ARCHETYPE_REGISTRY` + `archetype-map.mjs` + `template-binding.registry.ts`).

This document tracks **what still lives in `*-complete-direct-seed.md` but is not mechanically collected** (or is collected under limited semantics). Use it when interpreting Appendix A counts and when extending the extractor.

---

## 1. What the script *does* collect

| Mechanism | Source in seed MD | Output |
|-----------|-------------------|--------|
| §1 identity | First `## 1.` block; pipe rows → Field \| Value | Identity columns + Appendix §1 |
| Supplementary buckets | **§2** tables matching `classifySupplementaryTable`; **§3** and **§4** tables whose headers contain `nav_key` or `nav_item_code` | Classified into navigation / dyn_ui / permissions / module_registry / carbon_registry |
| Page matrix (resolved) | **`resolvePageMatrix`**: best-scoring table from **§5** or **§6** (`pickPageMatrixTable`); tie-break favors stronger score; equal score favors §5 | Appendix “§5 / §6 — Page matrix”; **`§5_page_matrix_rows`** = numbered `#`/col0 spine on **resolved** table; **`page_matrix_total_rows`** = all body rows (includes manifest-style rows without `#`); **`page_matrix_src`** = `§5` \| `§6` \| `—` |
| Extracted manifest rows | Numbered spine **or** manifest-style (`page_code` + `route`, synthetic `(seq N)` when no `#`) | Narrow extracted shape for tooling |

Tables whose headers do **not** match `classifySupplementaryTable` are **ignored** for supplementary buckets (not emitted under §2 buckets).

---

## 2. Global omissions (every pack)

| Content type | Collected? | Notes |
|--------------|------------|-------|
| `## 0.` provenance / preamble | No | Entire block skipped |
| Prose, blockquotes, callouts | No | — |
| Bullet lists, numbered lists outside tables | No | — |
| `- [ ]` / checkbox validation sections | No | e.g. §7–§11 checklists |
| Fenced code blocks (SQL, JSON snippets, shell) | No | e.g. “Direct SQL seed skeleton” |
| Tables in §5–§§… unless part of resolved matrix / classifier | Mostly no | See per-pattern rows |
| Appendices after numbered sections | Only if table matches classifier + correct section | — |

---

## 3. Supplementary classifier blind spots (`classifySupplementaryTable`)

A §2 table is dropped unless headers imply one of:

- **navigation:** `nav_key` **or** `nav_item_code`
- **dyn_ui:** `component_key` **and** (`route_path` or header exactly `route`)
- **module_registry:** `module_code` **and** `product_key` **and** (`title_en` or `category`)
- **permissions:** column matching `permission_code` pattern
- **carbon_registry:** `component_key` **and** `carbon_key`

**Examples often present in seeds but not classified:**

- `Symbol | Code` / alignment tables (`Layer | …`)
- `role_code | …` without permission_code naming
- Mixed ops tables (`Surface | Source | Endpoint`, `Area | Methods`, `Route path | Loader | Rendering`)
- Any permission matrix that does not use a header named like `permission_code`

---

## 4. Navigation: §3 scanning (implemented)

Supplementary **navigation** merges:

- All qualifying tables under **`## 2.`**
- **`## 3.`** and **`## 4.`** when table headers include **`nav_key`** or **`nav_item_code`**

**Example:** `config-center-complete-direct-seed.md` — nav under **`## 3. Navigation`** is merged into the navigation bucket when headers match.

---

## 5. Page matrix: §5 vs §6 resolution (implemented)

- **`resolvePageMatrix`** scores §5 and §6 candidates (`pageMatrixStrengthScore`): prefers numbered spine + page key + route; also scores manifest-style **`page_code` + `route`** without a numeric `#` column.
- **`config-center-complete-direct-seed.md`**: §5 often API/config-only; **`page_matrix_src`** = **`§6`** when the §6 page seed matrix wins.
- **Fallback:** If no page-matrix-shaped table wins, `pickSurfaceBindingTable` may still surface **Component \| props** lists (e.g. workspace-shell) — semantics differ from full route/template matrix.

---

## 6. “Action-style” section pattern (many modules)

Several packs follow:

| § | Typical content | Collected? |
|---|-----------------|------------|
| §2 | Initialization / permissions | Partial — only tables matching classifier |
| §3 | Provisioning per tenant | Only nav-shaped tables → navigation bucket |
| §4 | Business / operations | §4 nav-shaped tables → navigation; other ops tables skipped |
| §5 | Page seed matrix | **Yes** when it wins `resolvePageMatrix` |
| §6 | Extra matrix / SQL skeleton | **Page matrix** when §6 wins scoring; raw SQL still **no** |
| §7+ | Checklists / validation | **No** |

Examples: `action-complete-direct-seed.md`, `workspace-shell-complete-direct-seed.md`, and similar packs.

---

## 7. Foundation-style pattern

`foundation-complete-direct-seed.md`:

| § | Content | Collection gap |
|---|---------|----------------|
| §3 | Roles (`FOUNDATION_MODULE_ROLES`) | **Not ingested** unless the same table is duplicated under §2 with classifier headers |
| §6 | API surface | **Not** in supplementary unless headers accidentally match classifier |
| §7–§11 | DB, provisioning, wiring, Dynamic-UI, checklist | **Not** mechanically rolled into Appendix |

§4 navigation **is** collected if the table uses `nav_item_code`.

---

## 8. Summary column semantics

| Column | Meaning |
|--------|---------|
| **`§5_page_matrix_rows`** | Count of **numbered** spine rows (`#` or column 0 digits-only) on the **resolved** page matrix — **not** “grep §5 only”. |
| **`page_matrix_total_rows`** | All data rows on the resolved matrix (includes unnumbered manifest rows). |
| **`page_matrix_src`** | Which section supplied that matrix: `§5`, `§6`, or `—`. |

---

## 9. Recommended follow-ups

1. **Classifier:** Extend `classifySupplementaryTable` for common orphan patterns (e.g. `role_code` matrices) if those should appear in Appendix buckets.
2. **Convention:** Keep seeds consistent — prefer one canonical section for page matrix **or** rely on §6 scoring when §5 is non-UI.
3. **This doc:** Update when `inventory-contract-pack-md.mjs` gains new branches.

~~Extractor: read §6 for config-center~~ **Done.**  
~~Extractor: scan §3 for nav~~ **Done.**

---

## 10. Seed inventory

There are **34** `*-complete-direct-seed.md` files under `platform/ui-system/module_ui_os_contract-pack/`. Section numbering varies; **config-center** previously had a §5/§6 page-matrix mismatch — **resolved** via §6 scoring + **`page_matrix_src`**. **Foundation** and **action-style** packs still have predictable **roles / provisioning / SQL / checklist** gaps as above.

# Phase-1 consolidation audit (Wave 1 — Slice A)

**Artifact:** consolidation inventory + canonical seed pack alignment + read-only `dos.*` cooperate verification.  
**Slice boundary:** publish exits (`pnpm module:publish` ×4), publication gates as green criteria, tenant DNA / signup smoke, and MD-only JSON generation are **Slice B** — explicitly deferred below.  
**Freeze status:** **pending** human reviewer sign-off on inventory appendix + universal additive delta + DB appendix reproduction (checklist in §3 and [`00-universal-module-seed-standard.md`](../ui-system/module_ui_os_contract-pack/00-universal-module-seed-standard.md)).

---

## 1. Executive summary

Wave 1 Slice A delivers:

1. **Comparable inventory** — [`phase-1-seed-inventory.md`](./phase-1-seed-inventory.md): baseline table over **34** `*-complete-direct-seed.md` files under `platform/ui-system/module_ui_os_contract-pack/`, plus per-file **`##` heading appendix** for outline traceability (zero-loss vs rescraping headings from sources).
2. **Named facts + counts (contract-pack seeds)** — [`phase-1-contract-pack-md-inventory.md`](./phase-1-contract-pack-md-inventory.md): same files with summary counts **and** Appendix A per-file **§1 identity** plus **`page_key` / route / archetype / component-or-loader** rows extracted from §5 (not counts-only). **Step‑1 template parity:** compare seeds and bindings to the archetype‑approved chain (`ARCHETYPE_REGISTRY`, `archetype-map.mjs`, `template-binding.registry.ts`) per [`phase-1-archetype-template-gap-workflow.md`](./phase-1-archetype-template-gap-workflow.md) — Appendix A alone does not prove loader/registry/DB alignment. **Quick repro:** `node scripts/archetype-template-gap-report.mjs` (expect exit **0**; optional `--json`).
3. **Universal template additive merge** — Slice A blocks appended to [`00-universal-module-seed-standard.md`](../ui-system/module_ui_os_contract-pack/00-universal-module-seed-standard.md): inventory pointer, `dos.module_contract_publish_log` / `dos.module_contract_errors`, `VERIFY_*` note, **reviewer freeze checklist** (pending).
4. **Canonical pack** — [`module_complete_direct_seed_pack/`](../ui-system/module_complete_direct_seed_pack/README.md): 34 MD + 4 JSON + schema; README documents resolver path and MD-only gap.
5. **Parity guard** — `node scripts/ci-guards/seed-pack-md-json-parity.mjs` → **`published=4 dropped=30 blockers=0`** (four JSON-backed modules; thirty MD-only until JSON twins exist).
6. **Read-only DB matrix** — §5 + full copy-paste SQL in **§9 Appendix** (run against `shahin_grc` with credentials from env — see §6).

**Not in Slice A:** treating `pnpm module:publish` for all modules as exit criteria; VERIFY placeholder cleanup across MD-only seeds; tenant provisioning smoke tied to fresh publish. Those are listed under §8.

### Platform surface counts — one-sheet summary (DB)

These are **live registry counts** from `shahin_grc` / schema **`dos`** (same numbers as §5 matrix). **Environment-specific** — repro with §9 SQL.

| What you asked | Maps to | Row count (2026-05-04 dev) | SQL |
|----------------|---------|----------------------------|-----|
| **Routes** (Dynamic UI routes) | `dos.dynamic_ui_routes` | **176** | A3 |
| **Nav** (navigation registry rows) | `dos.navigation_registry` | **138** | A2 |
| **Components** (registered Dynamic UI components) | `dos.dynamic_ui_component_registry` | **483** | A4 |
| **Template bindings** (route ↔ archetype / loader binding rows; closest to “seeded pages” in DB) | `dos.ui_route_template_binding` | **184** | A6 |
| **Modules** (module registry) | `dos.module_registry` | **48** | A1 |
| **Carbon catalog** (active IBM rows) | `dos.ui_carbon_components` where `is_active=true` | **272** | A5 |
| **Workspace shell bindings** | `dos.workspace_shell_binding` | **1200** | A7 |

**“Pages” wording:** there is no single `dos.pages` table. Use **176** if “page” means a **routable URL** in Dynamic UI, or **184** if you mean **template-binding rows** (archetype + props per route pattern). Per-module seed docs (e.g. foundation’s **21 pages**) are **contract slices**, not platform totals — sum across modules only after reconciling overlap with Dynamic UI.

---

## 2. Inventory snapshot

| Attribute | Value |
|-----------|--------|
| **Committed artifact** | [`platform/docs/phase-1-seed-inventory.md`](./phase-1-seed-inventory.md) |
| **Scope** | All `*-complete-direct-seed.md` under `platform/ui-system/module_ui_os_contract-pack/` |
| **Row count** | **34** modules |
| **Baseline columns** | `module_code`, `md_filename`, `json_in_contract_pack`, `json_in_canonical_pack`, `h2_heading_count`, `verify_placeholder_hits`, `notes` |
| **Continuation convention** | Add `part_index` only if a module is split across multiple comparable rows (unused in this snapshot) |
| **Zero-loss outline** | Same file: appendix listing every `## …` line per seed MD |

---

## 3. Universal template (additive merges)

The following were **appended** to [`00-universal-module-seed-standard.md`](../ui-system/module_ui_os_contract-pack/00-universal-module-seed-standard.md) (no replacement of per-module seed bodies):

- **Wave 1 Slice A** section with:
  - Link to `phase-1-seed-inventory.md` and baseline column definitions
  - **`dos.module_contract_publish_log`** / **`dos.module_contract_errors`** observability summary (publisher cooperate surfaces)
  - **`VERIFY_*` / placeholder** convention linked to inventory column `verify_placeholder_hits`
  - **Reviewer freeze checklist** + explicit **freeze status: pending**

Per-module `*-complete-direct-seed.md` files remain authoritative for full narrative.

---

## 4. Canonical pack + parity guard

| Item | Detail |
|------|--------|
| **Directory** | `platform/ui-system/module_complete_direct_seed_pack/` |
| **README** | [`README.md`](../ui-system/module_complete_direct_seed_pack/README.md) — SOT vs contract-pack, resolver note (`scripts/module/lib/load-contract.mjs`), 4 JSON vs 30 MD-only |
| **Contents** | 34× `*-complete-direct-seed.md`, 4× `*-complete-direct-seed.json` (`config-center`, `dynamic-ui`, `foundation`, `workspace-shell`), `00-universal-module-contract.schema.json` |
| **Guard command** | `node scripts/ci-guards/seed-pack-md-json-parity.mjs` |
| **Outcome (verified 2026-05-04)** | **`published=4 dropped=30 blockers=0`** |

No path changes were required to `seed-pack-md-json-parity.mjs` for this slice.

---

## 5. DB cooperate audit matrix

Every row includes **copy-paste SQL** in §9 (same statements). Environment: §6.

| # | Check | Result (2026-05-04 dev DB) | SQL ref |
|---|--------|----------------------------|---------|
| R1 | `dos.module_registry` row count | **48** | A1 |
| R2 | `dos.navigation_registry` row count | **138** | A2 |
| R3 | `dos.dynamic_ui_routes` row count | **176** | A3 |
| R4 | `dos.dynamic_ui_component_registry` row count | **483** | A4 |
| R5 | `dos.ui_carbon_components` (`is_active=true`) | **272** | A5 |
| R6 | `dos.ui_route_template_binding` row count | **184** | A6 |
| R7 | `dos.workspace_shell_binding` row count | **1200** | A7 |
| R8 | `dos.module_contract_publish_log` row count | **2** | A8 |
| R9 | `dos.module_contract_errors` row count | **0** | A9 |
| R10 | Trigger on `dos.dynamic_ui_component_registry` (runtime catalog guard) | **`trg_carbon_only_runtime`** → `fn_block_non_ibm_runtime_row()` | A10 |
| R11 | `dos.dynamic_ui_routes` CHECK constraints (domain enums + permission pattern) | **7** named `chk_perm_dot_form_dynamic_ui_routes`, `ck_dynamic_ui_routes_*` (+ PK/FK/NOT NULL — **20** constraints total on table) | A11 |
| R12 | Recent publish log rows | `workspace-shell` **1.0.0** and **2.0.0** with non-null `rows_emitted` | A12 |

**Notes:**

- Counts are **environment-specific**; reproduces by running appendix SQL on the target DB.
- `module_contract_*` tables illustrate **publisher cooperate** surfaces (success log + structured errors); absence of errors (`0` rows) is a cleanliness signal for this snapshot only.

---

## 6. Environment for reproduction

Do **not** commit passwords. Source of truth for dev credentials is documented in workspace [`AGENTS.md`](../../AGENTS.md) (`DATABASE_URL` / `dos_auth` pattern).

**Verify pattern:**

```bash
export PGPASSWORD='<from env — do not commit>'
psql -h localhost -U dos_auth -d shahin_grc -c 'SELECT current_database(), current_user;'
```

Replace host/user/database if your `.env` differs. All appendix statements assume schema **`dos`** on database **`shahin_grc`**.

---

## 7. Deferred checklist (Slice B)

Explicit deferrals (not Wave 1 Slice A exit criteria):

- [ ] **`pnpm module:publish`** for JSON-backed modules beyond current state / full four-module publication gate as **green** exit if required by release policy
- [ ] **Publication gates** — any CI gate that requires **all** modules published JSON-backed
- [ ] **Tenant DNA / signup smoke** tied to fresh publish
- [ ] **MD-only JSON** generation + publish for seeds without `.json` twins (`ai-platform`, `ai-os`, `workflow`, `inbox`, plus remaining 26 MD-only rows per parity guard)
- [ ] **`VERIFY_*` cleanup** in MD seeds after JSON + publisher validation exists
- [ ] **`/dynamic-ui/*` SPA proof** — document when/if tied to Slice B

---

## 8. Reviewer sign-off (freeze)

When the baseline is accepted:

1. Check each box in [`00-universal-module-seed-standard.md`](../ui-system/module_ui_os_contract-pack/00-universal-module-seed-standard.md) → **Reviewer freeze checklist**.
2. Update **Freeze status** in this document §1 and the universal doc from **pending** → **approved** with reviewer id / date in git commit message or internal ledger.

---

## 9. Appendix — copy-paste SQL

Run as a batch or statement-by-statement.

### A1 — module_registry count

```sql
SELECT count(*) AS module_registry_count FROM dos.module_registry;
```

### A2 — navigation_registry count

```sql
SELECT count(*) AS navigation_registry_count FROM dos.navigation_registry;
```

### A3 — dynamic_ui_routes count

```sql
SELECT count(*) AS dynamic_ui_routes_count FROM dos.dynamic_ui_routes;
```

### A4 — dynamic_ui_component_registry count

```sql
SELECT count(*) AS dynamic_ui_component_registry_count FROM dos.dynamic_ui_component_registry;
```

### A5 — ui_carbon_components active count

```sql
SELECT count(*) AS ui_carbon_components_active
FROM dos.ui_carbon_components
WHERE is_active = true;
```

### A6 — ui_route_template_binding count

```sql
SELECT count(*) AS ui_route_template_binding_count FROM dos.ui_route_template_binding;
```

### A7 — workspace_shell_binding count

```sql
SELECT count(*) AS workspace_shell_binding_count FROM dos.workspace_shell_binding;
```

### A8 — module_contract_publish_log count

```sql
SELECT count(*) AS module_contract_publish_log_count FROM dos.module_contract_publish_log;
```

### A9 — module_contract_errors count

```sql
SELECT count(*) AS module_contract_errors_count FROM dos.module_contract_errors;
```

### A10 — triggers on dynamic_ui_component_registry

```sql
SELECT tgname, pg_get_triggerdef(oid) AS def
FROM pg_trigger
WHERE tgrelid = 'dos.dynamic_ui_component_registry'::regclass
  AND NOT tgisinternal
ORDER BY tgname;
```

### A11 — constraints on dynamic_ui_routes

```sql
SELECT conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid = 'dos.dynamic_ui_routes'::regclass
ORDER BY conname;
```

### A12 — module_contract_publish_log sample rows

```sql
SELECT module_code, contract_version, rows_emitted, applied_at
FROM dos.module_contract_publish_log
ORDER BY applied_at;
```

---

## Document history

| Date | Change |
|------|--------|
| 2026-05-04 | Initial Wave 1 Slice A consolidation audit (inventory + universal delta + canonical pack + DB appendix + Slice B deferrals) |

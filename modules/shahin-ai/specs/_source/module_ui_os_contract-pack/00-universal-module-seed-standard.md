# Universal Module Direct Seed Standard

## Purpose

This folder defines what must exist before a module can be shown as a real active module in the workspace UI.

**Per-module narrative shape:** When authoring or refreshing `*-complete-direct-seed.md`, follow the **Asset consolidated layout** (§1 → §1a operational inventory → §2 … §8, explicit `role_code → permission_code` matrix, §7 reconciliation) documented in [`00-CONSOLIDATED-DIRECT-SEED-SHAPE.md`](./00-CONSOLIDATED-DIRECT-SEED-SHAPE.md). Golden example: [`asset-complete-direct-seed.md`](./asset-complete-direct-seed.md). The three groups below remain the semantic contract; the consolidated shape adds publisher-grade counts and matrix parity.

## Minimum-bar doctrine (non-negotiable)

Each module’s `*-complete-direct-seed.md` and its parity `*-complete-direct-seed.json` are the **normative minimum contract** for publisher and runtime alignment.

- **Allowed (enhance / increase):** new sections; additional seed rows; higher declared counts; tighter column definitions; new permissions, routes, or components; clarified prose; append-only blocks (`## Appendix …`); new `VERIFY_*` / status labels that increase transparency.
- **Forbidden:** deleting or neglecting documented seed rows to match partial implementation; shrinking tables or counts so the document matches incomplete code; dropping matrix bindings without a traceable supersession note.
- **When code lags:** keep the spec authoritative—use **Status rules** (`PARTIAL`, `VERIFY_*`, `BUILD_BLOCKED`, etc.) and appendix notes. Close gaps by **implementation + additive publisher apply**, not by editing the minimum bar downward.
- **Parity:** edits to Markdown must be reflected in sibling JSON (and vice versa); both grow together.

## Three required groups

### A. Initialization group — global one-time seed

| Area | Tables | Real columns (verified 2026-05-03) |
|---|---|---|
| Module identity | `dos.module_registry` | `module_code`, `product_key`, `display_name`, `status` |
| Navigation | `dos.navigation_registry` | `nav_item_code`, `module_code`, `parent_code`, `route`, `label_en`, `label_ar`, `sort_order` |
| Dynamic UI routes | `dos.dynamic_ui_routes` | `route`, `component_key`, `permission_key` (3+ segment regex enforced), `module_code` |
| Dynamic UI components | `dos.dynamic_ui_component_registry` | `component_key`, `vendor` (must = `ibm-carbon`), `carbon_key` (FK → `dos.ui_carbon_components`), `approval_status` |
| Permissions | `platform_dauth.permissions` | `permission_code` MUST be `<module>.<entity>.<verb>` 3-segment form |
| Roles | `platform_dauth.functional_roles` | reuse existing IDs (`platform_super_admin`, `tenant_admin`, `<module>_manager`, `standard_user`, plus `role_*` aliases) — do NOT invent new IDs |
| Role bindings | `platform_dauth.role_permissions` / `role_permission_map` | bind only to existing role IDs above |

**Hard constraints:**
- `dos.dynamic_ui_routes.permission_key` is regex-checked by `chk_perm_dot_form_dynamic_ui_routes`; 2-segment keys fail INSERT.
- `dos.dynamic_ui_component_registry` has trigger `trg_carbon_only_runtime` rejecting any `vendor != 'ibm-carbon'`.
- `dos.module_registry` has NO `owner_service` / `category` / `title_en` columns. The owner service is resolved at runtime via gateway prefix mapping, not in this row.
- Nav rows do NOT carry `permission` directly; permission is resolved through `dynamic_ui_routes.permission_key` for the matching `route`.
- Re-use the shared approved `module.*` component_keys (`module.entry.page`, `module.overview.page`, `module.records.page`, `module.workflows.page`, `module.reports.page`, `module.settings.page`) before introducing per-module page keys.

### B. Provisioning group — per tenant

| Area | Tables |
|---|---|
| Product activation | `dos.tenant_product_activation` |
| Module entitlement | `dos.tenant_module_entitlements` |
| User membership | `dos.tenant_memberships` |
| Trial/subscription | `dos.tenant_trials`, `dos.tenant_subscriptions` |
| Authorization tuples | OpenFGA / DAuth tuple store |

### C. Business / operations group — per module

| Area | Tables |
|---|---|
| Real page data | module-owned business tables |
| Audit | audit/decision/event tables |
| Workflow | workflow/approval tables if applicable |
| Evidence | evidence/document tables if applicable |

## Required chain per page

```text
DB nav row
→ route_path
→ Angular route
→ Angular page component
→ frontend API service
→ backend endpoint
→ DB table/query
→ permission
→ role binding
→ tenant/org scope
```


## Status rules

A row/page is not seed-ready until:

- Angular route exists
- Angular component file exists
- API endpoint exists
- Backend route exists
- DB table/query exists
- Permission exists
- Role binding exists
- Tenant/org scope is enforced
- No mock/static data
- Build passes

Allowed status values:

- `COMPLETE`
- `VERIFY`
- `NAV_MISSING`
- `ROUTE_MISSING`
- `COMPONENT_MISSING`
- `API_MISSING`
- `DB_MISSING`
- `PERMISSION_MISSING`
- `ROLE_BINDING_MISSING`
- `ORG_SCOPE_MISSING`
- `TUPLE_MISSING`
- `BUILD_BLOCKED`

---

## Wave 1 Slice A — additive notes (do not replace per-module MDs)

### Inventory pointer (comparable baseline + zero-loss traceability)

Committed artifact: [`platform/docs/phase-1-seed-inventory.md`](../../docs/phase-1-seed-inventory.md).

- Baseline table columns: `module_code`, `md_filename`, `json_in_contract_pack`, `json_in_canonical_pack`, `h2_heading_count`, `verify_placeholder_hits`, `notes`.
- Continuation convention: add `part_index` only if a module is split across multiple comparable rows (not needed for the 2026-05-04 snapshot).
- **Zero-loss outline:** the same file lists every `##` heading line per `*-complete-direct-seed.md` so reviewers can diff headings vs source MDs without rescraping.

### Contract publisher observability (`dos` schema)

- **`dos.module_contract_publish_log`** — successful publishes (`module_code`, `contract_version`, `schema_version`, `contract_sha256`, `sql_sha256`, `rows_emitted`, `applied_by`, `applied_at`, `summary`). Non-internal trigger **`trg_published_by_only`** runs **`assert_published_by_only()`** on INSERT/UPDATE (writer-actor guardrail).
- **`dos.module_contract_errors`** — failures during validate/dry-run/publish/activate/verify (`phase`, `error_type`, `message`, `severity` with CHECK constraints).

These complement (they do not replace) the initialization-group tables in **Three required groups** above.

### `VERIFY_*` / placeholder convention

Per-module MDs may still contain `VERIFY` markers or placeholder counts where JSON-backed publisher validation has not run. The inventory column **`verify_placeholder_hits`** surfaces rough placeholder density for prioritization; **`0`** means none matched the inventory scanner pattern for that snapshot.

### Dual verification (spec ↔ implementation)

Operator passes close the loop **both ways** (spec→truth and truth→spec); full checklist and mechanical aids are canonical in [`00-CONSOLIDATED-DIRECT-SEED-SHAPE.md`](./00-CONSOLIDATED-DIRECT-SEED-SHAPE.md) section **Dual verification passes (Pass A / Pass B)**. Fold bullets into each module’s **`## 8. Validation checklist`**; do not maintain duplicate registry tables outside [`README.md`](./README.md) §3 and the conformance snapshot in the consolidated shape doc.

### Reviewer freeze checklist (Wave 1 baseline)

- [ ] Inventory covers **all** `*-complete-direct-seed.md` files under this contract-pack directory (34 in the 2026-05-04 snapshot).
- [ ] Per-file `##` appendix in `phase-1-seed-inventory.md` spot-checked against sources (outline completeness).
- [ ] Additive edits to **this** universal document remain limited to Slice A blocks (no wholesale rewrite of seed narratives).
- [ ] Canonical directory [`module_complete_direct_seed_pack/`](../module_complete_direct_seed_pack/README.md) matches contract-pack content described in [`phase-1-consolidation-audit.md`](../../docs/phase-1-consolidation-audit.md).
- [ ] Read-only DB matrix in `phase-1-consolidation-audit.md` reproduced with appendix SQL on target environment.
- [ ] Sign-off: record **freeze status = approved** in that report’s executive summary when the baseline is accepted.

**Freeze status:** **pending** reviewer sign-off — do not treat the Wave 1 baseline as frozen until recorded in [`platform/docs/phase-1-consolidation-audit.md`](../../docs/phase-1-consolidation-audit.md).


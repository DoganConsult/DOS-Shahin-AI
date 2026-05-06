# Catalog-Only Binding Drift Report

Wave: **P1A — CATALOG_ONLY_METADATA_CANONICALIZATION**
Generated: 2026-05-06
Source migration: `platform/dos/migrations/public/20260509_0210_catalog_only_metadata_canonicalization.sql`
Resolver guard:   `services/ui-os-service/src/routes/workspace-shell.routes.ts` — `loadSurfaces()` SQL filter
Audit harness:    `scripts/audits/workspace-contract-audit.mjs` — `classifyCategory()` + `catalog-only-binding-drift` warning

## Doctrine

The 14 keys listed below are **approved IBM Carbon vocabulary primitives**.
They are inner-component primitives consumed by other renderers and **MUST NOT**
be emitted as workspace-shell surfaces. Their disposition is now explicit in
`dos.dynamic_ui_component_registry.metadata`:

```json
{ "catalog_only": true, "shell_renderable": false, "workspace_only": false }
```

The UI-OS resolver enforces this at the SQL layer:

```sql
AND COALESCE(r.metadata->>'catalog_only',     'false') <> 'true'
AND COALESCE(r.metadata->>'shell_renderable', 'true')  <> 'false'
```

The audit harness enforces it as a **hard failure** rule
(`catalog-only-emitted-by-runtime`) and a **warning** for residual bindings
(`catalog-only-binding-drift`).

## Allowlist (14 keys)

| componentKey | catalog_only | shell_renderable | workspace_only | rendererKey required | binding rows | emitted by runtime |
|---|---|---|---|---|---|---|
| `workspace.action.button` | true | false | false | **No** | 43 | **No** |
| `workspace.action.icon-button` | true | false | false | **No** | 43 | **No** |
| `workspace.action.inline-notification` | true | false | false | **No** | 43 | **No** |
| `workspace.action.modal` | true | false | false | **No** | 43 | **No** |
| `workspace.action.overflow-menu` | true | false | false | **No** | 43 | **No** |
| `workspace.action.overflow-menu-option` | true | false | false | **No** | 43 | **No** |
| `workspace.action.toast-notification` | true | false | false | **No** | 43 | **No** |
| `workspace.data.data-table` | true | false | false | **No** | 43 | **No** |
| `workspace.data.pagination` | true | false | false | **No** | 43 | **No** |
| `workspace.data.structured-list` | true | false | false | **No** | 43 | **No** |
| `workspace.data.table-batch-actions` | true | false | false | **No** | 43 | **No** |
| `workspace.data.table-toolbar` | true | false | false | **No** | 43 | **No** |
| `workspace.data.table-toolbar-actions` | true | false | false | **No** | 43 | **No** |
| `workspace.data.table-toolbar-search` | true | false | false | **No** | 43 | **No** |
| **TOTAL** | | | | | **602** | |

Binding rows are 43 per key × 14 keys = **602 rows** in `dos.workspace_shell_binding`,
one per active tenant. They are functionally inert because:

1. The SQL guard above filters them out before they reach `shell.surfaces`.
2. The pre-existing sensitive-zone perm gate already dropped them (defense-in-depth).
3. Runtime probe of `/api/ui-os/workspace-runtime` confirms zero catalog-only
   leakage (see Runtime Proof below).

## Runtime Proof

```
GET /api/ui-os/workspace-runtime
  ?tenant_id=14f273cf260a4736
  &user_id=70dd0034-bb20-4f9b-a9df-a308cd902efa
  &product_code=foundation
HTTP/1.1 200 OK

shell.surfaces.length = 21
catalog_only_leaked    = []   ← zero leakage
emitted componentKeys  = workspace.frame.* (14) + workspace.shell.* (7)
```

Audit verdict: **`WORKSPACE_CONTRACT_AUDIT_GATE_PASS`** (0 failures).

## Recommendation (deferred — not executed in P1A)

P1B should remove the 602 residual bindings via a single closed-allowlist
migration:

```
platform/dos/migrations/public/<NEXT>_workspace_shell_binding_catalog_only_cleanup.sql
```

Scope:
- closed allowlist of the 14 component keys above
- `DELETE FROM dos.workspace_shell_binding WHERE component_key = ANY($keys)`
- pre-DELETE assertion: registry rows are `catalog_only=true`
- pre-DELETE count snapshot (expected 602)
- post-DELETE assertion: zero rows remain for the 14 keys

This is **not yet authorized**. The SQL guard + audit warning are sufficient
to keep these primitives off the runtime; deletion is a doctrine cleanup
to remove drift from the data model.

## What did NOT change

- No `dynamic_ui_component_registry` row was deleted; the 14 keys remain
  approved Carbon vocabulary entries.
- No `workspace_shell_binding` row was deleted (intentional — this wave is
  metadata canonicalization only).
- No `ShellHost`, `SurfaceRenderer`, navigation, or visual UI files were
  modified.
- No new visual content, no Foundation/Home work, no nav cards.

## Acceptance

- [x] 14 registry rows carry canonical `catalog_only/shell_renderable/workspace_only` flags.
- [x] UI-OS resolver enforces non-emission via SQL (not via TypeScript filter).
- [x] Audit harness classifies catalog-only via DB metadata; binding presence is a warning, runtime emission is a failure.
- [x] `/api/ui-os/workspace-runtime` returns HTTP 200 with zero catalog-only keys.
- [x] Audit verdict remains `WORKSPACE_CONTRACT_AUDIT_GATE_PASS`.
- [x] 602 drift rows documented; deletion deferred to P1B.

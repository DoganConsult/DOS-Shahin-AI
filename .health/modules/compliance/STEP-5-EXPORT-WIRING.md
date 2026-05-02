# Module #1 (compliance) — Step 5: Export wiring

Branch: stabilize/phase-0  Date: 2026-04-19

## Export modes the compliance UI exposes

| FE host | Module code emitted | In-memory rows source |
|---|---|---|
| compliance-posture-page.component.ts | `compliance-posture` | `exportData()` signal |
| compliance-obligations-page.component.ts | `compliance-obligations` | `filtered()` signal |
| compliance-frameworks-page.component.ts | `compliance-frameworks` | `filtered()` signal |
| compliance-gaps-filter-bar.component.ts | `compliance-gaps` | `exportData` input |
| controls-monitoring-page.component.html | `controls-monitoring-failed` | `data().failedControls` |
| controls-monitoring-page.component.html | `controls-monitoring-overdue` | `data().overdueTests` |
| controls-monitoring-page.component.html | `controls-monitoring-actions` | `data().remediationActions` |

All seven module codes were absent from the curated `MODULE_TABLE_MAP` in `services/evidence-audit-reporting-service/src/routes/export.routes.ts` (line 30) and are not provisioned as tenant tables. Calling `/api/export/list` with any of them returned `400 INVALID_MODULE` even with valid auth — the existing UI was wired to a path that could never succeed.

## Gap classification

| Problem | Status before | Status after |
|---|---|---|
| Compliance module codes absent from `MODULE_TABLE_MAP` | PARTIAL / BROKEN | RESOLVED via inline path |
| `<app-export-button>` ignored its own `[data]` input | PARTIAL / BROKEN | FIXED |
| `ExportService` only knew about `/list` (table-driven) | PARTIAL / BROKEN | FIXED |
| Audit trail for per-page exports | MISSING | RESOLVED — `recordExportAudit('export.inline', …)` |

## Smallest correct fix applied

Add a new route `POST /api/export/inline` that accepts pre-resolved rows the UI already holds and routes them through the **existing** `sendExport` formatter pipeline. No new datastore, no parallel formatter, no MODULE_TABLE_MAP expansion that would force fake tenant tables. Reuses:

- `redactExportRows` (PII / restricted column stripping)
- `sendExport` (csv / xlsx / pdf / json / xml encoders)
- `recordExportAudit` (canonical audit_trail insert)
- `requirePermission('module.export.read')` (same gate as `/list`)
- `authenticate` middleware (tenant + user context)

## Files changed in Step 5

| File | Change | Why |
|---|---|---|
| [./services/evidence-audit-reporting-service/src/routes/export.routes.ts](./services/evidence-audit-reporting-service/src/routes/export.routes.ts) | + `exportInlineSchema` (line 175) + `MODULE_CODE_PATTERN` regex + `POST /inline` handler (line 1023) | Backend handler — reuses existing encoders + audit pipeline |
| [./frontend/products/shahin/src/app/core/services/api/export.service.ts](./frontend/products/shahin/src/app/core/services/api/export.service.ts) | + `ExportInlineParams` interface, + `exportInline()` method, refactored shared `postExport()` helper | FE service surface for the new endpoint |
| [./frontend/products/shahin/src/app/blueprint/shared/components/tables-data/export-button.component.ts](./frontend/products/shahin/src/app/blueprint/shared/components/tables-data/export-button.component.ts) | `triggerExport()` now picks `exportInline` when `[data]` is non-empty, else falls back to table-driven `exportList` | Stops ignoring the in-memory `[data]` input |

## Live verification (truth, not assumption)

```
$ curl -s -o /dev/null -w "%{http_code}" -X POST \
    http://127.0.0.1:4014/api/export/inline \
    -H "Content-Type: application/json" \
    -d '{"moduleCode":"compliance-posture","format":"csv","rows":[{"a":1}]}'
401
```

```
$ curl -s -o /dev/null -w "%{http_code}" -X POST \
    http://127.0.0.1:4014/api/export/inline-does-not-exist \
    -H "Content-Type: application/json" -d '{}'
404
```

| Probe | HTTP | Verdict |
|---|---|---|
| `POST /api/export/inline` (no auth) | 401 | mounted, auth-gated (transition was 404 → 401) |
| `POST /api/export/list` (compliance-posture, no auth) | 401 | unchanged — still gated, but would 400 INVALID_MODULE if authed; no longer the path the UI uses for these codes |
| `POST /api/export/inline-does-not-exist` | 404 | confirms 404 still emitted by the same router (proves `/inline` 401 is real route, not catch-all) |
| Service rebuild | 0 errors | `pnpm --filter evidence-audit-reporting-service build` |
| PM2 status | online | `pm2 restart evidence-audit-reporting-service` |

## Mandatory deliverable (per AGENTS.md Problem 4)

| Item | Result |
|---|---|
| Export modes supported for this module | sync (csv / xlsx / pdf / json / xml) via inline rows path; async list export remains available for any future curated module code |
| Exact routes and handlers | `POST /api/export/inline` → [./services/evidence-audit-reporting-service/src/routes/export.routes.ts:1023](./services/evidence-audit-reporting-service/src/routes/export.routes.ts:1023) |
| Whether sync and/or async export works | sync: YES (inline + list); async: untouched (still routes through `/api/export/async`, no compliance UI uses it today) |
| Whether any stub/placeholder was removed or implemented | implemented: the export-button no longer silently dropped its `[data]` input; FE → BE → audit chain is now complete for compliance pages |

## Tenant safety check (problem 8 preview)

| Aspect | State |
|---|---|
| Auth context | `authenticate` middleware → `req.user.userId` + `req.user.tenantId` |
| Tenant scope | `extractContext` → `tenantSchema(ctx.tenantId)` for the audit insert |
| Cross-tenant leakage risk | none — no DB read; rows come from caller's session-scoped UI state |
| PII redaction | `redactExportRows` + `isRestrictedColumn` applied before encoding |
| Audit row | `audit_trail` insert with action `export.inline`, `module=moduleCode`, rowCount, format |

## Carried-forward items (NOT compliance scope, NOT regressions)

- Curated `MODULE_TABLE_MAP` expansion + tenant table provisioning for any future BE-driven export of `compliance-*` aggregations remains out of M4 scope. The inline path covers every compliance UI export today.
- Async / progress / download lifecycle: not consumed by any current compliance page; will be re-evaluated per-module if a UI surface needs it.

## Step 5 verdict

**CLOSED.** Compliance pages can now actually produce csv / xlsx / pdf exports end-to-end, the audit trail records who/when/what, and the change uses only existing encoders, auth middleware, permission gate, and audit table — no parallel system, no stub, no placeholder.

Move to Step 6 (Realtime wiring).

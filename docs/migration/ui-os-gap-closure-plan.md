# UI-OS Gap Closure Plan

**Status:** DRAFT — 2026-05-01
**Owner:** platform team
**Scope:** close production-grade gap on the 31 `dos.ui_*` tables already migrated (Wave 1 + Wave 2 of the master checklist) **before** any new UI-OS tables are added.

Source checklist: [docs/Use it as the master checklist, but impl](../Use%20it%20as%20the%20master%20checklist%2C%20but%20impl)
Target service: [services/ui-os-service](../../services/ui-os-service)
Migration index: [platform/dos/migrations/migrations-index.json](../../platform/dos/migrations/migrations-index.json)

---

## Why this plan

The repo contains:
- 31 `dos.ui_*` tables (migrations `20260501_0302..0306`) plus the `dos.dynamic_ui_*` catalog (0300) and `langgraph_checkpoints` (0301) — verified present in `shahin_grc.dos.*`.
- A built `services/ui-os-service` exposing 14 endpoints (Bootstrap, Preferences, Workspace).
- 3 backend managers out of 24 listed in §21 of the master checklist.

But the production posture is incomplete:
- Migrations 0300–0306 are **not recorded** in either `dos.platform_migrations` (canonical) or `dos.schema_migrations` (legacy) — so future runs will see drift.
- `ui-os-service` is **not online in PM2** on port 4015 (`curl :4015/api/ui-os/health` → connection refused; PM2 list has no row).
- No tenant-isolation gate, no RBAC binding, no rate limit, no idempotency, no audit-trail emit, no OpenAPI, no PRR for the 14 shipped endpoints.
- 21 manager families and ~56 endpoints remain unbuilt **on tables that already exist**.

Adding more tables before fixing this multiplies the gap. This plan locks the chassis first, then fills surface area on tables already present.

---

## Phase 0 — Foundation honesty (no app code, just truth)

### 0.1  Backfill migration ledger
- Run [step-0.1-backfill-ui-os-ledger.sql](./step-0.1-backfill-ui-os-ledger.sql) against every DB that has the 31 `ui_*` tables (`shahin_grc` confirmed; check `shahin_fresh_full`, certs).
- Sha-256 checksums in the script are computed from the actual files; the runner will see them as already-applied.
- **Acceptance:** `SELECT count(*) FROM dos.platform_migrations WHERE filename LIKE '20260501_03%'` returns 7. Re-running [migration-runner](../../platform/config-center/migration/migration-runner.ts) with `status` reports zero unapplied and zero drift.

### 0.2  Down-migration parity test
- Against `dos_migration_validate`, for each of the 7 files: apply `up`, snapshot `pg_dump --schema-only --schema=dos`, apply `down`, then `up` again, snapshot again. Diff must be empty.
- **Acceptance:** `pg_dump` diff is byte-equal across the round-trip for each file.

### 0.3  Service env Source-of-Truth move
- Move env vars to `platform/config-center/env/ui-os-service.env` per the env-SoT rule.
- Required: `DATABASE_URL`, `PORT=4015`, `GATEWAY_ORIGIN_HMAC_SECRET`, `LOG_LEVEL=info`, `NODE_ENV=production`.
- **Acceptance:** `cat /proc/$PID/environ | tr '\0' '\n' | grep GATEWAY_ORIGIN_HMAC_SECRET` returns the secret on the running process.

### 0.4  Bring service online under PM2
- Apply the bash-space PM2 workaround from feedback memory:
  ```
  cd services/ui-os-service \
    && set -a && . /root/DOS-AIO/DOS\ Platform/platform/config-center/env/ui-os-service.env && set +a \
    && pm2 start dist/server.js --name ui-os-service
  pm2 save
  ```
- **Acceptance:** `curl http://localhost:4015/api/ui-os/health` returns `{"service":"ui-os-service","status":"ok"}`; `pm2 list` shows `ui-os-service online ↺=0` after 5 minutes.

### 0.5  Gateway proxy + auth boundary
- Mount `/api/ui-os/*` in [services/gateway/src/server.ts](../../services/gateway/src/server.ts) using `requireGatewayOrigin` HMAC + tenant header injection (same pattern as `/api/tenants/me`).
- **Acceptance:** anonymous browser request → 401 from gateway; authenticated browser → 200 with body; direct hit to `:4015` from outside gateway without HMAC → `500 NO_GATEWAY_SECRET`.

---

## Phase 1 — Production-grade chassis (still no new tables)

### 1.1  Tenant isolation at SQL level
- Wrap every query in `withTenantClient(tenantId)` that issues `SET LOCAL app.current_tenant_id = $1`.
- Add RLS policies on each of the 31 `ui_*` tables: `USING (tenant_id::text = current_setting('app.current_tenant_id', true))`.
- Run `pnpm tenant-isolation` scoped to `services/ui-os-service`.
- **Acceptance:** zero violations; cross-tenant probe returns 0 rows from SQL, never 403-via-app.

### 1.2  Zod at boundary + standard error envelope
- Move parsing to `src/schemas/{bootstrap,preferences,workspace}.schemas.ts`. Standard error: `{ code, message, requestId, details? }`.
- Generate `requestId` on entry, propagate via `res.locals.requestId` and structured logs.
- **Acceptance:** malformed body → 400 with `code=invalid_request`; logs grep by `requestId` show full request lifecycle in one line.

### 1.3  RBAC binding from canonical 544-perm catalogue
- Permissions to seed: `ui_os.bootstrap.read`, `ui_os.preferences.{read,write}`, `ui_os.workspace.{read,write,snapshot,restore}`.
- Bind on every route via the existing `requirePermission(...)` middleware.
- **Acceptance:** user without `ui_os.preferences.write` → 403 from middleware before any DB call; admin → 200.

### 1.4  Rate limits + idempotency
- Per-user token bucket on PUT/POST (express-rate-limit + Redis or `pg-bucket`).
- `Idempotency-Key` header required on snapshot/restore writes; store key + response in `dos.idempotency_keys` (existing) for 24 h.
- **Acceptance:** 100 req/s burst from one user → 429 after limit; same `Idempotency-Key` replay returns identical response with no duplicate row.

### 1.5  OpenAPI 3.1 + PRR
- Generate `services/ui-os-service/openapi.yaml` from zod via `zod-to-openapi`.
- Commit `runbook.md` + `prr.md` matching the Onboarding PRR-foundation pattern.
- **Acceptance:** `pnpm openapi:lint` green; PRR checklist 100% green for the 14 shipped endpoints.

### 1.6  Audit trail emit on writes
- Every successful PUT/POST/DELETE writes one row to `dos.audit_trail` with `actor_id` (NOT `user_id`), `service='ui-os'`, `entity`, `entity_id`, `before_jsonb`, `after_jsonb`.
- **Acceptance:** PUT preferences then `SELECT * FROM dos.audit_trail WHERE service='ui-os' ORDER BY id DESC LIMIT 1` shows the diff.

### 1.7  CI guards (only for what's wired)
- New workflow `.github/workflows/ui-os.yml`:
  - `tsc -p services/ui-os-service/tsconfig.json --noEmit`
  - `pnpm tenant-isolation --scope services/ui-os-service`
  - `pnpm openapi:lint services/ui-os-service/openapi.yaml`
  - `pnpm route-permission-binding-guard --scope services/ui-os-service`
  - `pnpm schema-shape-guard services/ui-os-service`
- **Acceptance:** PR that drops a permission binding fails CI before merge.

---

## Phase 2 — Fill manager + API gap on existing tables only

Each step adds **one** route group end-to-end: manager + zod + RBAC + rate-limit + audit + OpenAPI + tests + at least one real consumer in the Shahin SPA. **No new migrations.**

| Step | Route group | Tables consumed | Real consumer |
|---|---|---|---|
| 2.1 | Dashboards | `ui_dashboards`, `ui_dashboard_widgets` | Shahin `workspace-home` renders 1 dashboard from API |
| 2.2 | Grid state | `ui_data_grid_states` | One Foundation grid persists column order/width across reload |
| 2.3 | Saved views & filters | `ui_saved_views`, `ui_saved_filters` | Same Foundation grid loads a user-saved view |
| 2.4 | Productivity (commands, pins, recents, favorites, shortcuts, quick/context/bulk actions) | `ui_command_palette_items`, `ui_pinned_items`, `ui_recent_items`, `ui_favorites`, `ui_user_shortcuts`, `ui_quick_actions`, `ui_context_menus`, `ui_bulk_actions` | Shahin command palette opens, returns ≥10 items from API |
| 2.5 | Announcements | `ui_announcements`, `ui_user_announcements_read` | One seeded announcement appears once, dismisses, never reappears for that user |
| 2.6 | Tours + i18n read | `ui_tours`, `ui_user_tours_completed`, `ui_locales`, `ui_translations` | Shahin shell switches en↔ar via `/translations` (no in-bundle JSON) |
| 2.7 | Tenant branding | `ui_tenant_branding` | Changing `primary_color` reflects on Shahin login + workspace within 1 reload |
| 2.8 | Layout composition (read-only) | `ui_layout_templates`, `ui_user_layout_overrides`, `ui_page_layouts`, `ui_page_sections`, `ui_section_widgets`, `ui_responsive_breakpoints` | One Foundation page renders from `ui_page_layouts` (not hardcoded HTML) |
| 2.9 | Workspace snapshots | `ui_workspace_snapshots` | User snapshots panel state, signs out, restores after re-login |

Layout publish/version write paths (`ui_layout_versions`, `ui_layout_publish_history`) stay read-only until §16 governance tables exist (Wave 5).

**Per-step acceptance template:**
1. Manager class added under `src/managers/`.
2. Router added under `src/routes/`, mounted in `src/routes/index.ts`.
3. zod schemas in `src/schemas/`.
4. RBAC permissions seeded + bound.
5. Audit-trail emit on every write.
6. Rate limit applied.
7. OpenAPI fragment merged.
8. Vitest unit + integration tests against a real PG (NOT mocked — per testing memory).
9. One real consumer in Shahin SPA shipped behind nothing — feature visible to a logged-in user.
10. CI green on all guards from Phase 1.7.

---

## Phase 3 — Frontend chassis (renderers for what's wired)

### 3.1  Bootstrap consumption
- `UiOsBootstrapService` + `UiOsStateStore` (Angular signals) in `@dos/ui-system` consume `/bootstrap` once on app init. No other component fetches `/api/ui-os/*` directly.

### 3.2  Strict component allowlists
- `WIDGET_COMPONENT_MAP`, `PAGE_COMPONENT_MAP`, `ACTION_COMPONENT_MAP` in code.
- CI guard `ui-os-component-allowlist-guard` fails on any DB-provided component key without a map entry.

### 3.3  Locale/Theme/Branding renderers
- `LocaleDirectionRenderer` (RTL/LTR), `ThemeRenderer`, `BrandingRenderer` all read from `UiOsStateStore`. Replace remaining hardcoded styles in Shahin shell.

### 3.4  State renderers
- `EmptyStateRenderer`, `ErrorStateRenderer`, `LoadingStateRenderer`, `PermissionDeniedRenderer` used on every renderer added in Phase 2.

---

## Phase 4 — Observability + ratchet

### 4.1  Langfuse trace for `/bootstrap`
- Single span. Budget: P95 < 300 ms cold, < 50 ms warm.

### 4.2  Grafana panels
- `ui-os-latency`, `ui-os-error-rate`, `ui-os-bootstrap-cache-hit-rate`. Alert at 5xx > 0.5%.

### 4.3  Synthetic smoke
- 60 s loop hitting `/health` + `/bootstrap?tenantId=<smoke>` from inside gateway. Post to ops channel on red.

### 4.4  Ratchet lock
- Tenant-isolation violations = 0
- Contract drift = 0
- OpenAPI drift = 0
- Allowlist violations = 0
- Any regression blocks the PR.

---

## Cadence

| Window | Phases | Output |
|---|---|---|
| Week 1 | 0 + 1 | Chassis production-grade on 14 endpoints |
| Week 2 | 2.1 → 2.5 | 5 new route groups end-to-end |
| Week 3 | 2.6 → 2.9 + 3 + 4 | Remaining 4 route groups, Angular renderer chassis, observability ratchet |

**Only after Phase 0–4 are green** do new tables (§5 widgets, §6 grids, §7 forms, …) become Phase 5. By then every new table inherits all 7 platform behaviors automatically — RLS, RBAC, audit, rate limit, idempotency, OpenAPI, allowlist — instead of bolting them on later for ~90 tables at once.

---

## Out of scope (this plan)

- New `dos.ui_*` tables for §5–§20 of the master checklist.
- UI Manager Studio (§20, §25).
- Telemetry tables (§18) — emit-side only goes to existing `dos.audit_trail` + Langfuse for now.
- AI workspace context (§19) — overlaps `public.ai_drafts`, design pending.

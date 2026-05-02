# Top 10 Pages — AGRC-OS Wiring & Integration Status

This document defines the **top 10 platform pages** and their **actual** wiring status. When visiting these pages, integration may be **partial** until the gaps below are addressed.

## AGRC-OS Wiring Checklist (per page)

- [ ] **PageShell** (or consistent header with icon, title, subtitle, breadcrumbs)
- [ ] **Service layer**: GrcService, AGRCOSService, AgrcosUiService, or dedicated *Service
- [ ] **I18n**: All user-facing strings via `I18nService.translate()` / translation keys (en + ar)
- [ ] **Loading state**: signal or property, bound in template
- [ ] **Error state**: display and retry where appropriate
- [ ] **Real API**: `ngOnInit` (and actions) call backend; responses handled; no broken paths
- [ ] **Optional**: AGRC-OS drawer for contextual actions
- [ ] **Optional**: WebSocket / live updates where applicable

---

## Top 10 Pages — Honest Status

| # | Page / Route | Primary Service(s) | API(s) | Status | Notes |
|---|--------------|--------------------|--------|--------|------|
| 1 | **workspace-home** | GrcService | `GET /api/tenant-home/overview?workspaceId=`, `GET /api/tenant-home/activity`, `GET /api/tenant-home/actions` | ✅ Wired | Uses **tenant-home** API; `workspaceId` from localStorage or first workspace (backend returns `context.workspaceId`). See `TENANT-ADMIN-E2E-SETUP.md`. |
| 2 | **agrc-os** | AGRCOSService | `/api/agrc-os/*` | ⚠️ Partial | Custom header (no PageShell). Ensure backend `/agrc-os/*` routes are mounted and return expected shape. |
| 3 | **account-settings** | GrcService / AccountService | `/api/auth/userinfo`, etc. | ⚠️ Partial | PageShell + actions; verify auth routes and userinfo shape. |
| 4 | **security-settings** | GrcService / AccountService | `/api/auth/userinfo`, etc. | ⚠️ Partial | Same as account-settings. |
| 5 | **governance-os** | GrcService | `/api/governance/*`, osStatus, riskPosture, liveAlerts | ⚠️ Partial | PageShell + scope; verify env and HTTP client base URL. |
| 6 | **unified-squad** | UnifiedSquadService | `/api/unified-squad/*` | ⚠️ Partial | Verify backend mount and response shape. |
| 7 | **report-hub** | GrcService | `/api/report-hub/summary`, `/catalog`, `/trends`, `/anomalies` | ⚠️ Partial | PageShell + error/retry + i18n; API paths use `grc.get('/report-hub/...')` → `/api/report-hub/...` (correct if `apiUrl` is `/api`). |
| 8 | **notifications** | GrcService | `/api/notifications`, `/api/notifications/:id/read`, etc. | ⚠️ Partial | PageShell + i18n + error/retry; backend at `/api/notifications`. |
| 9 | **copilot** | GrcService | `/api/copilot/chat` | ⚠️ Partial | Verify chat endpoint and message shape. |
| 10 | **admin** | GrcService | `/api/admin/tenants`, `/api/admin/health`, jobs, etc. | ⚠️ Partial | PageShell + loading + error/retry; guard `grcAdminGuard`. Verify admin routes and role. |
| 11 | **vendor-hub** | GrcService, I18nService | Hub shell; embeds Vendors + Vendor Risk tabs | ✅ Wired | Agent A09 (Vendor Risk); i18n `vendorHub.*`; breadcrumbs and “Evidence and Risk Assessment” wording via `vendorHub.evidenceAndRiskAssessment`. |
| 12 | **vendors** (tab in vendor-hub) | GrcService, GrcLiveService | `GET/POST/PUT/DELETE /api/vendors` | ✅ Wired | PageShell; i18n `vendorsPage.*`; breadcrumbs: Vendors → Vendor Management and Third-Party Risk → Dashboard. |
| 13 | **vendor-risk** (tab in vendor-hub) | GrcService | `GET /api/vendor-risk/vendors/risk-register`, `GET /api/vendor-risk/vendors/:id/shared-responsibility` | ✅ Wired | PageShell; i18n `vendorRisk.*`; API paths aligned with backend; shared-responsibility loaded for first vendor. |

**Legend:** ⚠️ Partial = UI and service calls exist but pages may not be **fully** complete or wired when visited (e.g. missing workspace context, wrong API path, or backend not returning expected data).

---

## Gaps & integration fixes (to make pages fully wired)

1. **workspace-home**
   - Uses **tenant-home** API: `GET /api/tenant-home/overview`, `GET /api/tenant-home/activity`, `GET /api/tenant-home/actions`. Active workspace from `localStorage` key `grc_active_workspace` or backend returns `context.workspaceId` when empty.
   - Backend: `backend/src/routes/tenant-home.routes.ts`, `backend/src/services/tenant-home.service.ts`.

2. **Tenant config API**
   - Frontend was calling `GET /api/tenant-config` and `PATCH /api/tenant-config`; backend exposes `GET /api/tenant-config/config` and `PATCH /api/tenant-config/config`. **Fixed** in `GrcService` and `tenant-config.component` to use `/tenant-config/config`.

3. **Report-hub**
   - Uses `GrcService.get('/report-hub/...')`; backend is at `/api/report-hub` (report-hub.routes.ts). Ensure `environment.apiUrl` is `/api` so paths resolve to `/api/report-hub/...`.

4. **Admin**
   - Uses `getAdminTenants()`, `getAdminHealth()` → `/api/admin/tenants`, `/api/admin/health`. Verify admin routes and that `grcAdminGuard` allows access; backend may require specific role.

5. **All pages**
   - Run app, open each page, and check Network tab: no 404/500 on the primary data requests. Fix any wrong path (e.g. missing `/config` for tenant-config) and ensure backend route is mounted in `server.ts`.

---

## Verification (ensure it autoworks)

1. **Build**: Run `npm run build` in `frontend/` — must complete with no errors.
2. **Routes**: All four routes are protected and lazy-loaded:
   - `/report-hub` (report:read), `/notifications` (analytics:read), `/copilot` (copilot:read), `/admin` (grcAdminGuard).
3. **API base**: Report-hub uses **GrcService** (`/report-hub/summary`, `/report-hub/catalog`, etc.) so auth/tenant interceptors apply; download links use `environment.apiUrl` for same-origin PDF/XLS.
4. **I18n**: Keys `reportHub.*`, `notifications.*`, `copilot.*`, `admin.*` exist in `frontend/src/assets/i18n/en.json` and `ar.json` with fallbacks in components.
5. **Backend**: Report-hub backend is at `GET/POST /api/report-hub/*` (see `backend/src/routes/report-hub.routes.ts`). Notifications, copilot, and admin use existing GRC APIs.

---

## Service Layer (AGRC-OS pattern)

- **GrcService** — Generic HTTP `get/post/put/del` to `environment.apiUrl`; used by most pages.
- **AGRCOSService** — All `/agrc-os/*` endpoints (constitution, telemetry, gates, CCM, regulatory delta, orchestration, events, SOPs, runbooks, metrics).
- **AgrcosUiService** — UI config: `getDrawer(context?)`, `getDashboardLayout(dashboard)`.
- **UnifiedSquadService** — Unified Squad API (participants, dashboard, interventions).
- **AccountService** (optional) — Wraps `/auth/userinfo` and auth-related endpoints for account/security pages.

---

## References

- **Wiring pattern:** `frontend/PAGES-CONNECT-API.md`
- **AGRC-OS backend:** `backend/src/routes/agrc-os.routes.ts`, `backend/src/services/agrc-os-*.service.ts`
- **UI config:** `backend/src/routes/ui.routes.ts`, `frontend/src/app/services/agrc-os-ui.service.ts`
- **Widget map:** `frontend/src/app/shared/widgets/agrc-os-widget-map.ts`

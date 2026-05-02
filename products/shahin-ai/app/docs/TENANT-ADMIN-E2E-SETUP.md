# Tenant Admin Experience — End-to-End Setup

This document describes the **tenant admin flow** from login to workspace-home and how to verify it end-to-end.

---

## 1. Flow Overview

1. **Landing** (`/`) → If logged in and onboarding complete → redirect to `/workspace-home`.
2. **Login** → After auth, user is sent to `/onboarding` or `/workspace-home` depending on `onboardingComplete` (from `/api/auth/userinfo`).
3. **Workspace Home** (`/workspace-home`) → Operational cockpit:
   - Tenant header (org, workspace, tier, time)
   - Getting-started strip (when workspace is "new": 90-day plan + Admin Hub CTAs; dismissible)
   - Executive snapshot (8 KPIs)
   - Action center (tasks, approvals, evidence, audit items) with links to hubs
   - Program health band
   - Analytics row
   - Recent activity
   - Recommended next steps (from API) with correct routes to hubs and 90-day plan

---

## 2. APIs Used

| Purpose | Method | Endpoint | Auth |
|--------|--------|----------|------|
| Home overview | GET | `/api/tenant-home/overview?workspaceId=` | Bearer |
| Activity | GET | `/api/tenant-home/activity?workspaceId=&limit=&offset=` | Bearer |
| Action center | GET | `/api/tenant-home/actions?workspaceId=` | Bearer |
| Preferences | PATCH | `/api/tenant-home/preferences` | Bearer |

- **Backend** resolves `tenantId` and `userId` from the JWT (`authenticate` middleware).
- If `workspaceId` is missing or blank, the overview API returns the tenant’s **first workspace** in `context.workspaceId`; the frontend stores it in `localStorage` under `grc_active_workspace`.

---

## 3. Frontend Wiring

- **workspace-home**
  - Reads `workspaceId` from `localStorage.getItem('grc_active_workspace')` or empty.
  - Calls `GrcService.getHomeOverview(workspaceId)`.
  - On response, if `context.workspaceId` is present and current `workspaceId` was empty, sets `workspaceId` and saves to `localStorage`.
  - Next steps and action items use **hub routes**: `/compliance-hub`, `/governance-hub`, `/evidence-hub`, `/audit-hub`, `/admin-hub`, `/ninety-day-plan`, `/task-board`, `/framework-hub`, `/risk-hub`.
- **Getting-started strip**
  - Shown when maturity is `"new"` and not dismissed.
  - Dismissal stored in `localStorage` key `grc_workspace_home_getting_started_dismissed`.
- **admin-hub** and **knowledge-base**
  - Use `GrcService.getHomeOverview(workspaceId)` (with `grc_active_workspace` or `''`) instead of `GET /workspace-home`.

---

## 4. E2E Verification Checklist

Use this to confirm the tenant admin experience is wired end-to-end.

### 4.1 Auth & redirect

- [ ] Logged-out user visits `/` → sees landing (or login).
- [ ] Logged-in user with `onboardingComplete: true` visits `/` → redirects to `/workspace-home`.
- [ ] Logged-in user with `onboardingComplete: false` → redirects to `/onboarding`.

### 4.2 Workspace-home load

- [ ] Open `/workspace-home` as tenant admin (with `analytics:read` or equivalent).
- [ ] Network: `GET /api/tenant-home/overview` (with or without `workspaceId`) returns 200.
- [ ] Page shows tenant header (org name, workspace, tier, time).
- [ ] If workspace was empty, response includes `context.workspaceId` and it is stored; subsequent requests send that `workspaceId`.

### 4.3 New-workspace experience

- [ ] With a **new** workspace (no frameworks/controls/risks/policies), the **getting-started strip** is visible.
- [ ] Strip contains CTAs for "90-day plan" and "Admin Hub" (or Arabic equivalents).
- [ ] "90-day plan" links to `/ninety-day-plan`.
- [ ] "Admin Hub" links to `/admin-hub`.
- [ ] Dismiss button hides the strip and refreshes; after reload, strip stays hidden (localStorage).

### 4.4 Next steps and action center

- [ ] **Next steps** section shows items from API; each item has a working route (e.g. `/framework-hub`, `/compliance-hub`, `/admin-hub`, `/ninety-day-plan`).
- [ ] For a new workspace, top next steps include "View Your 90-Day Plan" and "Invite Team Members" (or equivalent).
- [ ] **Action center** items (overdue, approvals, evidence, etc.) link to the correct hubs (e.g. compliance → `/compliance-hub`, evidence → `/evidence-hub`).
- [ ] Clicking a next-step CTA or action item navigates to the correct page (no 404).

### 4.5 Hubs and 90-day plan

- [ ] From workspace-home, navigate to **Admin Hub** (`/admin-hub`) → page loads; no 404 on tenant-home/overview (admin-hub uses `getHomeOverview` for summary).
- [ ] Navigate to **90-day plan** (`/ninety-day-plan`) → page loads.
- [ ] Navigate to **Compliance Hub** (e.g. via next step or sidebar) → loads `/compliance` (or compliance-hub redirect).

### 4.6 Backend

- [ ] `GET /api/tenant-home/overview` without `workspaceId` returns `context.workspaceId` when tenant has at least one workspace.
- [ ] `nextSteps` in overview response have `route` values that match app routes (e.g. `compliance-hub`, `admin-hub`, `ninety-day-plan`).
- [ ] Role/permission: user has `analytics:read` (or whatever `workspace-home` route requires) so guard allows access.

---

## 5. Test Credentials (seed tenant admin)

If the platform seeds a default tenant admin (e.g. from `backend/src/data/seed-platform-admin.ts`):

- **Email:** `ahmet.dogan@doganconsult.com`
- **Password:** `As$123456789` (or value of `PLATFORM_ADMIN_PASSWORD` at seed time)
- **Tenant:** Dogan Consult (role: owner + super_admin)

**If login returns 401 (account locked):** Clear lockout in the database for that user (e.g. set `LockoutEnd = NULL`, `AccessFailedCount = 0` in the `users` table), then retry.

---

## 6. Quick Manual Test Script

1. **Start backend and frontend** (e.g. `npm run dev` in backend, `ng serve` in frontend).
2. **Log in** as a tenant admin user (onboarding complete).
3. **Go to** `/workspace-home` (or `/` and let redirect).
4. **Confirm**:
   - Tenant header visible.
   - At least one of: snapshot cards, action center, or next steps visible.
   - If workspace is new: getting-started strip visible; dismiss works.
5. **Click** a next-step CTA (e.g. "90-day plan") → should open `/ninety-day-plan`.
6. **Click** "Admin Hub" (from strip or sidebar) → should open `/admin-hub` without 404.
7. **Optional**: Clear `grc_active_workspace` from localStorage, reload workspace-home; confirm overview still loads and `context.workspaceId` is set and stored.

---

## 7. References

- **Backend:** `backend/src/routes/tenant-home.routes.ts`, `backend/src/services/tenant-home.service.ts`
- **Frontend:** `frontend/src/app/pages/workspace-home/workspace-home.component.ts`, `frontend/src/app/core/services/grc.service.ts` (`getHomeOverview`, `getHomeActivity`)
- **Routes:** `frontend/src/app/app.routes.ts` (`workspace-home`, `dashboard` → redirect to `workspace-home`, hub routes)
- **Guards:** `landingGuard`, `onboardingGuard`, `grcRoleGuard` (e.g. `analytics:read` for workspace-home)

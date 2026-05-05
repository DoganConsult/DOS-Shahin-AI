# Phase G T0 — Self-Registration Trial Lifecycle: Pre-Implementation Audit

**Date**: 2026-05-01
**Author**: platform team (auto-generated)
**Manifest section**: §G (Trial Lifecycle), §H (Billing OS) — see `platform/docs/PLATFORM_OPERATING_MANIFEST.md`
**Plan ref**: `docs/plans/you-are-taking-over-joyful-wave.md` lines 1284–1446
**Status**: Foundation present, trial layer is **GREENFIELD**.

---

## 1. Locked one-liner (from §G)

> Self-registration = tenant + owner + product trial + subscription + entitlements + workspace.
> Trial time is Config OS data. Foundation is platform DNA. Modules are trial-entitled.
> Expiry/conversion are lifecycle states, not manual cleanup.

---

## 2. What exists today (verified 2026-05-01)

### 2.1 Registration entry point — ✓ EXISTS but partial

- `services/tenant-service/src/server.ts:179-268` exposes `POST /register`
- Currently creates: tenant row, user row, membership (`is_tenant_owner=true`, role from `DEFAULT_OWNER_ROLE`), default product activation rows (`DEFAULT_TENANT_PRODUCTS=foundation`)
- Idempotent on existing user with active membership
- Wrapped in a single transaction
- **Does NOT create**: trial record, subscription record, product entitlements, module entitlements, trial audit row, default trial config

### 2.2 Keycloak registration — ✓ EXISTS

- Realm `dogan` user-profile simplified to `email / firstName / lastName / company / country / phone` (per 2026-05-01 work)
- Theme `dogan` with EN + AR messages and `organisation` group
- `keycloak-bootstrap.service.ts` (DAuth) provisions tenant on KC user creation; `BootstrapInput` extended with `company / country / phone`
- Gateway proxies `/api/auth/oidc/start` → 302 to KC → callback → tenant-service registration

### 2.3 Identity / membership types — ✓ EXISTS

- `dos.tenant_memberships.is_tenant_owner` boolean column
- `DEFAULT_OWNER_ROLE` env (default `tenant_owner`)
- `dos.users` has `tenant_id` pinned + `sso_provider='keycloak'`

### 2.4 Subscription / Tenant types in TS — ⚠ PARTIAL

- `modules/packages/dos-types/src/provisioning.ts` declares:
  - `SubscriptionStatus = 'active' | 'trial' | 'past_due' | 'cancelled' | 'paused' | 'pending'`
  - `TenantStatus = 'active' | 'trial' | 'suspended' | 'pending_setup' | 'offboarding' | 'terminated'`
  - `Subscription`, `SubscriptionAddOn`, `Tenant` interfaces (with `trialEndsAt?`)
- TS contracts diverge from §G spec — §G needs:
  - `trial_pending_verification | trial_active | trial_expiring | trial_grace | trial_suspended | trial_converted | trial_cancelled | trial_expired`
  - `Subscription: trialing | active | past_due | grace | suspended | cancelled | expired | converted`
- **No DB persistence** of any subscription/trial type — types are unused

### 2.5 Trial lifecycle job — ⚠ PARTIAL

- Temporal schedule **registered**: `trial-lifecycle-check` cron `0 2 * * *` in two locations:
  - `platform/workflow/_sources/modules_workflow/source/backend/workflow/temporal/schedules/register-all-schedules.ts`
  - `platform/workflow/_sources/services_workflow-service/src/domain/temporal/schedules/ensure-schedules.ts`
- **No handler implementation** — schedule fires into a stub queue, no expiry/grace/notification logic
- `pnpm trial` guard command does not exist yet

### 2.6 Subscription guard — ⚠ PARTIAL

- `modules/packages/dos-platform-core/src/http/guards/subscription-status-guard.ts` is a skeleton:
  - Allows full access on `active|trial|grace`
  - Read-only on `suspended`
  - Has a `setSubscriptionLookup()` callback hook
  - **No tenant-lookup function is wired** — guard never resolves a real status

### 2.7 Notification/email path — ✓ EXISTS

- `notification-service` is up (port 4005, restored 2026-05-01) — required for T0 welcome / T-7/T-3/T-1/expiry/grace/suspension fan-out
- Templates dir copied to dist; eligible for T4 trigger handlers

### 2.8 Foundation DNA — ✓ EXISTS

- `/api/health/foundation` reports route-catalog + db-pool + entitlement-store all `ok`
- Foundation is platform DNA — never `'not-entitled'`, only `hidden | enabled | missing-permission | backend-offline | route-not-wired`

### 2.9 Workspace shell — ✓ CONTRACT-DRIVEN

- `products/shahin-ai/product.manifest.json` `navigationComposition.{primary,secondary}` is the SoT for sidebar nav
- Shell renders from manifest via `workspace-navigation.adapter.ts` + `product-composition-nav.source.ts`
- Zero hardcoded nav labels in `workspace-shell.component.ts`
- This is the pattern any T6 workspace UI must follow.

---

## 3. What is greenfield (Phase G must own)

### 3.1 DB tables (T1) — ✗ MISSING

| Table | Phase | Status |
|---|---|---|
| `dos.tenant_trials` | G T1 | **CREATE** |
| `dos.tenant_subscriptions` | G T1 / H shared | **CREATE** |
| `dos.tenant_product_entitlements` | G T1 / H shared | **CREATE** |
| `dos.tenant_module_entitlements` | G T1 / H shared | **CREATE** |
| `dos.trial_audit_log` | G T1 | **CREATE** |
| `dos.billing_plans` | H1 | future (Phase H) |
| `dos.billing_plan_features` | H1 | future (Phase H) |
| `dos.billing_audit_log` | H1 | future (Phase H) |

**Existing cousin** to NOT duplicate: `dos.tenant_product_activation` (feature-flag table, columns `id, tenant_id, product_code, status, activated_at`). Keep as-is; it's not an entitlement record.

### 3.2 Atomic registration (T2) — ✗ EXTEND `/register`

`tenant-service` `/register` currently does only steps 1–4. T2 adds 5–9 inside the same transaction:

1. Tenant row (status='active' → §G says `'active'` after verification, `'pending_setup'` before)
2. User row
3. Membership (is_tenant_owner=true)
4. Default product activation
5. **NEW** Trial row (`status='trial_pending_verification'`, `starts_at=now`, `ends_at=now+platform.trial.defaultDays`)
6. **NEW** Subscription row (`status='trialing'`, `billing_status='no_payment_required'`, `trial_id=…`)
7. **NEW** Product entitlement (`source='trial'`, `entitlement_status='active'`)
8. **NEW** Module entitlements (one per `product.shahin.trial.allowedModules` config; with `limits_json` from `product.shahin.trial.{maxUsers,aiCredits,…}`)
9. **NEW** Trial audit row (`action='trial_created'`)
10. **NEW** Default tenant config rows (locale, timezone, currency from `tenantDefaults` in product manifest)

Wrapped in a single `withTenantClient` transaction — must roll back atomically on any failure.

### 3.3 `trial-lifecycle-sync` handler (T3) — ✗ MISSING

Schedule fires daily at 02:00; handler iterates `dos.tenant_trials` and:
- N days before `ends_at` → status = `trial_expiring` + emit `notification.trial.expiring`
- After `ends_at` → status = `trial_grace` + emit `notification.trial.grace`
- After `grace_ends_at` → status = `trial_suspended`, deactivate trial entitlements (entitlement_status → `expired`), emit `notification.trial.suspended`, write audit row
- Foundation entitlement stays evaluated (DNA, never disabled)

### 3.4 APIs (T4) — ✗ MISSING

Public:
- `POST /api/trials/start` — captures form, creates verification token, fires email
- `POST /api/trials/verify-email` — flips trial → `trial_active`, fires welcome
- `GET /api/trials/status/public/:token` (optional)

Authenticated (tenant-service):
- `GET /api/trials/current`
- `GET /api/subscription/current`
- `POST /api/trials/convert` (T8 — preserves tenant_id, swaps entitlements)
- `POST /api/trials/cancel`

Admin (admin-service):
- `GET /api/admin/trials`, `POST /api/admin/trials/:id/{extend,suspend,convert}`

### 3.5 Dynamic UI / Config OS reflection (T5) — ⚠ EXTEND

- `GET /api/dynamic-ui/modules/status` already returns module status; extend resolver to surface `'trial-expired'`, `'trial-limit-reached'` reasons
- `GET /api/config-center/effective` already returns effective config; extend to include trial config + limits when caller is tenant-scoped
- Foundation **never** marked `'not-entitled'` (already enforced — keep it that way)

### 3.6 Workspace UI surfaces (T6) — ✗ MISSING

- Trial status banner (component in @dos/ui-system, contract-driven from `/api/trials/current`)
- Trial card on workspace-home (days left, plan, allowed modules, limits, upgrade CTA)
- Owner-only trial-management card on tenant settings
- All chrome (banner copy, card sections, action labels, status pill colours) **resolved from module manifest**, never literal in component code (per `feedback_contract_driven_workspace_shell` rule)

### 3.7 Anti-abuse (T7) — ✗ MISSING

- IP/email/domain rate-limit on `/api/trials/start`
- CAPTCHA hook
- Disposable-email block (config-driven list)
- Email verification gate before activation
- One active trial per company domain when `product.shahin.trial.oneTrialPerDomain=true`
- Sanitisation of company-name + domain
- All actions append to `dos.trial_audit_log`

### 3.8 Conversion path (T8) — ✗ MISSING

`POST /api/trials/convert`:
- Subscription: `trialing` → `active`
- Replace trial entitlements with paid entitlements (same tenant_id, same users)
- Remove `limits_json` ceilings
- Audit row (`action='trial_converted'`)
- Trigger Dynamic UI refresh + Config OS refresh
- **No new tenant** on conversion

### 3.9 Config keys (T1 prerequisite) — ✗ MISSING

To register in Phase B C1 schemas:
- `platform.trial.defaultDays`, `platform.trial.graceDays`
- `product.shahin.trial.defaultDays`, `product.shahin.trial.graceDays`
- `product.shahin.trial.maxUsers`, `product.shahin.trial.allowedModules`, `product.shahin.trial.aiCredits`
- `product.shahin.trial.requireCorporateEmail`, `product.shahin.trial.allowPublicEmailDomains`, `product.shahin.trial.oneTrialPerDomain`

### 3.10 `pnpm trial` guards — ✗ MISSING

CI guards to add:
- no tenant trial without subscription
- no subscription without `product_code`
- no trial entitlement without `trial_id` / `source`
- no product-local trial duration constants (must come from Config OS)
- no Foundation marked `'not-entitled'`
- no frontend trial authority
- no bypass of email verification when required
- no trial without owner membership
- no expired trial with active trial entitlements
- no secrets exposed in trial config

---

## 4. Cross-phase alignment

| Concern | Owns | Note |
|---|---|---|
| Trial DB schema | G T1 | shared with Phase H (do not duplicate in H1) |
| Subscription DB schema | G T1 / H shared | Phase H adds `provider_mode`, `provider_ref` columns |
| Billing tables (`billing_plans`, `billing_plan_features`, `billing_audit_log`) | H1 | Phase G must NOT create these |
| Entitlement resolution UI flag | C / F | Dynamic UI consumes; G adds `trial-expired` + `trial-limit-reached` reasons |
| Workspace banner / card chrome | T6 | must be contract-driven via module manifest |
| Email fan-out | P / notification-service | Phase G triggers; templates owned by P |
| Audit trail unification | L | Phase G writes to `trial_audit_log`; Phase L consolidates into platform audit ledger |
| Provisioning orchestrator | J | Phase G tenant-service `/register` is the temporary host until J ships |

---

## 5. Acceptance gates (from §G — locked)

A new user can self-register and reach a working trial workspace only when ALL of these hold:

1. New user can self-register through the public flow.
2. Email/domain verification works end-to-end.
3. Tenant + owner + trial + subscription + entitlements created **atomically**.
4. Workspace renders from real trial entitlements (no static fallback).
5. Trial duration comes from Config OS (no constant in code).
6. Expiry/grace/suspension jobs run, transition states, and emit notifications.
7. Conversion path preserves tenant_id and data; entitlements swap from trial → paid.
8. Foundation is platform DNA; `'not-entitled'` never used for it.
9. Modules render their workspace from trial entitlements only.
10. UI shows trial status + limits via contract-driven banner/card (rule: `feedback_contract_driven_workspace_shell`).
11. All trial actions appended to `dos.trial_audit_log`.
12. `pnpm trial` guards green or no-new-violations baseline reported.
13. `pnpm typecheck` and `pnpm test` green.

---

## 6. Recommended T1 → T8 sequencing

1. **T1** — Migrations + types + Config keys (foundation for everything else)
2. **T2** — Atomic registration in tenant-service (extends existing `/register`)
3. **T7** — Anti-abuse (must be in place before public T4 endpoints open)
4. **T4** — APIs (public + authenticated + admin)
5. **T3** — `trial-lifecycle-sync` handler (depends on T1 + notification-service)
6. **T5** — Dynamic UI / Config OS reflect trial state
7. **T6** — Workspace UI surfaces (banner + cards) — contract-driven only
8. **T8** — Conversion path

Rationale: T7 must precede T4 to prevent abuse on day 1. T3 needs T1 tables and notification-service (already up). T6 last because UI consumes the resolved state.

---

## 7. Files this phase will touch

**New** (`G T1`):
- `platform/dos/db/migrations/public/<NNNN>_tenant_trials.sql`
- `platform/dos/db/migrations/public/<NNNN>_tenant_subscriptions.sql`
- `platform/dos/db/migrations/public/<NNNN>_tenant_product_entitlements.sql`
- `platform/dos/db/migrations/public/<NNNN>_tenant_module_entitlements.sql`
- `platform/dos/db/migrations/public/<NNNN>_trial_audit_log.sql`
- `platform/config-center/contracts/config/trial.config.schema.json`
- `modules/packages/dos-types/src/trial.ts`
- `modules/packages/dos-types/src/subscription.ts` (rewrite to match §G)

**Extend** (`G T2`):
- `services/tenant-service/src/routes/<register>.routes.ts` (atomic 5-step extension)
- `services/tenant-service/src/domain/registration.ts` (new — orchestrates trial bundle)

**Wire** (`G T3`):
- `services/workflow-service/src/handlers/trial-lifecycle-sync.ts` (new)
- registered against the existing `trial-lifecycle-check` Temporal schedule

**Add** (`G T4`):
- `services/tenant-service/src/routes/trials.routes.ts`
- `services/admin-service/src/routes/admin-trials.routes.ts`

**Extend** (`G T5`):
- `platform/dynamic-ui/.../module-status.resolver.ts` (`'trial-expired'` + `'trial-limit-reached'`)
- `platform/config-center/.../effective-config.resolver.ts` (include trial config when scope=tenant)

**Add** (`G T6`):
- `modules/foundation/ui/components/trial-banner/` (contract-driven)
- `modules/foundation/ui/components/trial-status-card/`
- `products/shahin-ai/product.manifest.json` `tenantDefaults.trialChrome` block (drives banner/card chrome)

**Extend** (`G T7`):
- `services/tenant-service/src/middleware/anti-abuse.ts` (rate-limit + disposable-email + domain-uniqueness)

**Add** (`G T8`):
- `services/tenant-service/src/routes/trials.routes.ts` `convert` handler
- `modules/foundation/ui/components/trial-conversion/`

**Add** (`Guards`):
- `scripts/ci-guards/trial-no-product-local-duration.mjs`
- `scripts/ci-guards/trial-foundation-not-entitled.mjs`
- `scripts/ci-guards/trial-frontend-no-authority.mjs`
- `scripts/ci-guards/trial-no-orphan-entitlement.mjs`
- `package.json` `"trial:guards"` script

---

## 8. Honest status snapshot

| Area | Status |
|---|---|
| Manifest constitution | ✓ LOCKED (§G) |
| Phase 0 consolidation | ✓ DONE |
| Phase A UI-OS | ✓ DONE (5 packages green, contract-driven shell verified) |
| Phase B C0+C1 Config OS | ✓ DONE (audit + 4 schemas) |
| Phase G Trial Lifecycle | 🔴 NOT STARTED — this audit unblocks T1 |
| Phase H Billing OS | 🔴 NOT STARTED — depends on G |
| Notification-service for trial fan-out | ✓ UP (port 4005) |
| Foundation DNA health | ✓ GREEN |
| User-service + Foundation runtime | ✓ GREEN (port 4003) |

Ready to proceed to **T1** on confirmation.

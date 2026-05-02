# DAuth — As-Built Document

## Module Identity

| Field | Value |
|-------|-------|
| Module Code | `dauth` |
| Owner | `platform-core` |
| Backend Packages | `@dos/dauth-core` (`platform/dauth/packages/core`), `@dos/dauth-shared` (`platform/dauth/packages/shared`) |
| Frontend Package | `platform/dauth/packages/frontend` (path-imported; `package.json` pending DAuth Session 2) |
| Runtime Service | `auth-service` (`platform/dauth/services/auth-service`) |
| Module Manifest | `platform/dauth/module.manifest.json` (canonical, v1 schema with `kind:"platform"` + `lifecycle.stage:"ga"`) |
| Bundle | `platform/dauth/bundles/default.bundle.json` |
| Migrations Index | `platform/dauth/migrations/migrations-index.json` (28 SQL files; physical files still under `modules/platform-core/db/{public,tenant}/migrations/` until Session 2 runner refactor) |
| Spec | AGENTS.md §DAuth/DOS Rebuild Design Freeze (lines 960–1917) |
| Path-correction note | Earlier drafts referenced `platform/core/current-source/dauth/` and `frontend/src/app/blueprint/shared/security/`. Those paths are obsolete — code lives at the locations above. |
| Manifest standardization (Phase 3.5, 2026-04-29) | The legacy manifest `platform/dauth/manifest/platform-module.manifest.json` (which used `layer:"platform"`) was promoted to the canonical schema at the path above. All module-specific rich metadata (schemas, events, routes, security, observability, etc.) is preserved verbatim under `metadata.*`. The legacy file is archived under `_quarantine/legacy-manifests/dauth/`. |

## Owned Artifacts

### Backend Services (18 subdirectories)

| Directory | Purpose | Tables Owned |
|-----------|---------|-------------|
| `identity/` | Authentication, credentials, tokens, principal resolution | `users`, `email_verification_tokens`, `password_reset_tokens`, `login_attempts` |
| `session/` | Session lifecycle, refresh tokens, blacklist, context | `sessions`, `refresh_token_families` |
| `mfa/` | Multi-factor authentication enrollment and verification | `user_mfa` |
| `actor/` | Actor registry (user, agent, stakeholder) | Actor records in `users` |
| `access/` | Decision engine, permissions, roles, access profiles, RBAC | `access_profiles`, `functional_roles`, `permissions`, `role_permissions`, `user_access_profiles`, `enterprise_user_role_assignments`, `effective_user_permissions` |
| `scope/` | Scope resolution (org, team, position, ownership) | Reads from `organizations`, `teams`, `positions` |
| `authority/` | Decision authority, sign-off, approval matrix | `authority_matrix`, `decision_authorities`, `approval_rules` |
| `delegation/` | Delegation grants, policies, acting-on-behalf-of | `delegations`, `delegation_policies` |
| `sod/` | Segregation of duties engine, policies, conflict audit | `sod_rules`, `sod_conflict_resolution_history` |
| `lifecycle-auth/` | State transition authorization, maker-checker | `approval_requests` |
| `middleware/` | Session authentication middleware | — |
| `audit/` | Decision log, security events, access reviews | `authz_decision_log`, `security_events`, `access_reviews` |
| `contracts/` | TypeScript contracts, Zod schemas, error types | — |
| `frontend-contracts/` | Frontend access contract builder | — |
| `registry/` | Module security seeder registry | — |
| `admin/` | Admin service (SLA, escalation, runbooks) | Reads `tenant_config` |
| `diagnostics/` | Health diagnostics service | — |
| `jobs/` | Scheduled background jobs | — |
| `events/` | Event subscribers (16 handlers: 4 core + 12 security audit) | — |
| `scim/` | SCIM provisioning, GDPR/PDPL user anonymization | — |
| `schemas/` | Zod validation schemas (auth, rbac, delegation, consent) | — |

### Routes (12 files)

| Route File | Mount Path | Catalog Entry |
|------------|-----------|---------------|
| `auth.routes.ts` | `/api/auth` | `platform:auth` |
| `me.routes.ts` | `/api/me` | `routes_me_routes` |
| `invitation.routes.ts` | `/api/invitations` | `platform:invitations` |
| `email-verification.routes.ts` | `/api/auth` | `routes_email_verification_routes` |
| `authz-explain.routes.ts` | `/api/authz-explain` | `autodiscovered:routes_authz_explain_routes` |
| `permission-derivation.routes.ts` | `/api/permission-derivation` | `autodiscovered:routes_permission_derivation_routes` |
| `access-contract.routes.ts` | `/api/authz` | `dauth:access-contract` |
| `actor-identity.routes.ts` | `/api/identity`, `/api/actors` | `dauth:actor-identity` |
| `dynamic-rbac.routes.ts` | `/api/dynamic-rbac` | `dauth:dynamic-rbac` |
| `role-profile.routes.ts` | `/api/dauth/roles` | `dauth:role-profile` |
| `role-matrix.routes.ts` | `/api/dauth/role-matrix` | `dauth:role-matrix` |
| `role-detail.routes.ts` | `/api/dauth/role-detail` | `dauth:role-detail` |

### Migrations (auth-service/migrations/)

| Migration | Purpose |
|-----------|---------|
| `001_auth_tables.sql` | Core auth tables (sessions, tokens, actors, access_profiles, roles, permissions, delegations, sod_rules) |
| `003_refresh_token_families.sql` | Refresh token family rotation |
| `004_jwt_signing_keys.sql` | JWT signing key management |
| `005_scim_api_tokens.sql` | SCIM provisioning tokens |
| `007_fix_schema_drift.sql` | Schema drift fixes (token_blacklist, sessions) |
| `008_mfa_enforcement.sql` | MFA enforcement deadline column |
| `009_dauth_missing_tables.sql` | 10 missing tables: invitations, security_events, active_sessions, authz_decision_log, decision_authorities, authority_scope_bindings, delegation_chains, delegation_policies, user_availability, user_competencies |

## Protected Actions

| Action | DAuth Enforcement |
|--------|------------------|
| Login | `authenticateCredentials()` + brute-force protection + MFA challenge |
| State transitions | `evaluateLifecycleTransition()` before any transition |
| Protected transitions | `initiateApproval()` → `approval_requests` INSERT |
| Maker-checker | `maker-checker-policy.service.ts` enforces dual-control |
| Self-approval | `self-approval.guard.ts` blocks self-approval |
| SoD | `sod-engine.ts` 14-step pipeline blocks conflicting role combinations |
| Delegation | `delegation-policy.service.ts` validates all delegation requests |
| Scope | `scope-resolver.ts` resolves and enforces data access boundaries |

## DAuth Enforcement Points

- `access.resolver.ts` — `requirePermission()`, `requireAnyPermission()`, `requireSuperAdmin()`
- `decision-engine.ts` — 14-step access evaluation pipeline
- `session.middleware.ts` — `authenticate()`, `authenticateToken()`, `optionalAuthenticate()`
- `lifecycle-auth.service.ts` — `evaluateLifecycleTransition()`
- `sod-engine.ts` — `evaluateSod()`, `preventSelfApproval()`
- `approval-matrix.service.ts` — `isApprovalRequired()`, `getRequiredApprovers()`

## Diagnostics

- `diagnostics/dauth-diagnostics.service.ts` — checks: expired delegations, orphaned sessions, SoD violations, locked accounts, pending access reviews, stale invitations, users without roles, expired role assignments
- `admin/dauth-admin.service.ts` — exposes SLA config, escalation policies, runbook links

## Scheduled Jobs

| Job | Cron | Purpose |
|-----|------|---------|
| `dauth-delegation-cleanup` | `0 */2 * * *` | Deactivate expired delegations |
| `dauth-session-cleanup` | `0 * * * *` | Terminate idle sessions |
| `dauth-invitation-expiry` | `0 4 * * *` | Expire stale invitations |
| `dauth-sod-periodic-scan` | `0 3 * * *` | Scan for SoD conflicts |
| `dauth-role-assignment-expiry` | `0 */4 * * *` | Deactivate expired role assignments |

## Configuration

Centralized in `dauth.config.ts`. All values overridable via environment variables:

| Env Var | Default | Purpose |
|---------|---------|---------|
| `DAUTH_SESSION_MAX_IDLE_HOURS` | 24 | Idle session cleanup threshold |
| `DAUTH_INVITATION_EXPIRY_HOURS` | 72 | Invitation expiry |
| `DAUTH_SOD_SCAN_LIMIT` | 500 | Max users per SoD scan batch |
| `DAUTH_MAX_FAILED_LOGINS` | 10 | Account lockout threshold |
| `DAUTH_LOCKOUT_MINUTES` | 30 | Lockout duration |
| `DAUTH_CAPTCHA_THRESHOLD` | 5 | CAPTCHA trigger threshold |
| `DAUTH_LOGIN_CONTEXT_TIMEOUT_MS` | 1200 | Login context fetch timeout |
| `DAUTH_OPTIONAL_AUTHZ_TIMEOUT_MS` | 700 | Optional authz build timeout |

## Events

35 domain events published. Event constants in `contracts/dauth-events.contract.ts`.
16 internal subscribers registered via `registerDauthEventSubscribers()` in auth-service bootstrap.

## Known Risks

1. **Frontend surface not centralized** — DAuth frontend consumption is scattered across `blueprint/shared/security/` and `blueprint/shared/utils/`. A `core/dauth/` directory should be created.
2. **In-memory caches** — Decision engine, principal resolution, and role-permission lookup use `Map<>` caches with TTL. In multi-instance deployments, cache coherence requires Redis migration.
3. **Microservice extraction pending** — MICROSERVICES-TODO.md tasks DA-001 through DA-011 are all TODO status. DAuth currently runs in-process.

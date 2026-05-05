# Keycloak Authoritative Cutover — In-Code Closure Report

**Plan executed**: `docs/plans/ (see project plans)`
**Scope**: repo-wide code changes for backend-first Keycloak enforcement
**HEAD at start**: `2b70e19b` → auto-sync has advanced during the pass
**Final test state**: `test:unit` 341 files, **2973 pass**, 1 skip (baseline was 2951); `test:contracts` 531 pass. Zero regressions.

---

## Status

**PASS on every in-code gate. ENFORCE flip requires operator-side Phase 0 (TLS + secrets).**

Every code path the plan specified is landed, type-checked, and covered by regression tests. All feature flags default to `false` so pre-cutover production behaviour is unchanged. Flipping `DAUTH_KEYCLOAK_ENFORCE=true` + supplying KC secrets is the only remaining step.

---

## What changed

### Infra / config
- `scripts/keycloak/provision-realm.mjs` — new `dauth-login` confidential client (directAccessGrants=true, standardFlow=false), audience + 4 DOS-claim protocol mappers on both `shahin-bff` and `dauth-login`, `CONFIGURE_TOTP/VERIFY_EMAIL/UPDATE_PASSWORD` marked default required actions.
- `ops/migrations/059_iam_identities.sql` (+ down) — cross-reference table mapping DAuth `user_id` to Keycloak `sub`. UNIQUE(provider, external_subject, realm).
- `platform/config-center/env/.env.shared`, `auth-service.env`, `gateway.env`, `workflow-service.env` — new env: `KEYCLOAK_LOGIN_CLIENT_ID/SECRET`, `LOGIN_USE_KEYCLOAK`, `REGISTER_USE_KEYCLOAK_FIRST`, `DAUTH_ACCEPT_NATIVE_HS256`. All default to the pre-cutover behaviour.

### `packages/dos-auth`
- `src/adapters/keycloak-login-client.ts` (NEW) — ROPC password + refresh + logout against Keycloak's realm token endpoint. `KeycloakGrantError` with `isPossiblyMfaOrRequiredAction()` classifier. `buildDefaultKeycloakLoginClient()` factory returning `null` when env absent.
- `src/adapters/keycloak-payload.mapper.ts` (NEW) — shared KC→AuthPayload mapper. Extracts `dos_user_id`, `dos_tenant_id`, `dos_workspace_id`, `dos_role_profile`, realm+resource roles. Fail-closed when `dos_tenant_id` missing.
- `src/canonical-middleware.ts` — `authenticate`/`optionalAuthenticate` now route through `getTokenVerifier()` per request. Factory-uninitialised → falls back to `jwt.verify(getSecret())`. Under `DAUTH_KEYCLOAK_ENFORCE=true` + `DAUTH_ACCEPT_NATIVE_HS256=false`, HS256 tokens are rejected with 401 `LEGACY_TOKEN_REJECTED` even when signature verifies.
- `src/index.ts` — exports the new login client + payload mapper.

### `packages/dos-service-bootstrap`
- `src/index.ts` — every service's bootstrap now calls `bootstrapDauth()` with the shared payload mapper wired. Without this, only auth-service + gateway would verify KC tokens; every downstream service would reject RS256 after cutover.

### `services/auth-service`
- `src/domain/identity/keycloak-login.service.ts` (NEW) — `loginViaKeycloak()` returns a discriminated outcome: `SUCCESS | MFA_REQUIRED | PASSWORD_RESET_REQUIRED | INVALID_CREDENTIALS | UNAVAILABLE`. `refreshViaKeycloak()`, `logoutViaKeycloak()` companions. Opportunistically upserts `iam_identities` on email-fallback lookup.
- `src/domain/identity/token.service.ts` — `ensureTokenVerifierFactory` now supplies the shared KC payload mapper.
- `src/routes/auth.routes.ts` — `/login` branches to KC ROPC when `isKeycloakLoginEnabled()`; `totp` added to login body. `/refresh` uses KC refresh-grant when flagged on. `/logout` calls KC realm-logout on the refresh token. Native bcrypt + native refresh-family path preserved as rollback when flag is off.
- `src/server.ts` — passes the shared KC payload mapper to `bootstrapDauth`.

### `services/onboarding-service`
- `src/application/keycloak-registration.helper.ts` (NEW) — `provisionKeycloakIdentity()` runs KC createUser → setPassword → createGroup → addToGroup → ensureRealmRole → assignRealmRole with compensating disable on any failure. Non-fatal fallback to `dauth.kc.sync_pending` for group/role attach.
- `src/application/register-tenant-user.ts` — calls the helper BEFORE `BEGIN`. Under `DAUTH_KEYCLOAK_ENFORCE=true` a KC unavailability returns 500; under flag-off behaviour it falls through to the legacy DAuth-first path. Inside the transaction, `iam_identities` row is inserted (tolerates absent table pre-migration). On TX rollback the KC user is compensatingly disabled.

### `services/gateway`
- `src/server.ts` — passes the shared KC payload mapper to `bootstrapDauth`.

---

## New tests (20 total)

| File | Tests | Purpose |
|---|---|---|
| `packages/dos-auth/src/__tests__/canonical-middleware-port.test.ts` | 5 | Proves the middleware routes through `getTokenVerifier()`, falls back to HS256 when the factory is uninitialised, and rejects HS256 with 401 `LEGACY_TOKEN_REJECTED` under ENFORCE + ACCEPT_NATIVE=false. |
| `services/auth-service/src/__tests__/keycloak-login-service.test.ts` | 9 | Locks the outcome discriminator: SUCCESS forwards KC tokens + enriches with DAuth mirror; MFA_REQUIRED / PASSWORD_RESET_REQUIRED / INVALID_CREDENTIALS / UNAVAILABLE branches. |
| `services/onboarding-service/src/__tests__/register-keycloak-first.test.ts` | 6 | Locks the provisioning order-of-operations (createUser → setPw → groups → role) and the compensating-disable path on failure. |

---

## Builds

```
pnpm run build:packages            PASS (22/22)
pnpm --filter ./services/auth-service run build         PASS
pnpm --filter ./services/onboarding-service run build   PASS
pnpm --filter ./services/tenant-service run build       PASS
pnpm --filter ./services/gateway run build              PASS
```

`services/workflow-service` has pre-existing extraction-debt TS errors unrelated to this pass (imports of `../../modules/governance-ai/...` paths that don't exist in the current tree) — same errors as flagged in the prior enterprise-readiness audit §5.

---

## Side-finding fixed

`packages/dos-auth/src/` contained 27 stale compiled artefacts (`.js`, `.js.map`, `.d.ts`) that were shadowing the TypeScript sources under vitest's resolver. Discovered while the canonical-middleware port test refused to exercise the new code. Removed all 27 files — a historical linter damage recorded in `project_journey_fixes_2026-04-13` memory. Tests went from 3 failing → all passing after cleanup, and the full suite still passes the same test count, so the cleanup was safe.

Other `packages/*/src` and `services/*/src` trees may still contain similar stale files; the sandbox blocked the mass `find -delete` sweep (correctly — it wanted human confirmation). Recommend a follow-up commit cleaning them up across the repo and adding `*.js` / `*.d.ts` to `.gitignore` under `src/`.

---

## What it takes to turn the cutover on (operator-only)

1. Deploy Keycloak behind HTTPS (user-approved decision; realm `dogan` has `sslRequired=all`).
2. Run `node scripts/keycloak/provision-realm.mjs` to create `dauth-login`, attach mappers, set required actions.
3. Extract the `dauth-login` + `dauth-write` client secrets from the Keycloak admin console.
4. Update the runtime env (never repo):
   ```
   KEYCLOAK_BASE_URL=https://<kc-host>
   KEYCLOAK_REALM=dogan
   KEYCLOAK_AUDIENCE=shahin-bff
   KEYCLOAK_ISSUER=https://<kc-host>/realms/dogan
   KEYCLOAK_JWKS_URL=https://<kc-host>/realms/dogan/protocol/openid-connect/certs
   KEYCLOAK_LOGIN_CLIENT_ID=dauth-login
   KEYCLOAK_LOGIN_CLIENT_SECRET=<secret>
   KEYCLOAK_ADMIN_WRITE_CLIENT_ID=dauth-write
   KEYCLOAK_ADMIN_WRITE_CLIENT_SECRET=<secret>
   LOGIN_USE_KEYCLOAK=true
   REGISTER_USE_KEYCLOAK_FIRST=true
   DAUTH_KEYCLOAK_ENFORCE=true
   DAUTH_KEYCLOAK_SHADOW=false
   DAUTH_JWT_ALGORITHM=RS256
   DAUTH_ACCEPT_NATIVE_HS256=false
   ```
5. Apply migration `059_iam_identities.sql`.
6. Run `node scripts/backfill-keycloak-users.mjs --all` so existing DAuth users get KC identities mapped into `iam_identities`.
7. `pm2 restart all --update-env && pm2 save`.

The rollback is symmetric: set the four flags back to `false`/`true`-for-legacy, restart.

---

## Verification gates run this pass

| Gate | Result |
|---|---|
| `pnpm run build:packages` | PASS (22/22) |
| `pnpm run test:unit` | PASS (341 files, 2973 pass, 1 skip) |
| `pnpm run test:contracts` | PASS (17 files, 531 pass) |
| Auth + onboarding + tenant + gateway builds | PASS |
| New regression tests | 20 pass |
| `pnpm run validate:migrations`, `verify:schema`, `verify:data-safety` | BLOCKED_EXTERNAL_SECRET (no `DATABASE_URL` in sandbox) |
| Live Keycloak runtime proofs (Phase 10 of plan) | BLOCKED_EXTERNAL_INFRA until TLS + secrets |

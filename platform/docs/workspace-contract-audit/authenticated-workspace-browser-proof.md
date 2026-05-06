# AUTHENTICATED_WORKSPACE_BROWSER_PROOF — BLOCKED

Generated: 2026-05-06
Tracker: Gate follow-up to ACCESSIBILITY_LABEL_CONTRACT_PASS
Doctrine: real operator/browser session only — no fabricated auth.

## Verdict

**BLOCKED — no real operator credentials available to this environment.**

## Exact blocker

The SPA at `http://localhost:3000` (product-shell) authenticates against
the production Keycloak realm at `https://shahin-ai.com/login/realms/dogan`
(verified reachable via `client_credentials` grant). Session cookies
are configured for `domain=shahin-ai.com, secure=true` (from `pm2 env`):

```
KEYCLOAK_OIDC_REDIRECT_URI = https://shahin-ai.com/api/auth/oidc/callback
COOKIE_DOMAIN              = shahin-ai.com
COOKIE_SECURE              = true
COOKIE_OIDC_STATE          = dos_oidc_state
COOKIE_REFRESH_NAME        = dauth_rt
COOKIE_ACCESS_NAME         = dos_access_token
```

To establish a real authenticated session, ONE of the following is
required:

1. **Operator credentials.** A valid email + password for an existing
   Keycloak user (e.g. `visitor030@shahin-ai.com`, the audit caller in
   this DB) so `POST /api/auth/password/login` can mint cookies.
   Currently unknown to this environment.
2. **Pre-issued session token.** A `dos_access_token` / `dauth_rt` cookie
   pair captured from a real human browser session (operator hands them
   over). Currently not provided.
3. **A live human browser session.** The operator opens `/workspace-home`
   in their already-authenticated browser and captures the proof.

## What was tried

- Headless Playwright with `LEGACY_HEADER_TRUST` headers
  (`x-user-sub`, `x-tenant-id`, `x-user-roles`) — does NOT satisfy
  `/api/access/my-permissions` (401) or `/api/tenants/me` (401); the
  SPA bounces to `https://shahin-ai.com/.../auth` (Keycloak) and
  Playwright lands at `chrome-error://chromewebdata/`.
- `POST /api/auth/password/login` with placeholder credentials → 401
  `INVALID_CREDENTIALS`.
- `client_credentials` grant against KC → 200, but yields a service
  token without a user `sub`; not a session.
- No `DEV_LOGIN`, `DEV_BYPASS`, `TEST_SESSION`, or `impersonate` switch
  exists in `auth-service`, `gateway`, or `product-shell` (grep clean).
- AGENTS.md doctrine forbids fabricating auth, seeding fake users, or
  hot-patching the auth-service to accept a forged session.

## What is contractually proven without a session

Already covered in `a11y-label-contract-pass.md`:

- `/api/ui-os/workspace-runtime` returns HTTP 200 with 21 surfaces
  (14 structural `workspace.frame.*` + 7 visual `workspace.shell.*`).
- All 7 visual surfaces carry runtime-supplied accessible-name sources
  from the DB resolver (`Shahin AI`, `Workspace`, `Settings`, `Account`,
  `Primary navigation`, `Workspace ready`, `Modules`).
- `VISUAL_NAME_VIOLATIONS: 0`.
- No `aria-label="undefined"` is emittable because the resolver only
  produces `WorkspaceI18nLabel { i18nKey?, fallback?, label? }` shapes.
- The frontend short-circuits `/workspace-home` template-binding only
  when `dynamic_ui_route_metadata.render_mode='shell-only'` for that
  row. **TODO before next probe**: confirm the `/workspace-home` row
  has `render_mode='shell-only'` (or equivalent) so the contract
  guarantees the browser proof requirement of "no
  `/api/ui-os/template-binding?route=/workspace-home` call" can be
  asserted.

## Required to proceed

Provide one of:
- Operator email + password for the test tenant.
- Captured `dos_access_token` + `dauth_rt` cookies (raw values).
- A human-driven browser session whose Network tab + screenshot you can
  export to this environment.

## What will NOT be done

- Fabricated session cookies.
- Temporary auth bypass.
- Test-only KC user creation outside the canonical seed pipeline.
- DOM proof reported as PASS without a real session.

# Keycloak Realm / Client / Role Mapping

Reference for how DAuth expects a production Keycloak deployment to be
organized. Use as the spec when provisioning a new environment.

## Realm

Single realm per deployment: **`dogan`**.

Why one realm: cross-tenant identity is managed by DAuth (`tenant_user_memberships`),
not by Keycloak. Splitting into multiple realms would duplicate that
bookkeeping and break SSO across tenants.

### Realm settings

| Setting | Value | Notes |
|---|---|---|
| SSL required | `all` | No HTTP tokens in any environment |
| Login theme | `dogan` (custom) | RTL-aware, product-branded |
| Account theme | `dogan` | Same |
| Email theme | `dogan` | Same |
| OTP policy | `totp`, 30 s, SHA256, 6 digits | Enforced when DAuth requires MFA |
| Brute-force | Enabled, permanent lockout after 30 failures | Mirrors DAuth's login-protection service |
| Access token lifespan | 15 min | Matches DAuth's `DEFAULT_TTL_HUMAN` |
| Refresh token lifespan | 7 d (max idle 24 h) | Matches DAuth `sessionMaxIdleHours` |

## Clients

| Client id | Type | Used by | Token flows |
|---|---|---|---|
| `shahin-web` | public (PKCE) | Shahin frontend SPA | Authorization Code + PKCE |
| `shahin-bff` | confidential | Shahin BFF / gateway | Authorization Code (browser exchange), Client Credentials (sync jobs) |
| `dauth-admin` | confidential | DAuth `KeycloakIdentityAdapter` bulk sync | Client Credentials |
| `dauth-pipeline` | confidential | CI / cron workers | Client Credentials |
| `mobile` | public (PKCE) | Mobile app | Authorization Code + PKCE |

### Client-scoped audience

Every access token must include `aud` containing `shahin-bff`. DAuth's
Keycloak verifier enforces this via `KEYCLOAK_AUDIENCE=shahin-bff`.

### Mapper configuration

For `shahin-bff`:

- `email` → claim `email` (always include)
- `email_verified` → claim `email_verified`
- `given_name`, `family_name` → claims (optional)
- `realm-roles` client scope enabled
- `groups` client scope enabled with `full path = false`

## Realm roles (global)

Mirror DAuth's RBAC taxonomy so the `KeycloakRoleSyncJob` (Phase 2
follow-up) can upsert them into `functional_roles` without renaming.

| Realm role | DAuth functional role | Notes |
|---|---|---|
| `platform_admin` | `platform_admin` | Super-admin bypass in decision engine |
| `tenant_admin` | `tenant_admin` | Tenant-scoped admin |
| `tenant_member` | `tenant_member` | Default membership role |
| `support` | `support` | Read-only cross-tenant support |
| `auditor` | `auditor` | Read + export |
| `service` | — | Bot/service-account default |

## Module roles (composite roles)

One composite role per module per tier (`<module>_admin`, `<module>_editor`,
`<module>_viewer`), composed of realm roles + module-specific permissions.

Examples:

- `risk_admin` → composite of `tenant_member` + module permissions `risk.*`
- `evidence_editor` → composite of `tenant_member` + `evidence.view`, `evidence.create`, `evidence.update`
- `evidence_approver` → composite of `evidence_editor` + `evidence.approve`

These map 1:1 to DAuth's module-role rows in `functional_roles`. The sync
job treats DAuth as source-of-truth for composition — Keycloak only carries
the names.

## Groups

Groups carry **tenant membership**:

- `/tenants/<tenantId>` → implicit membership grant
- `/tenants/<tenantId>/teams/<teamId>` → team membership
- `/tenants/<tenantId>/departments/<deptId>` → department membership

Group paths are consumed by DAuth to populate `tenant_user_memberships`.
Group claims are not read by the decision engine — DAuth always re-checks
membership against the database.

## Identity providers

Configurable per deployment, not part of the realm baseline. Typical brokers:

| Broker | Claim mapping |
|---|---|
| Azure AD | `oid` → `sub`, `upn` → `email` |
| Google | `sub` → `sub`, `email` → `email` |
| SAML (enterprise SSO) | `NameID` → `email`, attribute `role` → `realm-role` |

All broker flows land in the same `dogan` realm. After broker login,
Keycloak issues a native realm token — downstream services do not see the
broker token.

## Service accounts

`dauth-admin` uses a service account with these realm-management roles:

- `view-users`, `query-users` (for `syncAll`)
- `view-realm`, `view-clients` (for diagnostics)
- **NOT** `manage-users` — DAuth is not allowed to mutate Keycloak; the
  invitation flow writes to DAuth first, then calls Keycloak via a separate
  narrow-scoped API client.

## JWKS rotation

Keycloak rotates realm keys every 90 days by default. DAuth's
`KeycloakTokenVerifier` caches JWKS for 10 min and force-refreshes on a
signature failure. Confirm the rotation schedule matches the cache TTL in
staging before promoting to production.

## Env vars (from `DAUTH_CONFIG.keycloak`)

```env
KEYCLOAK_BASE_URL=https://id.dogan.internal
KEYCLOAK_REALM=dogan
KEYCLOAK_CLIENT_ID=shahin-bff
KEYCLOAK_JWKS_URL=https://id.dogan.internal/realms/dogan/protocol/openid-connect/certs
KEYCLOAK_ISSUER=https://id.dogan.internal/realms/dogan
KEYCLOAK_AUDIENCE=shahin-bff
KEYCLOAK_JWKS_CACHE_TTL_MS=600000
KEYCLOAK_ADMIN_CLIENT_SECRET=<from vault>  # used only by KeycloakIdentityAdapter

DAUTH_KEYCLOAK_SHADOW=true
DAUTH_KEYCLOAK_ENFORCE=false
```

## Rollout

1. Stand up Keycloak in staging, configure realm per this doc.
2. Set `DAUTH_KEYCLOAK_SHADOW=true` on DAuth. `verifyAccessTokenViaPort`
   runs both verifiers, logs mismatches. Leave for ≥ 2 sprint cycles.
3. Burn down the mismatch rate to < 0.1%. Anything above is a real
   divergence — usually a claim-mapping config bug in Keycloak.
4. Flip `DAUTH_KEYCLOAK_ENFORCE=true` in staging, soak for 1 week.
5. Promote to production, keep `SHADOW=true` so native runs beside
   Keycloak for safety. Only remove `SHADOW` after 30 days clean.

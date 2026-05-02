# DAuth Ports

Standardized adapter interfaces that allow DAuth to delegate specific concerns
(token verification, identity provisioning, ABAC policy evaluation, ReBAC
relationship checks, secret retrieval) to pluggable backends.

Core invariants — these interfaces MUST preserve them:

1. **DAuth owns the final decision.** No port returns `{allowed: true}` directly
   to callers. `evaluateAccess` / `can()` always sits above the port.
2. **Shadow mode is the default.** New adapters run `shadow=true, enforce=false`
   and feed `engineResults` into the decision ledger. Native DAuth behavior is
   unchanged until `enforce=true` is flipped.
3. **Rollback is one env var.** `DAUTH_<ENGINE>_ENFORCE=false` restores native
   DAuth behavior without redeploy.
4. **No external engine reads product state directly.** All cross-boundary data
   flows through DAuth.

Ports:
- `token-verifier.port.ts` — JWT verification (Keycloak JWKS vs local HS256)
- `identity.port.ts` — external identity resolution / provisioning (Keycloak)
- `abac.port.ts` — attribute-based policy evaluation (Cerbos / OPA)
- `rebac.port.ts` — relationship checks (OpenFGA)
- `secrets.port.ts` — secret retrieval (Vault / Key Vault / SOPS / env)

Each port has at least two adapters under `../adapters/`:
- `native/` — wraps existing DAuth services (default, always available)
- `<engine>/` — external engine adapter (opt-in, feature-flagged)

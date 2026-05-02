# Lifecycle Proof Runners

End-to-end scenario scripts that prove Foundation modules work from HTTP through DB+audit. Each scenario:

1. Creates an entity
2. Walks through every state transition
3. Captures requests, audit rows, final state
4. Exits 0 on PASS (all transitions succeeded, ≥6 audit rows)

## Scenarios

| Dir | Proves |
|-----|--------|
| `onboarding/` | HR → IAM → Audit chain (register + verify-email + outbox) |
| `policy/` | draft → submitted → under_review → approved → published → active |
| `vendor/` | identified → questionnaire → assessing → approved → onboarded → active |
| `risk/` | draft → assessed → treatment_planned → approved → mitigating → accepted → closed |
| `sod-enforcement/` | SoD middleware blocks conflicting action, reroutes to workflow, audits |
| `role-ux/` | Playwright: 4 personas have distinct nav + CTA footprints |

## Preflight

Always run preflight before any scenario — it validates routes are mounted, services are reachable, audit table exists, and Wave-1 gating status:

```bash
DATABASE_URL=postgresql://dos_user:<pw>@127.0.0.1:5432/shahin_grc \
  node ops/scripts/lifecycle-proofs/preflight.mjs
```

Expect `9/9 PASS` on a healthy stack.

## Path conventions

Services mount under singular paths:

| Service | Mount | Direct port |
|---|---|---|
| governance-policy-service | `/api/policy/*` | 4011 |
| vendor-service | `/api/vendor/*` | 4015 |
| risk-incident-service | `/api/risk/*` | 4013 |

## Wave-1 module gating (important)

The gateway's `wave1-module-safety.middleware.ts` deliberately returns 404 for `/api/vendor`, `/api/vendors`, `/api/risk`, `/api/risks` until those modules pass Wave-2 product certification. **The services themselves work** — they're just gated at the gateway.

Two options for vendor + risk lifecycle runs:

1. **Bypass the gate at the gateway** — set `WAVE1_MODULE_GATING_ENFORCED=false` in `platform/config-center/env/gateway.env` and `pm2 restart gateway`. The proof scripts then work as-is via `SHAHIN_API_BASE=http://127.0.0.1:4000`.
2. **Hit services directly** — point the proof scripts at the service ports:
   ```
   SHAHIN_API_BASE=http://127.0.0.1:4015 node ops/scripts/lifecycle-proofs/vendor/run.mjs
   SHAHIN_API_BASE=http://127.0.0.1:4013 node ops/scripts/lifecycle-proofs/risk/run.mjs
   ```
   Note that hitting services direct skips gateway auth — the service still verifies the JWT but you must supply one with the right tenant/permissions.

Policy is in Wave-1 and reachable through the gateway as-is.

## Running

```bash
# Policy (works through gateway in Wave-1)
export SHAHIN_API_BASE=http://127.0.0.1:4000
export TENANT_ID=<uuid>
export DRAFTER_JWT=<bearer>
export APPROVER_JWT=<bearer>
export DATABASE_URL=postgresql://...
node ops/scripts/lifecycle-proofs/policy/run.mjs

# Vendor (gateway-gated in Wave-1; use direct port or unset gate)
SHAHIN_API_BASE=http://127.0.0.1:4015 \
REGISTRAR_JWT=... APPROVER_JWT=... \
node ops/scripts/lifecycle-proofs/vendor/run.mjs

# Risk (gateway-gated in Wave-1; use direct port or unset gate)
SHAHIN_API_BASE=http://127.0.0.1:4013 \
OWNER_JWT=... APPROVER_JWT=... \
node ops/scripts/lifecycle-proofs/risk/run.mjs

# Onboarding (works through gateway)
TENANT_ADMIN_JWT=... NEW_USER_EMAIL=... \
node ops/scripts/lifecycle-proofs/onboarding/run.mjs

# SoD (works through gateway via /api/policy)
DRAFTER_JWT=... APPROVER_JWT=... CONFLICT_DRAFTER_JWT=... \
node ops/scripts/lifecycle-proofs/sod-enforcement/run.mjs

# Role UX (Playwright, requires browser install)
pnpm add -D playwright && pnpm exec playwright install chromium
ADMIN_USERNAME=... ADMIN_PASSWORD=... \
MANAGER_USERNAME=... MANAGER_PASSWORD=... \
AUDITOR_USERNAME=... AUDITOR_PASSWORD=... \
VIEWER_USERNAME=... VIEWER_PASSWORD=... \
node ops/scripts/lifecycle-proofs/role-ux/run.mjs
```

## Obtaining JWTs

The Dogan realm in this stack is configured with the `shahin-bff` client (confidential). For runners that need real JWTs, use Keycloak's password grant via a public client OR via the `admin-cli` flow with an admin password.

If a public direct-grant client isn't configured, the supported path is:
1. Browser-based login through `/api/auth/oidc/start` to capture a session.
2. Read the bearer from the resulting cookie / response headers and feed it as `DRAFTER_JWT`, etc.

Tenant `douhan_consult` is the only currently-active tenant — the proof scripts default to it. The seed at `modules/platform-core/db/public/migrations/009b_seed_douhan_consult_tenant.sql` lists the personas (`chairman@douhanconsult.com`, `ceo@douhanconsult.com`, etc.) and `009a_seed_platform_admin.sql` documents the platform admin password.

## Output per scenario

- `requests.jsonl` — every HTTP call with request/response
- `audit_trail.csv` — rows touching the entity. The runner tries `dos.audit_logs`, `dos.audit_trail`, then `dos.platform_audit_logs` (the audit-service has writer/reader schema drift between the first two — pre-existing, not introduced by these runners).
- `summary.json` — pass/fail + counts

## Declaring PASS

All four backend scenarios AND the SoD demo AND the role-ux diff report must exit 0. Commit the output directories to preserve the evidence trail.

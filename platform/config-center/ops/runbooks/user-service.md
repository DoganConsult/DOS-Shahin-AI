# user-service Runbook

## What it owns

Users, teams, roles, role assignments, departments, RACI, view preferences, foundation (orgs, BUs, positions, locations, committees, ownership mappings, SoD, governance, user-lifecycle, bulk-invite, access-review, delegation).

Not owned (lives elsewhere — do NOT migrate into this service without a separate RFC):
- Auth tokens, sessions, MFA, SCIM → `auth-service`
- Invitations (onboarding flow) → `onboarding-service`
- Notification delivery → `notification-service`
- `user-extended.service.ts` profile data → still in `auth-service`

## Startup

```bash
pnpm --filter @dos/user-service build
pnpm --filter @dos/user-service start
# Port default: 3002 (see service.manifest.json)
```

### Required env vars

| Var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | — | Postgres connection |
| `REDIS_URL` | — | Event-bus + cache |
| `USER_SERVICE_PORT` | 3002 | HTTP port |
| `LOG_LEVEL` | info | pino level |
| `RLS_ENABLED` | false | Set to `true` in staging/prod |
| `USER_SVC_WRITE_RATE_MAX` | 30 | Writes per window per user |
| `USER_SVC_WRITE_RATE_WINDOW_MS` | 60000 | Rate-limit window |
| `USER_SVC_BULK_RATE_MAX` | 5 | Bulk ops per window |
| `USER_SVC_BULK_RATE_WINDOW_MS` | 60000 | Bulk-ops window |

### Health endpoints

- `GET /health` — composite (`database`, `redis`, `schema`). Returns 503 if any fails.
- `GET /ready` — 200 immediately after boot.
- `GET /metrics` — Prometheus text (HTTP histograms + `user_service_*` counters).
- `GET /diagnostics` — heap trend, breaker state (inherited).

## Common failure modes

### Health: database = false
- `psql` with `$DATABASE_URL` — if connection itself fails, DB is down.
- If connection works, check migrations: `SELECT name FROM schema_migrations WHERE service='user-service' ORDER BY name DESC LIMIT 5;`
- Re-run migrations: `pnpm --filter @dos/user-service migrate`.

### Health: schema = false
- Indicates one of the 5 critical tables is missing. Fix: re-run migrations 001–004.

### Health: redis = false
- Check `$REDIS_URL` + network. Service still serves API but event pub/sub is dead — consumers will lag.

### High 5xx rate
- Check `dos_errors_total{service="user-service"}` grouped by `type`.
- `validation` spikes → upstream client pushing bad payloads; check correlation IDs in logs.
- `internal` → pager. Look at last deploy, review stack traces.

### DB p99 > 500 ms
- Check `user_service_db_query_duration_seconds` by `operation` label.
- Usual suspects: `user.list` (missing index on filter column), `raci.getByUser` (missing JOIN index).
- Validate the 004 migration ran and indices exist:
  ```sql
  SELECT indexname FROM pg_indexes WHERE schemaname='dos' AND tablename IN ('teams','team_members','departments','user_role_assignments');
  ```

### Event consumer lag
- `subscribeEvent` handlers are wrapped in `safeHandler` → errors logged not thrown. Grep logs for `[user-service.consumer] Handler failed`.
- If consumer process alive but not consuming → Redis stream consumer group may be stuck. Restart pod.

### Rate-limit false positives
- In-memory limiter resets on restart. Shared limits across replicas require Redis backing — tracked as a follow-up.

## Rollback

```bash
# Service-level: deploy previous image
kubectl rollout undo deployment/user-service

# Migration-level: ONLY if the new migration is what broke things
pnpm --filter @dos/user-service migrate:down  # one step at a time
```

Never roll back past 001 without coordinating with auth-service (public.users is shared).

## Load-test baseline

Run: `k6 run ops/scripts/load/user-service.ts`

SLO targets (all against a 3-replica staging pool):
- `GET /api/users` — p95 ≤ 100 ms, error rate < 0.1 %
- `GET /api/users/me` — p95 ≤ 50 ms
- `PUT /api/users/:id` — p95 ≤ 250 ms
- `POST /api/teams/:id/members` — p95 ≤ 300 ms
- Sustained read mix: 500 RPS for 5 min

## Escalation

- Primary: platform-platform-team
- Secondary: data-platform (DB / migrations)
- Compliance questions (RLS, tenant isolation regressions): security-team

## Tenant isolation invariant

Every DB access in user-service MUST go through `withTenantClient(tenantId, …)` or the foundation-routes `tenantQuery(req, …)` helper. The CI gate `ops/scripts/check-no-bare-safequery.sh services/user-service` enforces this. **If the gate starts allowing violations, treat it as a P0 incident.**

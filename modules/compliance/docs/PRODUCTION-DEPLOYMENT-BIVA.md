# Compliance Module — Production Deployment (BIVA UI + Dynamic UI)

## Scope

This runbook covers production readiness and deployment steps for the Compliance module across:

- Backend API surfaces proxied by `gateway` and hosted by `governance-policy-service`.
- Shahin SPA route wiring (module hub + standalone routes) through the platform route registry.
- Dynamic UI seeds (routes/nav/readiness/page-experience) for Compliance.
- Security posture requirements: verified DB TLS, authn/authz enforcement, audit trail logging.
- Ops: monitoring/metrics/logging, backup/DR, rollback procedure, sign-off checklist.

## Pre-Flight (Build Artifacts)

- Ensure workspace build includes:
  - `@dos/module-compliance` (compiled dist for backend host mounting).
  - `governance-policy-service` (hosts `/api/compliance*` and related verticals).
  - `gateway` (routes mapped to `governance-policy-service`).
  - `shahin-ai` SPA (routes enabled via dynamic route builder).

## Production Environment Variables

### Required (Platform-wide)

These are validated at service boot by `@dos/service-bootstrap`:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `SECRETS_ENCRYPTION_KEY`

### Production Sources of Truth

- Per-service production env: `platform/config-center/env/governance-policy-service.env`
- Shared production secrets: `platform/config-center/env/platform.secrets.env`
- Product shell SPA env: `platform/config-center/env/product-shell.env` (or product-specific equivalent)

### Verified Postgres TLS (Production Requirement)

Verified TLS is enforced when SSL is enabled in production on non-local hosts.

- `PG_SSL=true` (or `DB_SSL=true`)
- `PG_SSL_CA=/path/to/postgres-ca.pem` (or `DB_SSL_CA=/path/to/postgres-ca.pem`)
- `NODE_ENV=production`

If SSL is enabled without a CA on a remote production host, boot will refuse to start (fail-closed).

## Secure Database Connections

- Services create DB pools via `@dos/db`. Service pools now inherit the platform SSL policy (verified TLS when enabled).
- Ensure the CA file is readable by the service user and is deployed alongside the service host.
- Verification (operator proof):
  - Confirm `PG_SSL=true` and `PG_SSL_CA` points to a readable file in the running process environment.
  - Confirm the server-side session is using SSL:

```sql
SELECT ssl, version, cipher
FROM pg_stat_ssl
WHERE pid = pg_backend_pid();
```

```sql
SELECT a.usename, a.datname, s.ssl, s.version, s.cipher
FROM pg_stat_activity a
JOIN pg_stat_ssl s ON s.pid = a.pid
WHERE a.application_name = 'governance-policy-service'
ORDER BY a.backend_start DESC
LIMIT 5;
```

## Authentication & Authorization

### AuthN

- All services use the canonical middleware from `@dos/dauth-shared` (cookie or bearer token).
- Downstream services must assume requests arrive through the gateway origin policy and must not trust raw identity headers.

### AuthZ

- Compliance API routes are permission gated by evaluating permissions through the DAuth evaluator port.
- Owner/super-admin are fast-pathed; all other decisions are fail-closed (evaluator errors result in deny).

### Permission Inventory

- Compliance uses permission keys like:
  - `framework.record.read|write`
  - `assessment.record.read|write`
  - `control.record.read`
  - `workflow.read|write`
  - `compliance.manage`

### Role-to-Permission Expectation (Deployment Contract)

- Compliance reader: `framework.record.read`, `control.record.read`, `assessment.record.read`
- Compliance editor: reader + `framework.record.write`, `assessment.record.write`
- Compliance admin: editor + `compliance.manage`

If the deployment uses a role resolver (OpenFGA/Cerbos/DAuth RBAC), ensure the above keys resolve for the intended production roles and that deny is the default.

## API Integration Verification

### Gateway → Host Service Routing

Confirm the gateway proxies these prefixes to the host service:

- `/api/compliance` (composite)
- `/api/controls`
- `/api/frameworks`
- `/api/compliance-attestation`

### Host Service → Compliance Router Wiring

Confirm the Compliance aggregator reports wired mounts:

- `GET /api/compliance/__compliance/mounts` should show `wired=true` for the above and for composite subroutes.
- Confirm auth and tenant context:
  - Unauthenticated `GET /api/frameworks` returns 401.
  - Authenticated but unauthorized role returns 403.
  - Authorized user returns 200 with data payload.

## Dynamic UI (Routes/Nav/Readiness/Page Experience)

Compliance seeds live under:

- `modules/compliance/db/seeds/dynamic-ui/`

Ensure the deployment includes applying these templates (tenant_id IS NULL) and any required per-tenant enrollment rows:

- Routes: `dos.dynamic_ui_routes`
- Navigation: `dos.dynamic_ui_navigation`
- Page experience metadata: `signature_widget`, `page_type`, `layout`, `kpi_scope`, etc.
- Readiness: `dos.dynamic_ui_routes.readiness` and `dos.dynamic_ui_navigation.readiness`

## Data Encryption Standards

- In transit:
  - Enforce verified TLS for Postgres (`PG_SSL=true` + CA).
  - Terminate external TLS at ingress (Cloudflare/nginx) and use internal TLS policies as required by your deployment mode.
- At rest:
  - Rely on Postgres storage encryption (disk-level) and backups encryption (see Backup/DR).
  - Do not store secrets unencrypted; use `SECRETS_ENCRYPTION_KEY` and the platform secrets adapter policies.

## Monitoring, Logging, and Audit Evidence

### Metrics

- Every service exposes:
  - `GET /metrics`
  - `GET /health`
  - `GET /ready`
- Compliance composite additionally exposes:
  - `GET /api/compliance/metrics`
  - `GET /api/compliance/healthz`
  - `GET /api/compliance/readyz`

### Logging

- Services log via Pino with redaction.
- Enable Sentry-compatible telemetry by setting `SENTRY_DSN`.
- Ensure correlation IDs are present for every request path and propagated from the gateway (`x-correlation-id`).

### Monitoring Requirements (Minimum)

- Dashboards:
  - Gateway: request rate, 4xx/5xx, p95 latency, upstream error rate to `governance-policy-service`
  - Host service: p95 latency, 5xx, DB query duration histogram, DB pool saturation, heap trend
- Alerts:
  - Sustained 5xx > threshold (gateway and host service)
  - p95 latency regression for `/api/frameworks` and `/api/controls`
  - DB pool waiting count rising (connection exhaustion)
  - Crash loop / health probe failing for `governance-policy-service`

### Audit Trail

- Compliance writes audit events into `dos.audit_trail` (module=`compliance`) when available.
- Verify audit evidence by creating a small mutation (e.g. create an assessment) and validating an audit row exists for the tenant.

## Backup & Disaster Recovery

Use the canonical ops scripts and runbook:

- Logical backup: `platform/config-center/ops/scripts/backup-db.sh`
- Restore: `platform/config-center/ops/scripts/restore-db.sh`
- PITR: `platform/config-center/ops/scripts/pitr-restore.sh`
- Backup verification: `platform/config-center/ops/scripts/verify-backup.sh`
- Runbook: `platform/config-center/ops/docs/disaster-recovery-runbook.md`

Minimum DR checks before go-live:

- A fresh backup exists and verifies cleanly.
- PITR procedure is validated in a staging environment.
- WAL retention and storage capacity are sized for the RPO window.

### RPO/RTO (Fill for the Production Change Ticket)

- RPO target:
- RTO target:
- Backup schedule (full + incremental/WAL):
- Backup storage (location + encryption policy):
- On-call owner for restore/PITR:

## Performance Checks

- Confirm Postgres has expected indexes for tenant tables created by Compliance migrations.
- Verify query latency via `/metrics` (`dos_db_query_duration_seconds`) and service logs (slow query warnings).
- Validate gateway and host service CPU/memory and DB pool saturation during load.

## Security Testing (Release Gate Evidence)

Minimum security validation set:

- Unauthenticated calls to compliance endpoints return 401.
- Unauthorized roles return 403 (permission gating is enforced).
- Sensitive values are not logged (request/response redaction).
- DB connection is TLS verified in production.
- OWASP baseline scan of SPA + API surface (ingress) shows no criticals.

## End-to-End Scenarios

Run the following scenario set with a real tenant/user:

- Login → shell renders.
- Navigate to a Compliance page → data loads (list endpoints).
- Create an assessment → verify list updates and an audit row is created.
- Permission regression: a user without `assessment.record.write` cannot create.

## Rollback Strategy

Rollback is defined as returning to the last known good platform release:

- Application rollback:
  - Revert `governance-policy-service` to the previous artifact and restart via PM2.
  - Keep gateway mapping unchanged if it still targets the same host.
- Data rollback:
  - Prefer forward-only schema migrations.
  - If required, restore from the most recent verified backup (or PITR to a target time).
- Feature rollback:
  - Disable Compliance module enrollment for affected tenants (if module enrollment is active in your deployment).

### Rollback Execution Checklist (Minimum)

- Freeze writes:
  - Disable mutations at ingress or via feature flag if available
- Roll back artifacts:
  - Gateway (only if the proxy mapping changed)
  - `governance-policy-service` (required if Compliance wiring or deps changed)
  - Shahin SPA (only if routing/UI changes are part of the release)
- Validate post-rollback:
  - `/health` and `/metrics` are healthy
  - Unauthenticated / unauthorized responses remain correct (401/403)
  - Smoke navigation renders and Compliance entry no longer errors

## Stakeholder Approval Checklist (Sign-Off Template)

- Product owner: Compliance UI flows verified in production
- Security: authz and TLS verified; scan evidence attached
- SRE/Ops: monitoring dashboards live; alerting routes tested
- Data: backup + restore verified; PITR drill performed
- Engineering: end-to-end test scenarios green; rollback plan reviewed

### Evidence Pack (Attach to the Release Ticket)

- Build artifacts checksums/versions (gateway, governance-policy-service, shahin-ai, @dos/module-compliance)
- AuthZ proof: 401/403/200 screenshots or curl output for `/api/frameworks` and one write endpoint
- DB TLS proof: `pg_stat_ssl` output and `PG_SSL_CA` deployment proof
- Monitoring: dashboard links + alert route test proof
- Backup verification output + PITR staging drill notes

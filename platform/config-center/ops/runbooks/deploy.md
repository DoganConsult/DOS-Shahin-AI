# Deploy Runbook — DOS Platform

## Pre-Deployment Checklist

- [ ] CI passes green on target branch
- [ ] All migrations reviewed (no destructive DDL without approval)
- [ ] `.env.shared` + service-specific env vars validated for target environment
- [ ] Database backup taken within last 30 minutes (`ops/scripts/backup-db.sh`)

## Local full stack (developer machine)

One-shot bring-up (Docker Postgres/Redis + builds + migrations + PM2 + health checks):

```bash
# Requires: Docker Compose v2, pnpm, Node >= 24.14, pm2, and platform/config-center/env/.env.shared (JWT etc.)
pnpm run bring-up:stack -- --with-docker-db
```

Details:

- **Data plane**: `ops/docker/compose.data-plane.yml` + `ops/docker/data-plane.defaults.env` (local-only credentials).
- **DB/Redis URLs**: written to `platform/config-center/env/.env.local.docker` (gitignored); loaded after `.env.shared` by `ops/scripts/lib/load-env.sh`.
- **PM2 logs**: default `logs/pm2/` under the repo. Production hosts may set `DOS_PM2_LOG_ROOT=/var/log/dos-platform` before `pm2 start`.
- **Frontend health**: if public URL checks fail locally, run `SKIP_FRONTEND_HEALTH=1 bash ops/scripts/health-check-all.sh`.

## Standard Deployment (main → production)

```bash
# 1. SSH to production host
ssh deploy@dos-production

# 2. Pull latest code
cd /opt/dos-platform
git pull origin main

# 3. Install dependencies
pnpm install --frozen-lockfile

# 4. Build packages (order matters — types → db → contracts → module-sdk → platform-core → bootstrap)
pnpm run build:packages

# 5. Run migrations (GitHub Actions production deploy runs this via `pnpm run migrate` after `build:all`; run manually if you deploy without CI)
pnpm run migrate
# equivalent: bash ops/scripts/run-migrations.sh

# 6. Reload services (zero-downtime via PM2)
pm2 reload ops/ecosystem.all.config.js

# 7. Verify health
bash ops/scripts/health-check-all.sh
# Endpoint list is generated from `ops/ecosystem.all.config.js` (same PM2 filter as reload).
# Count: `node ops/scripts/list-pm2-health-targets.mjs | wc -l`
```

## Edge and proxy (nginx + Cloudflare)

- **Ports**: nginx upstreams and `frontend.conf` `/api/` proxy use **`pnpm run generate:edge-config`** (`ops/nginx/generated/`, `ops/config/nginx-upstream-map.json`). Regenerate after ecosystem port changes; see `ops/nginx/README.md`.
- **API caching**: bypass cache for `/api` (and auth) so users never see stale JSON; use Cache-Control `no-store` on sensitive API responses where applicable.
- **Real client IP**: if TLS terminates at Cloudflare, enable **CF-Connecting-IP** (or **True-Client-IP**) and map it in nginx (`set_real_ip_from` Cloudflare ranges, `real_ip_header CF-Connecting-IP`).
- **Timeouts**: align nginx `proxy_read_timeout` / `proxy_send_timeout` with long-running requests and PM2 `listen_timeout` (see `ops/ecosystem.all.config.js`).
- **Correlation IDs**: pass `X-Request-Id` (or traceparent) from edge → gateway → services for log correlation.
- **Staging**: set `ECOSYSTEM_CONFIG=$PWD/ops/ecosystem.staging.config.js` before `health-check-all.sh` so health targets match the PM2 file you reloaded.

## Multi-database

If you operate more than one PostgreSQL migration target, see **`ops/docs/multi-database-migrations.md`** for env var naming and orchestration expectations.

## Post-Deployment Verification

1. Check every PM2 app in the active ecosystem returns `/health` = ok/ready: `bash ops/scripts/health-check-all.sh` (see count command above).
2. Check PM2 status: `pm2 status` — zero restarts, all online
3. Check Grafana dashboards for error rate spike (first 5 minutes)
4. Test login flow manually: `https://app.shahin-ai.com/auth/login`
5. Check migration audit: `SELECT * FROM dos.schema_migrations ORDER BY applied_at DESC LIMIT 10;` (unified shell runner). If you use the TypeScript canonical runner per ADR-004, use `dos.platform_migrations` instead.

## Rollback Procedure

If health checks fail or error rate > 5%:

```bash
# Option A: Rollback all services to previous commit
bash ops/scripts/rollback-all.sh <previous-commit-hash>

# Option B: Rollback single service
bash ops/scripts/rollback-service.sh <service-name> <commit-hash>

# Option C: Rollback database migration
bash ops/scripts/rollback-migration.sh <migration-name>
```

## Emergency Contacts

| Role | Contact |
|------|---------|
| Platform Lead | See PagerDuty on-call rotation |
| DBA | See PagerDuty on-call rotation |
| Security | See PagerDuty on-call rotation |

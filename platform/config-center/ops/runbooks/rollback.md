# Rollback Runbook — DOS Platform

## When to Rollback

- Health check failure on 2+ services after deploy
- Error rate spike > 5x baseline (ErrorRateSpike alert fires)
- P99 latency > 5s sustained for 3+ minutes (CriticalP99Latency alert)
- Data integrity issue discovered post-deploy

## Rollback Procedures

### Full Platform Rollback

Rolls back ALL services + packages to a known-good commit.

```bash
# 1. Identify the last good commit
git log --oneline -10

# 2. Execute full rollback
bash ops/scripts/rollback-all.sh <commit-hash>

# 3. Verify health (script waits 10s then checks)
bash ops/scripts/health-check-all.sh
```

**What it does:**
1. Stops all PM2 services
2. Checks out target commit for services/, packages/, platform/
3. Reinstalls dependencies
4. Rebuilds packages
5. Restarts all services
6. Runs health checks

### Single Service Rollback

When only one service is affected.

```bash
bash ops/scripts/rollback-service.sh <service-name> <commit-hash>
```

### Database Migration Rollback

```bash
# Rollback specific migration
bash ops/scripts/rollback-migration.sh <migration-filename>

# Rollback service-specific migration
bash ops/scripts/rollback-service-migration.sh <service-name> <migration-filename>
```

## Post-Rollback Verification

1. `bash ops/scripts/health-check-all.sh` — all 32 services healthy
2. `pm2 status` — all services online, zero restarts
3. Check Grafana: error rate returns to baseline within 2 minutes
4. Test critical path: login → dashboard → create risk
5. Check database: `SELECT * FROM dos.platform_migrations ORDER BY applied_at DESC LIMIT 5;`

## Database Point-in-Time Recovery

For data corruption or accidental data deletion:

```bash
# 1. Stop affected services
pm2 stop <service-name>

# 2. Restore from backup
bash ops/scripts/backup-db.sh restore <backup-file.sql.gz>

# 3. Restart services
pm2 start <service-name>
```

## Escalation

If rollback doesn't resolve the issue:
1. Check `pm2 logs <service>` for root cause
2. Check Grafana distributed traces for the failing request
3. Escalate to platform lead via PagerDuty

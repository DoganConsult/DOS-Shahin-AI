# Quality Gate Module — Rollout & Rollback Note

## Module: quality-gate v1.0.0
## Date: 2026-04-04
## Owner: Platform Team

---

## Pre-Rollout Checklist

- [ ] Backend typecheck passes (`node node_modules/typescript/bin/tsc --noEmit --skipLibCheck`)
- [ ] Quality gate module tests pass (`pnpm vitest run src/modules/quality-gate/`)
- [ ] Migration 923 reviewed and approved
- [ ] PM2 ecosystem config updated with `temporal-quality-gate-worker`
- [ ] Temporal server accessible at configured address
- [ ] Feature flags `qgate.*` configured in tenant feature_flags table

## Rollout Steps

### 1. Deploy Migration
```bash
# Migration 923 creates 7 tables: qgate_runs, qgate_stage_results,
# qgate_ai_eval_scores, qgate_schema_drift_log, qgate_vrt_snapshots,
# qgate_thresholds, qgate_mutation_reports
pnpm migrate
```

### 2. Deploy Backend
```bash
# Standard PM2 reload — zero-downtime
pm2 reload ecosystem.config.js
```

### 3. Start Quality Gate Worker
```bash
pm2 start ecosystem.config.js --only temporal-quality-gate-worker
```

### 4. Verify Health
```bash
# Check worker is running
pm2 status temporal-quality-gate-worker

# Check routes are mounted
curl -s http://localhost:3000/api/quality-gate/dashboard/health | jq .

# Check migration ran
psql -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'qgate_%'"
```

### 5. Provision Existing Tenants
```bash
# For each existing tenant, the QualityGateSeedInstaller will run
# on next provisioning cycle or manual catch-up:
pnpm migrate:catchup
```

## Rollback Steps

### If issues detected after deploy:

1. **Stop the worker:**
   ```bash
   pm2 stop temporal-quality-gate-worker
   ```

2. **Routes are safe** — quality-gate routes will return 404 if module is disabled via feature flag. No need to redeploy backend unless there's a crash.

3. **Disable feature flag** (per-tenant):
   ```sql
   UPDATE tenant_config SET qgate_enabled = false WHERE tenant_id = '<tenant>';
   ```

4. **Tables are safe** — quality gate tables are isolated (`qgate_*` prefix). They don't affect any other module's data. Leaving them in place is safe.

5. **To fully rollback migration** (destructive, only if needed):
   ```sql
   DROP TABLE IF EXISTS qgate_mutation_reports CASCADE;
   DROP TABLE IF EXISTS qgate_vrt_snapshots CASCADE;
   DROP TABLE IF EXISTS qgate_thresholds CASCADE;
   DROP TABLE IF EXISTS qgate_schema_drift_log CASCADE;
   DROP TABLE IF EXISTS qgate_ai_eval_scores CASCADE;
   DROP TABLE IF EXISTS qgate_stage_results CASCADE;
   DROP TABLE IF EXISTS qgate_runs CASCADE;
   ```

## Dependencies

- **Hard:** admin module (must be installed first)
- **Soft:** governance, compliance modules (optional)
- **External tools (optional):** Semgrep, TruffleHog, Checkov, K6, Stryker, BackstopJS
- **Temporal:** Requires agrc-quality-gate task queue registered

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Migration failure | Medium | Tables use IF NOT EXISTS; idempotent |
| Worker crash loop | Low | PM2 auto-restart with max_restarts=10 |
| Temporal queue not created | Medium | Worker auto-registers queue on connect |
| External tools missing | Low | Each stage gracefully skips if tool not installed |
| Provisioning slow | Low | QualityGateSeedInstaller is non-critical; failure doesn't block provisioning |

## Monitoring

- **Logs:** `/opt/shahin-grc/logs/temporal-quality-gate-*.log`
- **Events:** `quality-gate.run.*` events in event bus
- **Dashboard:** Admin Hub → Quality Gates tab
- **Langfuse:** Quality gate traces under project `agrc-os`

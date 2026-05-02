# Incident Response Playbook — DOS Platform

## Severity Levels

| Level | Definition | Response Time | Examples |
|-------|-----------|---------------|----------|
| **SEV-0** | Platform down, all tenants affected | 15 min | DB unreachable, gateway crash loop, auth-service down |
| **SEV-1** | Critical feature broken, data at risk | 30 min | Login failures, audit trail gaps, data corruption |
| **SEV-2** | Major feature degraded, workaround exists | 2 hours | Slow queries, partial module failure, MFA issues |
| **SEV-3** | Minor issue, no business impact | Next business day | UI glitch, non-critical log errors, cosmetic issues |

## Incident Lifecycle

### 1. Detection

**Automated alerts** (Prometheus → AlertManager):
- `ServiceUnhealthy` → service failed health check
- `ErrorRateSpike` → 5x error rate increase
- `CriticalP99Latency` → P99 > 5 seconds
- `CircuitBreakerOpen` → downstream dependency failing
- `MemoryLeakSuspected` → heap growing for 30+ minutes

**Manual detection**:
- User reports via support channel
- Internal team notices during testing

### 2. Triage (First 15 Minutes)

```bash
# Check overall platform health
bash ops/scripts/health-check-all.sh

# Check PM2 status for crash loops
pm2 status

# Check recent logs for errors
pm2 logs --lines 100 | grep -i error

# Check database connectivity
psql "$DATABASE_URL" -c "SELECT 1;"

# Check Redis connectivity
redis-cli -u "$REDIS_URL" ping
```

### 3. Containment

**Service-level**: Restart the affected service
```bash
pm2 restart <service-name>
```

**Platform-level**: Rollback if restart doesn't fix
```bash
bash ops/scripts/rollback-all.sh <last-good-commit>
```

**Database-level**: If migration caused the issue
```bash
bash ops/scripts/rollback-migration.sh <migration-name>
```

### 4. Communication

| Audience | Channel | When |
|----------|---------|------|
| Engineering team | Slack #incidents | Immediately on SEV-0/1 |
| Affected tenants | Email / in-app banner | Within 30 min for SEV-0/1 |
| Management | Status page update | Within 1 hour for SEV-0 |

**Template:**
> **[SEV-X] [Brief description]**
> Status: Investigating / Mitigated / Resolved
> Impact: [Who is affected, what feature]
> ETA: [Expected resolution time]
> Next update: [When]

### 5. Resolution

1. Identify root cause
2. Apply fix (code change, config change, or rollback)
3. Verify fix in staging first (if time permits)
4. Deploy fix to production
5. Monitor for 30 minutes post-fix

### 6. Post-Incident Review (within 48 hours)

- **Timeline**: Minute-by-minute of detection → resolution
- **Root cause**: What failed and why
- **Impact**: Tenants affected, duration, data loss (if any)
- **Action items**: Prevent recurrence (with owners and deadlines)
- **Metrics**: Time to detect, time to mitigate, time to resolve

## Grafana Dashboards

| Dashboard | URL | Use |
|-----------|-----|-----|
| Platform Overview | `/d/platform-overview` | First look at all services |
| Service Detail | `/d/service-detail` | Drill into specific service |
| SLO Overview | `/d/slo-overview` | SLO burn rate check |
| Event Backbone | `/d/event-backbone` | Event bus health |
| Tenant Metrics | `/d/tenant-metrics` | Per-tenant impact assessment |

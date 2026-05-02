# Monitoring Runbook — DOS Platform

## Monitoring Stack

| Component | Purpose | Access |
|-----------|---------|--------|
| **Prometheus** | Metrics collection | `http://localhost:9090` |

Scrape targets are generated from the PM2 ecosystem (`pnpm run generate:edge-config` → `ops/monitoring/generated/ecosystem-file-sd.json`). See `ops/monitoring/README.md`.
| **Grafana** | Dashboards & alerting | `http://localhost:3001` |
| **AlertManager** | Alert routing | `http://localhost:9093` |
| **Vector** | Log aggregation | Config: `ops/monitoring/vector.toml` |
| **Pino** | Structured JSON logging | Per-service stdout |
| **PM2** | Process management | `pm2 monit` |

## Grafana Dashboards

| Dashboard | File | Key Panels |
|-----------|------|------------|
| Platform Overview | `ops/monitoring/dashboards/platform-overview.json` | Service health grid, request rate, error rate, latency p95/p99 |
| Service Detail | `ops/monitoring/dashboards/service-detail.json` | Per-service CPU, memory, request duration, DB query time |
| SLO Overview | `ops/monitoring/dashboards/slo-overview.json` | Error budget burn rate, latency SLO, availability SLO |
| AI Agent Mesh | `ops/monitoring/dashboards/ai-agent-mesh.json` | Agent execution time, tool calls, LLM token usage |
| Event Backbone | `ops/monitoring/dashboards/event-backbone.json` | Event throughput, subscriber lag, dead letter queue |
| Tenant Metrics | `ops/monitoring/dashboards/tenant-metrics.json` | Per-tenant request volume, active users, module adoption |

## Key Metrics

### Service Health
- `dos_http_requests_total` — total request count by method, route, status
- `dos_http_request_duration_seconds` — request latency histogram
- `dos_errors_total` — error count by type and service

### Database
- `dos_db_query_duration_seconds` — query execution time
- `dos_db_pool_active` — active connections in pool
- `dos_db_pool_idle` — idle connections
- `dos_db_pool_waiting` — queries waiting for connection

### Cache
- `dos_cache_hits_total` / `dos_cache_misses_total` — cache hit ratio

### Rate Limiting
- `dos_rate_limit_checks_total` — rate limit evaluations
- `dos_rate_limit_rejections_total` — rejected requests (429s)

### Circuit Breakers
- `dos_circuit_breaker_state` — 0=closed, 1=half-open, 2=open

## Alert Rules

All rules defined in `ops/monitoring/alerts.yml`. Key alerts:

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| HighP95Latency | p95 > 2s for 5m | warning | Check slow queries, review recent deploys |
| CriticalP99Latency | p99 > 5s for 3m | critical | Investigate DB, check circuit breakers |
| HighErrorRate | error rate > 5% for 5m | warning | Check logs, identify failing routes |
| ErrorRateSpike | 5x spike vs 1h ago | critical | Likely bad deploy — consider rollback |
| MemoryLeakSuspected | heap growing for 30m | warning | Restart service, file bug |
| CircuitBreakerOpen | breaker state = open | critical | Downstream dependency is failing |
| ServiceUnhealthy | /health returns non-200 | critical | Restart service, check dependencies |
| SlowDatabaseQueries | avg query > 1s for 5m | warning | Check pg_stat_activity, add indexes |

## Daily Health Check

```bash
# 1. All services healthy
bash ops/scripts/health-check-all.sh

# 2. PM2 status — no restarts in last 24h
pm2 status

# 3. Check error rate in Grafana (should be < 0.1%)
# Dashboard: Platform Overview → Error Rate panel

# 4. Check database connections
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# 5. Check disk usage
df -h /var/lib/postgresql/data

# 6. Check Redis memory
redis-cli -u "$REDIS_URL" info memory | grep used_memory_human
```

## Log Access

```bash
# Real-time logs for a service
pm2 logs <service-name> --lines 100

# Search logs for errors
pm2 logs <service-name> --lines 10000 | grep '"level":"error"'

# Filter by correlation ID
pm2 logs --lines 10000 | grep '<correlation-id>'
```

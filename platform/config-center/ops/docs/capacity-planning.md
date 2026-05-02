# DOS-AIO Capacity & Scale Planning

> Last verified against source configs: 2026-04-14

## PM2 Service Memory Budget

All values from `ops/ecosystem.all.config.js`. Total: **33 services + 1 frontend shell = 34 PM2 processes**.

| Service | Port | Exec Mode | Instances | max_memory_restart | max-old-space-size |
|---------|------|-----------|-----------|--------------------|--------------------|
| gateway | 4000 | cluster | 2 | 1G | 768 MB |
| auth-service | 4001 | fork | 1 | 1G | 768 MB |
| tenant-service | 4002 | fork | 1 | 1G | 768 MB |
| user-service | 4003 | fork | 1 | 1G | 768 MB |
| workflow-service | 4004 | fork | 1 | 1536M | 1024 MB |
| notification-service | 4005 | fork | 1 | 768M | 512 MB |
| audit-service | 4006 | fork | 1 | 768M | 512 MB |
| ai-gateway-service | 4007 | fork | 1 | 2G | 1536 MB |
| onboarding-service | 4010 | fork | 1 | 1G | 768 MB |
| governance-policy-service | 4011 | fork | 1 | 1G | 768 MB |
| compliance-controls-service | 4012 | fork | 1 | 2G | 1536 MB |
| risk-incident-service | 4013 | fork | 1 | 2G | 1536 MB |
| evidence-audit-reporting-service | 4014 | fork | 1 | 1G | 768 MB |
| vendor-service | 4015 | fork | 1 | 1G | 768 MB |
| asset-service | 4016 | fork | 1 | 768M | 512 MB |
| bcp-service | 4017 | fork | 1 | 768M | 512 MB |
| training-service | 4018 | fork | 1 | 768M | 512 MB |
| privacy-service | 4019 | fork | 1 | 768M | 512 MB |
| dora-service | 4020 | fork | 1 | 768M | 512 MB |
| remediation-action-service | 4021 | fork | 1 | 1G | 768 MB |
| qiyas-journey-service | 4022 | fork | 1 | 1G | 768 MB |
| dashboard-widgets-service | 4023 | fork | 1 | 768M | 512 MB |
| analytics-service | 4024 | fork | 1 | 1G | 768 MB |
| executive-intelligence-service | 4025 | fork | 1 | 768M | 512 MB |
| integrations-service | 4026 | fork | 1 | 768M | 512 MB |
| notification-inbox-service | 4027 | fork | 1 | 768M | 512 MB |
| portals-service | 4028 | fork | 1 | 768M | 512 MB |
| records-service | 4029 | fork | 1 | 768M | 512 MB |
| platform-product-service | 4030 | fork | 1 | 1G | 768 MB |
| agrc-os-service | 4031 | fork | 1 | 1G | 768 MB |
| analytics-reporting-service | 4032 | fork | 1 | 1G | 768 MB |
| platform-core-service | 4033 | fork | 1 | 1G | 768 MB |
| product-shell | 3000 | fork | 1 | 512M | 384 MB |

### Memory Totals (max_memory_restart caps)

| Tier | Count | Per-service | Subtotal |
|------|-------|-------------|----------|
| 2G | 3 (ai-gateway, compliance-controls, risk-incident) | 2048 MB | 6144 MB |
| 1536M | 1 (workflow) | 1536 MB | 1536 MB |
| 1G | 16 services | 1024 MB | 16384 MB |
| 768M | 12 services | 768 MB | 9216 MB |
| 512M | 1 (product-shell) | 512 MB | 512 MB |
| **Total** | **34 processes** (gateway runs 2 cluster instances → 35 OS processes) | | **~33.8 GB** |

**Minimum server RAM required: 64 GB** (33.8 GB services + PostgreSQL + Redis + OS + observability stack headroom).

## Network Binding

| Bind Address | Services |
|---|---|
| `0.0.0.0` (public) | gateway (4000), product-shell (3000) |
| `127.0.0.1` (localhost only) | All other 31 services |

Source: `packages/dos-service-bootstrap/src/index.ts` line 450.

## Database Connection Pool Budget

From `platform/config-center/env/` service-specific `.env` files and `packages/dos-db/src/config.ts`:

| Service | DB_POOL_MAX | DB User |
|---------|-------------|---------|
| gateway | 5 | dos_auth |
| auth-service | 15 | dos_auth |
| tenant-service | 10 | dos_tenant |
| user-service | 10 | dos_user |
| workflow-service | 10 | dos_workflow |
| notification-service | 5 | dos_notification |
| audit-service | 10 | dos_audit |
| ai-gateway-service | 10 | dos_tenant |
| onboarding-service | 10 | dos_tenant |
| Code default (all others) | 20 | dos_user |

**Pool timeouts** (from `packages/dos-db/src/config.ts`):
- Idle timeout: 30,000 ms
- Connection timeout: 5,000 ms
- Statement timeout: 30,000 ms
- Slow query threshold: 500 ms (logged as warning)

**Estimated max connections**: ~200-250 across all services (varies by which code-default services override via env).

## Redis

Single instance, no auth, no clustering:
- **URL:** `redis://127.0.0.1:6379`
- **Key prefix:** `dos:`
- **Client:** ioredis 5.10.x
- **Connect timeout:** 10,000 ms
- **Keep-alive:** 30,000 ms
- **Max retries per request:** 3
- **Retry strategy:** exponential backoff, max 10 retries, max delay 5,000 ms

Source: `packages/dos-db/src/redis.ts`

## Nginx Rate Limiting

From `ops/nginx/dos-platform.conf`:

| Zone | Rate | Burst | Purpose |
|------|------|-------|---------|
| api_global | 30 req/s per IP | 60 | All API traffic |
| auth_strict | 5 req/min per IP | 3 | Auth endpoints (brute-force defense) |
| static_zone | 50 req/s per IP | 100 | Frontend static assets |

- **Connection limit:** 50 concurrent connections per IP
- **Excess response:** HTTP 429
- **client_max_body_size:** 10 MB

### SSL/TLS (from `ops/nginx/frontend.conf`)
- Protocols: TLSv1.2, TLSv1.3
- HSTS: max-age=31536000, includeSubDomains
- Proxy timeouts: connect 10s, send 60s, read 300s

## Observability Stack Resource Usage

Native install via `ops/monitoring/native/install.sh` (systemd-managed, no Docker).
Pinned versions come from `PROM_VERSION`, `ALERTMANAGER_VERSION`, `JAEGER_VERSION`,
`LOKI_VERSION` defaults in that script; Grafana/ClickHouse are installed from
their official apt repos.

| Component | Version (default) | Port | Data path |
|-----------|------------------|------|-----------|
| Prometheus | 2.53.0 | 9090 | `/var/lib/prometheus` (30-day retention) |
| Alertmanager | 0.27.0 | 9093 | `/var/lib/alertmanager` |
| Grafana | apt `stable` | 3000 | `/var/lib/grafana` |
| Jaeger | 1.58.1 | 16686 (UI), 4317 (gRPC), 4318 (HTTP) | `/var/lib/jaeger` (Badger) |
| Loki | 3.1.0 | 3100 | `/var/lib/loki` (30-day retention) |
| ClickHouse | apt `stable` | 8123 (HTTP), 9000 | `/var/lib/clickhouse` |

## Prometheus Alert Thresholds

From `ops/monitoring/alerts.yml`:

| Alert | Condition | Duration | Severity |
|-------|-----------|----------|----------|
| DatabaseDown | `pg_up == 0` | 1 min | critical |
| HighCPUUsage | avg CPU > 80% | 3 min | warning |
| SLOBurnLatency | P99 > 500 ms | 5 min | critical |
| MicroserviceOffline | `up == 0` | 1 min | critical |

## Alertmanager Routing

From `ops/monitoring/alertmanager.yml`:

| Severity | Receiver | Repeat | Integration |
|----------|----------|--------|-------------|
| critical | pagerduty-critical | 1 hour | PagerDuty + webhook to notification-service |
| warning | opsgenie-warning | 4 hours | OpsGenie (P3) + webhook to notification-service |
| default | default-webhook | 4 hours | notification-service (port 4005) |

- **Group by:** alertname, job
- **Group wait:** 30s
- **Inhibition:** all alerts suppressed when MaintenanceMode is active

## Scaling Triggers

| Metric | Threshold | Action | Cooldown |
|--------|-----------|--------|----------|
| CPU Utilization | > 80% for 3 min | Alert fires (HighCPUUsage), autoscale action | per alertmanager routing |
| RAM per process | exceeds max_memory_restart | PM2 auto-restarts the process | immediate |
| DB Connection Pool | > 80% capacity | Manual — requires PgBouncer or pool resize | — |
| API P99 Latency | > 500 ms for 5 min | SLOBurnLatency alert fires → PagerDuty | — |
| Service down | up == 0 for 1 min | MicroserviceOffline alert → PagerDuty | — |

## Runtime Requirements

| Dependency | Required Version | Source |
|-----------|-----------------|--------|
| Node.js | >= 24.14.0 | `package.json` engines |
| pnpm | >= 10.33.0 | `package.json` engines / packageManager |
| PM2 | 5+ | ops scripts |
| PostgreSQL | pg driver ^8.13.0 (no explicit server version pinned) | `packages/dos-db/package.json` |
| Redis | ioredis ^5.10.0 (no explicit server version pinned) | `packages/dos-db/package.json` |

## Cost Management
Ensure un-utilized demo environments spin down automatically post-PoC execution saving explicit cloud egress and computational overhead.

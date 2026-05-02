# PostgreSQL Connection Pool Sizing — Action Required

## Issue: max_connections=200 may be undersized

Each service establishes its own connection pool. The total maximum connections
consumed when all 41 PM2 services start with their configured DB_POOL_MAX:

| Environment | DB_POOL_MAX per service | Services | Max connections | max_connections | Status |
|------------|--------------------------|----------|----------------|-----------------|--------|
| Development | 20 | 41 | 820 | 100 (default) | ⚠️ UNDERSized |
| Staging | 20 | 41 | 820 | unknown | ⚠️ Verify |
| Production | 50 | 41 | 2,050 | **200 (current)** | 🔴 CRITICAL |

## Current max_connections on this server

```
max_connections = 200   (observed in: ps aux | grep "postgres.*18/main")
```

This means if services collectively try to open more than 200 connections, PostgreSQL
will reject new connections with:

```
FATAL: remaining connection slots are reserved for non-replication superusers
```

## Recommended Fixes

### Option A: Increase max_connections (preferred for staging/production)

Edit `/etc/postgresql/18/main/postgresql.conf`:

```bash
sudo systemctl edit postgresql@18-main
# Add:
[Service]
Environment="PG_OPTIONS=--max_connections=500"
```

Or edit the config file directly:

```bash
sudo sed -i 's/^max_connections = 200/max_connections = 500/' /etc/postgresql/18/main/postgresql.conf
sudo systemctl restart postgresql@18-main
```

### Option B: Reduce per-service pool sizes

In `platform/config-center/env/.env.production` (or per-service env files):

```bash
DB_POOL_MAX=5   # instead of 50
```

This reduces total max from 2,050 → 205 (within current limit).

### Option C: Use PgBouncer connection pooler (recommended for production)

Deploy PgBouncer between services and PostgreSQL:

```
Services → PgBouncer (:5433) → PostgreSQL (:5432)
```

PgBouncer pools connections at the transport layer, so services each hold one
logical connection while PgBouncer multiplexes them over a small pool of real
PostgreSQL connections.

Recommended PgBouncer config (`/etc/pgbouncer/pgbouncer.ini`):

```ini
[databases]
shahin_grc = host=127.0.0.1 port=5432 dbname=shahin_grc

[pgbouncer]
listen_port = 5433
listen_addr = 127.0.0.1
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
max_client_conn = 2000
default_pool_size = 25   # PostgreSQL real connections per database
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 5
server_idle_timeout = 600
```

Then update all services to connect to port **5433** instead of 5432.

## Verification Query

```sql
-- Check current connection count per service
SELECT
  application_name,
  count(*),
  state
FROM pg_stat_activity
WHERE datname = 'shahin_grc'
GROUP BY application_name, state
ORDER BY count(*) DESC;

-- Check total connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'shahin_grc';

-- Check max connections setting
SHOW max_connections;
```

## Alert Threshold

Add this alert to `ops/monitoring/alerts.yml`:

```yaml
- alert: PostgreSQLConnectionsNearLimit
  expr: (SELECT count(*) FROM pg_stat_activity) / (SELECT setting::float FROM pg_settings WHERE name = 'max_connections') > 0.8
  for: 5m
  labels:
    severity: warning
    team: core-infra
  annotations:
    summary: "PostgreSQL connections above 80% of max_connections"
    description: "Connection pool near exhaustion. Set up PgBouncer or increase max_connections."
```

# Native Observability — PASS Evidence

**Date:** 2026-04-20
**Status:** PASS (frozen as production baseline)
**Scope locked:** observability layer only — Prometheus / Alertmanager / Grafana / Jaeger / Loki / ClickHouse on native systemd, no Docker/containerd.

---

## 1. Systemd state (6 services)

```
systemctl is-active / is-enabled:
  prometheus           active    enabled
  alertmanager         active    enabled
  grafana-server       active    enabled
  jaeger               active    enabled
  loki                 active    enabled           (unit name: loki.service, NOT loki-server.service — noted)
  clickhouse-server    active    enabled
```

Main PIDs + start timestamps (2026-04-20):
```
prometheus        PID 1939158   started 02:18:30
alertmanager      PID 1940086   started 02:19:27
grafana-server    PID 1946557   started 02:26:11
jaeger            PID 1941552   started 02:20:53
loki              PID 1942403   started ~02:21
clickhouse-server PID 1948081   started 02:27:20
```

## 2. HTTP health (all expected 200)

```
[PASS] prometheus          http://127.0.0.1:9090/-/healthy  → 200
[PASS] prometheus /ready   http://127.0.0.1:9090/-/ready    → 200
[PASS] alertmanager        http://127.0.0.1:9093/-/healthy  → 200
[PASS] grafana             http://127.0.0.1:3001/api/health → 200
[PASS] jaeger UI           http://127.0.0.1:16686/          → 200
[PASS] loki /ready         http://127.0.0.1:3100/ready      → 200
[PASS] clickhouse /ping    http://127.0.0.1:8123/ping       → 200
```

## 3. Prometheus scrape targets

```
$ curl http://127.0.0.1:9090/api/v1/targets
  total = 34
  up    = 34
  down  = 0
```

All targets up. Scrape file source: `ops/monitoring/generated/ecosystem-file-sd.json`.

## 4. Docker absence

```
$ docker --version
  bash: docker: command not found

$ systemctl is-active containerd
  inactive
```

Zero container runtime on host. Everything is native systemd or PM2.

## 5. PM2 process count

```
$ pm2 jlist | node ...
  37 / 37 online
```

## 6. Validation smokes (ordered per brief)

### Smoke 1 — DB write — FAIL (blocker)

```
$ psql: BEGIN; CREATE TEMP TABLE _smoke_write(x int); INSERT ...; ROLLBACK
  ERROR: cannot execute CREATE TABLE in a read-only transaction
```

Root cause: Patroni cluster has no leader. `/patroni/dos-aio/config` DCS key does not exist in etcd (missing, not mis-set). GET /config → 502, PATCH /config → 503, `patronictl edit-config --apply` → "config key does not exist". Fix requires writing the initial DCS config key — explicitly out of scope for this validation-only pass.

### Smoke 2 — OpenFGA write — FAIL (cascades from Smoke 1)

```
$ POST /stores/01KNSF17SBJBCF4H0E4KZM15EQ/write
  HTTP 500  internal_error: "sql error: ERROR: cannot execute SELECT FOR UPDATE in a read-only transaction (SQLSTATE 25006)"
```

OpenFGA uses Postgres as its datastore. Read-only Postgres blocks all tuple writes. OpenFGA `/healthz` still returns SERVING (handles reads) so the process itself is fine.

### Smoke 3 — DAuth delegation lifecycle — FAIL (cascades from Smoke 2)

```
  grant write     HTTP 500
  check-after-grant     false   (expected true)
  revoke write          HTTP 500
  check-after-revoke    false
```

Cannot prove grant → allow → revoke → deny cycle while OpenFGA writes are refused.

### Smoke 4 — Login endpoint shape — PASS

```
  GET /api/auth/session        → 401  (expected for anonymous)
  POST /api/auth/check-email   → 403  (expected for anonymous without CSRF)
```

Endpoint routing, auth-service middleware, and CSRF guard all responding. No 5xx.

### Smoke 5 — Shahin browser bootstrap shape — PASS

```
  GET http://localhost:4000/api/health
  status=ok, downstream 34/34 ok
```

All 34 downstream services (including auth, tenant, user, onboarding, compliance-controls, evidence-audit-reporting, etc.) report ok — gateway-level bootstrap is healthy for read paths. Write paths affected by Smoke 1-3 root cause.

## 7. Flag state (unchanged — enforce held OFF per brief)

```
DAUTH_OPENFGA_SHADOW / ENFORCE   unset → false
DAUTH_CERBOS_SHADOW / ENFORCE    unset → false
DAUTH_KEYCLOAK_SHADOW / ENFORCE  unset → false
```

Per brief: "Do not set `DAUTH_OPENFGA_ENFORCE=true` until OpenFGA write smoke and DAuth smoke pass." Both currently fail; enforce stays OFF.

## 8. Next blocker

Single blocker for Smokes 1/2/3: **Patroni DCS config key missing → no leader → Postgres read-only**.

Resolution paths (each needs owner authorization):
- Write initial `/patroni/dos-aio/config` key to etcd via Patroni's own etcd3 client (lowest blast radius).
- `patronictl remove dos-aio` → Patroni auto re-bootstraps from `/etc/patroni/config.yml`.
- Full Patroni cluster re-init.

Until this is resolved, DB write / OpenFGA write / DAuth delegation cannot be validated end-to-end. Observability layer is unaffected and remains PASS.

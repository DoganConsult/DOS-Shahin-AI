# DOS Platform — Observability (Native / Self-Hosted)

The observability stack runs **natively on the host** via systemd — no Docker
and no Docker Compose anywhere in the DOS-AIO platform.

Stack:

| Service | Port | systemd unit |
|---|---|---|
| Prometheus | 9090 | `prometheus.service` |
| Alertmanager | 9093 | `alertmanager.service` |
| Grafana | 3000 | `grafana-server.service` (from the Grafana apt package) |
| Jaeger (all-in-one) | 16686 (UI), 4317/4318 (OTLP) | `jaeger.service` |
| Loki | 3100 | `loki.service` |
| ClickHouse | 8123 (HTTP), 9000 (native) | `clickhouse-server.service` |

## Install

One-time, as root (or `sudo`) on the host that should run the stack:

```bash
sudo ops/monitoring/native/install.sh
```

That script:

- Installs each binary (Prometheus, Alertmanager, Jaeger, Loki from upstream
  tarballs; Grafana and ClickHouse from their official apt repos).
- Creates system users (`prometheus`, `alertmanager`, `jaeger`, `loki`).
- Symlinks every config in this directory into `/etc/<service>/`, so edits
  here are picked up by the running service on reload.
- Installs systemd units from [`native/systemd/`](native/systemd/) and starts
  them.

Pinned versions are overridable via env, e.g.
`PROM_VERSION=2.54.0 sudo -E ops/monitoring/native/install.sh prometheus`.

## Scrape targets (ecosystem-driven)

[`prometheus.yml`](prometheus.yml) uses file service discovery pointing at
[`generated/ecosystem-file-sd.json`](generated/). That file is produced by:

```bash
pnpm run generate:edge-config
```

…from the same `ops/ecosystem.all.config.js` (or `ECOSYSTEM_CONFIG`) that PM2
and nginx consume. Re-run it whenever the service topology changes.

## Process working directory

`file_sd_configs` paths in [`prometheus.yml`](prometheus.yml) resolve relative
to the Prometheus process working directory. The systemd unit sets
`WorkingDirectory=/etc/prometheus` (which is a symlink to this directory), so
the discovered paths work out of the box.

## Day-to-day operations

```bash
# status
sudo systemctl status prometheus alertmanager grafana-server jaeger loki clickhouse-server

# reload after editing a config in this dir
sudo systemctl reload prometheus          # hot-reload
sudo systemctl restart alertmanager       # re-renders alertmanager.yml from env
sudo systemctl restart loki jaeger

# Grafana admin password / env — edit /etc/sysconfig/grafana-server
# (or /etc/default/grafana-server on Debian) then:
sudo systemctl restart grafana-server

# health checks
curl -sf http://localhost:9090/-/healthy     # prometheus
curl -sf http://localhost:9093/-/healthy     # alertmanager
curl -sf http://localhost:3000/api/health    # grafana
curl -sf http://localhost:16686/             # jaeger UI
curl -sf http://localhost:3100/ready         # loki
curl -sf http://localhost:8123/ping          # clickhouse
```

## Alertmanager secrets

`PAGERDUTY_SERVICE_KEY` and `OPSGENIE_API_KEY` live in
`/etc/alertmanager/alertmanager.env` (mode `0640`, owner `root:alertmanager`).
The service's `ExecStartPre` (`/usr/local/sbin/alertmanager-render-config`)
substitutes them into [`alertmanager.yml`](alertmanager.yml) at start time and
writes the rendered file to `/run/alertmanager/alertmanager.yml`.

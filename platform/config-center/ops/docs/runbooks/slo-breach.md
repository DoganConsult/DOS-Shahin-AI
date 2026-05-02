# Runbook — SLO Burn-Rate Breach

Scope: this runbook applies to any `SLOBurnFast_*` / `SLOBurnSlow_*`
or `PlatformAvailabilityBelowSLO` alert emitted from
[`ops/monitoring/rules/slo.yml`](../../monitoring/rules/slo.yml).

## 0. Pre-flight

- Confirm the alert label `service=<x>` and the paging tier.
- Open the SLO dashboard in Grafana
  (`ops/monitoring/dashboards/slo-overview.json`).
- Confirm the current deploy/rollback window from
  [`../../../docs/releases/TAG-GOVERNANCE.md`](../../../docs/releases/TAG-GOVERNANCE.md).

## 1. Classify

| Alert | Budget | Paging |
| --- | --- | --- |
| `SLOBurnFast_*`  | 14.4x — exhausts 30d budget in ~50 min | Critical, primary on-call |
| `SLOBurnSlow_*`  | 6x — exhausts 30d budget in ~5 days    | Warning, business hours |
| `PlatformAvailabilityBelowSLO` | 30d aggregate already below 99.9% | Critical, page owner + platform-core lead |

## 2. Triage (first 10 min)

1. `bash ops/scripts/health-check-all.sh` — is the failing service
   actually returning 5xx, or is it the dependency graph?
2. Check the error hotspot — grep the last 5 minutes of
   `journalctl -u pm2-<service>` for `ERR`, `FATAL`, `AssertionError`.
3. Look at Grafana: `service-detail.json` for the burning service
   + upstream dependencies (DB, Redis, Temporal, Anthropic).
4. Look at `ops/monitoring/alerts.yml` for any correlated alerts
   (`DatabaseDown`, `RedisUnreachable`, `OutboxDLQNonZero`,
   `ProvisioningWorkerHeartbeatStale`).

## 3. Stabilise (10-30 min)

Based on the triage:

- Upstream dependency failing → follow its runbook:
  [`db-failure.md`](./db-failure.md),
  [`../../../ops/runbooks/incident-response.md`](../../../ops/runbooks/incident-response.md).
- Bad release → follow rollback:
  [`../../../ops/runbooks/rollback.md`](../../../ops/runbooks/rollback.md).
- Capacity: scale out the PM2 fleet for the affected service via
  `pm2 scale <name> +1` and watch the 5m error-rate series.
- If `ai-gateway-service` is the burning service, check the model
  provider status page (Anthropic) before touching our infra.

## 4. Communicate

- Declare an incident in `ops/status/incidents.json` with
  `status: "investigating"` and the service in `affectedServices`.
  The `/status` page reflects this within 30 seconds.
- Update `latestUpdate` at least every 30 minutes.
- When `errorRate:5m` drops below the SLO for an evaluation window,
  move to `monitoring`; after 1h stable, move to `resolved`.

## 5. Post-incident

- Write the post-mortem in `docs/sre/incidents/<date>-<slug>.md`
  within 5 business days.
- If the SLO target itself was unreasonable (chronic burn even without
  incidents), propose a revision to
  [`docs/sre/slo-catalogue.yaml`](../../../docs/sre/slo-catalogue.yaml)
  via an ADR in [`../ADR/`](../ADR/).

## 6. Reference

- SLO recording + burn-rate rules: [`../../monitoring/rules/slo.yml`](../../monitoring/rules/slo.yml)
- Platform-wide alerts: [`../../monitoring/alerts.yml`](../../monitoring/alerts.yml)
- SLA (customer-facing): [`../../../docs/sre/SLA.md`](../../../docs/sre/SLA.md)
- Google SRE workbook — "Alerting on SLOs" chapter (canonical reference for the multi-window, multi-burn-rate approach).

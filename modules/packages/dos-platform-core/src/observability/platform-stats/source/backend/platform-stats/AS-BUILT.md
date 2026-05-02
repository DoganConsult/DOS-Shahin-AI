# AS-BUILT: Platform Stats Module (MP-50)

## Module Identity
- **Module Code:** `platform-stats`
- **Tier:** Technical Support Surface
- **Criticality:** P3

## Owned Artifacts
- **Database Tables:** `platform_metrics`, `platform_kpis`, `platform_usage_log`
- **Aggregate Root:** `platform_metrics`
- **API Surface:** `/api/platform-stats/` → `/metrics`, `/health`, `/usage`, `/kpis`, `/diagnostics`

## Protected Actions (DAuth Enforcement Points)
- `platform-stats.read` — View all statistics (admin/auditor only)
- `platform-stats.manage` — Record metrics and compute KPIs

## Service Families
1. **Metric Aggregation Service** — `recordMetric()`, `queryMetrics()`
2. **System Health Service** — `getSystemHealth()` (fan-out to all services)
3. **Usage Analytics Service** — `trackUsage()`, `queryUsage()`
4. **KPI Computation Service** — `getKpis()`, `computeAndStoreKpi()`
5. **Diagnostics Service** — `runDiagnostics()`

## Diagnostics
- Metrics table population check
- KPI computation freshness (today's snapshot)
- Stale KPI detection (>7 days old)

## Known Risks
1. System health fan-out currently uses hardcoded service list — should be driven by module registry.
2. Usage tracking ON CONFLICT may need upsert logic for aggregation.

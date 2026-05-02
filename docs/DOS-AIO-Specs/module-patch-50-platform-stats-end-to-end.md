# Module Patch MP-50 — Platform Stats Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 50 — Platform Stats Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Platform Stats module** end to end. 

It tells an agent exactly how to:
- inspect platform-wide statistics aggregation, system health metrics, usage analytics, and operational dashboards
- compare the current implementation against the canonical platform-stats target
- know what belongs to Platform Stats versus the DOS telemetry mechanisms
- know exactly what files, services, contracts, tables, and ingestion metrics must exist

### 0.4 Module identity
- Module code: `platform-stats`
- Layer: technical support surface
- Criticality: **P3 low**
- Runtime role: platform-wide statistics aggregation, tenant activity tracking, module usage analytics, operational KPI computation, telemetry visualization
- Primary dependency domains: DOS foundation, analytics, admin

---

## 1. Cross-Patch Inheritance Map

This module patch inherits and applies:
- Patch 0 (Common Enforcement Standard)
- Patch 1 (Platform Full-Stack Core)
- Patch 3 (DAuth Access)
- Patch 11 (Observability)
- Patch 12 (Reporting Core)

---

## 2. Module Purpose and Boundaries

### 2.1 What Platform Stats owns directly
- Platform-wide metric aggregation (active users, API call volumes, error rates)
- Module usage analytics (which modules are heavily used versus neglected)
- Tenant activity tracking and consumption metrics
- Operational KPI computation and trend analysis
- Administrative dashboard data feeds for platform usage

### 2.2 What Platform Stats consumes from DOS
- Module registry (for enumerating available modules and linking stats to them)
- Event backbone (ingesting firehose events to calculate stats)
- Observability layer (harvesting raw OpenTelemetry/Prometheus metrics for business contexts)

### 2.3 What Platform Stats consumes from DAuth
- Strict admin-level and root-level access authorization (this module exposes global platform health and must be protected from standard users)

### 2.4 What Platform Stats consumes from adjacent modules
- **Analytics**: Passing aggregated stat arrays to the Analytics charting infrastructure
- **Admin**: Injecting health panels into the super-admin dashboard

### 2.5 What Platform Stats must not implement
- Duplicate real-time analytics engines (must use ClickHouse or the standard analytics module)
- Duplicate application tracing (consumed from DOS observability)

---

## 3. Canonical Backend Structure

```text
backend/src/modules/platform-stats/
  controllers/
  routes/
  services/
  repositories/
  contracts/
  schemas/
  types/
  diagnostics/
  jobs/
  ports/
  index.ts
  platform-stats.module.ts
```

### 3.1 Required backend service families
- **Metric Aggregation Service**: Cron-driven roll-up of telemetry
- **System Health Service**: Real-time heartbeat checking of all upstream services
- **Usage Analytics Service**: Processing tenant and user traffic patterns
- **KPI Computation Service**: Formulating complex reporting KPIs (e.g., MTTR averages across the platform)
- **Diagnostics Service**: Monitoring the stats pipeline itself

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/platform-stats/
  pages/
  components/
  services/
  contracts/
  index.ts
```

Required surfaces:
- Platform Overview Dashboard
- System Health Panel (Green/Yellow/Red traffic lights for services)
- Module Usage Analytics View
- KPI Trends Charting

---

## 5. Data Model Requirements

Platform Stats owns the following PostgreSQL / ClickHouse tables:
- `platform_metrics` — time-series metrics (metric_key, value, timestamp, metadata_json)
- `platform_kpis` — computed operational KPIs (kpi_name, computed_value, snapshot_date)
- `platform_usage_log` — aggregated daily usage per tenant (tenant_id, module_used, hit_count, date)

---

## 6. API Surface Requirements

Required route groups:
- **Metrics Retrieval**: `/api/platform-stats/metrics`
- **Health Status**: `/api/platform-stats/health`
- **Usage Analytics**: `/api/platform-stats/usage`
- **KPI Trends**: `/api/platform-stats/kpis`
- **Diagnostics**: `/api/platform-stats/diagnostics`

Required contracts:
- `PlatformMetricContract`
- `PlatformHealthContract`
- `PlatformUsageContract`
- `PlatformKpiContract`

All query parameters for date ranges and aggregations must map to strict Zod object validation.

---

## 7. Workflow and DAuth Integration

- **DAuth**: Scoped exclusively to users possessing the `admin` or `system.auditor` roles.
- **Workflow**: No business process workflows required (read-only telemetry module).

---

## 8. AI Integration

Allowed AI participation:
- Anomaly detection in API metrics (e.g., sudden traffic spikes flagged by AI)
- Resource exhaustion forecasting and trend prediction

Restricted:
- AI cannot mutate metric histories.

---

## 9. UI and Experience Requirements

The UI must provide:
- Real-time auto-refresh capability for the system health panel
- Density-optimized usage charts for high-level overviews
- Empty states and explicit loading skeletons (dashboards loading large time-series data must not freeze)


### 9.1 Cross-Module UX and Interactivity
- **Global Health Beacons**: Injects dynamic 'traffic light' telemetry widgets into the super-admin navigation bar.
- **Drill-Down Analytics**: Translates raw stats into click-through telemetry exposing the underperforming sub-modules immediately.

---

## 10. Settings/Admin/Runtime Control

Required controls:
- Metric point collection interval configurability
- Retention policy definitions (e.g., drop raw hourly metrics after 30 days, keep daily rollups)
- KPI alerting thresholds (e.g., notify if API error rate > 5%)

---

## 11. Observability and Operations

Required diagnostics:
- Metric collection health (are stats successfully writing to the DB?)
- Stale KPIs status
- Storage utilization check for `platform_metrics` table

---

## 12. Required Tests

- Metric aggregation roll-up logic tests
- Health computation algorithm tests
- Usage tracking pipeline unit tests
- KPI historical accuracy tests

---

## 13. Exact Build Instructions

If `platform-stats` backend is missing:
- Create the module skeleton.
- Implement real metric collection and scheduled jobs for data rollups, ensuring data reads efficiently using timeseries DB patterns where necessary.

---

## 14. Acceptance Criteria

Pass only if:
- Metrics are successfully retrieved and aggregated from real platform activity.
- The system health status accurately reflects live infrastructure state.
- Rollups respect DAuth administration separation.
- Diagnostics are fully wired up.

---

## 15. Fail Conditions

FAIL if:
- Metrics are hardcoded in the frontend.
- API endpoints act as thin passthroughs returning static JSON files.
- Memory leaks occur due to unbound metric aggregation in Node.js instead of querying PostgreSQL/ClickHouse.

---

## 16. Recommended Next Part

After this module patch, the next recommended module patch is:
**Module Patch 51 — Attestation Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the platform-stats implementation against the target, ensuring real telemetry is aggregated cleanly and exposed via enterprise-grade DAuth scopes.

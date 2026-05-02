# Module Patch MP-49 — Benchmarks Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 49 — Benchmarks Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Benchmarks module** end to end. 

It tells an agent exactly how to:
- inspect industry benchmark cataloging, tenant-vs-benchmark comparison, maturity scoring, and peer analysis
- compare the current implementation against the canonical benchmarks target
- know what belongs to Benchmarks, what belongs to controls, what belongs to compliance, and how scores are mapped
- know exactly what files, services, contracts, tables, and analytical capabilities must exist

### 0.4 Module identity
- Module code: `benchmarks`
- Layer: cross-module support surface
- Criticality: **P3 low**
- Runtime role: industry benchmark catalog, CIS/NIST/custom baseline tracking, tenant-vs-benchmark scoring, peer comparison analytics
- Primary dependency domains: DOS foundation, DAuth control spine, compliance, controls, qiyas

---

## 1. Cross-Patch Inheritance Map

This module patch inherits and applies:
- Patch 0 (Common Enforcement Standard)
- Patch 1 (Platform Full-Stack Core)
- Patch 3 (DAuth Access)
- Patch 5 (Lifecycle Auth)
- Patch 11 (Observability)
- Patch 12 (Reporting Core)

---

## 2. Module Purpose and Boundaries

### 2.1 What Benchmarks owns directly
- Benchmark catalog (ingestion and cataloging of CIS, NIST baselines, custom industry benchmarks)
- Benchmark-to-control contextual mapping
- Tenant posture scoring against official benchmarks
- Peer comparison analytics (anonymized tenant-to-tenant benchmark standing, if enabled)
- Benchmark diagnostics and admin import surfaces

### 2.2 What Benchmarks consumes from DOS
- Foundation org structure
- Event backbone
- Observability infrastructure

### 2.3 What Benchmarks consumes from DAuth
- Scoped access and strict read authorization (peer data requires rigorous isolation)
- Admin privileges for uploading new benchmark framework definitions

### 2.4 What Benchmarks consumes from adjacent modules
- **Compliance**: For orchestrating framework alignment
- **Controls**: For acquiring real-time control effectiveness data to map against benchmarks
- **Qiyas**: For baseline maturity scoring algorithms and methodologies

### 2.5 What Benchmarks must not implement
- Duplicate control registry architectures (must be consumed from Controls module)
- Duplicate generic maturity scoring models (must be consumed from Qiyas module)
- Its own cross-tenant data leak vulnerabilities

---

## 3. Canonical Backend Structure

```text
backend/src/modules/benchmarks/
  controllers/
  routes/
  services/
  repositories/
  contracts/
  schemas/
  types/
  events/
  jobs/
  diagnostics/
  security/
  ports/
  index.ts
  benchmarks.module.ts
```

### 3.1 Required backend service families
- **Benchmark Catalog Service**: Framework versioning and catalog CRUD
- **Mapping Service**: Linking benchmarks to internal entity metadata
- **Scoring Service**: Crunching effectiveness via qiyas/controls context
- **Peer Comparison Service**: Safely aggregating anonymized data sets
- **Diagnostics Service**: Monitoring scoring pipeline health

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/benchmarks/
  pages/
  components/
  services/
  contracts/
  store/
  index.ts
```

Required surfaces:
- Benchmark Catalog Directory
- Comparison Dashboard (Tenant vs Benchmark)
- Scoring Results Details
- Peer Analysis Views (spider charts/radars)
- Admin/Diagnostics surfaces

---

## 5. Data Model Requirements

Benchmarks owns the following PostgreSQL tables:
- `benchmarks_catalog` — benchmark_id, name, version, provider, release_date
- `benchmark_control_mappings` — benchmark_id, internal_control_id, weight, mapping_status
- `benchmark_scores` — benchmark_id, tenant_id, score, computed_at, status
- `benchmark_peer_data` — pre-computed anonymized aggregate statistics for peer views

---

## 6. API Surface Requirements

Required route groups:
- **Catalog CRUD**: `/api/benchmarks/catalog`
- **Mapping Management**: `/api/benchmarks/mappings`
- **Scoring Retrieval**: `/api/benchmarks/scoring`
- **Peer Comparison**: `/api/benchmarks/peers`
- **Diagnostics/Admin**: `/api/benchmarks/diagnostics`

Required contracts:
- `BenchmarkCatalogContract`
- `BenchmarkMappingContract`
- `BenchmarkScoreContract`
- `BenchmarkDiagnosticsContract`

Validation powered by Zod must exist on all mapping and catalog mutation endpoints.

---

## 7. Workflow and DAuth Integration

- DAuth is heavily enforced for read/write access and specifically scoped for peer comparison visibility flags.
- Workflow integration occurs when adopting a new benchmark, potentially pushing it through an approval lifecycle.

---

## 8. AI Integration

Allowed AI participation:
- Benchmark alignment recommendation (AI analyzing internal controls and suggesting relevant benchmark frameworks)
- Gap prioritization insights

Restricted:
- No hallucinated benchmark scores.
- No override of official mathematical scoring algorithms.

---

## 9. UI and Experience Requirements

The Benchmarks UI must provide:
- High-fidelity visualization of comparison dashboards using radar/spider charts
- Interactive catalog with deep filtering
- Scoring visualization drill-downs

Must define:
- empty/loading/error states
- Explicit notifications when benchmark scoring computation is running asynchronously in the background.


### 9.1 Cross-Module UX and Interactivity
- **Radar Overlay Comparisons**: Compliance dashboards inherently overlay benchmark scores via integrated spider-charts.
- **Frictionless Framework Adoption**: Users can one-click adopt a benchmark mapping directly from the Compliance control grid.

---

## 10. Settings/Admin/Runtime Control

Required controls:
- Benchmark catalog upload/import tools
- Scoring methodology configuration (metric weights)
- Peer group definition constraints and opt-in toggles

---

## 11. Observability and Operations

Required diagnostics:
- Unmapped benchmarks (items in catalog with zero internal mappings)
- Stale scores (computations that haven't refreshed in X days)
- Catalog health checking
- Async scoring pipeline job queue status

---

## 12. Required Tests

- Catalog CRUD unit tests
- Mapping relationship constraint tests
- Scoring algorithm accuracy tests
- Peer comparison anonymization tests (CRITICAL SECURITY boundary test)
- Diagnostics retrieval tests

---

## 13. Exact Build Instructions

If benchmark services are currently stubs:
- Implement the real PostgreSQL-backed catalog and mapping relational engine.
- Implement scoring logic relying on actual linked control states.

If peer data is missing:
- Build the aggregation cron jobs safely to populate `benchmark_peer_data` without breaching tenant isolation protocols.

---

## 14. Acceptance Criteria

Pass only if:
- Catalog works end-to-end and can receive large framework imports.
- Mapping creates real relational records linking benchmarks to actual internal UUIDs.
- Scoring is strictly database-driven, not hardcoded mock responses.
- Diagnostics are fully operational.

---

## 15. Fail Conditions

FAIL if:
- Benchmarks are hardcoded static data.
- Scoring endpoints return random or mock data.
- Peer analysis leaks PII or breaches direct tenant data boundaries.

---

## 16. Recommended Next Part

After this module patch, the next recommended module patch is:
**Module Patch 50 — Platform Stats Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the current benchmarks implementation against the full enterprise target, classify gaps, build the true mappings array, validate scoring math, and record in the ledger.

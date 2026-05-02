# Module Patch MP-48 — Fitch Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 48 — Fitch Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **Fitch module** end to end. 

It tells an agent exactly how to:
- inspect credit rating integration, rating agency data ingestion, rating change tracking, and rating impact analysis
- compare the current implementation against the canonical fitch target
- know what belongs to Fitch, what belongs to risk, what belongs to vendors, and how integrations are handled
- know exactly what files, services, contracts, tables, and ingestion jobs must exist

### 0.4 Module identity
- Module code: `fitch`
- Layer: technical support surface
- Criticality: **P3 low**
- Runtime role: Fitch credit rating data ingestion, rating change tracking, rating-to-risk linkage, counterparty mappings, rating impact notifications
- Primary dependency domains: DOS foundation, DAuth control spine, risk, integrations, vendor

---

## 1. Cross-Patch Inheritance Map

This module patch inherits and applies:
- Patch 0 (Common Enforcement Standard)
- Patch 1 (Platform Full-Stack Core)
- Patch 3 (DAuth Access)
- Patch 5 (Lifecycle Auth)
- Patch 11 (Observability)

---

## 2. Module Purpose and Boundaries

### 2.1 What Fitch owns directly
- Fitch rating data ingestion pipelines and normalization
- Rating change tracking and historic storage over time
- Rating-to-entity linkage mapping (resolving fitch entities to internal vendors, counterparties, assets)
- Rating impact analysis and threshold-based alerts (e.g., downgrade alerts)
- Fitch diagnostics and admin sync surfaces

### 2.2 What Fitch consumes from DOS
- Foundation org structure
- Event backbone (emitting `fitch.rating.downgraded` events)
- Observability and job scheduling

### 2.3 What Fitch consumes from DAuth
- Scoped access (read visibility restrictions on financial data)
- Read/write authorization for ingestion configurations

### 2.4 What Fitch consumes from adjacent modules
- **Risk**: For correlating credit ratings into risk scoring equations
- **Vendor**: For associating third-party counterparties with Fitch ratings
- **Integrations**: For orchestrating the external API data feed from Fitch systems

### 2.5 What Fitch must not implement
- Duplicate risk scoring frameworks (consumed from risk)
- Duplicate vendor management tables (consumed from vendor)
- Custom authentication for integration API keys (handled by integrations core)

---

## 3. Canonical Backend Structure

```text
backend/src/modules/fitch/
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
  mappers/
  ports/
  index.ts
  fitch.module.ts
```

### 3.1 Required backend service families
- **Rating Ingestion Service**: Scheduled retrieval and normalization of data
- **Rating Change Tracker**: Delta comparison to detect upgrades/downgrades
- **Entity Linkage Service**: Associating Fitch entity IDs with internal UUIDs
- **Impact Analysis Service**: Evaluating threshold breaches based on rating changes
- **Diagnostics Service**: Monitoring ingestion pipeline health

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/fitch/
  pages/
  components/
  services/
  contracts/
  index.ts
```

Required surfaces:
- Rating Dashboard (overview of portfolio ratings)
- Rating History (historical trend view)
- Entity-Rating Linkage View (mapping tool)
- Impact Alerts View
- Admin/Diagnostics (ingestion logs and sync status)

---

## 5. Data Model Requirements

Fitch owns the following PostgreSQL tables:
- `fitch_ratings` — current rating state (entity_id, fitch_id, current_rating, outlook, updated_at)
- `fitch_rating_history` — time-series ledger of rating changes (entity_id, previous_rating, new_rating, change_date)
- `fitch_entity_links` — internal to external mapping (internal_entity_uuid, entity_type, fitch_id)
- `fitch_impact_alerts` — generated alerts for workflow triggers

---

## 6. API Surface Requirements

Required route groups:
- **Rating Retrieval**: `/api/fitch/ratings`
- **Rating History**: `/api/fitch/ratings/:id/history`
- **Entity Linkage**: `/api/fitch/links`
- **Impact Analysis**: `/api/fitch/impacts`
- **Diagnostics/Admin**: `/api/fitch/diagnostics`

Required contracts:
- `FitchRatingContract`
- `FitchHistoryContract`
- `FitchLinkContract`
- `FitchDiagnosticsContract`

Validation powered by Zod must exist on all mutating / mapping endpoints.

---

## 7. Workflow and DAuth Integration

Due to being a read-heavy technical integration module:
- DAuth is used primarily for scoped access and API admin configurations.
- Workflows are triggered strictly via events (e.g., a downgrade alert emits an event consumed by Action or Workflow for follow-up).

---

## 8. AI Integration

Allowed AI participation:
- Rating trend analysis
- Impact prediction on portfolio
- Assisting in entity matching (fuzzy matching names to Fitch IDs)

Restricted:
- No automatic modification of official rating data. Ratings must perfectly mirror the external source of truth.

---

## 9. UI and Experience Requirements

The Fitch UI must provide:
- Rating dashboard with heatmaps or distribution charts
- Historical trend line charts
- Streamlined entity linkage mapping tables with bulk actions

Must define:
- empty/loading/error states (crucial for API failure scenarios)
- Refresh indicators showing data staleness


### 9.1 Cross-Module UX and Interactivity
- **Visual Credit Alerts**: Vendor and Risk dashboards automatically inherit Fitch badge overlays on matching counterparties.
- **Automated Triage Generation**: Rating downgrades instantly generate interactive workflow triage tasks without user initiation.

---

## 10. Settings/Admin/Runtime Control

Required controls:
- Data feed configuration and endpoint mapping
- Scheduled sync refresh cadence
- Alert thresholds (e.g., "alert on drop below BBB")
- Entity linkage rule enablement

---

## 11. Observability and Operations

Required diagnostics:
- Stale ratings check (ratings not updated beyond heartbeat threshold)
- Failed ingestion count and integration circuit breaker status
- Unlinked ratings (Fitch entities monitored but not mapped internally)
- Feed health latency

---

## 12. Required Tests

- Rating ingestion parsing and normalisation tests
- Historical delta tracking tests (ensuring history records are created correctly on change)
- Entity linkage constraints tests
- Diagnostics retrieval tests

---

## 13. Exact Build Instructions

If the Fitch backend does not exist:
- Create the module skeleton including jobs directory.

If ingestion is currently a stub:
- Implement real data feed processing using the `pg` database. Create the background cron jobs registered in `products/shahin-ai/jobs/index.ts`.

---

## 14. Acceptance Criteria

Pass only if:
- Scheduled ingestion jobs execute and modify the database.
- Historical tracking accurately records deltas between syncing periods.
- Entity linkage creates real mapping records and allows successful querying.
- Diagnostics accurately report ingestion failures.

---

## 15. Fail Conditions

FAIL if:
- Ratings are stored in memory or local JSON.
- Ingestion bypasses validation contracts.
- Changes in ratings overwrite previous data without inserting into the history table.
- Required architectural artifacts are skipped.

---

## 16. Recommended Next Part

After this module patch, the next recommended module patch is:
**Module Patch 49 — Benchmarks Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to compare the current Fitch implementation against the canonical target, build the missing ingestion and history artifacts, and validate against enterprise rules.

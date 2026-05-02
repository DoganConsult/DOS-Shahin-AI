# Module Patch MP-53 — GRC Query Module End-to-End

## 0. Patch Identity

### 0.1 Patch name
**Module Patch 53 — GRC Query Module End-to-End**

### 0.2 Patch class
This is a **Reusable Module Enforcement Patch**.

### 0.3 Patch purpose
This patch defines the full canonical target for the **GRC Query module** end to end. 

It tells an agent exactly how to:
- inspect cross-module GRC federated data querying, unified search implementations, and Natural Language Query (NLQ) interfaces
- compare the current implementation against the canonical query target without violating tenant boundaries
- know what belongs to GRC Query, what belongs to AI, and how it strictly defers data ownership to source modules

### 0.4 Module identity
- Module code: `grc-query`
- Layer: cross-module support surface
- Criticality: **P2 medium**
- Runtime role: unified search across silos (compliance, risk, audit, policy), federated aggregation, NLQ bridging, complex cross-domain SQL builder
- Primary dependency domains: DOS foundation, DAuth control spine, ai, compliance, risk, controls

---

## 1. Cross-Patch Inheritance Map

This module patch inherits and applies:
- Patch 0 (Common Enforcement Standard)
- Patch 1 (Platform Full-Stack Core)
- Patch 3 (DAuth Access)
- Patch 8 (Audit Integration)
- Patch 11 (Observability)
- Patch 12 (Reporting Core)

---

## 2. Module Purpose and Boundaries

### 2.1 What GRC Query owns directly
- The Unified Search Bar orchestrator
- Advanced visual query builder interface
- Natural Language to SQL/API prompt chain translations
- Cross-module data export capabilities based on federated queries
- Saved query definitions per user

### 2.2 What GRC Query consumes from DOS
- Module registry (to federate queries only to currently licensed and active modules)
- Event backbone (logging complex search operations for audit)

### 2.3 What GRC Query consumes from DAuth
- **Absolute Scoped Access**: Every federated query MUST seamlessly inject the user's DAuth visibility contexts (e.g. `WHERE tenant_id = X AND department_id IN (Y)`) before execution.

### 2.4 What GRC Query consumes from adjacent modules
- **AI**: For Natural Language translation (NL → Domain DSL)
- **Reporting**: Handing off the queried result sets so Reporting can format them as PDFs/Excel.
- **Source Modules**: It queries Risk, Compliance, Policy directly.

### 2.5 What GRC Query must not implement
- **Data Duplication**: It must not run its own shadow database to consolidate data. It queries in real-time or leverages centralized ClickHouse analytics tables.
- **Mutation logic**: GRC Query is purely a read mechanism.

---

## 3. Canonical Backend Structure

```text
backend/src/modules/grc-query/
  controllers/
  routes/
  services/
  repositories/
  contracts/
  schemas/
  types/
  diagnostics/
  ports/
  index.ts
  grc-query.module.ts
```

### 3.1 Required backend service families
- **Federated Engine Service**: Fan-out fan-in data fetcher hitting other modules internally via Ports.
- **NL Translation Service**: Sending user text to the AI module to return structured GraphQL/SQL query representations.
- **Saved Query Service**: Simple CRUD for user bookmarks.
- **Diagnostics Service**: Checking if federated sub-modules are responsive.

---

## 4. Canonical Frontend Structure

```text
frontend/src/app/features/grc-query/
  pages/
  components/
  services/
  contracts/
  store/
  index.ts
```

Required surfaces:
- Global Unified Search Bar (typically injected into the shell nav)
- Results Page with tabbed module groupings (Risks, Controls, Policies)
- Advanced Query Builder (AND/OR logic tree UI)
- Saved Queries library

---

## 5. Data Model Requirements

GRC Query only owns metadata tracking, not the actual GRC data:
- `grc_query_log` — query_hash, user_id, execution_time_ms, module_hits
- `grc_saved_queries` — query_id, user_id, name, query_dsl_json, is_public

---

## 6. API Surface Requirements

Required route groups:
- **Unified Search**: `/api/grc-query/search`
- **Federated Advanced**: `/api/grc-query/federated`
- **NL Query**: `/api/grc-query/nlq`
- **Saved Queries**: `/api/grc-query/saved`

Required contracts:
- `GrcQueryRequestContract`
- `GrcQueryResultContract`
- `GrcSavedQueryContract`

---

## 7. Workflow and DAuth Integration

- **DAuth**: Is explicitly responsible for row-level security. The GrcQuery engine must map the query AST to the necessary DOS permissions before execution.

---

## 8. AI Integration

Allowed AI participation:
- Translation of "Show me all high risks in the HR department missing controls" into a query DSL.
- Summarizing the textual output of the query results.

Restricted:
- AI must not be allowed to bypass DAuth row level security when translating the NLQ.

---

## 9. UI and Experience Requirements

The UI must provide:
- Rapid type-ahead suggestions in the unified search bar
- Complex nested conditionally-rendered filter blocks for the advanced builder
- Skeletons when fetching federated shards 


### 9.1 Cross-Module UX and Interactivity
- **Omnipresent Search Paradigm**: Mounts globally in the DOS shell navigation header, enabling lateral data pivots from any screen.
- **Conversational Data Discovery**: Shifts users from rigid, path-based module clicking into a fluid, NLQ-driven analytical flow.

---

## 10. Settings/Admin/Runtime Control

Required controls:
- Query timeout configurations
- Max result size limits to prevent out-of-memory errors
- Allowed module toggles (e.g. "Do not include Vendor data in Global Search")

---

## 11. Observability and Operations

Required diagnostics:
- Slow query log threshold
- Federated API latency mapping
- NL translation failure rate

---

## 12. Required Tests

- Federation scatter-gather tests
- NL to AST translation unit tests
- **Crucial**: Cross-tenant isolation verification tests during complex joins.

---

## 13. Exact Build Instructions

If GRC query endpoints are missing or just wrapping Elasticsearch blindly:
- Build the API orchestrator that properly routes searches to internal module repositories while injecting DAuth context.
- Implement the saved query PostgreSQL tables.

---

## 14. Acceptance Criteria

Pass only if:
- A single federated search request successfully hits 3+ modules and returns aggregated results.
- DAuth scopes correctly hide data the user shouldn't see.

---

## 15. Fail Conditions

FAIL if:
- GRC Query allows unauthorized users to read protected incident records via search loopholes.
- Queries duplicate source data into a massive unmanageable table.

---

## 16. Recommended Next Part

After this module patch, the next recommended module patch is:
**Module Patch 54 — Playbooks Module End-to-End**

---

## 17. One-Line Use Instruction

Use this patch to verify the federated search engine, ensure precise DAuth isolation over cross-module joins, and classify any memory leak architectures.

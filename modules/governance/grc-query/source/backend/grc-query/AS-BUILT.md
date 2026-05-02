# AS-BUILT: GRC Query Module (MP-53)

## Module Identity
- **Module Code:** `grc-query`
- **Tier:** Cross-Module Support Surface
- **Criticality:** P2

## Owned Artifacts
- **Database Tables:** `grc_query_log`, `grc_saved_queries`
- **API Surface:** `/api/grc-query/` → `/search`, `/federated`, `/nlq`, `/saved`, `/diagnostics`

## Protected Actions
- `grc-query.read` — Execute queries across modules
- `grc-query.manage` — Save and share queries

## Service Families
1. **Federated Engine Service** — `federatedSearch()` (fan-out to risk, compliance, audit, incident, controls)
2. **NL Translation Service** — `nlQuery()` (natural language → structured DSL)
3. **Saved Query Service** — `saveQuery()`, `listSavedQueries()`
4. **Diagnostics Service** — `runDiagnostics()`

## Security Note
This module is read-only — it does NOT mutate data in other modules. All federated queries are scoped by tenant isolation via `safeQuery`.

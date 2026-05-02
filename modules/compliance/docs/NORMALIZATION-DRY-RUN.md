# Compliance Module — Normalization Dry-Run (6 Factors)

> Pure dry run. No file is moved, deleted, edited. Each factor below lists every file involved,
> the exact action proposed, the risk class, and the expected impact. Approve per-factor.

Generated 2026-05-02. Companion to `SUBSTRATE-NEEDS.md` and `DB-USAGE-INVENTORY.md`.

---

## Factor 1 — ROUTES: flatten `interface/http/`, mount orphans

### Current state
- 156 route files (`*.routes.ts`)
- 78 mounted in `bootstrap.ts` (canonical, top-level `interface/http/`)
- **78 orphan files** carrying **251 unique HTTP endpoints not currently online**

### Orphan distribution

| Folder | Orphan files | Why | Action |
|---|---|---|---|
| `interface/http/misc/` (flat + nested under `controls/`, `frameworks/`, `assessment/`, `regulatory/`, `scoring/`) | **44** | One side of each pair is a 21-line stub re-exporting the other; the "real" side has handlers | Merge to top-level; delete stub |
| `interface/http/compliance/` | 10 | Sub-folder copy of compliance routes (some have ~20 endpoints not in canonical) | Diff vs canonical, port unique handlers |
| `interface/http/cws/` (compliance workspace) | 7 | Domain split — never mounted | Mount under `/api/compliance/workspace/*` OR fold into existing routes |
| `interface/http/ksa/` | 4 | Domain split — never mounted | Mount under `/api/ksa/*` (3 already exist as canonical) |
| `interface/http/regulator/` | 3 | Domain split — never mounted | Mount under `/api/regulator/*` |
| `interface/admin/` | 1 (`compliance-admin.routes.ts`) | Different impl than `interface/http/compliance/compliance-admin.routes.ts` (13 ep vs 9 ep) | Diff + merge into one canonical admin router |
| Top-level | 9 | Real route files written but never imported in `bootstrap.ts` | Add imports + mounts |

### Top-level orphans (the easiest 9 wins)

```
interface/http/assessment-templates.routes.ts        10 endpoints — orphaned
interface/http/compliance-diagnostics.routes.ts      6  endpoints — orphaned
interface/http/compliance-obligations.routes.ts      ?  endpoints — orphaned
interface/http/compliance-ws.routes.ts               ?  endpoints — orphaned
interface/http/compliance.routes.ts                  16 endpoints — orphaned (16-ep slim version)
interface/http/control-lifecycle.routes.ts           7  endpoints — orphaned
interface/http/control.routes.ts                     5  endpoints — orphaned
interface/http/documents.routes.ts                   ?  endpoints — orphaned
interface/http/objects.routes.ts                     1  endpoint  — orphaned
```

### Proposed actions (no files touched yet)

1. **Sub-step 1A — Mount the 9 top-level orphans.** One import + one `app.use(...)` line each in `bootstrap.ts`. **Risk: LOW.** Brings ~50+ endpoints online.
2. **Sub-step 1B — Diff each `misc/` pair (one is stub, one is real).** 21 stubs already identified earlier; the 23 real files with handlers move up to `interface/http/<name>.routes.ts` if no top-level collision, else merge handlers into the existing canonical. **Risk: MED** (route paths may already be claimed).
3. **Sub-step 1C — Resolve 4 "two real implementations" pairs.** For each: extract endpoint list from both, take the union (no handler loss), keep one file. Pairs:
   - `compliance.routes.ts` (16 ep top) vs `compliance/compliance.routes.ts` (23 ep) → union ≥ 36 ep
   - `compliance-admin.routes.ts` in `admin/` (13 ep, 227 lines) vs `compliance/compliance-admin.routes.ts` (9 ep, 45 lines)
   - `controls.routes.ts` (3 ep top) vs `misc/controls/controls.routes.ts` (19 ep)
   - `frameworks.routes.ts` (3 ep top) vs `misc/frameworks/frameworks.routes.ts` (4 ep)
4. **Sub-step 1D — Mount `cws/`, `ksa/`, `regulator/` orphans.** Wire each as a sub-router (e.g. `/api/compliance/workspace`, `/api/ksa`, `/api/regulator`). **Risk: MED**.
5. **Sub-step 1E — Delete folder structure (`misc/`, `cws/`, `ksa/`, `regulator/`, `compliance/` subfolders) once everything is moved.** **Risk: LOW** post-move.

### Endpoint coverage after Factor 1
- 740 → 740 (no loss; 251 previously-orphan endpoints now mounted)
- Route files: 156 → ~95
- Folder layers: 4 → 1 (flat `interface/http/`)

---

## Factor 2 — UI SERVICES: pick canonical, dedupe

### Current state — **7 copies of `compliance-api.service.ts`**

| sha (12) | lines | endpoints | path |
|---|---|---|---|
| `55394d63a02e` | **742** | **69** | `ui/features/compliance/services/compliance-api.service.ts` |
| `092f77ddfa24` | 18 | 1 | `ui/services/compliance-api.service.ts` |
| `092f77ddfa24` | 18 | 1 | `ui/compliance/services/compliance-api.service.ts` (identical to above) |
| `a17ddff85627` | 1 | 0 | `ui/features/compliance/pages/controls-group/services/compliance-api.service.ts` |
| `a17ddff85627` | 1 | 0 | `ui/features/compliance/pages/compliance-core-pages/services/compliance-api.service.ts` |
| `a17ddff85627` | 1 | 0 | `ui/features/compliance/pages/assessments-group/services/compliance-api.service.ts` |
| `a17ddff85627` | 1 | 0 | `ui/features/compliance/pages/regulatory-group/services/compliance-api.service.ts` |

### Diagnosis
- **1 canonical** (742 lines, 69 endpoints) — `ui/features/compliance/services/compliance-api.service.ts`
- **2 byte-identical 18-line stubs** — `ui/services/` and `ui/compliance/services/` (delete one or both)
- **4 byte-identical 1-line files** scattered under page-group `services/` subfolders (placeholder shells — delete)

### Proposed actions

| # | Action | File(s) | Risk |
|---|---|---|---|
| 2A | Identify importers of each non-canonical copy | grep across `ui/` | LOW (read-only) |
| 2B | Re-point importers to the canonical 742-line service | Edit imports | MED (depends on count) |
| 2C | Delete 6 dupe files (2 stubs + 4 shells) | `git rm` | LOW after 2B |
| 2D | Audit the other fragmented services (`GrcComplianceService`, `GrcLiveService`, `GrcOperationsService`, `GovernanceApiService`, `KsaRegulatoryApiService`) — keep `ComplianceFeatureApiService` + `KsaRegulatoryApiService` as canonical, deprecate the GRC-namespaced ones | requires per-method audit | HIGH |

### After Factor 2
- 7 → 1 `compliance-api.service.ts`
- Service-name fragmentation reduced from 6 → 2 (Compliance + KsaRegulatory)

---

## Factor 3 — INTERFACE LAYER: move SQL out of `interface/`

### Current state — **131 SQL calls in 19 interface/ files** (HTTP layer should not hold SQL)

```
interface/http/objects.routes.ts                          interface/http/documents.routes.ts
interface/http/cws/cws-posture-foundation.routes.ts       interface/http/regulator/regulator-registry.routes.ts
interface/http/compliance/compliance-extended.routes.ts   interface/http/regulator/regulator-heatmap.routes.ts
interface/http/compliance/compliance.routes.ts            interface/http/control-lifecycle.routes.ts
interface/http/control-lifecycle.routes.ts                interface/http/misc/helpers.ts
interface/http/misc/scoring/scoring-policies.routes.ts    interface/http/misc/frameworks/framework-mapping.routes.ts
interface/http/misc/frameworks/frameworks.routes.ts       interface/http/misc/assessment/nca-export.routes.ts
interface/http/misc/controls/controls.routes.ts           interface/http/misc/controls/control-process-cycle.routes.ts
interface/http/misc/regulatory/knowledge-hub.routes.ts    interface/admin/compliance-admin.routes.ts
interface/controllers/compliance-admin.controller.ts      interface/diagnostics/compliance-diagnostics.service.ts
```

### Proposed actions

| # | Action | Risk |
|---|---|---|
| 3A | For each route file with SQL, extract the SQL into an application-layer service in `application/<area>/` | MED |
| 3B | Replace the SQL in the route with a call to the new service | LOW |
| 3C | Add unit tests on the extracted service | LOW |

### Nuance
This is most valuable AFTER Factor 1 (route flattening), so SQL doesn't get moved twice.

### After Factor 3
- `interface/` SQL count: 131 → 0
- Tests added: ~19 new spec files

---

## Factor 4 — CROSS-MODULE SQL: route `evidence` / `findings` through ports

### Current state — direct SQL on tables we don't own

| File | Tables touched (cross-module) |
|---|---|
| `application/compliance/assessments/compliance-audit-package.service.ts` | `evidence`, `findings` |
| `infrastructure/persistence/auto-extracted.repo.ts` | `evidence`, `findings` |

(Total: 8 refs to `evidence` + 6 to `findings` across these 2 files)

### Proposed actions

| # | Action | Risk |
|---|---|---|
| 4A | Add `evidence.port.ts` and `findings.port.ts` to `compliance/ports/` | LOW |
| 4B | Bind defaults to `@dos/service-client` calls against evidence/audit services | LOW |
| 4C | Replace direct SQL with port calls in the 2 violator files | MED |
| 4D | Update `module.manifest.json` to declare these as `crossModuleClients` | LOW |

### After Factor 4
- 0 cross-module direct SQL
- 2 new ports, contract-bounded
- Module passes "no foreign tables" check for drop-in self-enclosure

---

## Factor 5 — DB MIGRATIONS: extract `qiyas`, normalize numbering

### Current state
- `db/migrations/001_qiyas_tables.sql` (CREATE qiyas tables)
- `db/migrations/001_qiyas_tables_down.sql` (rollback)
- `qiyas` is a separate domain (assessment journey) — does not belong in compliance migrations
- File numbering non-monotonic: `000`, `001×4`, `002`, `003`, `027`, `131`, `132`, `200`, plus per-table extracted files

### Proposed actions

| # | Action | Risk |
|---|---|---|
| 5A | Move `qiyas` migrations to a new `modules/qiyas/` (or wherever qiyas owner lives — search the repo for owner) | MED — needs cross-module owner check |
| 5B | Renumber compliance migrations into a monotonic sequence (preserve checksums in `dos:supersedes-checksum` headers) | HIGH — touches every migration file |
| 5C | Confirm `dos.tenant_migrations` tracker remains consistent | HIGH |
| 5D | Extracted-from files (`*_extracted_from_*.sql`) keep their headers (provenance preserved) | LOW |

### Recommendation
Defer 5B/5C to a separate dedicated PR — too risky to bundle. Only 5A is safe to do in normalization.

### After Factor 5 (5A only)
- 2 fewer files in compliance migrations
- 0 net behavior change (qiyas migrations re-applied from new location)

---

## Factor 6 — DB ACCESS: adopt `tquery`/`pquery`, normalize tenant isolation

### Current state

| Helper | Calls | Purpose |
|---|---|---|
| `safeQuery` | **1361** | Generic — does not enforce tenant isolation |
| `query` | 366 | Raw — does not enforce tenant isolation |
| `withTenantClient` | 37 | Tenant-scoped block — enforces isolation |
| `tquery` | 0 | Canonical tenant query helper — not adopted |
| `pquery` | 0 | Canonical platform query helper — not adopted |

### Tenant isolation gate
Platform-wide rule: any query touching a tenant-scoped table must use `tquery` or `withTenantClient`. `safeQuery` against tenant tables is currently silent risk — RLS catches misuse but the gate doesn't enforce statically.

### Proposed actions

| # | Action | Files | Risk |
|---|---|---|---|
| 6A | Categorize every `safeQuery` call: tenant-scoped vs platform-scoped | 1361 calls in 97 files | LOW (read-only) |
| 6B | Replace tenant-scoped `safeQuery` with `tquery` (or wrap in `withTenantClient`) | est. 1100+ calls | HIGH |
| 6C | Replace platform-scoped `safeQuery` with `pquery` | est. 250+ calls | MED |
| 6D | Replace generic `query()` (366) similarly | 366 calls in ~30 files | HIGH |
| 6E | CI guard: re-add tenant-isolation gate, configure compliance threshold per-batch | gate config | LOW |

### Strategy
This is too big for one PR. Split per phase from `DB-USAGE-INVENTORY.md` §10:
- Phase 1: Frameworks, Controls (highest reference count) — ~24 calls per
- Phase 2: Assessments, Obligations
- Phase 3: Gaps, Attestations
- Phase 4: Regulatory, SoD, Settings

### After Factor 6 (full)
- `safeQuery`/`query`: 1727 → ~50 (only platform-side legitimate uses)
- `tquery`/`pquery` adoption: 0 → ~1700
- Tenant-isolation gate: PASS

---

## Cross-cutting: build smoke + drop-in proof (post-normalization)

Both are read-only verifications, not factors:

| Step | Command | Pass criteria |
|---|---|---|
| Standalone build | `pnpm --filter @dos/module-compliance typecheck` | exit 0 (already passing as of step 3c) |
| Standalone build (with emit) | `pnpm --filter @dos/module-compliance build` | dist/ produced, no diagnostics |
| Test suite | `pnpm --filter @dos/module-compliance test` | all green |
| Drop-in proof | Copy `modules/compliance/` to a fresh product host, register manifest, boot | All routes mount, all UI components register |

---

## Authorization matrix — what to permit

Reply with the factors to authorize. Each is independent and reversible (Factor 5B/6 excepted).

| Factor | What it does | File-touch count | Risk | Reversible |
|---|---|---|---|---|
| **1A** Mount 9 top-level orphans | + endpoints come online | 1 (`bootstrap.ts`) + 9 imports | LOW | yes |
| **1B** Merge `misc/` stub-pairs | -21 stub files, -44 misc orphans | ~65 files | MED | yes |
| **1C** Resolve 4 two-real-impl pairs | merge handlers, no loss | 8 files | MED | yes |
| **1D** Mount cws/ksa/regulator | + endpoints online | 1 + 14 imports | MED | yes |
| **1E** Delete misc/cws/ksa/regulator folders | tree flattening | folder removal | LOW | yes (post-1A-D) |
| **2A-C** Dedupe 6 stub `compliance-api.service.ts` | UI cleanup | 6 dels + import edits | LOW | yes |
| **2D** Service-name canonicalization (Grc* → Compliance*) | UI naming sweep | ~50 files | HIGH | yes |
| **3** SQL out of `interface/` | layer correctness | 19 files | MED | yes |
| **4** Cross-module SQL → ports (`evidence`/`findings`) | self-enclosure | 2 files + 2 ports | MED | yes |
| **5A** Extract qiyas migrations | provenance | 2 files moved | MED | yes |
| **5B** Renumber migrations | numbering hygiene | 46 files | HIGH | NO — defer |
| **6A** Categorize safeQuery calls | inventory | (read-only) | LOW | n/a |
| **6B-D** Migrate to tquery/pquery | tenant isolation | ~1700 calls | HIGH | yes (per call) |

### Recommended order
`1A` → `2A-C` → `1B` → `1C` → `1D` → `1E` → `4` → `3` → `5A` → `6A` → `6B-D` (per phase) → `2D`

---

## What was already shipped this session

| Step | Done |
|---|---|
| Manifest v2 (30 sections) | ✅ |
| UI `@app/dauth` purge (3 files) | ✅ |
| AI port-bypass purge (3 files) | ✅ |
| `_inbound`/`_legacy`/`node_modules` untracked | ✅ |
| Substrate-needs audit doc | ✅ |
| DB-usage-inventory doc | ✅ |
| Typecheck pass | ✅ exit 0 |

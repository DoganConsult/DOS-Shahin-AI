# Compliance Module — DB Usage Inventory (Deep)

> Source-of-truth record. Every table, every query point, every UI → API → DB chain.
> Built per phase so each consolidation step (UI / API / DB) has a verified baseline.

Generated 2026-05-02. Re-run via the inventory commands at the bottom.

---

## 1. Headline metrics

| Surface | Count |
|---|---|
| Migration files (`db/migrations/*.sql`) | **46** |
| Tables CREATE'd by this module (distinct, schema-stripped) | **49** |
| Tables ALTER'd | 25 |
| TypeScript files containing SQL | **216** |
| Files importing `@dos/db` | **97** |
| `safeQuery(...)` calls | **1361** |
| `query(...)` calls (generic) | 366 |
| `withTenantClient(...)` calls | 37 |
| `tquery` / `pquery` calls | 0 (not yet adopted) |
| **Total query points** | **~1764** |
| UI services (`*service*.ts` under `ui/`) | **11** |
| UI components mapping to API services | **48** |
| Distinct `/api/...` endpoints called from UI | 36 |
| `ksa-regulatory-api.service` endpoints | 10 |
| `compliance-api.service` endpoints | 40 |
| Backend route bases declared in manifest | 23 |
| Backend route files (`*.routes.ts`) | 156 (78 mounted, 78 orphan — see ROUTE-AUDIT) |

---

## 2. Tables OWNED by compliance (49 distinct, schema-prefixed in migrations)

```
assessments                          control_test_schedules
attestation_campaigns                crosswalk_mappings
attestation_drafts                   csa_campaigns
attestation_records                  csa_responses
compliance_ai_suggestions            entities
compliance_assessments               grc_architecture_map
compliance_attachments               grc_audit_universe
compliance_attestations              grc_framework_dependencies
compliance_calendar                  grc_kri_catalog
compliance_change_log                grc_maturity_model
compliance_comments                  grc_risk_domain_coverage
compliance_controls_mapping          maturity_assessments
compliance_evidence_links            obligations
compliance_exceptions                sod_conflict_matrix
compliance_external_mappings         sod_rules
compliance_frameworks                sod_waivers
compliance_gaps                      ucf_controls
compliance_kpis
compliance_monitoring                # plus referenced from manifest target list:
compliance_obligations               frameworks
compliance_posture_scores            controls
compliance_programs                  control_objectives
compliance_regulatory_changes        control_testing
compliance_report_snapshots
compliance_requirements
compliance_roadmap
compliance_settings
compliance_tags
compliance_versions
control_deficiencies
control_effectiveness_assessments
control_scope_tags
```

> All tables are tenant-scoped via `__TENANT_SCHEMA__` prefix at migration time → resolved to `<tenant>.{table}` per tenant.

---

## 3. Top 15 tables actually referenced from code (`${schema}.<table>` pattern)

| Refs | Table |
|---|---|
| 12 | `crosswalk_mappings` |
| 12 | `controls` |
| 11 | `ucf_controls` |
| 9  | `compliance_assessments` |
| 8  | `evidence` (referenced — not owned, lives in evidence module) |
| 6  | `findings` |
| 6  | `attestation_reminders` |
| 4  | `gaps` |
| 4  | `frameworks` |
| 4  | `compliance_attestations` |
| 3  | `compliance_items` |
| 2  | `control_evidence_requirements` |
| 2  | `compliance_overview_snapshots` |
| 2  | `audit_log` (referenced — owned by audit module) |
| 2  | `assessments` |

Cross-module table dependencies: `evidence`, `findings`, `audit_log`. These must be reached through cross-module APIs/events, not direct SQL — verify in route handlers.

---

## 4. Migration file inventory (purpose per file)

```
000_extracted_from_000_inline_baseline.sql           extracted from ops/migrations/tenant/000_inline_baseline.sql
001_compliance_tables.sql                            Module: compliance | Migration: 001
001_compliance_tables_down.sql                       Rollback for 001
001_extracted_from_001_compliance_tables.sql         extracted from compliance-controls-service
001_qiyas_tables.sql                                 qiyas-journey-service tables (cross-module owned)
001_qiyas_tables_down.sql                            Rollback
002_enterprise_expansion.sql                        Enterprise expansion
003_advanced_controls_tables.sql                    Advanced controls
027_extracted_from_027_tenant_schema_tables.sql     extracted from ops/migrations/tenant/027
131_sod_rules.sql                                   SoD rules — supersedes prior checksum
132_sod_waivers.sql                                 SoD waivers — supersedes prior checksum
200_seed_ksa_grc_allsectors_catalog.sql             Seed: KSA GRC all-sectors catalog
... (35 more files — see `db/migrations/` for full list)
```

**Observations**
- 4 distinct sources merged in: original module migrations, extracted from `services/compliance-controls-service/`, extracted from `ops/migrations/tenant/`, plus `qiyas-journey-service` tables.
- `qiyas` tables look misplaced — that's a separate module's data inside compliance migrations. **Flag for review.**
- Numbering is non-monotonic (`000`, `001x4`, `002`, `003`, `027`, `131`, `132`, `200`) — runner relies on `dos.tenant_migrations` checksum tracking, not file order.

---

## 5. Query density per top-level area

| Area | Calls | Files | Avg/file |
|---|---|---|---|
| `application/` | 548 | 59 | 9 |
| `infrastructure/` | 719 | 25 | 29 |
| `interface/` | 131 | 19 | 7 |
| **Total** | **1398** | **103** | — |

(Discrepancy with 1361+366+37=1764 above: that count includes generic `query(...)` matches outside the strict helper set; the per-area table only counts the 4 helpers.)

`infrastructure/` is the heaviest — repository/adapter layer. `application/` is healthy spread. `interface/` should ideally be near 0 (HTTP layer should not hold SQL); 131 calls there are a smell.

---

## 6. UI services (Angular)

| Service file | Endpoints called |
|---|---|
| `ui/features/compliance/services/compliance-api.service.ts` | **40** |
| `ui/features/compliance/services/ksa-regulatory-api.service.ts` | 10 |
| `ui/features/compliance/services/grc-compliance.service.ts` | 1 |
| `ui/features/compliance/services/assessment-api.service.ts` | 0 (delegates) |
| `ui/features/compliance/services/control-process-cycle.service.ts` | (TBD) |
| `ui/compliance/services/compliance-api.service.ts` | 1 (likely legacy) |
| (5 more) | various |

**Observation**: There are TWO `compliance-api.service.ts` files (`ui/compliance/services/` and `ui/features/compliance/services/`) — duplicate UI service. Decide canonical, delete other.

### `compliance-api.service` endpoints (the workhorse)

```
/api/compliance                       /api/controls
/api/compliance/dashboard             /api/controls/
/api/compliance/gap-analysis/         /api/controls/actions
/api/compliance/obligations           /api/controls/bulk-assign-team
/api/compliance/obligations/          /api/controls/ccm-dashboard
/api/compliance/obligations/framework/ /api/controls/failures
/api/compliance/remediations          /api/controls/failures/
/api/compliance/remediations/         /api/controls/monitoring
/api/compliance-attestation/campaigns /api/controls/team-distribution
/api/compliance-attestation/campaigns/ /api/controls/tests
/api/compliance-ws                    /api/audit/cross-module/status
/api/assessment-templates             /api/audit/finding-trends/severity
/api/assessment-templates/            /api/audit/overview
/api/assessment-templates/assessment/ /api/audit/ratings/summary
/api/assessment-templates/categories
```

### `ksa-regulatory-api.service` endpoints

```
/api/ksa-cross-framework/mappings
/api/ksa-cross-framework/mappings/store
/api/ksa-cross-framework/summary
/api/ksa-regulatory
/api/ksa-regulatory-changes
/api/ksa-regulatory-changes/
/api/ksa-sector-maturity/assess
/api/ksa-sector-maturity/benchmark/
/api/ksa-sector-maturity/model
/api/ksa-sector-maturity/models
```

---

## 7. UI component → service usage (sample of 48)

| UI component | Services injected |
|---|---|
| `compliance/pages/regulatory-group/compliance-regulatory/compliance-frameworks-page.component.ts` | `ComplianceFeatureApiService`, `MessageService` |
| `compliance/pages/regulatory-group/compliance-regulatory/compliance-obligations-page.component.ts` | `ComplianceFeatureApiService` |
| `compliance/pages/regulatory-group/compliance-regulatory/obligation-detail-page.component.ts` | `ComplianceFeatureApiService`, `MessageService` |
| `compliance/pages/assessments-group/compliance-assessments-findings/compliance-assessments-page.component.ts` | `ApiClientService`, `ComplianceFeatureApiService`, `MessageService` |
| `compliance/pages/assessments-group/compliance-assessments-findings/compliance-attestations-page.component.ts` | `ComplianceFeatureApiService` |
| `compliance/pages/assessments-group/compliance-assessments-findings/compliance-findings-page.component.ts` | `ComplianceFeatureApiService`, `MessageService` |
| `compliance/pages/assessments-group/compliance-assessments-findings/compliance-gaps-page.component.ts` | `ComplianceFeatureApiService` |
| `compliance/pages/scoring-maturity/maturity/maturity-wizard.component.ts` | `GrcComplianceService`, `GrcOperationsService`, `MessageService`, `StorageService` |
| `compliance/pages/regulatory-group/regulation-compiler/regulation-compiler.component.ts` | `GrcComplianceService`, `MessageService` |
| `compliance/pages/regulatory-group/regulatory-feeds/regulatory-feeds.component.ts` | `ApiClientService` |
| `compliance/pages/registry/registry.component.ts` | `GrcComplianceService`, `MessageService` |
| `compliance/pages/sox-compliance/sox-compliance.component.ts` | `ApiClientService`, `GrcComplianceService`, `GrcLiveService`, `MessageService` |
| `compliance/pages/esg/esg.component.ts` | `ApiClientService`, `GrcComplianceService`, `GrcLiveService`, `GrcOperationsService`, `MessageService` |
| `compliance/pages/ethics-integrity/ethics-integrity.component.ts` | `ApiClientService`, `MessageService` |
| `compliance/pages/taxonomy/taxonomy.component.ts` | `ApiClientService` |
| `compliance/pages/mapping/mapping.component.ts` | `ApiClientService`, `GrcLiveService`, `GrcOperationsService`, `MessageService` |
| `compliance/pages/ontology-catalog/ontology-catalog.component.ts` | `ApiClientService` |
| `compliance/pages/content-pack/content-pack.component.ts` | `ConfirmationService`, `GrcOperationsService` |
| `compliance/pages/scoring-maturity/scoring-policies/scoring-policies.component.ts` | `GrcComplianceService`, `GrcLiveService`, `MessageService` |
| `compliance/pages/scoring-maturity/scoring/scoring.component.ts` | `GrcComplianceService` |
| `compliance/pages/assessments-group/assessment-templates/assessment-templates.component.ts` | `GrcComplianceService`, `GrcLiveService`, `MessageService` |
| `compliance/components/ksa-regulatory-calendar.component.ts` | `GovernanceApiService`, `KsaRegulatoryApiService`, `MessageService` |

(full list in `/tmp/db-inv/ui-component-services.txt` — 48 entries)

**Service-name canonicality issue**: pages reference at least 6 different "compliance" services:
- `ComplianceFeatureApiService` (newer, per-feature)
- `ComplianceApiService` (older?)
- `GrcComplianceService` (legacy GRC namespace)
- `GrcOperationsService`, `GrcLiveService`, `GovernanceApiService`, `KsaRegulatoryApiService`, `ApiClientService` (generic)

A drop-in self-enclosed module should expose ONE canonical UI service per resource group.

---

## 8. Backend route → DB tables — chain map (canonical 5 routes)

| HTTP route base | Route file | Application services | Likely tables touched |
|---|---|---|---|
| `/api/compliance` | `interface/http/compliance.routes.ts` | `application/compliance/core/*` | `compliance_obligations`, `compliance_assessments`, `compliance_gaps`, `compliance_settings` |
| `/api/controls` | `interface/http/controls.routes.ts` | `application/controls/*` | `controls`, `control_objectives`, `control_testing`, `control_effectiveness_assessments`, `control_deficiencies` |
| `/api/frameworks` | `interface/http/frameworks.routes.ts` | `application/frameworks/*` | `compliance_frameworks`, `frameworks`, `crosswalk_mappings`, `ucf_controls` |
| `/api/obligations` | `interface/http/obligations.routes.ts` | `application/compliance/obligations/*` | `compliance_obligations`, `obligations`, `compliance_requirements` |
| `/api/assessments` | `interface/http/assessments.routes.ts` | `application/compliance/assessments/*` | `compliance_assessments`, `assessments`, `attestation_records`, `compliance_ai_suggestions` |

> Full per-route → DB-table map needs an AST walk; this version is from grep + folder structure. Run the full map only when needed (cost: ~5 min on this repo).

---

## 9. Cross-module dependencies (tables we reference but DO NOT own)

| Table | Owner module | Access pattern |
|---|---|---|
| `evidence`, `evidence_items` | `evidence/` | direct SQL ❌ → must use evidence service API |
| `findings` | `audit/` | direct SQL ❌ → must use audit service API |
| `audit_log`, `audit_trail` | `audit/` | mostly via `@dos/module-sdk/audit` ✅ |
| `risks`, `risk_assessments` | `risk/` | declared in manifest as referenced; verify access pattern |
| `policies` | `policy/` | declared; verify access |
| `vendors` | `vendor/` | declared via event `vendor.compliance_gap_propagated` ✅ |
| `employees`, `departments`, `org_units` | `platform/foundation/` | via `foundation.port` ✅ |
| `users`, `tenants` | platform | via auth port ✅ |
| `workflow_instances` | platform workflow | via `@dos/platform-core/workflows` ✅ |

**Violations to flag**: 8 references to `evidence` / 6 to `findings` from compliance code. Drop-in self-enclosure requires these go through cross-module ports/clients, not raw SQL.

---

## 10. Per-phase usage map

### Phase: Frameworks
- **DB tables (owned)**: `compliance_frameworks`, `frameworks`, `crosswalk_mappings`, `ucf_controls`, `grc_framework_dependencies`
- **Backend routes**: `/api/frameworks`, `/api/framework-mapping`, `/api/ucf`, `/api/mappings`
- **UI components**: `compliance-frameworks-page`, `framework-mapping`, `framework-harmonization`, `ucf` group
- **Cross-module reads**: none
- **Events published**: `compliance.framework_mapping_updated`, `compliance.framework_gap_identified`

### Phase: Controls
- **DB tables (owned)**: `controls`, `control_objectives`, `control_testing`, `control_effectiveness_assessments`, `control_deficiencies`, `control_scope_tags`, `control_test_schedules`, `compliance_controls_mapping`
- **Backend routes**: `/api/controls`, `/api/control`, `/api/compliance-controls`
- **UI components**: `compliance-controls-page`, `compliance-controls-monitoring/*`, scoring components
- **Cross-module reads**: `evidence` (8 refs — VIOLATION; should be via evidence API)
- **Events published**: `controls.created`, `controls.status_changed`, `controls.effectiveness_tested`, `controls.effectiveness_failed`, `controls.deficiency_detected`

### Phase: Obligations
- **DB tables (owned)**: `compliance_obligations`, `obligations`, `compliance_requirements`
- **Backend routes**: `/api/compliance/obligations`, `/api/obligations`, `/api/requirements`
- **UI components**: `compliance-obligations-page`, `obligation-detail-page`
- **Events**: subscribes `regulatory_changes` → updates obligations

### Phase: Assessments
- **DB tables (owned)**: `compliance_assessments`, `assessments`, `compliance_ai_suggestions`, `maturity_assessments`
- **Backend routes**: `/api/compliance/assessments`, `/api/assessment-templates`, `/api/nca-assessment`, `/api/sama-assessment`, `/api/rcsa`
- **UI components**: `compliance-assessments-page`, `assessment-templates`, `nca-assessment`, `sama-assessment`, `maturity-wizard`
- **Cross-module**: ai port for findings suggestions

### Phase: Gaps & Findings
- **DB tables (owned)**: `compliance_gaps`, `compliance_posture_scores`, `compliance_overview_snapshots`
- **Cross-module reads**: `findings` (6 refs — VIOLATION; should be via audit API)
- **Backend routes**: `/api/compliance/gap-analysis`, `/api/compliance/gaps`
- **Events published**: `compliance.gap_detected`, `compliance.gap_closed`, `compliance.posture_changed`

### Phase: Attestations & CSA
- **DB tables (owned)**: `attestation_campaigns`, `attestation_records`, `attestation_drafts`, `compliance_attestations`, `csa_campaigns`, `csa_responses`
- **Backend routes**: `/api/compliance-attestation/campaigns`, `/api/attestations`, `/api/csa-*`
- **UI components**: `compliance-attestations-page`
- **Events**: `compliance.attestation_campaign_started`, `compliance.attestation_recorded`

### Phase: Regulatory & Submissions
- **DB tables (owned)**: `compliance_regulatory_changes`, `regulator_bulletins`, `submission_packets`, `ksa_sector_maturity`, `ksa_regulatory_changes`, `ksa_regulatory_reports`
- **Backend routes**: `/api/ksa-regulatory-changes`, `/api/ksa-sector-maturity`, `/api/ksa-cross-framework`, `/api/regulatory-changes`
- **UI components**: `regulation-compiler`, `regulatory-feeds`, `ksa-regulatory-calendar`
- **Cross-module**: AI port for narrative generation

### Phase: SoD & Conflicts
- **DB tables (owned)**: `sod_conflict_matrix`, `sod_rules`, `sod_waivers`
- **Cross-module reads**: `employees`, `departments`, `org_units` (via `foundation.port` ✅)
- **Backend routes**: `/api/sod-conflict-matrix`, `/api/sod-runtime`
- **Events subscribes**: `foundation.scope_changed`, `foundation.org_created`

### Phase: Settings, KPIs, Snapshots
- **DB tables (owned)**: `compliance_settings`, `compliance_kpis`, `compliance_calendar`, `compliance_change_log`, `compliance_comments`, `compliance_tags`, `compliance_versions`, `compliance_external_mappings`, `compliance_report_snapshots`, `compliance_attachments`, `compliance_evidence_links`, `compliance_exceptions`, `compliance_monitoring`, `compliance_programs`, `compliance_roadmap`
- **Backend routes**: `/api/settings`, `/api/kpis`, `/api/calendar`, `/api/tags`, `/api/comments`, `/api/change-log`, `/api/versions`, `/api/programs`, `/api/roadmap`, `/api/monitoring`, `/api/posture-scores`
- **UI components**: scattered across pages

---

## 11. Findings & action list

### Findings
1. **8 cross-module SQL violations** — `evidence` and `findings` accessed by direct SQL.
2. **2 duplicate UI services** — `compliance-api.service.ts` exists in both `ui/compliance/services/` and `ui/features/compliance/services/`.
3. **6 different UI service names** for compliance work — fragmented naming, no canonical service.
4. **131 SQL calls in `interface/`** — HTTP layer should not hold SQL; smells of skipped application layer.
5. **`qiyas` migrations live inside compliance** — likely belongs in a separate module.
6. **Migration numbering non-monotonic** — relies on checksum tracking, easy to mis-order.
7. **0 `tquery`/`pquery` adoption** — module still using `safeQuery` / `withTenantClient`. Tenant-isolation gate doesn't enforce here yet.
8. **No per-route OpenAPI doc for ~700 of 740 endpoints** — only 42 in openapi.yaml.

### Phase-by-phase fix order (prerequisites for "drop-in reusable")
| Phase | Fix |
|---|---|
| DB | Move cross-module table reads (`evidence`, `findings`) behind module API clients |
| DB | Audit `qiyas` tables — extract to its own module if owned elsewhere |
| DB | Adopt `tquery`/`pquery` — replace `safeQuery` calls in tenant-scoped paths |
| API | Mount the 78 orphan route files (251 unique endpoints offline today) |
| API | Move SQL out of `interface/` (131 calls) into `application/` |
| API | Backfill OpenAPI for the ~700 undocumented endpoints |
| UI | Pick ONE canonical compliance API service; delete the duplicate `compliance-api.service.ts` |
| UI | Rename to a single hierarchy: `ComplianceApiService` per resource group |

---

## 12. Re-run commands (audit reproducibility)

From `modules/compliance/`:

```bash
# Tables created
grep -hiE "CREATE TABLE (IF NOT EXISTS )?\"?[a-z_.]+\"?" db/migrations/*.sql | \
  sed -E 's/CREATE TABLE (IF NOT EXISTS )?//I; s/"//g; s/__TENANT_SCHEMA__\.//' | sort -u

# Tables referenced from code (\${schema}.X)
grep -rhoE '\$\{schema\}\.[a-z_]+' --include='*.ts' application/ infrastructure/ interface/ | \
  sort | uniq -c | sort -rn

# Query call density
for area in application infrastructure interface; do
  c=$(grep -rE "\b(safeQuery|withTenantClient|tquery|pquery)\s*\(" --include='*.ts' "$area/" | wc -l)
  echo "$area/: $c"
done

# UI components → services
for page in $(find ui/features -name '*.component.ts'); do
  imports=$(grep -E "import.*Service" "$page" | grep -oE "[A-Z][a-zA-Z]+(Api)?Service" | sort -u | tr '\n' ',')
  [ -n "$imports" ] && echo "$page → $imports"
done

# UI services → /api endpoints
for svc in $(find ui -name '*service*.ts' -not -name '*.spec.ts'); do
  apis=$(grep -oE "['\\\`\"]/api/[a-z0-9/:_-]+" "$svc" | tr -d "'\\\`\"" | sort -u)
  [ -n "$apis" ] && { echo "--- $svc ---"; echo "$apis"; }
done
```

All raw outputs are cached in `/tmp/db-inv/` from the inventory run.

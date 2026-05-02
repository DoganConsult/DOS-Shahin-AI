# Compliance Module — Provisioning & Seeding Specification

**Module code:** `compliance` · **Kind:** `business` · **Product:** Shahin AI · **Lifecycle:** GA

This document is the contractual checklist for bringing the Compliance module to **100% provisioned** for any tenant. It uses the same four-class taxonomy as the Foundation spec:

| Class | Meaning |
|---|---|
| **A. MUST-PROVISION (DDL)** | Schema/tables — required for module to load |
| **B. MUST-SEED — Process Content** | Permissions, roles, frameworks catalogue, control library, assessment-type catalogue, compliance-status enum. Module logic depends on these |
| **C. MAY-SEED — Demo Content** | Sample assessments, gaps, attestation campaigns to populate empty pages |
| **D. MAY-SEED — Guidance Templates** | Default framework selection, default review cycle, suggested control inheritance — user is expected to confirm/modify |

---

## A. MUST-PROVISION — Database Footprint (DDL)

Run via `pnpm migrate` against both the `dos.*` shared schema and per-tenant `tenant_<code>.*` schema.

### Owned tables (per-tenant `__TENANT_SCHEMA__` substituted at apply time)

From [`db/migrations/`](./db/migrations/):

- **Baseline (`000_extracted_from_000_inline_baseline.sql`)** — `obligations`, `sod_conflict_matrix`, `entities`, `assessments`
- **Compliance core (`001_compliance_tables.sql`)** — `compliance_frameworks`, `compliance_requirements`, `compliance_assessments`, `compliance_gaps`, `compliance_obligations`
- **Shared catalogue (`001_extracted_from_001_compliance_tables.sql`)** — `dos.compliance_frameworks`, `dos.compliance_requirements`
- **Maturity (`001_qiyas_tables.sql`)** — `dos.maturity_assessments`
- **Enterprise expansion (`002_enterprise_expansion.sql`)** — `compliance_versions`, `compliance_change_log`, `compliance_settings`, `compliance_kpis`, `compliance_report_snapshots`, `compliance_ai_suggestions`, `compliance_external_mappings`, `compliance_attachments`
- **Advanced controls (`003_advanced_controls_tables.sql`)** — control objectives, control testing, control evidence links
- **SoD (`131_sod_rules.sql`, `132_sod_waivers.sql`)** — `sod_rules`, `sod_waivers`
- **Public catalogue (`200_seed_ksa_grc_allsectors_catalog.sql`)** — `public.grc_audit_universe`, `public.grc_kri_catalog` (+ peers)
- **Tenant schema (`027_extracted_from_027_tenant_schema_tables.sql`)** — additional tenant-side tables

### Manifest-declared owned tables
`frameworks`, `controls`, `compliance_mappings`, `compliance_assessments`, `compliance_gaps`, `compliance_requirements`, `control_objectives`, `control_testing`, `control_evidence_links`

### Referenced (read-only) tables
`tenants`, `users`, `workflow_instances`, `risks`, `evidence_items`, `policies`, `audit_trail`

---

## B. MUST-SEED — Process Content (deploy-time, all tenants)

Without this, framework dropdowns are empty, assessments cannot be created, and `kickstartCompliance` fails fast with `"No frameworks provisioned — complete onboarding first"` (see `services/tenant-service/dist/domain/provisioning/module-kickstart.service.js` `kickstartCompliance`).

| Item | Volume | Source | Target |
|---|---|---|---|
| **Permission codes** (33+) | `compliance:read/write/delete/approve/manage`, dot variants `compliance.read/manage`, plus 22 fine-grained: `compliance.obligations.*`, `compliance.controls.*`, `compliance.assessments.*`, `compliance.attestation.*`, `compliance.regulatory.*`, `compliance.gaps.*`, `compliance.analytics.read` | [`contracts/compliance.permissions.ts`](./contracts/compliance.permissions.ts) → seed migration | `dos.permissions` |
| **Role bindings** | bind to `compliance_admin`, `compliance_officer`, `auditor`, `member` | foundation zero_blocker bindings + module migrations | `dos.role_permissions` |
| **Frameworks catalogue** | KSA: SAMA, ECC, PDPL, NCA-ECC, NCA-CCC; international: ISO27001, NIST CSF, SOC 2 | [`infrastructure/data/compliance-seed.ts`](./infrastructure/data/compliance-seed.ts) + [`infrastructure/data/ksa-frameworks/`](./infrastructure/data/ksa-frameworks/) | `dos.compliance_frameworks` / per-tenant `frameworks` |
| **KSA all-sectors catalogue** | **807 INSERT rows** — audit universe, KRI catalogue, regulatory bodies, sector mappings | `200_seed_ksa_grc_allsectors_catalog.sql` (generated from `DOS-AIO-Specs/KSA_GRC_AllSectors_Complete.xlsx`) | `public.grc_audit_universe`, `public.grc_kri_catalog`, peers |
| **Compliance levels** (5) | `compliant`, `substantially_compliant`, `partially_compliant`, `non_compliant` (+ design tokens for color) | `compliance-seed.ts::complianceLevels` | `dos.compliance_status_catalog` |
| **Assessment types** | self_assessment, internal_audit, external_audit, regulatory_inspection (with `requiresExternalAuditor` flag) | `compliance-seed.ts::assessmentTypes` | `dos.assessment_types` |
| **Gap severities** | critical, major, minor, observation | `compliance-seed.ts::SEED_COLORS` | `dos.gap_severities` |
| **SoD rules** | conflict matrix seed | `131_sod_rules.sql`, `132_sod_waivers.sql` | `dos.sod_rules` |
| **Default constants** | `COMPLIANCE_LIMITS`, `COMPLIANCE_TIMEOUTS`, `COMPLIANCE_SLA_DEFAULTS` | [`infrastructure/data/compliance-constants.ts`](./infrastructure/data/compliance-constants.ts) | application config |
| **Workflow templates** | `compliance_assessment_lifecycle`, `gap_remediation`, `attestation_campaign`, `framework_mapping_review` | manifest `events.publishes` triggers | workflow-service registry |
| **Reference data declared in manifest** | `frameworks`, `controls`, `assessment_types`, `compliance_statuses` (`requiredReferenceData`) | seed providers | per-tenant catalogues |

---

## C. MAY-SEED — Demo Content (per-tenant, toggleable)

There is **no canonical demo seed file** for compliance equivalent to `foundation-demo-tenant.sql` — this is a gap (see below). A demo seed should produce:

| Entity | Suggested sample rows |
|---|---|
| `compliance_assessments` | 1 baseline assessment per active framework (state = `in_progress`) |
| `compliance_requirements` | inherited from framework catalogue (already seeded as process content) |
| `compliance_gaps` | 5–10 sample gaps spanning severities (critical/major/minor) for visualization |
| `compliance_obligations` | one regulatory obligation per active framework with a near-term due date |
| `attestation_campaigns` | 1 campaign in `draft` for a sample population |
| `compliance_kpis` | 3 KPIs (coverage %, overdue gaps, attestation completion) |

---

## D. MAY-SEED — Guidance Templates (per-tenant, starter content)

Inserted by `kickstartCompliance(tenantId, userId)` ([`module-kickstart.service.js`](../../services/tenant-service/dist/domain/provisioning/module-kickstart.service.js)) when the module is activated.

Behavior today:
1. Reads up to **5 frameworks** from `tenant_<code>.frameworks` (provisioned in step B).
2. For each framework, creates a **`control_review` task**: *"Gap assessment: <framework name>"* (priority high, assigned to `system`, due in default SLA).
3. Writes `module_kickstart_log.compliance` with status + artifact list.

Plus the manifest-declared `tenantDefaults`:

| Default | Manifest key | Intent |
|---|---|---|
| Default framework | `compliance_default_framework` | Pre-select e.g. ECC for KSA tenants — user can change |
| Review cycle (days) | `compliance_review_cycle_days` | Default 90 days — user adjusts |

End-user is expected to confirm framework selection during onboarding wizard, then the system instantiates per-framework gap assessments as actual process content.

---

## Activation Inputs Required

| Input | Source | Used for |
|---|---|---|
| `tenantId` | foundation provisioned tenant | scope all writes |
| `tenantCode` → `tenant_<code>` schema | foundation provisioner | runs `001_compliance_tables.sql` against it |
| `ownerUserId` | `platform_dauth.users` | task `assigned_to`, audit `created_by` |
| `workspaceId` | `tenant_<code>.workspaces` | task linkage |
| **Selected frameworks** | onboarding wizard | filters which `dos.compliance_frameworks` rows clone into tenant |
| **Country / sector** | `public.tenants.settings` | drives KSA sector pack selection from `grc_audit_universe` |
| `WORKFLOW_SERVICE_URL` env | ops | template instantiation |
| Permission `compliance.read` (min) | DAuth token | UI access |

---

## Definition-of-Done Checklist

- [x] Per-tenant schema migrated with all `compliance_*` tables
- [x] `dos.compliance_frameworks` + `dos.compliance_requirements` populated
- [x] KSA all-sectors catalogue (807 rows) loaded into `public.grc_*`
- [x] 33+ permission codes seeded; bindings to `compliance_admin` / `compliance_officer` / `auditor` present
- [x] Compliance levels, gap severities, assessment types catalogues populated
- [x] `tenantDefaults`: default framework + review cycle written to `compliance_settings`
- [ ] Onboarding wizard ran — at least 1 framework selected and cloned into tenant `frameworks` table
- [ ] `kickstartCompliance` ran successfully (≥1 framework discovered + per-framework gap-assessment tasks created) → `module_kickstart_log.compliance = completed`
- [ ] Workflow templates registered with workflow-service
- [ ] (optional) Demo gaps + attestation campaign seeded
- [x] DAuth token includes `compliance.read` (or `member`)
- [x] `GET /api/compliance/frameworks` returns 200 with non-empty data
- [x] `GET /api/compliance/health` returns 200
- [x] Negative test: role without `compliance.read` gets 403
- [x] Event publishers fire on first gap detection (`compliance.gap_detected`)

---

## Gaps Identified

1. **No `module-migration-bundle.json` for compliance** (Foundation has one, compliance does not) — migrations are picked up by file-name convention only, with no declared `ordered[]`, no `down` mapping, and no `seeds[]` registry. **Fix:** author bundle with explicit ordering.
2. **`kickstartCompliance` fails fast when no frameworks exist** but the onboarding wizard step that selects frameworks is decoupled from the kickstart trigger. A tenant can be marked "active" without a framework, then every compliance page renders empty. **Fix:** make framework selection a **gating step** of `tenant.status='active'`, OR have `kickstartCompliance` auto-clone the manifest's `compliance_default_framework` if none selected.
3. **No demo seed file.** Compliance pages render blank for fresh tenants. **Fix:** add `db/seeds/compliance-demo-tenant.sql` mirroring `foundation-demo-tenant.sql` (idempotent, gated by `SEED_DEMO_DATA`).
4. **Permission code split** — manifest references `compliance:read` (colon) and `compliance.read` (dot) for the same concept. Routes mix both. **Fix:** reconcile to dot-notation everywhere, mirror the foundation `_1510` reconciliation pattern.
5. **`requiredReferenceData` declared in manifest but no validator** — nothing checks that `frameworks`, `controls`, `assessment_types`, `compliance_statuses` are populated before module activation. **Fix:** add a pre-activation health check that returns degraded if any reference table is empty, blocking `module_kickstart_log` from going to `completed`.
6. **Workflow templates publish events but no template registration migration** is shipped in the module — relies on `instantiateTemplate` HTTP call which silently swallows errors (`catch { return null; }`). **Fix:** add a startup-time template registration that fails loudly if workflow-service is unreachable.
7. **`200_seed_ksa_grc_allsectors_catalog.sql` is auto-generated from an Excel file** with no provenance tracking — re-running the generator will produce diffs that look like manual edits. **Fix:** lock the source spreadsheet checksum + date in a header comment block.
8. **Mixed schema strategy** — some tables live in `dos.*` (shared catalogue), some in `__TENANT_SCHEMA__.*` (per-tenant copies); the rules for which goes where are not documented and seem inconsistent (e.g. `compliance_frameworks` exists in both). **Fix:** publish a "shared vs tenant-local" decision matrix as part of the manifest.
9. **No `module_kickstart_log` failure surface in the UI** — operators cannot see that a tenant's compliance kickstart failed for "no frameworks" until they query the DB directly. **Fix:** expose `/api/admin/tenant/<id>/kickstart-status` panel.
10. **Sector packs are optional but `grc_audit_universe` is global (`public.*`)** — multi-region tenants share the same KSA-centric audit universe. **Fix:** scope by `region`/`country` columns and filter at query time.

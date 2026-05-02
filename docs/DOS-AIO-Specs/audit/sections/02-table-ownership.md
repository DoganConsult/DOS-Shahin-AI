# Section 2 — Table Ownership Matrix (cross-cutting)

**Source:** `module.manifest.json` × 50 (with `ownedTables` populated) cross-referenced against live `shahin_grc` table list.
**Raw evidence:** [`../_evidence/08-manifest-owned-tables.tsv`](../_evidence/08-manifest-owned-tables.tsv), [`../_evidence/09-duplicate-tables.tsv`](../_evidence/09-duplicate-tables.tsv).

## 2.1 Module → declared owned tables (50 manifests)

This matrix is the **declared** truth from manifests. Reconciliation against actual DB is in each phase's per-module file.

| Module | Owner team | Product | Service | # owned tables (declared) | Manifest path |
|--------|-----------|---------|---------|--------------------------:|---------------|
| onboarding | product-shahin-ai | shahin-ai | onboarding-service | 22 | `Onboarding Module/modules-onboarding/module.manifest.json` |
| journey | product-shahin-ai | shahin-ai | onboarding-service | 10 | `Onboarding Module/journey/module.manifest.json` |
| bcp | product-shahin-ai | shahin-ai | bcp-service | 28 | `BCP Module/_sources/modules_bcp/module.manifest.json` |
| vendor | product-shahin-ai | shahin-ai | vendor-service | 34 | `Vendor Module/_sources/modules_vendor/module.manifest.json` |
| qiyas | product-shahin-ai | shahin-ai | qiyas-journey-service | 20 | `Qiyas Module/module.manifest.json` |
| integrations | product-shahin-ai | shahin-ai | integrations-service | 8 | `integrations/module.manifest.json` (also `modules/integrations`) |
| dora | product-shahin-ai | shahin-ai | dora-service | 17 | `DORA Module/module.manifest.json` |
| evidence | product-shahin-ai | shahin-ai | evidence-audit-reporting-service | 7 | `Evidence Module/module.manifest.json` |
| governance | product-shahin-ai | shahin-ai | governance-policy-service | 4 | `Governance Module/module.manifest.json` |
| governance-os | product-shahin-ai | shahin-ai | governance-policy-service | 11 | `Governance Module/governance-os/module.manifest.json` |
| governance-ai | product-shahin-ai | shahin-ai | ai-governance-service | (see manifest) | `Governance Module/governance-ai/module.manifest.json` |
| incident | product-shahin-ai | shahin-ai | risk-incident-service | (see manifest) | `Incident Module/module.manifest.json` |
| mcp | product-shahin-ai | shahin-ai | mcp-gateway-service | (see manifest) | `MCP Module/module.manifest.json` |
| training | product-shahin-ai | shahin-ai | training-service | (see manifest) | `Training Module/module.manifest.json` |
| risk | product-shahin-ai | shahin-ai | risk-incident-service | (see manifest) | `Risk Module/module.manifest.json` |
| remediation | product-shahin-ai | shahin-ai | remediation-action-service | (see manifest) | `Remediation Module/module.manifest.json` |
| policy | product-shahin-ai | shahin-ai | governance-policy-service | (see manifest) | `Policy Module/module.manifest.json` |
| local-knowledge / knowledge | product-shahin-ai | shahin-ai | (TBD) | (see manifest) | `knowledge Module/*/module.manifest.json` |
| agrc-engine | product-shahin-ai | shahin-ai | agrc-os-service | (see manifest) | `AGRC-engine Module/module.manifest.json` |
| privacy | product-shahin-ai | shahin-ai | privacy-service | (see manifest) | `Privacy Module/module.manifest.json` |
| inbox | product-shahin-ai | shahin-ai | notification-inbox-service | 6 | `Inbox Module/module.manifest.json` |
| notification | product-shahin-ai | shahin-ai | notification-inbox-service | 7 | `Notification Module/module.manifest.json` |
| ksa-regulatory | product-shahin-ai | shahin-ai | (TBD) | (see manifest) | `ksa-regulatory Module/module.manifest.json` |
| reporting | product-shahin-ai | shahin-ai | evidence-audit-reporting-service | (see manifest) | `Reporting Module/module.manifest.json` |
| analytics | product-shahin-ai | shahin-ai | analytics-service | (see manifest) | `modules/analytics/module.manifest.json` |
| dashboard / dashboard-editor | product-shahin-ai | shahin-ai | dashboard-widgets-service | (see manifest) | `modules/dashboard/*/module.manifest.json` |
| compliance | product-shahin-ai | shahin-ai | (host: governance-policy-service) | (see manifest) | `modules/compliance/module.manifest.json` |
| workflow | product-shahin-ai | shahin-ai | workflow-service | (see manifest) | `modules/workflow/module.manifest.json` |
| team | product-shahin-ai | shahin-ai | user-service | (see manifest) | `modules/foundation/team/module.manifest.json` (+ `platform/foundation/team`) |
| audit | product-shahin-ai | shahin-ai | evidence-audit-reporting-service | 8 | `Audit Module/module.manifest.json` |
| operating-cockpit | product-shahin-ai | shahin-ai | (TBD) | (see manifest) | `operating-cockpit/module.manifest.json` |
| playbooks | product-shahin-ai | shahin-ai | (TBD) | (see manifest) | `playbooks/module.manifest.json` |
| portals | product-shahin-ai | shahin-ai | portals-service | (see manifest) | `portals/module.manifest.json` |
| records | product-shahin-ai | shahin-ai | records-service | (see manifest) | `records/module.manifest.json` |
| controls | product-shahin-ai | shahin-ai | (host service TBD) | (see manifest) | `Controls Module/module.manifest.json` |
| issues | product-shahin-ai | shahin-ai | (TBD) | (see manifest) | `Isues Module/module.manifest.json` (note typo `Isues`) |
| mobile | product-shahin-ai | shahin-ai | (mobile-bff TBD) | (see manifest) | `Mobile Module/module.manifest.json` |
| action | product-shahin-ai | shahin-ai | remediation-action-service | (see manifest) | `Action Module/module.manifest.json` |
| asset | product-shahin-ai | shahin-ai | asset-service | (see manifest) | `Asset Module/module.manifest.json` |
| attestation | product-shahin-ai | shahin-ai | (TBD) | (see manifest) | `Attestation Module/module.manifest.json` |
| exception | product-shahin-ai | shahin-ai | (TBD) | (see manifest) | `Exception Module/module.manifest.json` |
| proactive-leadership | product-shahin-ai | shahin-ai | (TBD) | (see manifest) | `Proactive-leadership Module/module.manifest.json` |
| widgets | product-shahin-ai | shahin-ai | dashboard-widgets-service | (see manifest) | `Widgets Module/module.manifest.json` |
| benchmarks | product-shahin-ai | shahin-ai | (TBD) | (see manifest) | `Benchmarks Module/module.manifest.json` |
| executive | product-shahin-ai | shahin-ai | executive-intelligence-service | (see manifest) | `Executive Module/module.manifest.json` |
| grc-query | product-shahin-ai | shahin-ai | (TBD) | (see manifest) | `GRC-query Module/module.manifest.json` |

## 2.2 Manifest debt (P1 — manifests missing `ownedTables`)

The following platform manifests do **not** declare `ownedTables`. This is a documentation contract violation per CONTRIBUTING.md §3 ("any new module ships `module.manifest.json` declaring … `ownedTables`"):

| Module code | Manifest | Notes |
|-------------|----------|-------|
| foundation | `modules/foundation/module.manifest.json` AND `platform/foundation/module.manifest.json` | Has `requiredReferenceData` and `tablePrefix: "foundation_"` instead. Real DB has 30+ `foundation_*` tables in `dos`. **P1**: must enumerate. |
| dauth | `platform/dauth/module.manifest.json` | Owns the entire `platform_dauth` schema (37 tables). **P1**. |
| dos | `platform/dos/module.manifest.json` | Owns `platform_dos` schema (25 tables). **P1**. |
| dsoc | `platform/dsoc/module.manifest.json` | Owns `platform_dsoc` schema (10 tables). |
| dnoc | `platform/dnoc/module.manifest.json` | Owns `platform_dnoc` schema (11 tables). |
| dynamic-ui | `platform/dynamic-ui/module.manifest.json` | Owns `dos.dynamic_ui_*` (≥18 tables). |
| admin | `platform/admin/module.manifest.json` | Owner of admin-service surfaces; tables TBD. |
| ai-os | `platform/ai/module.manifest.json` | AI runtime — `ai_*` tables span `dos` and `public`. |

## 2.3 Cross-schema duplicate table names (P0/P1 normalization findings)

From [`09-duplicate-tables.tsv`](../_evidence/09-duplicate-tables.tsv) — 17 names appearing in 2+ non-tenant schemas:

| Table name | Schemas | Severity | Recommendation (no-action audit) |
|------------|---------|----------|----------------------------------|
| `users` | `dos` (30 rows), `public` (26 rows) | **P0** | Canonical = `dos.users`. `public.users` is legacy; consolidate after FK migration. |
| `tenants` | `dos` (32 rows), `public` (15 rows) | **P0** | Canonical registry = `platform_dos.tenants_registry` (56 rows). `dos.tenants` is operational; `public.tenants` is duplicate legacy. Three-way drift. |
| `login_attempts` | `dos`, `platform_dauth`, `public` | **P0** | Canonical = `platform_dauth.login_attempts` per DAuth dedicated schema. `dos.login_attempts` and `public.login_attempts` are pre-promotion remnants. |
| `invitations` | `dos`, `platform_dauth` | **P1** | Canonical = `platform_dauth.invitations` (lifecycle owner). |
| `user_mfa` | `platform_dauth`, `public` | **P1** | Canonical = `platform_dauth.user_mfa`. |
| `api_keys` | `platform_dauth`, `public` | **P1** | Canonical = `platform_dauth.api_keys`. |
| `sod_rules` | `platform_dauth`, `public` | **P1** | Canonical = `platform_dauth.sod_rules`. |
| `incidents` | `dos`, `platform_dsoc` | **P1** | Two distinct purposes: `dos.incidents` = GRC business incident; `platform_dsoc.incidents` = security incident. **Rename** dsoc copy to `security_incidents` to remove ambiguity. |
| `feature_flags` | `dos`, `platform_dos` | **P1** | Canonical = `platform_dos.feature_flags`; dos copy is pre-promotion. |
| `feature_flag_overrides` | `platform_dos`, `public` | **P1** | Canonical = `platform_dos.feature_flag_overrides`. |
| `product_modules` | `platform_dos`, `public` | **P1** | Canonical = `platform_dos.product_modules`. |
| `product_registry` | `dos`, `public` | **P1** | Canonical = `platform_dos.products_registry` (the registry copy). Both `dos.product_registry` and `public.product_registry` are legacy. |
| `runtime_config` | `dos`, `public` | **P1** | Canonical = `dos.runtime_config` per `platform/foundation` runtime config package. |
| `config_runtime_overrides` | `dos`, `public` | **P1** | Same as above. |
| `job_registry` | `dos`, `public` | **P2** | Canonical = `platform_dos.scheduled_jobs` (NEW name); both legacy copies are deprecated. |
| `ai_agent_registry` | `dos`, `public` | **P2** | Canonical = `dos.ai_agent_registry`. |
| `schema_migrations` | `dos`, `public` | **P2** | See section 1.3 — collapse to `dos.schema_migrations`. |

## 2.4 `public` schema overload (P0)

The `public` schema is a 358-table dumping ground mixing **all six normalization layers**:

| Group (prefix / theme) | Sample tables | Layer | Should live in |
|------------------------|---------------|------:|----------------|
| `lookup_*` (35 tables) | `lookup_countries`, `lookup_sectors`, `lookup_cbb_categories`, `lookup_languages`, `lookup_timezones`, `lookup_sso_providers`, `lookup_sub_sectors`, … | **L1 (public reference)** | New schema `dos_reference` or keep in `public` as the canonical reference home |
| `grc_*` (~10 tables) | `grc_frameworks`, `grc_regulators`, `grc_kri_catalog`, `grc_maturity_model`, `grc_audit_universe`, `grc_sector_framework_matrix` | **L1 (public reference)** | `dos_reference` |
| `mcp_*` (11 tables) | `mcp_servers`, `mcp_tool_registry`, `mcp_tools`, `mcp_resources`, `mcp_sessions`, `mcp_audit_log`, `mcp_tool_invocations`, `mcp_prompts` | L2 + L4 mixed | Move to `dos.mcp_*` (operational) + `platform_dos.mcp_registry_*` (catalog) |
| `onboarding_*` (35 tables) | `onboarding_sessions`, `onboarding_session_answers`, `onboarding_question_bank`, `onboarding_inference_*`, `onboarding_handoff_*`, `onboarding_persona_rules`, `onboarding_module_rules` | L3 + L4 + L5 mixed | Conflicts with `onb.*` — must consolidate into one (recommendation: `dos.onboarding_*`) |
| `org_pack_template_*` (10 tables) | `org_pack_templates`, `org_pack_template_roles`, `org_pack_template_workflows`, `org_pack_template_sod_rules`, … | **L1 (public catalog)** | Keep in `public` or move to `dos_reference` |
| `bcp_*`, `asset_*`, `incident_*`, `pdpl_*` | Foundation defaults, classification schemes, severity matrices | L1 + L2 mixed | Distribute to `dos_reference` and `dos` |
| `dos_*` ops (15 tables) | `dos_releases`, `dos_release_approvals`, `dos_quality_gates`, `dos_verification_runs`, `dos_cutover_plans`, `dos_handover_locks` | L2 (release engineering) | Move to `platform_dos.release_*` |
| `powa_*` (~30 tables) | `powa_*_history`, `powa_snapshot_metas` | extension-managed (PoWA monitoring) | Out of scope — leave in `public` per extension |
| `ai_*`, `agent_*` (~25 tables) | `ai_agent_registry`, `ai_alert_rules`, `agent_credentials`, `agent_priority_weights`, `mcp_agent_registry` | L2 + L4 mixed | Move to `dos.ai_*` (consolidate with existing `dos.ai_*`) |
| `agrc_*`, `as_built_*` | `agrc_metrics_snapshots`, `agrc_os_cycle_log`, `as_built_ledger` | L4 + L6 | Move to `dos.agrc_*` |
| `compliance_*`, `audit_trail_global`, `findings`, `framework_registry` | Operational compliance tables | L4 | Already in `dos` for canonical copies — these are duplicates |
| `default_navigation_items`, `module_visibility_contracts*`, `module_dependencies`, `module_health_events`, `navigation_registry` (in `dos`) | Layer 2 registry | L2 | Move to `platform_dos.*` |

**P0 verdict:** `public` should be reduced to (a) Layer 1 reference catalogs (lookup_*, grc_*, org_pack_template_*) and (b) extension-managed objects (powa_*, citus_*). Everything else is migration debt.

## 2.5 Production-readiness verdict (cross-cutting)

| Dimension | State | Verdict |
|-----------|------:|---------|
| Schema separation by layer | partial — `platform_*` schemas exist but `public`/`dos` overlap heavily | **DB_PARTIAL** |
| Tenant isolation enforcement | 246 tables hold `tenant_id` without RLS | **DB_NOT_READY** |
| Manifest ↔ DB ownership mapping | 9/59 platform manifests missing `ownedTables` | **DB_PARTIAL** |
| Duplicate table normalization | 17 cross-schema duplicates incl. `users`, `tenants`, `login_attempts` | **DB_PARTIAL** |
| Tenant registry truth | 56 registry rows vs 13 physical schemas | **DB_NOT_READY** |
| Migration tracker consolidation | 9 trackers across 4 schemas | **DB_PARTIAL** |

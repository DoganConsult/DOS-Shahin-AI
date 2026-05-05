# Phase 1 — Contract-pack MD full inventory

**Scope:** Markdown only — `platform/ui-system/module_ui_os_contract-pack/*-complete-direct-seed.md` (no DB queries).

**Purpose:** Per-file size estimate, resolved page-matrix counts (§5 vs §6), navigation table rows (heuristic), documented route/component row claims where prose states counts — plus **Appendix A** with **named** §1 identity fields and resolved matrix rows (routes, page keys, components/loaders) extracted from the markdown.

## Methodology

| Column | Rule |
|--------|------|
| **md_lines** | Line count of the file |
| **est_print_pages** | `ceil(md_lines / 52)` (~52 lines/page, rough) |
| **h2_sections** | Count of top-level `## ` headings |
| **§5_page_matrix_rows** | Numbered spine rows in the **resolved** page matrix: best table from §5 or §6 by strength score (numbered `#`/col0 + `page_code`/`page_key` + `route`; or manifest-style `page_code` + `route` without numeric spine). Count cells where `#` column or column 0 matches `/^\d+$/` (digit-only). |
| **page_matrix_total_rows** | All body rows in the resolved matrix (includes unnumbered manifest rows). |
| **page_matrix_src** | `§5`, `§6`, or `—` — which section supplied the resolved matrix. |
| **nav_table_rows_heuristic** | Under `###` headings whose title mentions navigation/nav_registry/sidebar, count markdown table body rows (excludes separator/header rows). Fallback: `### 2.2` navigation block for compliance-style seeds. |
| **routes_doc_claim** | First integer before “rows” near `dynamic_ui_routes`, if present |
| **components_doc_claim** | First integer before “rows” near `dynamic_ui_component_registry`, if present |

**Appendix A:** **§1** — full `| Field | Value |` table (order preserved). **§2** — supplementary markdown tables merged by identical headers into buckets: navigation (`nav_key` / `nav_item_code`), Dynamic UI (`component_key` + `route_path`), permissions (`permission_code` alone — catalog rows), **role bindings** (`role_code` + `permission_code` — matrix rows), module registry (`module_code` + `product_key`), carbon registry (`component_key` + `carbon_key`). **§3** / **§4** — navigation-shaped tables merged into the navigation bucket (e.g. config-center §3, foundation §4). **§5 / §6** — full markdown table from the resolved page matrix (numbered rows when `#` column exists; otherwise all manifest rows). Unnumbered `page_code`+`route` rows appear in extracts as `(seq N)`. If no matrix: **Component | props** surfaces list unless §2 carbon bucket already documents shell bindings.

**Limits:** Stubs may omit explicit route/component prose (`—`). Nav counts vary by seed format.

## Summary table

| md_file | md_lines | est_print_pages | h2_sections | §5_page_matrix_rows | page_matrix_total_rows | page_matrix_src | nav_table_rows_heuristic | routes_doc_claim | components_doc_claim | notes |
|---------|----------|-----------------|-------------|---------------------|------------------------|-----------------|---------------------------|------------------|----------------------|-------|
| action-complete-direct-seed.md | 121 | 3 | 7 | 4 | 4 | §5 | 6 | — | — | — |
| agrc-engine-complete-direct-seed.md | 123 | 3 | 7 | 4 | 4 | §5 | 6 | — | — | — |
| ai-os-complete-direct-seed.md | 124 | 3 | 7 | 4 | 4 | §5 | 6 | — | — | — |
| ai-platform-complete-direct-seed.md | 162 | 4 | 7 | 4 | 4 | §5 | 7 | — | — | — |
| analytics-complete-direct-seed.md | 122 | 3 | 7 | 4 | 4 | §5 | 6 | — | — | — |
| asset-complete-direct-seed.md | 185 | 4 | 9 | 4 | 4 | §5 | 6 | — | — | — |
| attestation-complete-direct-seed.md | 116 | 3 | 7 | 3 | 3 | §5 | 5 | — | — | — |
| audit-complete-direct-seed.md | 121 | 3 | 7 | 4 | 4 | §5 | 6 | — | — | — |
| bcp-complete-direct-seed.md | 121 | 3 | 7 | 4 | 4 | §5 | 6 | — | — | — |
| compliance-complete-direct-seed.md | 196 | 4 | 7 | 16 | 16 | §5 | 19 | — | — | — |
| config-center-complete-direct-seed.md | 128 | 3 | 8 | 0 | 10 | §6 | — | — | — | Page matrix resolved from §6 (§5 is API/config tables). |
| controls-complete-direct-seed.md | 121 | 3 | 7 | 4 | 4 | §5 | 6 | — | — | — |
| dora-complete-direct-seed.md | 123 | 3 | 7 | 4 | 4 | §5 | 6 | — | — | — |
| dynamic-ui-complete-direct-seed.md | 129 | 3 | 8 | 4 | 4 | §5 | 6 | — | — | — |
| evidence-complete-direct-seed.md | 121 | 3 | 7 | 4 | 4 | §5 | 6 | — | — | — |
| foundation-complete-direct-seed.md | 358 | 7 | 12 | 21 | 21 | §5 | — | — | — | — |
| inbox-complete-direct-seed.md | 116 | 3 | 7 | 3 | 3 | §5 | 5 | — | — | — |
| incident-complete-direct-seed.md | 121 | 3 | 7 | 4 | 4 | §5 | 6 | — | — | — |
| issues-complete-direct-seed.md | 116 | 3 | 7 | 3 | 3 | §5 | 5 | — | — | — |
| knowledge-complete-direct-seed.md | 116 | 3 | 7 | 3 | 3 | §5 | 5 | — | — | — |
| ksa-regulatory-complete-direct-seed.md | 119 | 3 | 7 | 3 | 3 | §5 | 5 | — | — | — |
| mcp-complete-direct-seed.md | 117 | 3 | 7 | 3 | 3 | §5 | 5 | — | — | — |
| notification-complete-direct-seed.md | 116 | 3 | 7 | 3 | 3 | §5 | 5 | — | — | — |
| onboarding-complete-direct-seed.md | 117 | 3 | 7 | 3 | 3 | §5 | 5 | — | — | — |
| policy-complete-direct-seed.md | 121 | 3 | 7 | 4 | 4 | §5 | 6 | — | — | — |
| privacy-complete-direct-seed.md | 122 | 3 | 7 | 4 | 4 | §5 | 6 | — | — | — |
| qiyas-complete-direct-seed.md | 117 | 3 | 7 | 3 | 3 | §5 | 5 | — | — | — |
| remediation-complete-direct-seed.md | 116 | 3 | 7 | 3 | 3 | §5 | 5 | — | — | — |
| reporting-complete-direct-seed.md | 116 | 3 | 7 | 3 | 3 | §5 | 5 | — | — | — |
| risk-complete-direct-seed.md | 321 | 7 | 8 | 9 | 9 | §5 | 11 | 10 | 10 | Doc narrative may cite 10 routes; §5 table shows 9 numbered rows. |
| training-complete-direct-seed.md | 116 | 3 | 7 | 3 | 3 | §5 | 5 | — | — | — |
| vendor-complete-direct-seed.md | 121 | 3 | 7 | 4 | 4 | §5 | 6 | — | — | — |
| workflow-complete-direct-seed.md | 195 | 4 | 7 | 4 | 4 | §5 | 6 | — | — | — |
| workspace-shell-complete-direct-seed.md | 269 | 6 | 10 | 0 | 0 | — | — | — | — | Shell surfaces (not tenant page matrix); §5 documents shell registry. |

## Totals (34 files)

| Metric | Value |
|--------|-------|
| Sum of est_print_pages | 117 |
| Sum of §5_page_matrix_rows (numbered spine, resolved matrix) | 150 |
| Sum of page_matrix_total_rows (all body rows, resolved matrix) | 160 |


## Appendix A — Named extracts (§1 full + §2/§3/§4 supplementary + resolved page matrix)

Parsed mechanically from markdown **§1** pipe tables (`| Field | Value |`), **§2** supplementary tables (navigation, Dynamic UI, permissions, role bindings, module registry, carbon/component bindings), **§3** and **§4** tables that look like navigation (`nav_key` / `nav_item_code`), and the **resolved** page matrix: best-scoring table from **§5** or **§6** (config-center uses §6 when §5 is API-only).

Cells are copied from the seed MD (pipes escaped; newlines flattened). Use the authoritative `.json` if MD drift is suspected.

### action-complete-direct-seed.md

**§1 summary:** module_code=`action`, route_base=`/action`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | action |
| product_key | shahin-ai |
| route_base | /action |
| owner_service | workflow-service / action-service |
| module_status | active_after_validation |
| module_name_en | Action |
| module_name_ar | Action |
| category | workflow |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| action | action | /action | Action | Action | action.read | 10 |
| action.home | action | /action/home | Home | الرئيسية | action.read | 10 |
| action.tasks | action | /action/tasks | Tasks | المهام | action.read | 20 |
| action.approvals | action | /action/approvals | Approvals | الموافقات | action.approve | 30 |
| action.audit | action | /action/audit | Audit | التدقيق | action.audit.read | 40 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| action.home.page | /action/home | action | action.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| action.tasks.page | /action/tasks | action | action.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| action.approvals.page | /action/approvals | action | action.approve | ibm-carbon | VERIFY_CARBON_KEY | approved |
| action.audit.page | /action/audit | action | action.audit.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| action.admin | action admin |
| action.approve | action approve |
| action.audit.read | action audit read |
| action.read | action read |
| action.write | action write |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| action | shahin-ai | Action | workflow | active | workflow-service / action-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | action.home | /action/home | Home | الرئيسية | ActionHomeComponent | GET /api/actions/overview | dos.action_items | action.read | VERIFY |
| 2 | action.tasks | /action/tasks | Tasks | المهام | ActionTasksComponent | GET /api/actions/tasks | dos.action_items | action.read | VERIFY |
| 3 | action.approvals | /action/approvals | Approvals | الموافقات | ActionApprovalsComponent | GET /api/actions/approvals | dos.approval_requests | action.approve | VERIFY |
| 4 | action.audit | /action/audit | Audit | التدقيق | ActionAuditComponent | GET /api/actions/audit | dos.audit_trail | action.audit.read | VERIFY |

### agrc-engine-complete-direct-seed.md

**§1 summary:** module_code=`agrc-engine`, route_base=`/agrc-engine`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | agrc-engine |
| product_key | shahin-ai |
| route_base | /agrc-engine |
| owner_service | ai-engine-service / agrc-engine |
| module_status | active_after_validation |
| module_name_en | AGRC Engine |
| module_name_ar | AGRC Engine |
| category | ai-grc |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| agrc-engine | agrc-engine | /agrc-engine | AGRC Engine | AGRC Engine | agrc-engine.read | 10 |
| agrc-engine.home | agrc-engine | /agrc-engine/home | Engine Home | الرئيسية | agrc.read | 10 |
| agrc-engine.runs | agrc-engine | /agrc-engine/runs | Runs | التشغيلات | agrc.runs.read | 20 |
| agrc-engine.decisions | agrc-engine | /agrc-engine/decisions | Decisions | القرارات | agrc.decisions.read | 30 |
| agrc-engine.rules | agrc-engine | /agrc-engine/rules | Rules | القواعد | agrc.rules.read | 40 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| agrc-engine.home.page | /agrc-engine/home | agrc-engine | agrc.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| agrc-engine.runs.page | /agrc-engine/runs | agrc-engine | agrc.runs.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| agrc-engine.decisions.page | /agrc-engine/decisions | agrc-engine | agrc.decisions.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| agrc-engine.rules.page | /agrc-engine/rules | agrc-engine | agrc.rules.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| agrc-engine.admin | agrc-engine admin |
| agrc-engine.read | agrc-engine read |
| agrc-engine.write | agrc-engine write |
| agrc.decisions.read | agrc decisions read |
| agrc.read | agrc read |
| agrc.rules.read | agrc rules read |
| agrc.runs.read | agrc runs read |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| agrc-engine | shahin-ai | AGRC Engine | ai-grc | active | ai-engine-service / agrc-engine |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | agrc-engine.home | /agrc-engine/home | Engine Home | الرئيسية | AgrcEngineHomeComponent | GET /api/agrc-engine/overview | dos.agrc_runs | agrc.read | VERIFY |
| 2 | agrc-engine.runs | /agrc-engine/runs | Runs | التشغيلات | AgrcEngineRunsComponent | GET /api/agrc-engine/runs | dos.agrc_runs | agrc.runs.read | VERIFY |
| 3 | agrc-engine.decisions | /agrc-engine/decisions | Decisions | القرارات | AgrcEngineDecisionsComponent | GET /api/agrc-engine/decisions | dos.agrc_decisions | agrc.decisions.read | VERIFY |
| 4 | agrc-engine.rules | /agrc-engine/rules | Rules | القواعد | AgrcEngineRulesComponent | GET /api/agrc-engine/rules | dos.agrc_rules | agrc.rules.read | VERIFY |

### ai-os-complete-direct-seed.md

**§1 summary:** module_code=`ai-os`, route_base=`/ai-os`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | ai-os |
| product_key | shahin-ai |
| route_base | /ai-os |
| owner_service | ai-engine-service / ai-os |
| module_status | active_after_validation |
| module_name_en | AI OS |
| module_name_ar | AI OS |
| category | platform-dna |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| ai-os | ai-os | /ai-os | AI OS | AI OS | ai-os.read | 10 |
| ai-os.home | ai-os | /ai-os/home | AI OS Home | الرئيسية | ai.os.read | 10 |
| ai-os.models | ai-os | /ai-os/models | Models | النماذج | ai.os.models.read | 20 |
| ai-os.tools | ai-os | /ai-os/tools | Tools | الأدوات | ai.os.tools.read | 30 |
| ai-os.policies | ai-os | /ai-os/policies | Policies | السياسات | ai.os.policies.read | 40 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| ai-os.home.page | /ai-os/home | ai-os | ai.os.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| ai-os.models.page | /ai-os/models | ai-os | ai.os.models.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| ai-os.tools.page | /ai-os/tools | ai-os | ai.os.tools.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| ai-os.policies.page | /ai-os/policies | ai-os | ai.os.policies.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| ai-os.admin | ai-os admin |
| ai-os.read | ai-os read |
| ai-os.write | ai-os write |
| ai.os.models.read | ai os models read |
| ai.os.policies.read | ai os policies read |
| ai.os.read | ai os read |
| ai.os.tools.read | ai os tools read |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| ai-os | shahin-ai | AI OS | platform-dna | active | ai-engine-service / ai-os |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | ai-os.home | /ai-os/home | AI OS Home | الرئيسية | AiOsHomeComponent | GET /api/ai-os/overview | dos.ai_os_runtime | ai.os.read | VERIFY |
| 2 | ai-os.models | /ai-os/models | Models | النماذج | AiOsModelsComponent | GET /api/ai-os/models | dos.ai_models | ai.os.models.read | VERIFY |
| 3 | ai-os.tools | /ai-os/tools | Tools | الأدوات | AiOsToolsComponent | GET /api/ai-os/tools | dos.ai_tools | ai.os.tools.read | VERIFY |
| 4 | ai-os.policies | /ai-os/policies | Policies | السياسات | AiOsPoliciesComponent | GET /api/ai-os/policies | dos.ai_policies | ai.os.policies.read | VERIFY |

### ai-platform-complete-direct-seed.md

**§1 summary:** module_code=`ai-platform`, route_base=`/ai`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | ai-platform |
| product_key | shahin-ai |
| route_base | /ai |
| owner_service | ai-gateway-service / ai-engine-service |
| module_status | active_after_validation |
| module_name_en | AI Platform |
| module_name_ar | الرئيسية الذكية |
| category | platform-dna |
| icon | ai |
| description_en | AI platform home, agents, agent runs, governance and evidence ledger. |
| description_ar | الرئيسية الذكية، الوكلاء، التشغيلات، الحوكمة وسجل الأدلة. |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| ai-platform | ai-platform | /ai | AI Platform | الرئيسية الذكية | ai.read | 10 |
| ai-platform.home | ai-platform | /ai/home | AI Home | الرئيسية الذكية | ai.read | 10 |
| ai-platform.agents | ai-platform | /ai/agents | Agents | الوكلاء | ai.agents.read | 20 |
| ai-platform.runs | ai-platform | /ai/runs | Runs | التشغيلات | ai.runs.read | 30 |
| ai-platform.governance | ai-platform | /ai/governance | AI Governance | حوكمة الذكاء الاصطناعي | ai.governance.read | 40 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| ai-platform.home.page | /ai/home | ai-platform | ai.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| ai-platform.agents.page | /ai/agents | ai-platform | ai.agents.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| ai-platform.runs.page | /ai/runs | ai-platform | ai.runs.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| ai-platform.governance.page | /ai/governance | ai-platform | ai.governance.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| ai.read | View AI Platform |
| ai.admin | Administer AI Platform |
| ai.agents.read | View agents |
| ai.agents.manage | Manage agents |
| ai.runs.read | View AI runs |
| ai.runs.cancel | Cancel AI runs |
| ai.governance.read | View AI governance |
| ai.governance.approve | Approve governed AI actions |
| ai.evidence.read | View AI evidence |
| ai.audit.read | View AI audit trail |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | title_ar | category | status | owner_service |
| --- | --- | --- | --- | --- | --- | --- |
| ai-platform | shahin-ai | AI Platform | الرئيسية الذكية | platform-dna | active | ai-gateway-service / ai-engine-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | component file | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | ai-platform.home | /ai/home | AI Home | الرئيسية الذكية | AiHomeComponent | products/shahin-ai/app/src/app/modules/ai/ai-home.component.ts | GET /api/ai/overview | dos.agent_runs, dos.agent_recommendations | ai.read | VERIFY |
| 2 | ai-platform.agents | /ai/agents | Agents | الوكلاء | AiAgentsComponent | products/shahin-ai/app/src/app/modules/ai/ai-agents.component.ts | GET /api/ai/agents | dos.dynamic_ui_agents, dos.dynamic_ui_agent_actions | ai.agents.read | VERIFY |
| 3 | ai-platform.runs | /ai/runs | Runs | التشغيلات | AiRunsComponent | products/shahin-ai/app/src/app/modules/ai/ai-runs.component.ts | GET /api/ai/runs | dos.agent_runs, dos.agent_run_steps, dos.agent_action_receipts | ai.runs.read | VERIFY |
| 4 | ai-platform.governance | /ai/governance | AI Governance | حوكمة الذكاء الاصطناعي | AiGovernanceComponent | products/shahin-ai/app/src/app/modules/ai/ai-governance.component.ts | GET /api/ai/governance | dos.agent_evidence_links, dos.agent_action_receipts, dos.authz_decision_log | ai.governance.read | VERIFY |

### analytics-complete-direct-seed.md

**§1 summary:** module_code=`analytics`, route_base=`/analytics`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | analytics |
| product_key | shahin-ai |
| route_base | /analytics |
| owner_service | analytics-service |
| module_status | active_after_validation |
| module_name_en | Analytics |
| module_name_ar | Analytics |
| category | insights |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| analytics | analytics | /analytics | Analytics | Analytics | analytics.read | 10 |
| analytics.overview | analytics | /analytics/overview | Overview | نظرة عامة | analytics.read | 10 |
| analytics.dashboards | analytics | /analytics/dashboards | Dashboards | لوحات المعلومات | analytics.read | 20 |
| analytics.reports | analytics | /analytics/reports | Reports | التقارير | analytics.report.read | 30 |
| analytics.exports | analytics | /analytics/exports | Exports | الصادرات | analytics.export | 40 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| analytics.overview.page | /analytics/overview | analytics | analytics.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| analytics.dashboards.page | /analytics/dashboards | analytics | analytics.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| analytics.reports.page | /analytics/reports | analytics | analytics.report.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| analytics.exports.page | /analytics/exports | analytics | analytics.export | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| analytics.admin | analytics admin |
| analytics.export | analytics export |
| analytics.read | analytics read |
| analytics.report.read | analytics report read |
| analytics.write | analytics write |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| analytics | shahin-ai | Analytics | insights | active | analytics-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | analytics.overview | /analytics/overview | Overview | نظرة عامة | AnalyticsOverviewComponent | GET /api/analytics/overview | dos.analytics_snapshots | analytics.read | VERIFY |
| 2 | analytics.dashboards | /analytics/dashboards | Dashboards | لوحات المعلومات | AnalyticsDashboardsComponent | GET /api/analytics/dashboards | dos.analytics_dashboards | analytics.read | VERIFY |
| 3 | analytics.reports | /analytics/reports | Reports | التقارير | AnalyticsReportsComponent | GET /api/analytics/reports | dos.analytics_reports | analytics.report.read | VERIFY |
| 4 | analytics.exports | /analytics/exports | Exports | الصادرات | AnalyticsExportsComponent | GET /api/analytics/exports | dos.analytics_exports | analytics.export | VERIFY |

### asset-complete-direct-seed.md

**§1 summary:** module_code=`asset`, route_base=`/asset`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | asset |
| product_key | shahin-ai |
| route_base | /asset |
| owner_service | asset-service |
| module_status | active_after_validation |
| module_name_en | Asset |
| module_name_ar | Asset |
| category | grc-core |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| asset | asset | /asset | Asset | Asset | asset.read | 10 |
| asset.overview | asset | /asset/overview | Overview | نظرة عامة | asset.read | 10 |
| asset.inventory | asset | /asset/inventory | Inventory | المخزون | asset.read | 20 |
| asset.owners | asset | /asset/owners | Owners | الملاك | asset.read | 30 |
| asset.risk | asset | /asset/risk | Asset Risk | مخاطر الأصول | asset.risk.read | 40 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| asset.overview.page | /asset/overview | asset | asset.read | ibm-carbon | grid | approved |
| asset.inventory.page | /asset/inventory | asset | asset.read | ibm-carbon | table | approved |
| asset.owners.page | /asset/owners | asset | asset.read | ibm-carbon | structured-list | approved |
| asset.risk.page | /asset/risk | asset | asset.risk.read | ibm-carbon | grid | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| asset.admin | asset admin |
| asset.read | asset read |
| asset.risk.read | asset risk read |
| asset.write | asset write |

#### §2 / §3 / §4 — Role bindings (role_code + permission_code)

| role_code | permission_code |
| --- | --- |
| tenant_owner | asset.admin |
| tenant_owner | asset.read |
| tenant_owner | asset.risk.read |
| tenant_owner | asset.write |
| asset_admin | asset.admin |
| asset_admin | asset.read |
| asset_admin | asset.write |
| asset_operator | asset.read |
| asset_operator | asset.write |
| asset_auditor | asset.read |
| asset_auditor | asset.risk.read |
| standard_user | asset.read |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| asset | shahin-ai | Asset | grc-core | active | asset-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | asset.overview | /asset/overview | Overview | نظرة عامة | AssetOverviewComponent | GET /api/assets/overview | dos.assets | asset.read | VERIFY |
| 2 | asset.inventory | /asset/inventory | Inventory | المخزون | AssetInventoryComponent | GET /api/assets | dos.assets | asset.read | VERIFY |
| 3 | asset.owners | /asset/owners | Owners | الملاك | AssetOwnersComponent | GET /api/assets/owners | dos.asset_owners | asset.read | VERIFY |
| 4 | asset.risk | /asset/risk | Asset Risk | مخاطر الأصول | AssetRiskComponent | GET /api/assets/risk | dos.asset_risk_scores | asset.risk.read | VERIFY |

### attestation-complete-direct-seed.md

**§1 summary:** module_code=`attestation`, route_base=`/attestation`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | attestation |
| product_key | shahin-ai |
| route_base | /attestation |
| owner_service | compliance-controls-service |
| module_status | active_after_validation |
| module_name_en | Attestation |
| module_name_ar | Attestation |
| category | grc-core |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| attestation | attestation | /attestation | Attestation | Attestation | attestation.read | 10 |
| attestation.overview | attestation | /attestation/overview | Overview | نظرة عامة | attestation.read | 10 |
| attestation.campaigns | attestation | /attestation/campaigns | Campaigns | الحملات | attestation.read | 20 |
| attestation.responses | attestation | /attestation/responses | Responses | الردود | attestation.read | 30 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| attestation.overview.page | /attestation/overview | attestation | attestation.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| attestation.campaigns.page | /attestation/campaigns | attestation | attestation.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| attestation.responses.page | /attestation/responses | attestation | attestation.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| attestation.admin | attestation admin |
| attestation.read | attestation read |
| attestation.write | attestation write |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| attestation | shahin-ai | Attestation | grc-core | active | compliance-controls-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | attestation.overview | /attestation/overview | Overview | نظرة عامة | AttestationOverviewComponent | GET /api/attestations/overview | dos.attestations | attestation.read | VERIFY |
| 2 | attestation.campaigns | /attestation/campaigns | Campaigns | الحملات | AttestationCampaignsComponent | GET /api/attestations/campaigns | dos.attestation_campaigns | attestation.read | VERIFY |
| 3 | attestation.responses | /attestation/responses | Responses | الردود | AttestationResponsesComponent | GET /api/attestations/responses | dos.attestation_responses | attestation.read | VERIFY |

### audit-complete-direct-seed.md

**§1 summary:** module_code=`audit`, route_base=`/audit`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | audit |
| product_key | shahin-ai |
| route_base | /audit |
| owner_service | audit-service / evidence-audit-reporting-service |
| module_status | active_after_validation |
| module_name_en | Audit |
| module_name_ar | Audit |
| category | audit |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| audit | audit | /audit | Audit | Audit | audit.read | 10 |
| audit.overview | audit | /audit/overview | Overview | نظرة عامة | audit.read | 10 |
| audit.trail | audit | /audit/trail | Audit Trail | سجل التدقيق | audit.read | 20 |
| audit.events | audit | /audit/events | Events | الأحداث | audit.events.read | 30 |
| audit.reports | audit | /audit/reports | Reports | التقارير | audit.report.read | 40 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| audit.overview.page | /audit/overview | audit | audit.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| audit.trail.page | /audit/trail | audit | audit.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| audit.events.page | /audit/events | audit | audit.events.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| audit.reports.page | /audit/reports | audit | audit.report.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| audit.admin | audit admin |
| audit.events.read | audit events read |
| audit.read | audit read |
| audit.report.read | audit report read |
| audit.write | audit write |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| audit | shahin-ai | Audit | audit | active | audit-service / evidence-audit-reporting-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | audit.overview | /audit/overview | Overview | نظرة عامة | AuditOverviewComponent | GET /api/audit/overview | dos.audit_trail | audit.read | VERIFY |
| 2 | audit.trail | /audit/trail | Audit Trail | سجل التدقيق | AuditTrailComponent | GET /api/audit/trail | dos.audit_trail | audit.read | VERIFY |
| 3 | audit.events | /audit/events | Events | الأحداث | AuditEventsComponent | GET /api/audit/events | dos.security_events | audit.events.read | VERIFY |
| 4 | audit.reports | /audit/reports | Reports | التقارير | AuditReportsComponent | GET /api/audit/reports | dos.audit_reports | audit.report.read | VERIFY |

### bcp-complete-direct-seed.md

**§1 summary:** module_code=`bcp`, route_base=`/bcp`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | bcp |
| product_key | shahin-ai |
| route_base | /bcp |
| owner_service | bcp-service |
| module_status | active_after_validation |
| module_name_en | BCP |
| module_name_ar | BCP |
| category | resilience |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| bcp | bcp | /bcp | BCP | BCP | bcp.read | 10 |
| bcp.overview | bcp | /bcp/overview | Overview | نظرة عامة | bcp.read | 10 |
| bcp.plans | bcp | /bcp/plans | Plans | الخطط | bcp.read | 20 |
| bcp.tests | bcp | /bcp/tests | Tests | الاختبارات | bcp.test.read | 30 |
| bcp.incidents | bcp | /bcp/incidents | Incidents | الحوادث | bcp.incident.read | 40 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| bcp.overview.page | /bcp/overview | bcp | bcp.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| bcp.plans.page | /bcp/plans | bcp | bcp.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| bcp.tests.page | /bcp/tests | bcp | bcp.test.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| bcp.incidents.page | /bcp/incidents | bcp | bcp.incident.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| bcp.admin | bcp admin |
| bcp.incident.read | bcp incident read |
| bcp.read | bcp read |
| bcp.test.read | bcp test read |
| bcp.write | bcp write |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| bcp | shahin-ai | BCP | resilience | active | bcp-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | bcp.overview | /bcp/overview | Overview | نظرة عامة | BcpOverviewComponent | GET /api/bcp/overview | dos.bcp_plans | bcp.read | VERIFY |
| 2 | bcp.plans | /bcp/plans | Plans | الخطط | BcpPlansComponent | GET /api/bcp/plans | dos.bcp_plans | bcp.read | VERIFY |
| 3 | bcp.tests | /bcp/tests | Tests | الاختبارات | BcpTestsComponent | GET /api/bcp/tests | dos.bcp_tests | bcp.test.read | VERIFY |
| 4 | bcp.incidents | /bcp/incidents | Incidents | الحوادث | BcpIncidentsComponent | GET /api/bcp/incidents | dos.bcp_incidents | bcp.incident.read | VERIFY |

### compliance-complete-direct-seed.md

**§1 summary:** module_code=`compliance`, route_base=`/compliance`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | compliance |
| product_key | shahin-ai |
| route_base | /compliance |
| owner_service | governance-policy-service / compliance module |
| module_status | active_after_validation |
| module_name_en | Compliance |
| module_name_ar | الأطر |
| category | business-grc |
| icon | compliance |
| description_en | Frameworks, obligations, assessments, gaps, findings, evidence, reports and compliance work queue. |
| description_ar | الأطر، الالتزامات، التقييمات، الفجوات، الملاحظات، الأدلة، التقارير وقائمة عمل الامتثال. |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| compliance | compliance | /compliance | Compliance | الأطر | compliance.read | 10 |
| compliance.overview | compliance | /compliance/overview | Overview | نظرة عامة | compliance.read | 10 |
| compliance.frameworks | compliance | /compliance/frameworks | Frameworks | الأطر | compliance.read | 20 |
| compliance.obligations | compliance | /compliance/obligations | Obligations | الالتزامات | compliance.read | 30 |
| compliance.assessments | compliance | /compliance/assessments | Assessments | التقييمات | compliance.assessment.read | 40 |
| compliance.gaps | compliance | /compliance/gaps | Gaps | الفجوات | compliance.read | 50 |
| compliance.findings | compliance | /compliance/findings | Findings | الملاحظات | compliance.read | 60 |
| compliance.attestations | compliance | /compliance/attestations | Attestations | الإقرارات | compliance.read | 70 |
| compliance.posture | compliance | /compliance/posture | Posture | الوضع العام | compliance.read | 80 |
| compliance.heatmap | compliance | /compliance/heatmap | Heatmap | الخريطة الحرارية | compliance.read | 90 |
| compliance.calendar | compliance | /compliance/calendar | Calendar | التقويم | compliance.read | 100 |
| compliance.roadmap | compliance | /compliance/roadmap | Roadmap | خارطة الطريق | compliance.read | 110 |
| compliance.reports | compliance | /compliance/reports | Reports | التقارير | compliance.report.read | 120 |
| compliance.work-queue | compliance | /compliance/work-queue | Work Queue | قائمة العمل | compliance.read | 130 |
| compliance.exceptions | compliance | /compliance/exceptions | Exceptions | الاستثناءات | compliance.write | 140 |
| compliance.evidence-ops | compliance | /compliance/evidence-ops | Evidence Operations | عمليات الأدلة | compliance.evidence.read | 150 |
| compliance.admin | compliance | /compliance/admin | Admin | الإدارة | compliance.admin | 160 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| compliance.overview.page | /compliance/overview | compliance | compliance.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| compliance.frameworks.page | /compliance/frameworks | compliance | compliance.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| compliance.obligations.page | /compliance/obligations | compliance | compliance.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| compliance.assessments.page | /compliance/assessments | compliance | compliance.assessment.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| compliance.gaps.page | /compliance/gaps | compliance | compliance.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| compliance.findings.page | /compliance/findings | compliance | compliance.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| compliance.attestations.page | /compliance/attestations | compliance | compliance.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| compliance.posture.page | /compliance/posture | compliance | compliance.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| compliance.heatmap.page | /compliance/heatmap | compliance | compliance.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| compliance.calendar.page | /compliance/calendar | compliance | compliance.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| compliance.roadmap.page | /compliance/roadmap | compliance | compliance.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| compliance.reports.page | /compliance/reports | compliance | compliance.report.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| compliance.work-queue.page | /compliance/work-queue | compliance | compliance.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| compliance.exceptions.page | /compliance/exceptions | compliance | compliance.write | ibm-carbon | VERIFY_CARBON_KEY | approved |
| compliance.evidence-ops.page | /compliance/evidence-ops | compliance | compliance.evidence.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| compliance.admin.page | /compliance/admin | compliance | compliance.admin | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| compliance.read | Read compliance |
| compliance.write | Write compliance |
| compliance.admin | Administer compliance |
| compliance.assessment.read | Read assessments |
| compliance.assessment.write | Write assessments |
| compliance.report.read | Read reports |
| compliance.report.export | Export reports |
| compliance.evidence.read | Read evidence |
| compliance.evidence.write | Write evidence |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | title_ar | category | status | owner_service |
| --- | --- | --- | --- | --- | --- | --- |
| compliance | shahin-ai | Compliance | الأطر | business-grc | active | governance-policy-service / compliance module |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | component file | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | compliance.overview | /compliance/overview | Overview | نظرة عامة | CompliancePageComponent | modules/compliance/ui/pages/compliance-page.component.ts | GET /api/compliance-ws/overview | dos.compliance_kpis, dos.compliance_frameworks | compliance.read | VERIFY |
| 2 | compliance.frameworks | /compliance/frameworks | Frameworks | الأطر | ComplianceFrameworksPageComponent | modules/compliance/ui/pages/compliance-frameworks-page.component.ts | GET /api/compliance-ws/frameworks | dos.compliance_frameworks | compliance.read | VERIFY |
| 3 | compliance.obligations | /compliance/obligations | Obligations | الالتزامات | ComplianceObligationsPageComponent | modules/compliance/ui/pages/compliance-obligations-page.component.ts | GET /api/compliance-ws/obligations | dos.compliance_obligations | compliance.read | VERIFY |
| 4 | compliance.assessments | /compliance/assessments | Assessments | التقييمات | ComplianceAssessmentsPageComponent | modules/compliance/ui/pages/compliance-assessments-page.component.ts | GET /api/compliance-ws/assessments | dos.compliance_assessments | compliance.assessment.read | VERIFY |
| 5 | compliance.gaps | /compliance/gaps | Gaps | الفجوات | ComplianceGapsPageComponent | modules/compliance/ui/pages/compliance-gaps-page.component.ts | GET /api/compliance-ws/gaps | dos.compliance_gaps | compliance.read | VERIFY |
| 6 | compliance.findings | /compliance/findings | Findings | الملاحظات | ComplianceFindingsPageComponent | modules/compliance/ui/pages/compliance-findings-page.component.ts | GET /api/compliance-ws/findings | dos.compliance_findings | compliance.read | VERIFY |
| 7 | compliance.attestations | /compliance/attestations | Attestations | الإقرارات | ComplianceAttestationsPageComponent | modules/compliance/ui/pages/compliance-attestations-page.component.ts | GET /api/compliance-ws/attestations | dos.compliance_attestations | compliance.read | VERIFY |
| 8 | compliance.posture | /compliance/posture | Posture | الوضع العام | CompliancePosturePageComponent | modules/compliance/ui/pages/compliance-posture-page.component.ts | GET /api/compliance-ws/posture | dos.compliance_posture_snapshots | compliance.read | VERIFY |
| 9 | compliance.heatmap | /compliance/heatmap | Heatmap | الخريطة الحرارية | ComplianceHeatmapPageComponent | modules/compliance/ui/pages/compliance-heatmap-page.component.ts | GET /api/compliance-ws/heatmap | dos.compliance_gaps, dos.compliance_assessments | compliance.read | VERIFY |
| 10 | compliance.calendar | /compliance/calendar | Calendar | التقويم | ComplianceCalendarPageComponent | modules/compliance/ui/pages/compliance-calendar-page.component.ts | GET /api/compliance-ws/calendar | dos.compliance_obligations, dos.compliance_tasks | compliance.read | VERIFY |
| 11 | compliance.roadmap | /compliance/roadmap | Roadmap | خارطة الطريق | ComplianceRoadmapPageComponent | modules/compliance/ui/pages/compliance-roadmap-page.component.ts | GET /api/compliance-ws/roadmap | dos.compliance_roadmap_items | compliance.read | VERIFY |
| 12 | compliance.reports | /compliance/reports | Reports | التقارير | ComplianceReportsPageComponent | modules/compliance/ui/pages/compliance-reports-page.component.ts | GET /api/compliance-ws/reports | dos.compliance_reports | compliance.report.read | VERIFY |
| 13 | compliance.work-queue | /compliance/work-queue | Work Queue | قائمة العمل | ComplianceWorkQueuePageComponent | modules/compliance/ui/pages/compliance-work-queue-page.component.ts | GET /api/compliance-ws/work-queue | dos.compliance_tasks | compliance.read | VERIFY |
| 14 | compliance.exceptions | /compliance/exceptions | Exceptions | الاستثناءات | ComplianceExceptionsPageComponent | modules/compliance/ui/pages/compliance-exceptions-page.component.ts | GET /api/compliance-ws/exceptions | dos.compliance_exceptions | compliance.write | VERIFY |
| 15 | compliance.evidence-ops | /compliance/evidence-ops | Evidence Operations | عمليات الأدلة | ComplianceEvidenceOpsPageComponent | modules/compliance/ui/pages/compliance-evidence-ops-page.component.ts | GET /api/compliance-ws/evidence | dos.compliance_evidence | compliance.evidence.read | VERIFY |
| 16 | compliance.admin | /compliance/admin | Admin | الإدارة | ComplianceAdminPageComponent | modules/compliance/ui/pages/compliance-admin-page.component.ts | GET /api/compliance-ws/admin | dos.compliance_settings | compliance.admin | VERIFY |

### config-center-complete-direct-seed.md

**§1 summary:** module_code=`config-center`, route_base=`/admin/config-center`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | config-center |
| product_key | shahin-ai |
| route_base | /admin/config-center |
| owner_service (manifest) | ui-os-service` (template binding resolver); config HTTP served via **gateway → tenant-service** (`/api/config-center`) |

#### §2 / §3 / §4 — Navigation registry

| nav_item_code | route | permission |
| --- | --- | --- |
| config-center | (group) | platform.config_center.read |
| config-center.hub | /admin/config-center | platform.config_center.read |
| … | /admin/config-center/settings | … |
| config-center.flags | /admin/config-center/flags | … |
| config-center.tokens | /admin/config-center/tokens | … |
| config-center.audit | /admin/config-center/audit | … |
| config-center.compare | /admin/config-center/compare | … |
| config-center.resolve | /admin/config-center/resolve | … |
| config-center.workspace | /admin/config-center/workspace | … |
| config-center.gateway | /admin/config-center/gateway | … |
| config-center.health | /admin/config-center/health | … |

#### §2 / §3 / §4 — Permissions

| permission_code | Use |
| --- | --- |
| platform.config_center.read | **Required by `configCenterGuard`** — navigation + pages |
| platform.config_center.admin | Writes (settings PUT, gateway overrides, import) |
| platform.audit.read | Richer audit / forensic views if enforced server-side |

#### §5 / §6 — Page matrix (full columns) — source §6

| page_code | route | template_export | SPA implementation | Primary APIs |
| --- | --- | --- | --- | --- |
| platform.config-center.hub | /admin/config-center | DecisionDashboardTemplateComponent | ⚠ Redirect → **`resolve`** | N/A unless redirect fixed |
| platform.config-center.resolve | .../resolve | ModuleSettingsTemplateComponent | ✅ `ConfigResolutionComponent | GET ${base}/resolve/*`, `/explain/*`, `/settings |
| platform.config-center.compare | .../compare | ModuleSettingsTemplateComponent | ✅ `ConfigCompareComponent | GET ${base}/compare/* |
| platform.config-center.workspace | .../workspace | ModuleSettingsTemplateComponent | ✅ `ConfigWorkspaceComponent | GET ${base}/gateway/workspace-config`, `/gateway/shell-override`, `PUT workspace-batch |
| platform.config-center.health | .../health | TrendIntelligenceTemplateComponent | ✅ `ConfigHealthComponent | GET ${base}/health/* |
| platform.config-center.gateway | .../gateway | TrendIntelligenceTemplateComponent | ✅ DynamicTemplate + binding | Gateway inventory/overrides mutations |
| platform.config-center.settings | .../settings | ModuleRecordsTemplateComponent | ✅ DynamicTemplate + binding | GET/PUT ${base}/settings* |
| platform.config-center.flags | .../flags | ModuleRecordsTemplateComponent | ✅ DynamicTemplate + binding | *(confirm tenant-service keys / feature-flag slice)* |
| platform.config-center.tokens | .../tokens | ModuleRecordsTemplateComponent | ✅ DynamicTemplate + binding | *(confirm secrets/tokens slice)* |
| platform.config-center.audit | .../audit | AuditTrailLedgerTemplateComponent | ✅ DynamicTemplate + binding | GET ${base}/audit* |

### controls-complete-direct-seed.md

**§1 summary:** module_code=`controls`, route_base=`/controls`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | controls |
| product_key | shahin-ai |
| route_base | /controls |
| owner_service | compliance-controls-service |
| module_status | active_after_validation |
| module_name_en | Controls |
| module_name_ar | Controls |
| category | grc-core |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| controls | controls | /controls | Controls | Controls | controls.read | 10 |
| controls.overview | controls | /controls/overview | Overview | نظرة عامة | controls.read | 10 |
| controls.library | controls | /controls/library | Control Library | مكتبة الضوابط | controls.read | 20 |
| controls.testing | controls | /controls/testing | Testing | الاختبار | controls.test.read | 30 |
| controls.evidence | controls | /controls/evidence | Evidence | الأدلة | controls.evidence.read | 40 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| controls.overview.page | /controls/overview | controls | controls.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| controls.library.page | /controls/library | controls | controls.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| controls.testing.page | /controls/testing | controls | controls.test.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| controls.evidence.page | /controls/evidence | controls | controls.evidence.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| controls.admin | controls admin |
| controls.evidence.read | controls evidence read |
| controls.read | controls read |
| controls.test.read | controls test read |
| controls.write | controls write |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| controls | shahin-ai | Controls | grc-core | active | compliance-controls-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | controls.overview | /controls/overview | Overview | نظرة عامة | ControlsOverviewComponent | GET /api/controls/overview | dos.controls | controls.read | VERIFY |
| 2 | controls.library | /controls/library | Control Library | مكتبة الضوابط | ControlsLibraryComponent | GET /api/controls | dos.controls | controls.read | VERIFY |
| 3 | controls.testing | /controls/testing | Testing | الاختبار | ControlsTestingComponent | GET /api/controls/testing | dos.control_tests | controls.test.read | VERIFY |
| 4 | controls.evidence | /controls/evidence | Evidence | الأدلة | ControlsEvidenceComponent | GET /api/controls/evidence | dos.control_evidence | controls.evidence.read | VERIFY |

### dora-complete-direct-seed.md

**§1 summary:** module_code=`dora`, route_base=`/dora`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | dora |
| product_key | shahin-ai |
| route_base | /dora |
| owner_service | dora-service |
| module_status | active_after_validation |
| module_name_en | DORA |
| module_name_ar | DORA |
| category | regulatory |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| dora | dora | /dora | DORA | DORA | dora.read | 10 |
| dora.overview | dora | /dora/overview | Overview | نظرة عامة | dora.read | 10 |
| dora.ict-risk | dora | /dora/ict-risk | ICT Risk | مخاطر تقنية المعلومات | dora.risk.read | 20 |
| dora.incidents | dora | /dora/incidents | Incidents | الحوادث | dora.incident.read | 30 |
| dora.reports | dora | /dora/reports | Reports | التقارير | dora.report.read | 40 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| dora.overview.page | /dora/overview | dora | dora.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| dora.ict-risk.page | /dora/ict-risk | dora | dora.risk.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| dora.incidents.page | /dora/incidents | dora | dora.incident.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| dora.reports.page | /dora/reports | dora | dora.report.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| dora.admin | dora admin |
| dora.incident.read | dora incident read |
| dora.read | dora read |
| dora.report.read | dora report read |
| dora.risk.read | dora risk read |
| dora.write | dora write |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| dora | shahin-ai | DORA | regulatory | active | dora-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | dora.overview | /dora/overview | Overview | نظرة عامة | DoraOverviewComponent | GET /api/dora/overview | dos.dora_register | dora.read | VERIFY |
| 2 | dora.ict-risk | /dora/ict-risk | ICT Risk | مخاطر تقنية المعلومات | DoraIctRiskComponent | GET /api/dora/ict-risk | dos.dora_ict_risks | dora.risk.read | VERIFY |
| 3 | dora.incidents | /dora/incidents | Incidents | الحوادث | DoraIncidentsComponent | GET /api/dora/incidents | dos.dora_incidents | dora.incident.read | VERIFY |
| 4 | dora.reports | /dora/reports | Reports | التقارير | DoraReportsComponent | GET /api/dora/reports | dos.dora_reports | dora.report.read | VERIFY |

### dynamic-ui-complete-direct-seed.md

**§1 summary:** module_code=`dynamic-ui`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | dynamic-ui |
| product_key | shahin-ai |
| route_base (manifest) | /dynamic-ui |
| owner_service | ui-os-service |
| tier / category | platform |

#### §2 / §3 / §4 — Navigation registry

| nav_item_code | route | permission |
| --- | --- | --- |
| dynamic-ui | (group) | dynamic_ui.module.read |
| dynamic-ui.overview | /dynamic-ui/overview | dynamic_ui.module.read |
| dynamic-ui.routes | /dynamic-ui/routes | dynamic_ui.routes.read |
| dynamic-ui.components | /dynamic-ui/components | dynamic_ui.components.read |
| dynamic-ui.contracts | /dynamic-ui/contracts | dynamic_ui.contracts.read |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_code | manifest route | Archetype (JSON) | template_export | How it would render once routed | Backend data |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | dynamic-ui.overview | /dynamic-ui/overview | command-home | ModuleOverviewTemplateComponent | DynamicTemplatePageComponent` + DB binding **`or`** dedicated page | ⚠ Compose from `route-catalog` / contracts — **no `/overview`** |
| 2 | dynamic-ui.routes | /dynamic-ui/routes | intelligent-register | ModuleRecordsTemplateComponent | Same | ✅ `GET .../route-catalog |
| 3 | dynamic-ui.components | /dynamic-ui/components | intelligent-register | ModuleRecordsTemplateComponent | Same | ⚠ No dedicated **`/components`** — needs endpoint or reuse `route-catalog |
| 4 | dynamic-ui.contracts | /dynamic-ui/contracts | intelligent-register | ModuleRecordsTemplateComponent | Same | ✅ `GET .../contract/:moduleCode` (per module) |

### evidence-complete-direct-seed.md

**§1 summary:** module_code=`evidence`, route_base=`/evidence`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | evidence |
| product_key | shahin-ai |
| route_base | /evidence |
| owner_service | evidence-audit-reporting-service |
| module_status | active_after_validation |
| module_name_en | Evidence |
| module_name_ar | Evidence |
| category | grc-core |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| evidence | evidence | /evidence | Evidence | Evidence | evidence.read | 10 |
| evidence.overview | evidence | /evidence/overview | Overview | نظرة عامة | evidence.read | 10 |
| evidence.library | evidence | /evidence/library | Library | المكتبة | evidence.read | 20 |
| evidence.requests | evidence | /evidence/requests | Requests | الطلبات | evidence.request.read | 30 |
| evidence.reports | evidence | /evidence/reports | Reports | التقارير | evidence.report.read | 40 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| evidence.overview.page | /evidence/overview | evidence | evidence.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| evidence.library.page | /evidence/library | evidence | evidence.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| evidence.requests.page | /evidence/requests | evidence | evidence.request.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| evidence.reports.page | /evidence/reports | evidence | evidence.report.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| evidence.admin | evidence admin |
| evidence.read | evidence read |
| evidence.report.read | evidence report read |
| evidence.request.read | evidence request read |
| evidence.write | evidence write |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| evidence | shahin-ai | Evidence | grc-core | active | evidence-audit-reporting-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | evidence.overview | /evidence/overview | Overview | نظرة عامة | EvidenceOverviewComponent | GET /api/evidence/overview | dos.evidence_items | evidence.read | VERIFY |
| 2 | evidence.library | /evidence/library | Library | المكتبة | EvidenceLibraryComponent | GET /api/evidence | dos.evidence_items | evidence.read | VERIFY |
| 3 | evidence.requests | /evidence/requests | Requests | الطلبات | EvidenceRequestsComponent | GET /api/evidence/requests | dos.evidence_requests | evidence.request.read | VERIFY |
| 4 | evidence.reports | /evidence/reports | Reports | التقارير | EvidenceReportsComponent | GET /api/evidence/reports | dos.evidence_reports | evidence.report.read | VERIFY |

### foundation-complete-direct-seed.md

**§1 summary:** module_code=`foundation`, routeBase=`/api/foundation`, entitlementKey=`module.foundation`, version=`2.0.0`, tier=`platform`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | foundation |
| version | 2.0.0 |
| nameEn | Foundation — Organization Hierarchy |
| nameAr | الأساس — الهيكل التنظيمي |
| tier | platform |
| category | platform |
| routeBase | /api/foundation |
| eventNamespace | foundation |
| tablePrefix | foundation_ |
| provisioningOrder | 2 |
| licensingTier | starter |
| installable | false |
| visibility | internal |
| entitlementKey | module.foundation |
| featureFlag | module.foundation.enabled |
| owner_service | user-service` (lazy-loads canonical `platform/foundation/dist`) |
| entrypoint | dist/bootstrap.js#registerFoundation |

#### §2 / §3 / §4 — Navigation registry

| sort | nav_item_code | route | permission | icon |
| --- | --- | --- | --- | --- |
| 5 | foundation | *(null — group)* | foundation.module.read | building |
| 10 | foundation.overview | /foundation/overview | foundation.module.read | layout-dashboard |
| 20 | foundation.organization | /foundation/organization | foundation.data.read | sitemap |
| 30 | foundation.business-units | /foundation/business-units | foundation.data.read | briefcase |
| 40 | foundation.departments | /foundation/departments | foundation.data.read | building-community |
| 50 | foundation.positions | /foundation/positions | foundation.data.read | badge |
| 60 | foundation.locations | /foundation/locations | foundation.data.read | map-pin |
| 70 | foundation.users | /foundation/users | foundation.user.read | users |
| 80 | foundation.teams | /foundation/teams | foundation.data.read | users-group |
| 90 | foundation.roles | /foundation/roles | foundation.rbac.read | shield |
| 100 | foundation.permissions | /foundation/permissions | foundation.rbac.read | key |
| 110 | foundation.committees | /foundation/committees | foundation.data.read | assembly |
| 120 | foundation.delegations | /foundation/delegations | foundation.data.read | share |
| 130 | foundation.access-review | /foundation/access-review | foundation.review.read | checklist |
| 140 | foundation.policies | /foundation/policies | foundation.data.read | book |
| 150 | foundation.audit | /foundation/audit | foundation.audit.read | history |
| 160 | foundation.ownership | /foundation/ownership | foundation.data.read | chart-arcs |
| 170 | foundation.sod | /foundation/sod | foundation.sod.write | shield-lock |
| 180 | foundation.hierarchy-viz | /foundation/hierarchy-viz | foundation.hierarchy.read | binary-tree |
| 190 | foundation.user-lifecycle | /foundation/user-lifecycle | foundation.user.write | arrow-cycle |
| 200 | foundation.reference-data | /foundation/reference-data | foundation.data.read | database |
| 210 | foundation.diagnostics | /foundation/diagnostics | foundation.module.read | stethoscope |

#### §2 / §3 / §4 — Permissions

| permissionCode | resourceType | actionType | sensitive | description |
| --- | --- | --- | --- | --- |
| foundation.read | record | read | false | Read foundation records |
| foundation.record.write | record | write | false | Write foundation records |
| foundation.record.delete | record | delete | true | Delete foundation records |
| foundation.record.approve | record | approve | true | Approve foundation changes |
| foundation.manage | system | manage | true | Manage foundation configuration |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_code | route | archetype | template_export (loader) | permission (JSON) | Primary data APIs (see §6) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | foundation.overview | /foundation/overview | command-home | ModuleOverviewTemplateComponent | foundation.module.read | /api/foundation/dashboard`, `/api/foundation/lookups |
| 2 | foundation.organization | /foundation/organization | org-chart | OrgChartTemplateComponent | foundation.data.read | /api/organizations`, `/api/org-hierarchy |
| 3 | foundation.business-units | /foundation/business-units | org-chart | OrgChartTemplateComponent | foundation.data.read | /api/business-units`, `/api/organizations |
| 4 | foundation.departments | /foundation/departments | org-chart | OrgChartTemplateComponent | foundation.data.read | /api/departments`, `/api/organizations |
| 5 | foundation.positions | /foundation/positions | intelligent-register | ModuleRecordsTemplateComponent | foundation.data.read | /api/positions |
| 6 | foundation.locations | /foundation/locations | intelligent-register | ModuleRecordsTemplateComponent | foundation.data.read | /api/locations |
| 7 | foundation.users | /foundation/users | intelligent-register | ModuleRecordsTemplateComponent | foundation.user.read | /api/users`, `/api/profiles |
| 8 | foundation.teams | /foundation/teams | org-chart | OrgChartTemplateComponent | foundation.data.read | /api/teams`, `/api/foundation/teams |
| 9 | foundation.roles | /foundation/roles | intelligent-register | ModuleRecordsTemplateComponent | foundation.rbac.read | /api/roles`, `/api/foundation/roles |
| 10 | foundation.permissions | /foundation/permissions | ownership-map | OwnershipMapTemplateComponent | foundation.rbac.read | /api/permissions` (via host / foundation aggregator as mounted) |
| 11 | foundation.committees | /foundation/committees | intelligent-register | ModuleRecordsTemplateComponent | foundation.data.read | /api/committees`, `/api/governance/committees |
| 12 | foundation.delegations | /foundation/delegations | delegation-center | DelegationCenterTemplateComponent | foundation.data.read | /api/governance/delegations`, `/api/delegations |
| 13 | foundation.access-review | /foundation/access-review | workflow-control | ModuleAssessmentsTemplateComponent | foundation.review.read | /api/access-reviews`, `/api/access-review |
| 14 | foundation.policies | /foundation/policies | intelligent-register | ModuleRecordsTemplateComponent | foundation.data.read | /api/governance/policies`, `/api/governance |
| 15 | foundation.audit | /foundation/audit | audit-trail-ledger | AuditTrailLedgerTemplateComponent | foundation.audit.read | /api/audit-trail |
| 16 | foundation.ownership | /foundation/ownership | ownership-map | OwnershipMapTemplateComponent | foundation.data.read | /api/ownership-mappings |
| 17 | foundation.sod | /foundation/sod | module-settings | ModuleSettingsTemplateComponent | foundation.sod.write | /api/sod`, `/api/foundation/sod/* |
| 18 | foundation.hierarchy-viz | /foundation/hierarchy-viz | org-chart | OrgChartTemplateComponent | foundation.hierarchy.read | /api/org-hierarchy |
| 19 | foundation.user-lifecycle | /foundation/user-lifecycle | workflow-timeline | WorkflowTimelineTemplateComponent | foundation.user.write | /api/user-lifecycle`, `/api/foundation/user-lifecycle |
| 20 | foundation.reference-data | /foundation/reference-data | intelligent-register | ModuleRecordsTemplateComponent | foundation.data.read | /api/foundation/lookups`, reference catalogs via foundation routes |
| 21 | foundation.diagnostics | /foundation/diagnostics | posture-overview | PostureOverviewTemplateComponent | foundation.module.read | /api/health/foundation`, `/api/foundation/health |

### inbox-complete-direct-seed.md

**§1 summary:** module_code=`inbox`, route_base=`/inbox`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | inbox |
| product_key | shahin-ai |
| route_base | /inbox |
| owner_service | notification-service / inbox-service |
| module_status | active_after_validation |
| module_name_en | Inbox |
| module_name_ar | Inbox |
| category | work |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| inbox | inbox | /inbox | Inbox | Inbox | inbox.read | 10 |
| inbox.overview | inbox | /inbox/overview | Overview | نظرة عامة | inbox.read | 10 |
| inbox.items | inbox | /inbox/items | Items | العناصر | inbox.read | 20 |
| inbox.approvals | inbox | /inbox/approvals | Approvals | الموافقات | inbox.approvals.read | 30 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| inbox.overview.page | /inbox/overview | inbox | inbox.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| inbox.items.page | /inbox/items | inbox | inbox.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| inbox.approvals.page | /inbox/approvals | inbox | inbox.approvals.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| inbox.admin | inbox admin |
| inbox.approvals.read | inbox approvals read |
| inbox.read | inbox read |
| inbox.write | inbox write |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| inbox | shahin-ai | Inbox | work | active | notification-service / inbox-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | inbox.overview | /inbox/overview | Overview | نظرة عامة | InboxOverviewComponent | GET /api/inbox/overview | dos.inbox_items | inbox.read | VERIFY |
| 2 | inbox.items | /inbox/items | Items | العناصر | InboxItemsComponent | GET /api/inbox/items | dos.inbox_items | inbox.read | VERIFY |
| 3 | inbox.approvals | /inbox/approvals | Approvals | الموافقات | InboxApprovalsComponent | GET /api/inbox/approvals | dos.approval_requests | inbox.approvals.read | VERIFY |

### incident-complete-direct-seed.md

**§1 summary:** module_code=`incident`, route_base=`/incident`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | incident |
| product_key | shahin-ai |
| route_base | /incident |
| owner_service | risk-incident-service |
| module_status | active_after_validation |
| module_name_en | Incident |
| module_name_ar | Incident |
| category | grc-core |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| incident | incident | /incident | Incident | Incident | incident.read | 10 |
| incident.overview | incident | /incident/overview | Overview | نظرة عامة | incident.read | 10 |
| incident.register | incident | /incident/register | Register | السجل | incident.read | 20 |
| incident.response | incident | /incident/response | Response | الاستجابة | incident.response.read | 30 |
| incident.reports | incident | /incident/reports | Reports | التقارير | incident.report.read | 40 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| incident.overview.page | /incident/overview | incident | incident.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| incident.register.page | /incident/register | incident | incident.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| incident.response.page | /incident/response | incident | incident.response.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| incident.reports.page | /incident/reports | incident | incident.report.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| incident.admin | incident admin |
| incident.read | incident read |
| incident.report.read | incident report read |
| incident.response.read | incident response read |
| incident.write | incident write |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| incident | shahin-ai | Incident | grc-core | active | risk-incident-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | incident.overview | /incident/overview | Overview | نظرة عامة | IncidentOverviewComponent | GET /api/incidents/overview | dos.incidents | incident.read | VERIFY |
| 2 | incident.register | /incident/register | Register | السجل | IncidentRegisterComponent | GET /api/incidents | dos.incidents | incident.read | VERIFY |
| 3 | incident.response | /incident/response | Response | الاستجابة | IncidentResponseComponent | GET /api/incidents/response | dos.incident_response_actions | incident.response.read | VERIFY |
| 4 | incident.reports | /incident/reports | Reports | التقارير | IncidentReportsComponent | GET /api/incidents/reports | dos.incident_reports | incident.report.read | VERIFY |

### issues-complete-direct-seed.md

**§1 summary:** module_code=`issues`, route_base=`/issues`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | issues |
| product_key | shahin-ai |
| route_base | /issues |
| owner_service | issue-service / remediation-service |
| module_status | active_after_validation |
| module_name_en | Issues |
| module_name_ar | Issues |
| category | work |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| issues | issues | /issues | Issues | Issues | issues.read | 10 |
| issues.overview | issues | /issues/overview | Overview | نظرة عامة | issues.read | 10 |
| issues.register | issues | /issues/register | Register | السجل | issues.read | 20 |
| issues.actions | issues | /issues/actions | Actions | الإجراءات | issues.action.read | 30 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| issues.overview.page | /issues/overview | issues | issues.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| issues.register.page | /issues/register | issues | issues.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| issues.actions.page | /issues/actions | issues | issues.action.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| issues.action.read | issues action read |
| issues.admin | issues admin |
| issues.read | issues read |
| issues.write | issues write |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| issues | shahin-ai | Issues | work | active | issue-service / remediation-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | issues.overview | /issues/overview | Overview | نظرة عامة | IssuesOverviewComponent | GET /api/issues/overview | dos.issues | issues.read | VERIFY |
| 2 | issues.register | /issues/register | Register | السجل | IssuesRegisterComponent | GET /api/issues | dos.issues | issues.read | VERIFY |
| 3 | issues.actions | /issues/actions | Actions | الإجراءات | IssuesActionsComponent | GET /api/issues/actions | dos.issue_actions | issues.action.read | VERIFY |

### knowledge-complete-direct-seed.md

**§1 summary:** module_code=`knowledge`, route_base=`/knowledge`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | knowledge |
| product_key | shahin-ai |
| route_base | /knowledge |
| owner_service | knowledge-service |
| module_status | active_after_validation |
| module_name_en | Knowledge |
| module_name_ar | Knowledge |
| category | knowledge |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| knowledge | knowledge | /knowledge | Knowledge | Knowledge | knowledge.read | 10 |
| knowledge.overview | knowledge | /knowledge/overview | Overview | نظرة عامة | knowledge.read | 10 |
| knowledge.library | knowledge | /knowledge/library | Library | المكتبة | knowledge.read | 20 |
| knowledge.packs | knowledge | /knowledge/packs | Content Packs | حزم المحتوى | knowledge.packs.read | 30 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| knowledge.overview.page | /knowledge/overview | knowledge | knowledge.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| knowledge.library.page | /knowledge/library | knowledge | knowledge.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| knowledge.packs.page | /knowledge/packs | knowledge | knowledge.packs.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| knowledge.admin | knowledge admin |
| knowledge.packs.read | knowledge packs read |
| knowledge.read | knowledge read |
| knowledge.write | knowledge write |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| knowledge | shahin-ai | Knowledge | knowledge | active | knowledge-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | knowledge.overview | /knowledge/overview | Overview | نظرة عامة | KnowledgeOverviewComponent | GET /api/knowledge/overview | dos.knowledge_articles | knowledge.read | VERIFY |
| 2 | knowledge.library | /knowledge/library | Library | المكتبة | KnowledgeLibraryComponent | GET /api/knowledge/articles | dos.knowledge_articles | knowledge.read | VERIFY |
| 3 | knowledge.packs | /knowledge/packs | Content Packs | حزم المحتوى | KnowledgePacksComponent | GET /api/knowledge/packs | dos.content_packs | knowledge.packs.read | VERIFY |

### ksa-regulatory-complete-direct-seed.md

**§1 summary:** module_code=`ksa-regulatory`, route_base=`/ksa-regulatory`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | ksa-regulatory |
| product_key | shahin-ai |
| route_base | /ksa-regulatory |
| owner_service | regulatory-service |
| module_status | active_after_validation |
| module_name_en | KSA Regulatory |
| module_name_ar | KSA Regulatory |
| category | regulatory |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| ksa-regulatory | ksa-regulatory | /ksa-regulatory | KSA Regulatory | KSA Regulatory | ksa-regulatory.read | 10 |
| ksa-regulatory.overview | ksa-regulatory | /ksa-regulatory/overview | Overview | نظرة عامة | ksa.read | 10 |
| ksa-regulatory.frameworks | ksa-regulatory | /ksa-regulatory/frameworks | Frameworks | الأطر | ksa.frameworks.read | 20 |
| ksa-regulatory.obligations | ksa-regulatory | /ksa-regulatory/obligations | Obligations | الالتزامات | ksa.obligations.read | 30 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| ksa-regulatory.overview.page | /ksa-regulatory/overview | ksa-regulatory | ksa.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| ksa-regulatory.frameworks.page | /ksa-regulatory/frameworks | ksa-regulatory | ksa.frameworks.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| ksa-regulatory.obligations.page | /ksa-regulatory/obligations | ksa-regulatory | ksa.obligations.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| ksa-regulatory.admin | ksa-regulatory admin |
| ksa-regulatory.read | ksa-regulatory read |
| ksa-regulatory.write | ksa-regulatory write |
| ksa.frameworks.read | ksa frameworks read |
| ksa.obligations.read | ksa obligations read |
| ksa.read | ksa read |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| ksa-regulatory | shahin-ai | KSA Regulatory | regulatory | active | regulatory-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | ksa-regulatory.overview | /ksa-regulatory/overview | Overview | نظرة عامة | KsaRegulatoryOverviewComponent | GET /api/ksa-regulatory/overview | dos.ksa_regulatory_requirements | ksa.read | VERIFY |
| 2 | ksa-regulatory.frameworks | /ksa-regulatory/frameworks | Frameworks | الأطر | KsaRegulatoryFrameworksComponent | GET /api/ksa-regulatory/frameworks | dos.ksa_frameworks | ksa.frameworks.read | VERIFY |
| 3 | ksa-regulatory.obligations | /ksa-regulatory/obligations | Obligations | الالتزامات | KsaRegulatoryObligationsComponent | GET /api/ksa-regulatory/obligations | dos.ksa_obligations | ksa.obligations.read | VERIFY |

### mcp-complete-direct-seed.md

**§1 summary:** module_code=`mcp`, route_base=`/mcp`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | mcp |
| product_key | shahin-ai |
| route_base | /mcp |
| owner_service | ai-engine-service / mcp-service |
| module_status | active_after_validation |
| module_name_en | MCP |
| module_name_ar | MCP |
| category | ai-integration |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| mcp | mcp | /mcp | MCP | MCP | mcp.read | 10 |
| mcp.overview | mcp | /mcp/overview | Overview | نظرة عامة | mcp.read | 10 |
| mcp.servers | mcp | /mcp/servers | Servers | الخوادم | mcp.servers.read | 20 |
| mcp.tools | mcp | /mcp/tools | Tools | الأدوات | mcp.tools.read | 30 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| mcp.overview.page | /mcp/overview | mcp | mcp.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| mcp.servers.page | /mcp/servers | mcp | mcp.servers.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| mcp.tools.page | /mcp/tools | mcp | mcp.tools.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| mcp.admin | mcp admin |
| mcp.read | mcp read |
| mcp.servers.read | mcp servers read |
| mcp.tools.read | mcp tools read |
| mcp.write | mcp write |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| mcp | shahin-ai | MCP | ai-integration | active | ai-engine-service / mcp-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | mcp.overview | /mcp/overview | Overview | نظرة عامة | McpOverviewComponent | GET /api/mcp/overview | dos.mcp_servers | mcp.read | VERIFY |
| 2 | mcp.servers | /mcp/servers | Servers | الخوادم | McpServersComponent | GET /api/mcp/servers | dos.mcp_servers | mcp.servers.read | VERIFY |
| 3 | mcp.tools | /mcp/tools | Tools | الأدوات | McpToolsComponent | GET /api/mcp/tools | dos.mcp_tools | mcp.tools.read | VERIFY |

### notification-complete-direct-seed.md

**§1 summary:** module_code=`notification`, route_base=`/notification`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | notification |
| product_key | shahin-ai |
| route_base | /notification |
| owner_service | notification-service |
| module_status | active_after_validation |
| module_name_en | Notification |
| module_name_ar | Notification |
| category | work |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| notification | notification | /notification | Notification | Notification | notification.read | 10 |
| notification.overview | notification | /notification/overview | Overview | نظرة عامة | notification.read | 10 |
| notification.messages | notification | /notification/messages | Messages | الرسائل | notification.read | 20 |
| notification.preferences | notification | /notification/preferences | Preferences | التفضيلات | notification.preferences.read | 30 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| notification.overview.page | /notification/overview | notification | notification.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| notification.messages.page | /notification/messages | notification | notification.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| notification.preferences.page | /notification/preferences | notification | notification.preferences.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| notification.admin | notification admin |
| notification.preferences.read | notification preferences read |
| notification.read | notification read |
| notification.write | notification write |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| notification | shahin-ai | Notification | work | active | notification-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | notification.overview | /notification/overview | Overview | نظرة عامة | NotificationOverviewComponent | GET /api/notifications/overview | dos.notifications | notification.read | VERIFY |
| 2 | notification.messages | /notification/messages | Messages | الرسائل | NotificationMessagesComponent | GET /api/notifications | dos.notifications | notification.read | VERIFY |
| 3 | notification.preferences | /notification/preferences | Preferences | التفضيلات | NotificationPreferencesComponent | GET /api/notifications/preferences | dos.notification_preferences | notification.preferences.read | VERIFY |

### onboarding-complete-direct-seed.md

**§1 summary:** module_code=`onboarding`, route_base=`/onboarding`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | onboarding |
| product_key | shahin-ai |
| route_base | /onboarding |
| owner_service | onboarding-service |
| module_status | active_after_validation |
| module_name_en | Onboarding |
| module_name_ar | Onboarding |
| category | tenant-lifecycle |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| onboarding | onboarding | /onboarding | Onboarding | Onboarding | onboarding.read | 10 |
| onboarding.overview | onboarding | /onboarding/overview | Overview | نظرة عامة | onboarding.read | 10 |
| onboarding.sessions | onboarding | /onboarding/sessions | Sessions | الجلسات | onboarding.sessions.read | 20 |
| onboarding.intake | onboarding | /onboarding/intake | Foundation Intake | إدخال التأسيس | onboarding.intake.read | 30 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| onboarding.overview.page | /onboarding/overview | onboarding | onboarding.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| onboarding.sessions.page | /onboarding/sessions | onboarding | onboarding.sessions.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| onboarding.intake.page | /onboarding/intake | onboarding | onboarding.intake.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| onboarding.admin | onboarding admin |
| onboarding.intake.read | onboarding intake read |
| onboarding.read | onboarding read |
| onboarding.sessions.read | onboarding sessions read |
| onboarding.write | onboarding write |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| onboarding | shahin-ai | Onboarding | tenant-lifecycle | active | onboarding-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | onboarding.overview | /onboarding/overview | Overview | نظرة عامة | OnboardingOverviewComponent | GET /api/onboarding/overview | dos.onboarding_sessions | onboarding.read | VERIFY |
| 2 | onboarding.sessions | /onboarding/sessions | Sessions | الجلسات | OnboardingSessionsComponent | GET /api/onboarding/sessions | dos.onboarding_sessions | onboarding.sessions.read | VERIFY |
| 3 | onboarding.intake | /onboarding/intake | Foundation Intake | إدخال التأسيس | OnboardingIntakeComponent | GET /api/onboarding/intake | dos.onboarding_answer_sets | onboarding.intake.read | VERIFY |

### policy-complete-direct-seed.md

**§1 summary:** module_code=`policy`, route_base=`/policy`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | policy |
| product_key | shahin-ai |
| route_base | /policy |
| owner_service | governance-policy-service |
| module_status | active_after_validation |
| module_name_en | Policy |
| module_name_ar | Policy |
| category | grc-core |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| policy | policy | /policy | Policy | Policy | policy.read | 10 |
| policy.overview | policy | /policy/overview | Overview | نظرة عامة | policy.read | 10 |
| policy.library | policy | /policy/library | Policy Library | مكتبة السياسات | policy.read | 20 |
| policy.approvals | policy | /policy/approvals | Approvals | الموافقات | policy.approve | 30 |
| policy.attestations | policy | /policy/attestations | Attestations | الإقرارات | policy.attestation.read | 40 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| policy.overview.page | /policy/overview | policy | policy.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| policy.library.page | /policy/library | policy | policy.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| policy.approvals.page | /policy/approvals | policy | policy.approve | ibm-carbon | VERIFY_CARBON_KEY | approved |
| policy.attestations.page | /policy/attestations | policy | policy.attestation.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| policy.admin | policy admin |
| policy.approve | policy approve |
| policy.attestation.read | policy attestation read |
| policy.read | policy read |
| policy.write | policy write |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| policy | shahin-ai | Policy | grc-core | active | governance-policy-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | policy.overview | /policy/overview | Overview | نظرة عامة | PolicyOverviewComponent | GET /api/policies/overview | dos.policies | policy.read | VERIFY |
| 2 | policy.library | /policy/library | Policy Library | مكتبة السياسات | PolicyLibraryComponent | GET /api/policies | dos.policies | policy.read | VERIFY |
| 3 | policy.approvals | /policy/approvals | Approvals | الموافقات | PolicyApprovalsComponent | GET /api/policies/approvals | dos.policy_approvals | policy.approve | VERIFY |
| 4 | policy.attestations | /policy/attestations | Attestations | الإقرارات | PolicyAttestationsComponent | GET /api/policies/attestations | dos.policy_attestations | policy.attestation.read | VERIFY |

### privacy-complete-direct-seed.md

**§1 summary:** module_code=`privacy`, route_base=`/privacy`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | privacy |
| product_key | shahin-ai |
| route_base | /privacy |
| owner_service | privacy-service |
| module_status | active_after_validation |
| module_name_en | Privacy |
| module_name_ar | Privacy |
| category | privacy |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| privacy | privacy | /privacy | Privacy | Privacy | privacy.read | 10 |
| privacy.overview | privacy | /privacy/overview | Overview | نظرة عامة | privacy.read | 10 |
| privacy.ropa | privacy | /privacy/ropa | RoPA | سجل أنشطة المعالجة | privacy.ropa.read | 20 |
| privacy.dpia | privacy | /privacy/dpia | DPIA | تقييم أثر الخصوصية | privacy.dpia.read | 30 |
| privacy.requests | privacy | /privacy/requests | Requests | الطلبات | privacy.requests.read | 40 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| privacy.overview.page | /privacy/overview | privacy | privacy.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| privacy.ropa.page | /privacy/ropa | privacy | privacy.ropa.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| privacy.dpia.page | /privacy/dpia | privacy | privacy.dpia.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| privacy.requests.page | /privacy/requests | privacy | privacy.requests.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| privacy.admin | privacy admin |
| privacy.dpia.read | privacy dpia read |
| privacy.read | privacy read |
| privacy.requests.read | privacy requests read |
| privacy.ropa.read | privacy ropa read |
| privacy.write | privacy write |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| privacy | shahin-ai | Privacy | privacy | active | privacy-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | privacy.overview | /privacy/overview | Overview | نظرة عامة | PrivacyOverviewComponent | GET /api/privacy/overview | dos.privacy_assessments | privacy.read | VERIFY |
| 2 | privacy.ropa | /privacy/ropa | RoPA | سجل أنشطة المعالجة | PrivacyRopaComponent | GET /api/privacy/ropa | dos.privacy_ropa | privacy.ropa.read | VERIFY |
| 3 | privacy.dpia | /privacy/dpia | DPIA | تقييم أثر الخصوصية | PrivacyDpiaComponent | GET /api/privacy/dpia | dos.privacy_assessments | privacy.dpia.read | VERIFY |
| 4 | privacy.requests | /privacy/requests | Requests | الطلبات | PrivacyRequestsComponent | GET /api/privacy/requests | dos.privacy_requests | privacy.requests.read | VERIFY |

### qiyas-complete-direct-seed.md

**§1 summary:** module_code=`qiyas`, route_base=`/qiyas`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | qiyas |
| product_key | shahin-ai |
| route_base | /qiyas |
| owner_service | regulatory-service / qiyas-service |
| module_status | active_after_validation |
| module_name_en | Qiyas |
| module_name_ar | Qiyas |
| category | regulatory |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| qiyas | qiyas | /qiyas | Qiyas | Qiyas | qiyas.read | 10 |
| qiyas.overview | qiyas | /qiyas/overview | Overview | نظرة عامة | qiyas.read | 10 |
| qiyas.requirements | qiyas | /qiyas/requirements | Requirements | المتطلبات | qiyas.requirements.read | 20 |
| qiyas.assessments | qiyas | /qiyas/assessments | Assessments | التقييمات | qiyas.assessments.read | 30 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| qiyas.overview.page | /qiyas/overview | qiyas | qiyas.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| qiyas.requirements.page | /qiyas/requirements | qiyas | qiyas.requirements.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| qiyas.assessments.page | /qiyas/assessments | qiyas | qiyas.assessments.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| qiyas.admin | qiyas admin |
| qiyas.assessments.read | qiyas assessments read |
| qiyas.read | qiyas read |
| qiyas.requirements.read | qiyas requirements read |
| qiyas.write | qiyas write |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| qiyas | shahin-ai | Qiyas | regulatory | active | regulatory-service / qiyas-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | qiyas.overview | /qiyas/overview | Overview | نظرة عامة | QiyasOverviewComponent | GET /api/qiyas/overview | dos.qiyas_requirements | qiyas.read | VERIFY |
| 2 | qiyas.requirements | /qiyas/requirements | Requirements | المتطلبات | QiyasRequirementsComponent | GET /api/qiyas/requirements | dos.qiyas_requirements | qiyas.requirements.read | VERIFY |
| 3 | qiyas.assessments | /qiyas/assessments | Assessments | التقييمات | QiyasAssessmentsComponent | GET /api/qiyas/assessments | dos.qiyas_assessments | qiyas.assessments.read | VERIFY |

### remediation-complete-direct-seed.md

**§1 summary:** module_code=`remediation`, route_base=`/remediation`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | remediation |
| product_key | shahin-ai |
| route_base | /remediation |
| owner_service | remediation-service |
| module_status | active_after_validation |
| module_name_en | Remediation |
| module_name_ar | Remediation |
| category | work |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| remediation | remediation | /remediation | Remediation | Remediation | remediation.read | 10 |
| remediation.overview | remediation | /remediation/overview | Overview | نظرة عامة | remediation.read | 10 |
| remediation.plans | remediation | /remediation/plans | Plans | الخطط | remediation.read | 20 |
| remediation.actions | remediation | /remediation/actions | Actions | الإجراءات | remediation.action.read | 30 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| remediation.overview.page | /remediation/overview | remediation | remediation.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| remediation.plans.page | /remediation/plans | remediation | remediation.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| remediation.actions.page | /remediation/actions | remediation | remediation.action.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| remediation.action.read | remediation action read |
| remediation.admin | remediation admin |
| remediation.read | remediation read |
| remediation.write | remediation write |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| remediation | shahin-ai | Remediation | work | active | remediation-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | remediation.overview | /remediation/overview | Overview | نظرة عامة | RemediationOverviewComponent | GET /api/remediation/overview | dos.remediation_plans | remediation.read | VERIFY |
| 2 | remediation.plans | /remediation/plans | Plans | الخطط | RemediationPlansComponent | GET /api/remediation/plans | dos.remediation_plans | remediation.read | VERIFY |
| 3 | remediation.actions | /remediation/actions | Actions | الإجراءات | RemediationActionsComponent | GET /api/remediation/actions | dos.remediation_actions | remediation.action.read | VERIFY |

### reporting-complete-direct-seed.md

**§1 summary:** module_code=`reporting`, route_base=`/reporting`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | reporting |
| product_key | shahin-ai |
| route_base | /reporting |
| owner_service | analytics-reporting-service |
| module_status | active_after_validation |
| module_name_en | Reporting |
| module_name_ar | Reporting |
| category | reporting |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| reporting | reporting | /reporting | Reporting | Reporting | reporting.read | 10 |
| reporting.overview | reporting | /reporting/overview | Overview | نظرة عامة | reporting.read | 10 |
| reporting.reports | reporting | /reporting/reports | Reports | التقارير | reporting.read | 20 |
| reporting.exports | reporting | /reporting/exports | Exports | الصادرات | reporting.export | 30 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| reporting.overview.page | /reporting/overview | reporting | reporting.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| reporting.reports.page | /reporting/reports | reporting | reporting.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| reporting.exports.page | /reporting/exports | reporting | reporting.export | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| reporting.admin | reporting admin |
| reporting.export | reporting export |
| reporting.read | reporting read |
| reporting.write | reporting write |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| reporting | shahin-ai | Reporting | reporting | active | analytics-reporting-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | reporting.overview | /reporting/overview | Overview | نظرة عامة | ReportingOverviewComponent | GET /api/reporting/overview | dos.reports | reporting.read | VERIFY |
| 2 | reporting.reports | /reporting/reports | Reports | التقارير | ReportingReportsComponent | GET /api/reporting/reports | dos.reports | reporting.read | VERIFY |
| 3 | reporting.exports | /reporting/exports | Exports | الصادرات | ReportingExportsComponent | GET /api/reporting/exports | dos.report_exports | reporting.export | VERIFY |

### risk-complete-direct-seed.md

**§1 summary:** module_code=`risk`, route_base=`/risk`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | risk |
| catalog product_key | agrc` (in `dos.module_registry.product_key`) |
| tenant entitlement product_code | shahin-ai` (in `dos.tenant_module_entitlements.product_code`) |
| route_base | /risk |
| owner_service | risk-incident-service` (resolved via gateway prefix; not a column) |
| module_status | active |
| display_name | Risk Management |
| nav parent code | grc.risk |
| category | grc-core |

#### §2 / §3 / §4 — Navigation registry

| nav_item_code | module_code | parent_code | route | label_en | label_ar | sort_order |
| --- | --- | --- | --- | --- | --- | --- |
| grc.risk | risk | grc | /risk | Risk Management | إدارة المخاطر | 30 |
| risk.overview | risk | grc.risk | /risk/overview | Overview | نظرة عامة | 10 |
| risk.register | risk | grc.risk | /risk/register | Risk Register | سجل المخاطر | 20 |
| risk.assessments | risk | grc.risk | /risk/assessments | Assessments | التقييمات | 30 |
| risk.heatmap | risk | grc.risk | /risk/heatmap | Heatmap | الخريطة الحرارية | 40 |
| risk.treatments | risk | grc.risk | /risk/treatments | Treatments | المعالجات | 50 |
| risk.records | risk | grc.risk | /risk/records | Records | السجلات | 60 |
| risk.workflows | risk | grc.risk | /risk/workflows | Workflows | سير العمل | 70 |
| risk.reports | risk | grc.risk | /risk/reports | Reports | التقارير | 80 |
| risk.settings | risk | grc.risk | /risk/settings | Settings | الإعدادات | 90 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| route | component_key | permission_key | module_code |
| --- | --- | --- | --- |
| /risk | module.entry.page | risk.record.read | risk |
| /risk/overview | module.overview.page | risk.record.read | risk |
| /risk/register | RiskRegisterPage | risk.record.read | risk |
| /risk/assessments | RiskAssessmentsPage | risk.assessment.create | risk |
| /risk/heatmap | RiskHeatmapPage | risk.record.read | risk |
| /risk/treatments | RiskTreatmentsPage | risk.treatment.assign | risk |
| /risk/records | module.records.page | risk.record.read | risk |
| /risk/workflows | module.workflows.page | risk.manage | risk |
| /risk/reports | module.reports.page | risk.record.read | risk |
| /risk/settings | module.settings.page | risk.manage | risk |

#### §2 / §3 / §4 — Permissions

| permission_code | notes |
| --- | --- |
| risk.record.read | base read for records/overview/register/heatmap |
| risk.record.write | record edit |
| risk.record.update | record updates |
| risk.record.submit | standard_user contribution |
| risk.record.configure | admin-only configuration |
| risk.assessment.create | assessments page |
| risk.assessment.approve | assessment workflow |
| risk.treatment.assign | treatments page |
| risk.register.read | register list |
| risk.manage | workflows/settings |
| risk.approve | approval workflow |

#### §2 / §3 / §4 — Carbon / component registry (component_key + carbon_key)

| component_key | vendor | carbon_key | approval_status |
| --- | --- | --- | --- |
| module.entry.page | ibm-carbon | tiles | approved |
| module.overview.page | ibm-carbon | tiles | approved |
| module.records.page | ibm-carbon | table | approved |
| module.workflows.page | ibm-carbon | tabs | approved |
| module.reports.page | ibm-carbon | tiles | approved |
| module.settings.page | ibm-carbon | tabs | approved |
| RiskRegisterPage | ibm-carbon | tiles | approved |
| RiskAssessmentsPage | ibm-carbon | tiles | approved |
| RiskHeatmapPage | ibm-carbon | tiles | approved |
| RiskTreatmentsPage | ibm-carbon | tiles | approved |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route | label_en | Angular component | gateway prefix → service | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | risk.overview | /risk/overview | Overview | RiskOverviewComponent | /api/risk/*` → `risk-incident-service | dos.risks | risk.record.read | COMPLETE |
| 2 | risk.register | /risk/register | Risk Register | RiskRegisterPageComponent | /api/risk/* | dos.risks | risk.record.read | COMPLETE |
| 3 | risk.assessments | /risk/assessments | Assessments | RiskAssessmentsPageComponent | /api/risk/* | dos.risk_assessments | risk.assessment.create | COMPLETE |
| 4 | risk.heatmap | /risk/heatmap | Heatmap | RiskHeatmapPageComponent | /api/risk/* | dos.risks | risk.record.read | COMPLETE |
| 5 | risk.treatments | /risk/treatments | Treatments | RiskTreatmentsPageComponent | /api/risk/* | dos.risk_treatments | risk.treatment.assign | COMPLETE |
| 6 | risk.records | /risk/records | Records | (generic `module.records.page` host) | /api/risk/* | dos.risks | risk.record.read | COMPONENT_MISSING |
| 7 | risk.workflows | /risk/workflows | Workflows | (generic `module.workflows.page` host) | /api/risk/* | workflow tables | risk.manage | COMPONENT_MISSING |
| 8 | risk.reports | /risk/reports | Reports | (generic `module.reports.page` host) | /api/risk/* | dos.risks | risk.record.read | COMPONENT_MISSING |
| 9 | risk.settings | /risk/settings | Settings | (generic `module.settings.page` host) | /api/risk/* | settings tables | risk.manage | COMPONENT_MISSING |

### training-complete-direct-seed.md

**§1 summary:** module_code=`training`, route_base=`/training`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | training |
| product_key | shahin-ai |
| route_base | /training |
| owner_service | training-service |
| module_status | active_after_validation |
| module_name_en | Training |
| module_name_ar | Training |
| category | awareness |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| training | training | /training | Training | Training | training.read | 10 |
| training.overview | training | /training/overview | Overview | نظرة عامة | training.read | 10 |
| training.courses | training | /training/courses | Courses | الدورات | training.read | 20 |
| training.assignments | training | /training/assignments | Assignments | التكليفات | training.assignments.read | 30 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| training.overview.page | /training/overview | training | training.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| training.courses.page | /training/courses | training | training.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| training.assignments.page | /training/assignments | training | training.assignments.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| training.admin | training admin |
| training.assignments.read | training assignments read |
| training.read | training read |
| training.write | training write |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| training | shahin-ai | Training | awareness | active | training-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | training.overview | /training/overview | Overview | نظرة عامة | TrainingOverviewComponent | GET /api/training/overview | dos.training_courses | training.read | VERIFY |
| 2 | training.courses | /training/courses | Courses | الدورات | TrainingCoursesComponent | GET /api/training/courses | dos.training_courses | training.read | VERIFY |
| 3 | training.assignments | /training/assignments | Assignments | التكليفات | TrainingAssignmentsComponent | GET /api/training/assignments | dos.training_assignments | training.assignments.read | VERIFY |

### vendor-complete-direct-seed.md

**§1 summary:** module_code=`vendor`, route_base=`/vendor`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | vendor |
| product_key | shahin-ai |
| route_base | /vendor |
| owner_service | vendor-risk-service |
| module_status | active_after_validation |
| module_name_en | Vendor |
| module_name_ar | Vendor |
| category | third-party |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| vendor | vendor | /vendor | Vendor | Vendor | vendor.read | 10 |
| vendor.overview | vendor | /vendor/overview | Overview | نظرة عامة | vendor.read | 10 |
| vendor.registry | vendor | /vendor/registry | Registry | السجل | vendor.read | 20 |
| vendor.assessments | vendor | /vendor/assessments | Assessments | التقييمات | vendor.assessment.read | 30 |
| vendor.contracts | vendor | /vendor/contracts | Contracts | العقود | vendor.contract.read | 40 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| vendor.overview.page | /vendor/overview | vendor | vendor.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| vendor.registry.page | /vendor/registry | vendor | vendor.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| vendor.assessments.page | /vendor/assessments | vendor | vendor.assessment.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| vendor.contracts.page | /vendor/contracts | vendor | vendor.contract.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| vendor.admin | vendor admin |
| vendor.assessment.read | vendor assessment read |
| vendor.contract.read | vendor contract read |
| vendor.read | vendor read |
| vendor.write | vendor write |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| vendor | shahin-ai | Vendor | third-party | active | vendor-risk-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | vendor.overview | /vendor/overview | Overview | نظرة عامة | VendorOverviewComponent | GET /api/vendors/overview | dos.vendors | vendor.read | VERIFY |
| 2 | vendor.registry | /vendor/registry | Registry | السجل | VendorRegistryComponent | GET /api/vendors | dos.vendors | vendor.read | VERIFY |
| 3 | vendor.assessments | /vendor/assessments | Assessments | التقييمات | VendorAssessmentsComponent | GET /api/vendors/assessments | dos.vendor_assessments | vendor.assessment.read | VERIFY |
| 4 | vendor.contracts | /vendor/contracts | Contracts | العقود | VendorContractsComponent | GET /api/vendors/contracts | dos.vendor_contracts | vendor.contract.read | VERIFY |

### workflow-complete-direct-seed.md

**§1 summary:** module_code=`workflow`, route_base=`/workflow`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | workflow |
| product_key | shahin-ai |
| route_base | /workflow |
| owner_service | workflow-service |
| module_status | active_after_validation |
| module_name_en | Workflow |
| module_name_ar | Workflow |
| category | workflow |

#### §2 / §3 / §4 — Navigation registry

| nav_key | module_code | route_path | title_en | title_ar | permission | order |
| --- | --- | --- | --- | --- | --- | --- |
| workflow | workflow | /workflow | Workflow | Workflow | workflow.read | 10 |
| workflow.overview | workflow | /workflow/overview | Overview | نظرة عامة | workflow.read | 10 |
| workflow.templates | workflow | /workflow/templates | Templates | القوالب | workflow.templates.read | 20 |
| workflow.instances | workflow | /workflow/instances | Instances | المثيلات | workflow.instances.read | 30 |
| workflow.approvals | workflow | /workflow/approvals | Approvals | الموافقات | workflow.approvals.read | 40 |

#### §2 / §3 / §4 — Dynamic UI (component_key + route_path)

| component_key | route_path | module_code | permission | vendor | carbon_key | approval_status |
| --- | --- | --- | --- | --- | --- | --- |
| workflow.overview.page | /workflow/overview | workflow | workflow.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| workflow.templates.page | /workflow/templates | workflow | workflow.templates.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| workflow.instances.page | /workflow/instances | workflow | workflow.instances.read | ibm-carbon | VERIFY_CARBON_KEY | approved |
| workflow.approvals.page | /workflow/approvals | workflow | workflow.approvals.read | ibm-carbon | VERIFY_CARBON_KEY | approved |

#### §2 / §3 / §4 — Permissions

| permission_code | description |
| --- | --- |
| workflow.admin | workflow admin |
| workflow.approvals.read | workflow approvals read |
| workflow.instances.read | workflow instances read |
| workflow.read | workflow read |
| workflow.templates.read | workflow templates read |
| workflow.write | workflow write |

#### §2 / §3 / §4 — Module registry (module_code + product_key)

| module_code | product_key | title_en | category | status | owner_service |
| --- | --- | --- | --- | --- | --- |
| workflow | shahin-ai | Workflow | workflow | active | workflow-service |

#### §5 / §6 — Page matrix (full columns) — source §5

| # | page_key | route_path | title_en | title_ar | Angular component | API endpoint | DB tables | permission | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | workflow.overview | /workflow/overview | Overview | نظرة عامة | WorkflowOverviewComponent | GET /api/workflow/overview | dos.workflow_instances | workflow.read | VERIFY |
| 2 | workflow.templates | /workflow/templates | Templates | القوالب | WorkflowTemplatesComponent | GET /api/workflow/templates | dos.workflow_templates | workflow.templates.read | VERIFY |
| 3 | workflow.instances | /workflow/instances | Instances | المثيلات | WorkflowInstancesComponent | GET /api/workflow/instances | dos.workflow_instances | workflow.instances.read | VERIFY |
| 4 | workflow.approvals | /workflow/approvals | Approvals | الموافقات | WorkflowApprovalsComponent | GET /api/workflow/approvals | dos.workflow_approvals | workflow.approvals.read | VERIFY |

### workspace-shell-complete-direct-seed.md

**§1 summary:** module_code=`workspace-shell`, route_base=`null (shell hosts pages, owns no route)`, version=`2.0.0`, tier=`platform`

#### §1 — Identity (full)

| Field | Value |
| --- | --- |
| module_code | workspace-shell |
| product_key | platform-dna |
| tier | platform |
| category | platform |
| owner_service | ui-os-service |
| name_en | Workspace Shell |
| name_ar | هيكل مساحة العمل |
| version | 2.0.0 |
| is_platform_dna | true |
| route_base | null` (shell hosts pages, owns no route) |

#### §2 / §3 / §4 — Permissions

| permission_code | Sensitive |
| --- | --- |
| workspace.shell.read | no |
| workspace.shell.manage | yes |
| workspace.search.use | no |
| workspace.workqueue.read | no |
| workspace.agents.observe | no |
| workspace.inbox.read | no |
| workspace.records.create | no |

#### §2 / §3 / §4 — Carbon / component registry (component_key + carbon_key) (1/3)

| component_key | carbon_key | Selector | Position |
| --- | --- | --- | --- |
| shell.app | ui-shell | dos-app-shell | root |
| shell.desktop | ui-shell | dos-desktop-shell | root/desktop |
| shell.mobile | ui-shell | dos-mobile-shell | root/mobile |
| shell.desktop-sidebar | ui-shell | dos-desktop-sidebar | left |
| workspace.header | ui-shell | dos-workspace-header | top |
| workspace.sidebar | ui-shell | dos-workspace-sidebar | left |
| workspace.mobile-nav | tiles | dos-mobile-bottom-nav | bottom |
| shell.mobile-drawer | ui-shell | dos-mobile-drawer | left-overlay |
| shell.workspace-nav | ui-shell | dos-workspace-nav | sidebar-content |
| shell.nav-section | ui-shell | dos-nav-section | sidebar-group |
| shell.nav-item | ui-shell | dos-nav-item | sidebar-leaf |

#### §2 / §3 / §4 — Carbon / component registry (component_key + carbon_key) (2/3)

| component_key | carbon_key | Selector | Trigger |
| --- | --- | --- | --- |
| workspace.command-search | search | dos-command-search | cmd-k |
| workspace.inbox-center | modal | dos-inbox-center | bell icon |
| workspace.quick-create | button | dos-quick-create | FAB |
| workspace.context-panel | accordion | dos-context-panel | right rail |
| shell.account-menu | overflow-menu | dos-account-menu | avatar |

#### §2 / §3 / §4 — Carbon / component registry (component_key + carbon_key) (3/3)

| component_key | carbon_key | Selector | Purpose |
| --- | --- | --- | --- |
| workspace.status-bar | tag | dos-workspace-status-bar | system signals |
| workspace.action-queue | tiles | dos-action-queue | pending work |
| workspace.agent-strip | tiles | dos-agent-activity-strip | agent activity |
| shell.banner-strip | notification | dos-shell-banner-strip | trial/offline/error banners |
| shell.toast-outlet | notification | dos-toast-outlet | transient toasts |
| page.layout | grid | dos-page-layout | canonical page frame (masthead+KPI+tabs+main+rail) |
| page.masthead | tiles | dos-page-masthead | hero with eyebrow/title/subtitle/gradient |
| page.header | breadcrumb | dos-page-header | breadcrumb + title + actions |
| page.tabs | tabs | dos-tabs | tab navigation within pages |
| page.widget-frame | tiles | dos-widget-frame | dynamic widget chrome (5 variants, 4 states) |

#### §5 / §6 — Page matrix (full columns)

_No resolved page matrix._ Prefer **§2 / §3 / §4 — Carbon / component registry** above for shell surfaces.

_Generated by `scripts/inventory-contract-pack-md.mjs`._

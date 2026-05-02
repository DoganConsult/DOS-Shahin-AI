
# Global Platform Operating Constitution
## Platform / Products / Tenants / Models / AI Agents / Delivery / Audit / Handover
**Document ID:** GPOC-v1.0  
**Status:** Proposed Operating Standard  
**Intended Repository Path:** `/docs/governance/Global-Platform-Operating-Constitution.md`  
**Primary Audience:** Engineering, Architecture, Product, Data, DevOps, QA, Security, Audit, Delivery, Handover, AI-Agent Operators  
**Decision Mode:** Execute-by-standard. No improvisation outside approved change control.

---

## 1. Executive Purpose

This document is the constitutional operating standard for building, changing, auditing, deploying, handing over, and evolving the platform.

It exists to stop architectural drift, database drift, role confusion, silent coupling, undocumented shortcuts, and inconsistent delivery practices. It is written as a codebase asset, not as a presentation deck. Every engineer, architect, reviewer, implementer, auditor, DevOps operator, support owner, and AI agent must operate inside this document.

This constitution assumes the platform contains:

- a reusable **platform core**
- one or more **products**
- one or more **tenants / workspaces / organizations**
- one or more **AI providers and models**
- one or more **functions / tools / workflows / jobs**
- one or more **deployment profiles** such as local, cloud, on-prem, or air-gapped

This constitution is therefore designed for a **multi-product, multi-tenant, multi-model, multi-function platform**.

---

## 2. Architectural Context Locked by Existing Project Direction

This constitution explicitly incorporates the project direction already established in the codebase and project materials:

1. The platform core must stay **neutral and reusable**, while product logic remains **product-owned and separable**.
2. Product seed catalogs and product-specific AI assets must remain outside reusable platform orchestration.
3. Configuration must be separated into **environment**, **deployment**, **product**, and **tenant/workspace** layers.
4. The platform must remain valid for **fresh builds**, **fresh tenants**, **new deployments**, and **future extraction into a wider Dogan-OS style core**.
5. The system must support **bilingual delivery**, API-based integration, modular services, containerized deployment, and extensible AI/model layers.

---

## 3. Non-Negotiable Constitutional Laws

### Law 1 - Single Source of Truth
For every truth domain, there is one canonical owner and one canonical representation.

Canonical truth domains include:

- business truth
- product truth
- schema truth
- config truth
- permission truth
- API truth
- workflow truth
- event truth
- deployment truth
- monitoring truth

No duplicate authority.

### Law 2 - Platform Core Neutrality
Reusable platform services must not embed product-specific assumptions.

Allowed:
- generic interfaces
- registries
- orchestration layers
- product manifests
- explicit registration contracts

Forbidden:
- hardcoded product catalogs in platform core
- product-specific defaults inside neutral platform services
- platform routes or permissions borrowing product meaning

### Law 3 - Product Isolation
Each product owns its:

- module definitions
- domain schema
- workflows
- reports
- AI assets
- product defaults
- product onboarding assumptions
- product documentation

### Law 4 - Fresh Build Rule
A fresh environment must be buildable from approved baseline artifacts only.

Required:

- baseline schema
- reference seeds
- bootstrap scripts
- manifest registry
- verification scripts
- deployment config

Forbidden:

- invisible manual patches
- one-off SQL replay chains as runtime dependency
- environment-specific tribal knowledge

### Law 5 - Explicit Contracts Before Implementation
No implementation may proceed without the required contracts:

- domain contract
- API contract
- schema contract
- config contract
- permission contract
- workflow contract
- event contract
- observability contract

### Law 6 - No Hidden Logic
If logic cannot be found, reviewed, tested, and traced, it is non-compliant.

Examples of prohibited hidden logic:

- runtime-created tables without registry ownership
- inline permissions not present in the permission dictionary
- config keys without ownership classification
- audit events without entity ownership truth
- hidden environment fallbacks
- shadow endpoints
- undocumented background jobs

### Law 7 - Controlled AI Governance
AI agents operate only inside governed boundaries:

- approved tasks
- approved tools
- approved input contracts
- approved output contracts
- audit logs
- human review gates where required

### Law 8 - Delivery Includes Operations
A feature is not delivered until it includes:

- code
- schema
- config
- migration path
- tests
- logs
- metrics
- alerts
- rollback
- documentation
- handover material

### Law 9 - Every Change Must Be Traceable
Every change must have:

- reason
- owner
- change artifact
- review artifact
- test evidence
- deployment record
- rollback path

### Law 10 - Drift Is a Defect
Any drift between:

- code and DB
- backend and frontend
- docs and runtime
- route and permission
- config and environment
- product and platform ownership

is a defect and must be logged, triaged, and resolved.

---

## 4. Canonical Scope Model

### 4.1 Platform Core
The platform core is reusable and product-neutral. It may include:

- identity
- tenancy / workspace
- RBAC / ABAC
- audit
- notifications
- file service
- workflow engine
- event bus
- integration gateway
- model/provider gateway
- observability
- billing
- deployment control
- platform settings
- module registry
- manifest loading
- API shell
- web shell / app shell

### 4.2 Product Layer
Each product is product-owned and uses platform capabilities without redefining them.

A product may include:

- product domain entities
- product schema
- product services
- product routes
- product workflows
- product reports
- product AI assets
- product prompts
- product tools
- product defaults
- product onboarding presets

### 4.3 Tenant / Workspace Layer
Each tenant is a runtime customer scope that receives:

- enabled products
- enabled modules
- allowed providers/models
- tenant-specific config overrides
- branding and locale
- data isolation boundaries
- onboarding state
- audit scope
- support and SLA binding

### 4.4 Model / Provider / Function Layer
The platform must support more than one provider, more than one model, and more than one callable function.

Separate these clearly:

- **provider**: OpenAI / local / custom / IBM / internal
- **model**: specific inference model or engine
- **tool/function**: callable action, plugin, connector, computation, or operation
- **workflow**: ordered orchestration across tools/models/humans
- **agent**: governed orchestrator using models + tools + policy

### 4.5 Deployment Layer
Deployment is not product truth and not tenant truth.

Deployment concerns include:

- cloud vs on-prem
- air-gapped vs connected
- shared DB vs isolated DB
- queue mode
- object storage mode
- secret management mode
- topology profile
- monitoring sinks
- disaster recovery profile

---

## 5. Source-of-Truth Matrix

| Truth Domain | Canonical Owner | Canonical Artifact | Forbidden Secondary Authority |
|---|---|---|---|
| Domain entities | Product owner + architecture | Product schema manifest | Inline assumptions in controllers |
| Platform services | Platform architecture | Platform module registry | Product docs redefining platform |
| API contracts | Backend contract owner | OpenAPI / typed contract | UI guesses |
| DB schema | Data architecture | Baseline schema + migrations + schema registry | Ad-hoc SQL folders |
| Permissions | Security architecture | Permission dictionary | Hardcoded route strings outside registry |
| Config | Platform config authority | Typed config schemas + config matrix | Environment guesswork |
| AI models/providers | AI governance authority | Provider registry + model registry | Tool-local hidden defaults |
| Tenant enablement | Tenant config authority | Tenant manifest / config state | Product code assuming enablement |
| Deployment | DevOps authority | Deployment manifests / IaC / profiles | README-only steps |
| Monitoring | SRE / platform ops | Metrics catalog + alert rules | Human memory |

---

## 6. Mandatory Repository Architecture

The repository must follow a structure close to the following. Names may vary only by approved architecture decision.

```text
repo-root/
├── apps/
│   ├── api/
│   ├── web/
│   ├── worker/
│   └── admin/
├── platform/
│   ├── core/
│   │   ├── identity/
│   │   ├── tenancy/
│   │   ├── permissions/
│   │   ├── audit/
│   │   ├── config/
│   │   ├── workflow/
│   │   ├── files/
│   │   ├── events/
│   │   ├── integrations/
│   │   ├── models/
│   │   ├── observability/
│   │   └── registry/
│   ├── contracts/
│   ├── schemas/
│   ├── manifests/
│   └── shared/
├── products/
│   ├── shahin/
│   │   ├── domain/
│   │   ├── api/
│   │   ├── db/
│   │   ├── workflows/
│   │   ├── ai/
│   │   ├── reports/
│   │   ├── seeds/
│   │   └── manifests/
│   └── <future-product>/
├── db/
│   ├── baseline/
│   ├── migrations/
│   ├── seeds/
│   ├── registries/
│   └── verification/
├── docs/
│   ├── governance/
│   ├── architecture/
│   ├── runbooks/
│   ├── handover/
│   └── standards/
├── infra/
│   ├── environments/
│   ├── deployment-profiles/
│   ├── secrets/
│   ├── monitoring/
│   └── ci/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── contract/
│   ├── migration/
│   ├── e2e/
│   └── governance/
└── tools/
    ├── scripts/
    ├── validators/
    ├── drift-checks/
    └── generators/
```

No product-owned code inside platform-neutral folders unless explicitly marked as compatibility or composition-root wiring.

---

## 7. Ownership Rules for Platform / Products / Tenants / Models

### 7.1 Platform-Owned
Platform-owned means:

- reusable by more than one product
- not semantically tied to one product domain
- valid even if one product is removed
- auditable as neutral infrastructure

Examples:
- tenant config shell
- provider registry
- workflow engine
- permission engine
- model allowlist core
- audit service
- event service

### 7.2 Product-Owned
Product-owned means:

- business meaning tied to one product
- domain tables tied to one product
- product reports and templates
- product prompts and model mappings
- product onboarding defaults
- product workflow meanings

### 7.3 Tenant-Owned Runtime State
Tenant-owned state includes:

- enabled products
- enabled modules
- allowed models
- branding
- locale
- workflow overrides
- feature flags where tenant-scoped
- data retention overrides if allowed

### 7.4 Deployment-Owned
Deployment-owned values never belong in tenant or product config:

- secrets
- hostnames
- queue brokers
- storage backends
- cloud providers
- KMS references
- topology mode
- backup targets

---

## 8. Product Manifest Standard

Every product must expose a machine-readable manifest.

### 8.1 Required Product Manifest Fields

```json
{
  "product_code": "shahin",
  "display_name": "Shahin",
  "status": "active",
  "owner_team": "product-shahin",
  "platform_dependencies": [
    "identity",
    "tenancy",
    "audit",
    "permissions",
    "workflow",
    "models"
  ],
  "enabled_by_default": false,
  "module_codes": [
    "governance",
    "risk",
    "compliance",
    "evidence",
    "vendors",
    "reporting"
  ],
  "seed_providers": [
    "products/shahin/ai/shahin-ai-governance-seed"
  ],
  "tenant_defaults": [
    "locale",
    "timezone",
    "dashboard_layout"
  ],
  "required_reference_data": [
    "frameworks",
    "statuses",
    "severity_levels"
  ]
}
```

### 8.2 Rules
- Product manifests must be versioned.
- Product manifests must be loaded by platform registries, not manually duplicated.
- Product manifests must not include deployment secrets.
- Product manifests may reference product seed providers but may not mutate platform contracts directly.

---

## 9. Tenant / Workspace Constitution

### 9.1 Tenant Truth
A tenant is a runtime customer boundary, not a code boundary.

A tenant must always have:

- `tenant_id`
- `tenant_code`
- `workspace_id` if applicable
- `product_enablement`
- `module_enablement`
- `tenant_config_version`
- `allowed_models`
- `data_region`
- `lifecycle_state`
- `audit_scope`

### 9.2 Tenant Config Schema
Every tenant config must validate against a typed schema.

```ts
export interface TenantConfig {
  tenantId: string;
  tenantCode: string;
  workspaceCode: string;
  enabledProducts: string[];
  enabledModules: string[];
  locale: "en" | "ar";
  timezone: string;
  theme: string;
  allowedProviders: string[];
  allowedModels: string[];
  onboardingMode: "manual" | "guided" | "assisted" | "automated";
  workflowProfiles: string[];
  featureFlags: Record<string, boolean>;
  retentionProfile: string;
  supportTier: string;
}
```

### 9.3 Tenant Prohibitions
Tenant config must not directly contain:

- deployment secrets
- infrastructure hostnames unless explicitly tenant-scoped by approved design
- raw SQL
- product code that bypasses manifests
- permissions not present in the permission registry

### 9.4 Fresh Tenant Rule
A fresh tenant must be creatable by:

1. loading approved tenant schema
2. applying platform baseline
3. enabling approved products
4. applying tenant defaults
5. verifying config, permissions, manifests, and readiness

No hidden manual remediation.

---

## 10. Multi-Product Constitution

### 10.1 Multi-Product Rule
A platform may host multiple products. Therefore:

- product routing must remain namespaced
- product permissions must remain namespaced
- product seeds must remain product-owned
- product AI catalogs must remain product-owned
- product modules must not overwrite each other by default

### 10.2 Product Activation Flow
Standard flow:

1. Product manifest loaded
2. Product dependencies validated
3. Product modules registered
4. Product seeds registered
5. Tenant enablement checked
6. Tenant-scoped defaults applied
7. Product availability published to UI/API bootstrap

### 10.3 Product Isolation Tests
Every product must pass:

- no direct import into platform core except approved registration boundaries
- no permission collision with unrelated product
- no table ownership ambiguity
- no config key ownership ambiguity
- no nav ownership ambiguity

---

## 11. Model / Provider / Tool / Function Constitution

### 11.1 Canonical Terms
- **Provider**: service supplying one or more models
- **Model**: inferencing engine or model identity
- **Tool / Function**: callable capability
- **Workflow**: orchestrated sequence
- **Agent**: policy-bound orchestrator of models/tools/workflows

### 11.2 Mandatory Registries
The platform must maintain registries for:

- providers
- models
- tools/functions
- workflows
- agents
- prompt assets
- allowlists
- approval states
- versioned bindings

### 11.3 Registry SQL Baseline

```sql
create table ai_provider_registry (
  provider_code text primary key,
  display_name text not null,
  provider_type text not null,
  status text not null,
  config_scope text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ai_model_registry (
  model_code text primary key,
  provider_code text not null references ai_provider_registry(provider_code),
  display_name text not null,
  model_family text not null,
  modality text not null,
  lifecycle_state text not null,
  approval_state text not null,
  tenant_policy_mode text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ai_tool_registry (
  tool_code text primary key,
  display_name text not null,
  owner_scope text not null,
  product_code text,
  execution_mode text not null,
  approval_state text not null,
  input_schema jsonb not null,
  output_schema jsonb not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ai_agent_registry (
  agent_code text primary key,
  display_name text not null,
  owner_scope text not null,
  product_code text,
  default_model_code text,
  lifecycle_state text not null,
  approval_state text not null,
  input_contract jsonb not null,
  output_contract jsonb not null,
  execution_policy jsonb not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 11.4 Multi-Model Rules
The platform must support:

- multiple providers
- multiple approved models per tenant
- fallback chains
- explicit approval policies
- environment restrictions
- tenant/model allowlists
- product/model compatibility rules

### 11.5 Function / Tool Rules
Every function or tool must declare:

- owner scope
- allowed caller(s)
- allowed runtime(s)
- authentication mode
- input schema
- output schema
- side effects
- observability expectations

---

## 12. AI Agent Constitution

### 12.1 Agent Categories
Standard categories include:

- discovery agent
- schema agent
- API contract agent
- code generation agent
- review agent
- audit agent
- migration analysis agent
- deployment preparation agent
- monitoring agent
- documentation agent
- handover preparation agent

### 12.2 Agent Record Standard

```yaml
agent_code: schema_architect
owner_scope: platform
product_code: null
mission: Produce schema proposals from approved domain contracts
allowed_tools:
  - schema_registry_reader
  - ddl_generator
  - diff_checker
forbidden_actions:
  - production_db_write
  - direct_secret_read
input_contract:
  type: schema_request
output_contract:
  type: schema_proposal
review_mode: mandatory_human_review
confidence_policy:
  min_confidence: 0.85
audit_policy:
  emit_events: true
  persist_prompt_hash: true
```

### 12.3 Agent Operating Rules
Agents must:

- use approved input contracts
- emit structured outputs
- emit auditable events
- remain versioned
- never bypass approval gates
- never create undocumented persistence artifacts
- never mutate production without policy and explicit authorization

### 12.4 AI Change Lifecycle
1. agent receives governed input
2. agent proposes artifact
3. artifact validated against schema/API/config/permission contracts
4. artifact tested in sandbox
5. artifact reviewed
6. artifact deployed through normal gates
7. runtime monitored
8. learning recorded

---

## 13. Database Constitution

### 13.1 Database Truth
The database is governed by:

- canonical schema registry
- approved baseline
- approved migrations
- approved seeds
- verification checks
- ownership registry

The database is not governed by accumulated random SQL history.

### 13.2 Canonical Database Layers
Recommended separation:

- `platform_*` or `platform` schema for reusable core
- `product_*` or product schemas for product-owned data
- `tenant-scoped runtime tables` where explicitly required
- `audit_*`
- `event_*`
- `analytics_*`
- `registry_*`

### 13.3 Table Registry Standard
Every table must be registered with:

- table name
- owner scope
- product code if product-owned
- tenant scope mode
- lifecycle status
- source baseline/migration
- retention profile
- contains PII? Y/N
- contains secrets? Y/N
- archival mode
- replacement/deprecation lineage if any

### 13.4 Baseline Rule
If the system has historical SQL sprawl, the correct path is:

1. extract truth
2. classify tables and objects
3. define canonical target schema
4. generate clean baseline
5. archive legacy migrations
6. continue from new governed migration chain

### 13.5 Migration Rule
Every migration must be classed:

- baseline
- additive
- corrective
- rename
- destructive
- backfill
- deprecation
- archival

No uncategorized migration may ship.

### 13.6 Verification Script Requirements
The DB verification layer must check:

- table existence
- column existence
- key existence
- index existence
- enum/reference data integrity
- drift from expected schema
- orphan objects
- tenant readiness
- seed completion

---

## 14. Config Constitution

### 14.1 Four Config Domains
Configuration must be separated into exactly four domains:

1. **Environment config**
2. **Deployment config**
3. **Product config**
4. **Tenant/workspace config**

### 14.2 Environment Config
Contains:
- secrets references
- service endpoints
- provider credentials
- encryption settings
- queue connections
- runtime flags

### 14.3 Deployment Config
Contains:
- cloud/on-prem profile
- DB topology mode
- object storage mode
- offline mode
- scaling mode
- logging/monitoring sinks

### 14.4 Product Config
Contains:
- product defaults
- product modules
- product feature bundles
- product AI defaults
- product onboarding presets

### 14.5 Tenant Config
Contains:
- enabled products
- enabled modules
- allowed models/providers
- branding
- locale
- workflow profiles
- tenant-specific overrides

### 14.6 Hard Prohibitions
- No tenant secrets in product config
- No deployment flags in tenant config
- No product defaults in platform environment files
- No workspace identity leakage into unrelated product logic
- No feature flags without ownership

---

## 15. Permission Constitution

### 15.1 Naming Standard
Permission codes must follow one naming convention only:

```text
<scope>.<resource>.<action>
```

or, where short-form family is intentionally approved:

```text
<module>:<action>
```

Mixed conventions require explicit mapping and justification.

### 15.2 Permission Registry
Every permission must record:

- permission code
- owner scope
- module code
- resource code
- action code
- tenant scope mode
- UI guard mapping
- API guard mapping
- approval requirement

### 15.3 Route Rule
Every route must use:

- explicit permission
- explicit entity ownership
- explicit audit metadata
- explicit event emission policy where required

No `requireRole` drift where permission-based control is mandated.

### 15.4 UI Rule
Frontend guards must not invent permission semantics. They must consume the canonical permission map.

---

## 16. API Constitution

### 16.1 Endpoint Registry
Each endpoint must define:

- route
- method
- owner scope
- contract version
- auth mode
- permission
- request schema
- response schema
- event behavior
- error model

### 16.2 API Stability Rule
SDKs may only be generated from stabilized contracts.

### 16.3 Versioning Rule
Breaking changes require:

- version bump
- changelog
- migration note
- deprecation period where applicable
- integration notice

---

## 17. Event and Audit Constitution

### 17.1 Event Envelope Standard

```json
{
  "event_id": "uuid",
  "event_type": "product.entity.action",
  "module_code": "governance",
  "entity_type": "policy_document",
  "entity_id": "12345",
  "tenant_id": "tenant_abc",
  "actor_type": "user",
  "actor_id": "user_001",
  "source": "api",
  "correlation_id": "trace_123",
  "occurred_at": "2026-04-02T12:00:00Z",
  "metadata": {}
}
```

### 17.2 Audit Minimum Fields
Every auditable mutation must include:

- actor
- tenant
- module
- entity type
- entity id
- action
- before/after summary where relevant
- correlation id
- source
- timestamp

### 17.3 Label Truth Rule
Module labels, entity types, and ownership values must be truthful to the actual owner path. No vague relabeling.

---

## 18. Workflow Constitution

### 18.1 Workflow Rule
Every important object must have:

- lifecycle states
- transition rules
- approval gates
- escalation rules
- SLA behavior
- event emissions
- audit behavior

### 18.2 Workflow Definition Example

```yaml
workflow_code: policy_lifecycle
entity_type: policy_document
states:
  - draft
  - review
  - approved
  - published
  - superseded
  - retired
transitions:
  - from: draft
    to: review
    permission: policy.document.submit
  - from: review
    to: approved
    permission: policy.document.approve
  - from: approved
    to: published
    permission: policy.document.publish
```

### 18.3 Workflow Prohibitions
- No hidden state changes
- No UI-only workflow truth
- No background workflow actions without events and audit

---

## 19. Delivery Constitution

### 19.1 Required Delivery Stages
Every change follows:

1. Intake
2. Truth audit
3. Design
4. Contract approval
5. Baseline/build
6. Implementation
7. Self-review
8. Independent review
9. Test
10. Deploy preparation
11. Deployment
12. Handover
13. Monitoring
14. Improvement

### 19.2 Delivery Gates
No stage may pass without evidence.

| Gate | Required Evidence |
|---|---|
| Scope Gate | approved scope statement |
| Contract Gate | approved contracts |
| Schema Gate | migration and verification plan |
| Review Gate | architecture/security review |
| Test Gate | passing test evidence |
| Observability Gate | logs/metrics/alerts defined |
| Handover Gate | runbooks/docs packaged |
| Rollback Gate | rollback steps approved |

### 19.3 Definition of Done
Work is done only when:

- code merged
- contracts updated
- schema updated
- tests passed
- metrics and logs present
- docs updated
- handover notes updated
- rollback path verified

---

## 20. CI/CD Constitution

### 20.1 Minimum Pipeline Stages

```yaml
stages:
  - validate_manifests
  - lint
  - typecheck
  - unit_test
  - integration_test
  - contract_test
  - migration_test
  - drift_check
  - security_scan
  - package
  - deploy_staging
  - smoke_test
  - approval
  - deploy_production
  - post_deploy_verification
```

### 20.2 Mandatory Automated Checks
- schema drift check
- permission map parity check
- route-to-contract parity check
- manifest validation
- config schema validation
- migration rehearsal
- fresh tenant readiness
- observability presence checks

---

## 21. Monitoring Constitution

### 21.1 Monitoring Layers
Monitoring must cover:

- infrastructure health
- application health
- queue/job health
- DB health
- API health
- tenant health
- model/provider health
- AI workflow health
- business SLA health
- security posture

### 21.2 Required Metrics
At minimum:

- request latency
- error rate
- migration success rate
- fresh tenant provisioning success
- job completion rate
- failed AI runs
- model fallback frequency
- drift detection count
- audit event completeness
- support incident volume

### 21.3 Alert Classes
Alerts must be categorized:

- critical
- high
- medium
- informational

### 21.4 Client Readiness Monitoring
Client-facing deployments must expose:

- health status
- last successful backup
- last successful sync where applicable
- SLA score
- active incidents
- recent deployments

---

## 22. Handover Constitution

### 22.1 Handover Package Must Include
- architecture overview
- deployment profile
- environment inventory
- config matrix
- access matrix
- runbooks
- rollback plan
- backup and restore guide
- monitoring dashboards
- known limitations
- support model
- escalation contacts

### 22.2 Handover Completion Criteria
Handover is complete only when the receiving team can:

- start the system
- verify the system
- recover the system
- onboard a tenant
- trace an incident
- identify owners
- deploy a controlled change

---

## 23. Scenario Playbooks

### Scenario A - Build a New Product
1. approve product charter
2. define product manifest
3. define domain contracts
4. define schema contracts
5. define route contracts
6. define permissions
7. define seeds
8. wire through platform registries
9. run fresh tenant test
10. update docs and handover pack

### Scenario B - Build a New Tenant
1. validate tenant request
2. validate tenant config against typed schema
3. enable approved products
4. apply defaults
5. verify models/providers allowlist
6. run bootstrap
7. run tenant readiness verification
8. emit provisioning audit trail

### Scenario C - Add a New Model Provider
1. register provider
2. add provider config schema
3. register models
4. define approval state
5. define tenant policy controls
6. run sandbox verification
7. update monitoring and fallback policy
8. publish provider onboarding guide

### Scenario D - Replace Historical DB Sprawl with New Baseline
1. freeze schema scope
2. extract actual schema truth
3. classify all tables and objects
4. define canonical target
5. generate baseline DDL
6. generate reference seeds
7. create fresh DB
8. run application verification
9. archive legacy migrations
10. open new governed migration chain

### Scenario E - Audit a Module
1. pull owner manifest
2. pull contracts
3. verify permissions
4. verify route parity
5. verify audit/event coverage
6. verify schema ownership
7. verify tenant behavior
8. issue findings

### Scenario F - Client Handover
1. freeze release
2. generate package
3. train admins
4. train operators
5. verify dashboards
6. verify backup/restore
7. verify escalation matrix
8. obtain signoff

---

## 24. Required Documents in the Codebase

The following files must exist and remain current:

```text
/docs/governance/Global-Platform-Operating-Constitution.md
/docs/architecture/System-Landscape.md
/docs/architecture/Product-Manifest-Registry.md
/docs/architecture/Schema-Registry.md
/docs/standards/Permission-Dictionary.md
/docs/standards/Config-Matrix.md
/docs/standards/Event-Catalog.md
/docs/runbooks/Fresh-Tenant-Provisioning.md
/docs/runbooks/Fresh-Environment-Build.md
/docs/runbooks/Deployment-and-Rollback.md
/docs/handover/Client-Handover-Pack.md
```

---

## 25. Mandatory Code Assets

The codebase must include working machine-readable assets, not only prose.

Required asset classes:

- product manifests
- tenant config schemas
- provider registry definitions
- model registry definitions
- tool registry definitions
- workflow definitions
- permission registry
- event catalog
- DB schema registry
- migration verification scripts
- fresh tenant verification scripts
- drift detection scripts

---

## 26. Anti-Patterns

The following are constitutionally prohibited:

- product logic inside platform-neutral core
- platform config confused with tenant config
- deployment config confused with product config
- direct imports from platform core to product-owned seed catalogs outside approved registration/composition-root wiring
- duplicated route surfaces for the same meaning
- workspace permissions used as catch-all for unrelated domains
- hidden SQL patches
- hidden runtime table creation
- model defaults hidden inside tools
- tool side effects not documented
- AI agents bypassing human approval policy
- undocumented onboarding assumptions
- docs not matching runtime truth

---

## 27. Minimum Role Responsibilities

| Role | Must Do | Must Not Do |
|---|---|---|
| Architect | protect boundaries, approve contracts | bypass standards for speed |
| Developer | implement contracts exactly | invent hidden semantics |
| Reviewer | verify parity and ownership truth | approve undocumented drift |
| DevOps | deploy only through governed profiles | patch live systems invisibly |
| Data engineer | maintain schema truth and verification | treat DB as a dump |
| Auditor | verify actual runtime truth | assume documents are enough |
| Product owner | approve scope and product meaning | change architecture by request alone |
| AI operator | run governed AI workflows | allow untracked autonomous changes |

---

## 28. Immediate Adoption Plan

### Phase 1 - Foundation
- adopt this constitution
- assign owner
- publish path in repo
- freeze non-compliant shortcuts

### Phase 2 - Registry Build
- create product manifest registry
- create config matrix
- create permission dictionary
- create schema registry
- create model/provider registry

### Phase 3 - Verification Layer
- add drift checks
- add fresh build verification
- add fresh tenant verification
- add permission parity checks
- add route contract checks

### Phase 4 - Delivery Hardening
- add CI gates
- add observability checks
- add handover package generation
- add rollback validation

---

## 29. Final Operating Principle

**Design by contract. Build by baseline. Register everything. Audit every mutation. Separate platform from products. Separate products from tenants. Separate tenants from deployment. Separate models from tools. Deliver with proof. Evolve without drift.**

---

## 30. Appendix A - Example Product-Owned AI Seed Registration

```ts
// products/shahin/ai/register-shahin-ai-assets.ts
import { registerAiSeedProvider } from "../../platform/core/models/seed-registry";

registerAiSeedProvider("shahin", () => ({
  agents: ["a01", "a02", "a03"],
  prompts: ["risk_summary_v1"],
  tools: ["framework_lookup", "evidence_classifier"],
  workflows: ["grc_triage"]
}));
```

Platform core may consume the registry contract. Platform core must not embed the Shahin catalog inline.

---

## 31. Appendix B - Example Drift Check Categories

```text
drift categories:
- schema_drift
- config_drift
- permission_drift
- route_contract_drift
- manifest_drift
- tenant_readiness_drift
- ai_registry_drift
- observability_drift
```

---

## 32. Appendix C - Example Release Readiness Checklist

- [ ] scope approved
- [ ] contracts updated
- [ ] schema reviewed
- [ ] migrations rehearsed
- [ ] tests passed
- [ ] monitoring updated
- [ ] rollback verified
- [ ] handover notes updated
- [ ] tenant impact assessed
- [ ] model/provider impact assessed
- [ ] product manifest impact assessed
- [ ] deployment profile impact assessed

---

## 33. Appendix D - Example Fresh Build Checklist

- [ ] baseline schema applied
- [ ] reference data seeded
- [ ] product manifests loaded
- [ ] provider registry loaded
- [ ] model registry loaded
- [ ] permission dictionary loaded
- [ ] event catalog loaded
- [ ] tenant bootstrap verified
- [ ] smoke tests passed
- [ ] monitoring attached

---

## 34. Approval Block

| Field | Value |
|---|---|
| Constitution Owner | Platform Architecture Authority |
| Required Reviewers | Product, Data, Security, DevOps, QA, Audit |
| Effective Date | Upon approval |
| Review Frequency | Every release cycle or architectural change |
| Change Control | Pull request + architecture signoff + version bump |


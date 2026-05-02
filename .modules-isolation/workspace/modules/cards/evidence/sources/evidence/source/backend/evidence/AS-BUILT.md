# Evidence Module — AS-BUILT

> **Module code:** `evidence`
> **Spec:** `DOS-AIO-Specs/module-patch-09-evidence-end-to-end.md` (MP-09)
> **Layer:** Core business domain module
> **Criticality:** P0 — trust and auditability critical
> **Agent binding:** A05 (Evidence Agent)
> **License tier:** Starter
> **Provisioning order:** 13
> **Version:** 2.0.0

---

## Owned Artifacts

### Backend Services (33 files)

| Family | Service | Purpose |
|--------|---------|---------|
| **Core** | evidence-lifecycle.service | FSM state transitions, status history, ownership resolution |
| **Core** | evidence-query.service | Multi-table aggregations, foundation-scoped filtering |
| **Core** | evidence.service (barrel) | Re-exports 17 sub-service functions |
| **Collection** | evidence-auto-collection.service | Connector-matched auto-collection runs |
| **Collection** | evidence-schedule.service | CRUD + cron-based collection schedule management |
| **Collection** | evidence-freshness.service | Expiry tracking, bulk refresh, SLA enforcement |
| **Collection** | evidence-vault.service | Upload, versioning, hash-chain integrity, legal hold |
| **Collection** | evidence-provenance.service | Connector-to-evidence lineage tracking |
| **Analysis** | evidence-ai.service | Claude API: metadata suggestion, duplicate detection, linkage proposals |
| **Analysis** | evidence-quality-scoring.service | Multi-factor scoring: completeness, recency, source credibility |
| **Analysis** | evidence-catalog.service | Taxonomy management, evidence type registry, quality gates |
| **Analysis** | evidence-scoring.service | Control-to-evidence mapping, coverage metrics |
| **Workflow** | evidence-submission.service | Hash-chain verification (SHA-256), quality gates (G1/G3), attestation |
| **Workflow** | evidence-request.service | Evidence request CRUD, deadline tracking, SLA management |
| **Workflow** | evidence-review.service | Review workflows, peer review queues, feedback loops |
| **Workflow** | evidence-workflow.service | Cross-module event handling (assessment_completed -> evidence request) |
| **Reporting** | evidence-dashboard.service | Command center KPIs, work queue, source health |
| **Reporting** | evidence-package.service | Bundle creation/export, attestation packaging |
| **Reporting** | evidence-reporting.service | 9 report types (aging, backlog, freshness, quality, reuse, audit-readiness) |
| **Reporting** | evidence-reuse.service | Duplicate detection, cross-control reuse graph |
| **Diagnostics** | evidence-diagnostics.service | Expired evidence report, failed collection log, coverage gaps |
| **Diagnostics** | evidence-health.service | Health snapshot, per-control completeness |
| **Diagnostics** | evidence-policy.service | Policy compliance validation |

### Routes (22 files, mounted via barrel + catalog)

| Mount Path | Route File | Method Coverage |
|------------|-----------|-----------------|
| `/api/evidence` | evidence.routes.ts (barrel) | Mounts 17 sub-routers |
| `/api/evidence-catalog` | evidence-catalog.routes.ts | GET/POST/PUT catalog CRUD |
| `/api/evidence-tasks` | evidence-tasks.routes.ts | Task generation, status, approval |
| `/api/webhooks/pipeline/*` | pipeline-webhook.routes.ts | GitHub, GitLab, generic CI/CD webhooks |
| `/api/pipeline-webhooks/*` | pipeline-webhook.routes.ts | Webhook config admin |

**Total mutation endpoints:** 57 (100% Zod-validated including params on DELETE)

### Database Tables (31 tables, 13 migrations)

Key migrations: 041, 049, 076, 091, 205, 365, 372, 386, 716, 717, 718, 832, 836

Tables include: evidence, evidence_catalog, evidence_schedules, evidence_tasks, evidence_quality_scores, evidence_maturity_levels, evidence_attachments, evidence_status_history, evidence_packages, evidence_links, evidence_reviews, evidence_requests, pipeline_evidence, connector_evidence_mappings, evidence_reference_taxonomy + performance indexes.

### Connectors (3 implemented)

| Connector | Auth | Status |
|-----------|------|--------|
| JiraConnector | Basic auth / service account | Production |
| GoogleDriveConnector | OAuth 2.0 service account | Production |
| SharePointConnector | Azure AD OAuth | Production |

Factory pattern supports future connectors (AWS, Azure, GCP, Splunk, Sentinel, GitHub, GitLab, O365, Gmail).

### Scheduled Jobs (8 jobs, registered in product job registry)

| Job | Schedule | Purpose |
|-----|----------|---------|
| evidence-expiry-monitor | 0 6 * * * (daily 6am) | Expiry bucket tracking, auto-mark expired |
| evidence-collection-tracker | */30 * * * * (every 30m) | Overdue collection by SLA tier |
| evidence-review-backlog-monitor | every 4 hours | Review queue health |
| evidence-freshness-check | weekly Monday 8am | Freshness verification |
| evidence-compliance-coverage-report | monthly 1st at 7am | Coverage report generation |
| evidence-auto-archive | weekly Sunday 3am | Automatic archival |
| evidence-data-retention | monthly 1st at midnight | Retention policy enforcement |
| evidence-submitted-escalation | every 2 hours | SLA breach escalation |

### Events

**Published (14):** evidence.collected, evidence.auto_collected, evidence.expired, evidence.coverage_low, evidence.freshness_verified, evidence.multimodal_analyzed, evidence.quality_scored, evidence.package_created, evidence.review_completed, evidence.review_rejected, evidence.connector_synced, evidence.retention_applied, evidence.request_created, evidence.request_fulfilled

**Consumed (7):** compliance.assessment_completed, audit.finding_created, risk.assessment_completed, vendor.assessment_due, evidence.coverage_low, control.effectiveness_low, workflow.status_changed

### Frontend Surfaces (14 pages)

| Page | Component | Real API |
|------|-----------|----------|
| Home | EvidenceHomeComponent | getHomeWidgets, getEvidenceByStatus, getRecentActivity |
| Overview | EvidenceOverviewComponent | getOverviewStats, status history, foundation data |
| Catalog | EvidenceCatalogComponent | searchCatalog, getEvidence, KPI strip, CSV export |
| Detail | EvidenceDetailComponent | 8 tabs, forkJoin parallel load, quality dimensions |
| Work Queue | EvidenceWorkQueueComponent | 5 tabs, badge counts, detail drawer actions |
| Reuse | EvidenceReuseComponent | Reuse map, orphans, duplicates, merge/dismiss |
| Packages | EvidencePackagesComponent | Create/export bundles, add/remove items |
| Reports | EvidenceReportsComponent | 6 report tabs, lazy-loaded, CSV export per tab |
| Admin | EvidenceAdminComponent | 4 taxonomy tabs, inline CRUD, permission gated |
| Schedules | EvidenceSchedulesComponent | Schedule management, generate-now trigger |
| Requests | EvidenceRequestsComponent | Request CRUD |
| Reviews | EvidenceReviewsComponent | Review queue |
| Freshness/Expiry | EvidenceExpiryComponent | Expiry tracking |
| Connectors | EvidenceAutomatedCollectionComponent | Connector management |

---

## Protected Actions (DAuth Enforcement Points)

| Action | Enforcement | SoD Rule |
|--------|-------------|----------|
| Evidence review/approval | `evaluateLifecycleTransition()` + `initiateApproval()` | collector != reviewer (non-waivable) |
| Evidence submission | Hash-chain verification + quality gates G1/G3 | submitter != approver (non-waivable) |
| Package finalization | Freshness validation + approval authority | - |
| Attachment deletion | `initiateApproval()` required | - |
| Schedule deletion | `initiateApproval()` required | - |
| Admin configuration | `evidence.admin.configure` permission gate | - |

### Permissions (14)

evidence.item.read, evidence.item.create, evidence.item.update, evidence.item.delete, evidence.request.create, evidence.request.approve, evidence.request.view, evidence.review.submit, evidence.review.approve, evidence.package.create, evidence.package.export, evidence.package.delete, evidence.admin.configure, evidence.item.configure

### Roles (5)

| Role | Access Level |
|------|-------------|
| evidence.contributor | Upload evidence (read + create) |
| evidence.reviewer | Peer review (read + review) |
| evidence.operator | Schedule collection, monitor (read + update + schedule) |
| evidence.module_lead | Approval authority (all except admin) |
| evidence.executive_owner | Policy + SoD override (full) |

### Lifecycle FSM

**Evidence Item:** requested -> collecting -> uploaded -> under_review -> verified -> [locked | released | archived | rejected]

**Evidence Collection:** planned -> in_progress -> [completed | failed] | cancelled

---

## Diagnostics

| Check | Service | Alert Condition |
|-------|---------|----------------|
| Expired evidence | evidence-diagnostics.service | Count > 0 |
| Failed collections | evidence-diagnostics.service | Failure rate > threshold |
| Coverage gaps | evidence-diagnostics.service | Control without evidence |
| Overdue items | evidence-health.service | Past SLA deadline |
| Stuck items | evidence-health.service | No state change > 48h |
| Stale drafts | evidence-health.service | Draft age > 30d |
| Unassigned items | evidence-health.service | No owner assigned |

---

## Policies

- **Data retention:** 10 years (3650 days)
- **Archive:** After 7 years
- **Legal hold:** Supported (no hard deletes)
- **Data residency:** SA-Riyadh primary, ME-Central allowed; cross-border blocked
- **AI guardrails:** No autonomous approval/deletion; human review required
- **Automation limit:** 100 auto-actions/hour
- **Export:** Requires compliance_officer approval; CSV/XLSX/PDF/JSON

---

## Known Risks

| Risk | Mitigation |
|------|-----------|
| Pipeline webhook endpoints accept external traffic | Signature/API key validation on all webhook routes |
| AI recommendations could suggest incorrect linkages | Confidence scoring + human review gate |
| Large evidence files could strain upload path | Chunked upload + virus scanning middleware |
| Cross-module event failures could orphan requests | Dead-letter queue + retry with exponential backoff |

---

## MICROSERVICES-TODO Status

- **XD-007** (P1): Decouple evidence -> sibling imports with events/API calls — In progress
- **S6** (P1): Evidence extraction into Audit & Evidence Service — Planned (Phase 3)

# AI Governance Module — AS-BUILT

## Module Identity

| Field | Value |
|-------|-------|
| Module Code | `ai-governance` |
| Spec | MP-20 (`DOS-AIO-Specs/module-patch-20-ai-governance-end-to-end.md`) |
| Layer | AI governance and compliance module |
| Criticality | P1 |
| Product Owner | `shahin` |
| Route Base | `/api/ai-governance`, `/api/ai-governance-admin` |

## Owned Artifacts

### Backend Services
| Service | Path | Purpose |
|---------|------|---------|
| Registry | `services/` | AI model/system registry management |
| Assessments | `services/` | Governance assessments (bias, fairness, ethical) |
| Inventory | `services/` | AI asset inventory tracking |
| Policies | `services/` | AI governance policy management |
| Admin | `controllers/ai-governance-admin.controller.ts` | Config, health, reseed, SLA, escalation, runbooks |

### Owned Tables (tenant schema)
- `ai_gov_registry`
- `ai_gov_assessments`
- `ai_gov_inventory`
- `ai_gov_policies`

### Shared Tables (consumed, not owned)
- `audit_trail` (platform)
- `module_configs` (platform)
- `lifecycle_history` (platform)

## Protected Actions & DAuth Enforcement Points

| Action | Route | DAuth Gate |
|--------|-------|-----------|
| Registry activation | lifecycle transition | `evaluateLifecycleTransition` (approved→active) |
| Assessment completion | lifecycle transition | `evaluateLifecycleTransition` |
| Policy activation | lifecycle transition | `evaluateLifecycleTransition` (approved→active) |
| Emergency suspension | any→suspended | Executive override required |

## Security Manifest

| Artifact | Count |
|----------|-------|
| Roles | 7 (executive_owner, module_lead, approver, operator, contributor, auditor, viewer) |
| Approval Matrix Rules | 20 (ai_gov_registry 5, ai_gov_assessments 5, ai_gov_inventory 5, ai_gov_policies 5) |

## Diagnostics

Diagnostics service checks for schema existence, table presence, stale records, overdue assessments, and audit activity.

## Scheduled Jobs

Registered in `products/shahin-ai/jobs/index.ts` via `getAiGovernanceJobs()`.

## Admin Surfaces (Rule 6.3)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ai-governance-admin/config` | GET/PUT | Module configuration |
| `/api/ai-governance-admin/health` | GET | Module health |
| `/api/ai-governance-admin/reseed` | POST | Re-seed module |
| `/api/ai-governance-admin/reindex` | POST | Re-index |
| `/api/ai-governance-admin/backfill` | POST | Backfill |
| `/api/ai-governance-admin/sla` | GET | SLA configuration |
| `/api/ai-governance-admin/escalation-policy` | GET | Escalation policy |
| `/api/ai-governance-admin/runbooks` | GET | 6 bilingual runbook links |

## Approval Matrix (Rule 3.4 — Lifecycle-Aligned)

| Entity Type | Transitions |
|-------------|-------------|
| `ai_gov_registry` | draft→in_review, in_review→approved, approved→active, active→archived, any→suspended |
| `ai_gov_assessments` | draft→in_review, in_review→approved, approved→active, active→archived, any→suspended |
| `ai_gov_inventory` | draft→in_review, in_review→approved, approved→active, active→archived, any→suspended |
| `ai_gov_policies` | draft→in_review, in_review→approved, approved→active, active→archived, any→suspended |

## Audit Trail Coverage (Rule 6.2)

All mutation endpoints in admin routes have `setAuditData` calls.

## Known Risks

1. Route files use `@ts-ignore` for pragmatic build stabilization
2. Assessment SLA of 336h (14 days) is generous — may need tenant-specific tightening

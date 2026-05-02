# AI Module — AS-BUILT

## Module Identity

| Field | Value |
|-------|-------|
| Module Code | `ai` |
| Spec | MP-03 (inline in DOS-AIO.md) |
| Layer | Core AI infrastructure module |
| Criticality | P0 |
| Product Owner | `shahin` |
| Route Base | `/api/ai`, `/api/ai-admin` |

## Owned Artifacts

### Backend Services
| Service | Path | Purpose |
|---------|------|---------|
| AI Dashboard | `services/core/ai-dashboard.service.ts` | Agent usage, cost tracking, recent failures |
| AI Orchestration | `services/orchestration/ai-ai.service.ts` | AI-on-AI action governance |
| AI Workflow | `services/workflow/ai-workflow.service.ts` | Workflow event handlers |
| AI Events | `services/workflow/ai-event.service.ts` | Event emission for AI operations |
| AI Diagnostics | `services/diagnostics/ai-diagnostics.service.ts` | Health checks, failed run analysis, blocked tools |
| AI Admin | `controllers/ai-admin.controller.ts` | Config, health, reseed, SLA, escalation, runbooks |
| Code Search | `services/code-search/code-search.service.ts` | Codebase search engine |

### Backend Routes
| Mount Path | Route File | Key Endpoints |
|------------|-----------|---------------|
| `/api/ai-admin` | `routes/admin/ai-admin.routes.ts` | Config, health, diagnostics, SLA, escalation, runbooks, dashboard, cost-usage |

### Owned Tables (tenant schema)
- `ai_agent_registry`
- `ai_agent_configs`
- `ai_execution_log`
- `ai_cost_usage`
- `ai_tool_registry`

### Shared Tables (consumed, not owned)
- `audit_trail` (platform)
- `module_configs` (platform)
- `lifecycle_history` (platform)

## Protected Actions & DAuth Enforcement Points

| Action | Route | DAuth Gate |
|--------|-------|-----------|
| Agent activation | lifecycle transition | `evaluateLifecycleTransition` (approved→active) |
| Agent decommission | lifecycle transition | `evaluateLifecycleTransition` (active→decommissioned) |
| Agent suspension | lifecycle transition | `evaluateLifecycleTransition` (any→suspended) |

## Security Manifest

| Artifact | Count |
|----------|-------|
| Permissions | per seed data |
| Roles | 8 (executive_owner, platform_admin, system_admin, module_lead, approver, operator, contributor, viewer) |
| Approval Matrix Rules | 16 (ai_agents 6, ai_agent_configs 5, ai_execution_log 5) |

## Diagnostics

| Check | Purpose |
|-------|---------|
| `schema_exists` | Tenant schema present |
| `tables_exist` | Core tables present |
| `failed_runs` | Recent failed AI executions |
| `blocked_tools` | Tools blocked by governance gates |
| `queue_throughput` | Execution queue health |

## Scheduled Jobs

| Job | Cron | Purpose |
|-----|------|---------|
| `ai-sla-monitor` | periodic | Detect overdue agent deployments |
| `ai-stale-detector` | periodic | Auto-archive inactive agents |
| `ai-data-retention` | periodic | Enforce log retention policy |

## Admin Surfaces (Rule 6.3)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ai-admin/config` | GET/PUT | Module configuration |
| `/api/ai-admin/health` | GET | Module health |
| `/api/ai-admin/reseed` | POST | Re-seed module |
| `/api/ai-admin/reindex` | POST | Re-index |
| `/api/ai-admin/backfill` | POST | Backfill |
| `/api/ai-admin/diagnostics` | GET | Diagnostics snapshot |
| `/api/ai-admin/diagnostics/failed-runs` | GET | Failed run analysis |
| `/api/ai-admin/diagnostics/tool-usage` | GET | Blocked tool invocations |
| `/api/ai-admin/sla` | GET | SLA configuration |
| `/api/ai-admin/escalation-policy` | GET | Escalation policy |
| `/api/ai-admin/runbooks` | GET | 7 bilingual runbook links |
| `/api/ai-admin/dashboard` | GET | AI dashboard summary |
| `/api/ai-admin/cost-usage` | GET | Cost usage analytics |

## Approval Matrix (Rule 3.4 — Lifecycle-Aligned)

| Entity Type | Transitions | Notes |
|-------------|-------------|-------|
| `ai_agents` | draft→in_review, in_review→approved, approved→active, active→decommissioned, decommissioned→archived, any→suspended | Canonical lifecycle with decommission step |
| `ai_agent_configs` | draft→in_review, in_review→approved, approved→active, active→archived, any→suspended | Standard lifecycle |
| `ai_execution_log` | draft→in_review, in_review→approved, approved→active, active→archived, any→suspended | Standard lifecycle |

## Audit Trail Coverage (Rule 6.2)

All mutation endpoints in admin routes have `setAuditData` calls: update config, reseed, reindex, backfill.

## Known Risks

1. Some route files use `@ts-ignore` for pragmatic build stabilization
2. Code search service is co-located in AI module but serves platform-wide needs

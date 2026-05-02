# MCP Module — AS-BUILT

## Module Identity

| Field | Value |
|-------|-------|
| Module Code | `mcp` |
| Spec | MP-56 (`DOS-AIO-Specs/module-patch-56-mcp-end-to-end.md`) |
| Layer | AI infrastructure — tool orchestration |
| Criticality | P1 |
| Product Owner | `shahin` |
| Route Base | `/api/mcp` |

## Owned Artifacts

### Backend Services
| Service | Path | Purpose |
|---------|------|---------|
| Registry | `services/mcp-registry.service.ts` | Tool registry, overrides, enable/disable |
| Execution | `services/mcp-execution.service.ts` | Tool execution, stats, approvals, diagnostics, log purge |
| Server | `services/mcp-server.service.ts` | MCP server info and management |
| Diagnostics | `diagnostics/mcp-diagnostics.service.ts` | Module health checks (7 checks) |
| DB Loader | `loaders/db-loader.ts` | Database schema bootstrapping |

### Backend Routes
| Mount Path | Route File | Key Endpoints |
|------------|-----------|---------------|
| `/api/mcp/tools` | `routes/mcp-tool.routes.ts` | Tool CRUD, execute, status, enable/disable, overrides, log purge |
| `/api/mcp/approvals` | `routes/mcp-approval.routes.ts` | Approval list, review |
| `/api/mcp/agents` | `routes/mcp-agent.routes.ts` | Agent registry |
| `/api/mcp/servers` | `routes/mcp-server.routes.ts` | Server management |
| `/api/mcp/admin` | `admin/mcp-admin.routes.ts` | Settings, health, diagnostics, expire-approvals, SLA, escalation, runbooks |

### Owned Tables (tenant schema)
- `mcp_tool_registry`
- `mcp_agent_registry`
- `mcp_prompt_registry`
- `mcp_resource_registry`
- `mcp_tool_overrides`
- `mcp_tool_execution_log`
- `mcp_tool_usage_counters`
- `mcp_tool_approval_requests`

### Shared Tables (consumed, not owned)
- `audit_trail` (platform)
- `module_configs` (platform)
- `ai_agent_registry` (ai module)
- `ai_tool_registry` (ai module)

## Protected Actions & DAuth Enforcement Points

| Action | Route | DAuth Gate |
|--------|-------|-----------|
| Tool activation | draft→active | Approval matrix (module_lead required) |
| Tool suspension | active→suspended | Approval matrix (module_lead required) |
| Tool deprecation | active→deprecated | Approval matrix (executive_owner required) |
| Approval review | pending→approved/rejected | Approval matrix (module_lead required) |

## Security Manifest

| Artifact | Count |
|----------|-------|
| Approval Matrix Rules | 5 (mcp_tool_registry 3, mcp_tool_approval_requests 2) |
| SoD Rules | 1 (requester cannot approve own request) |
| Ownership Rules | 2 (tool registry, approval requests) |

## Diagnostics (Rule 6.1)

| Check | Table | Threshold |
|-------|-------|-----------|
| `schema_exists` | `information_schema.schemata` | Must exist |
| `tables_exist` | `information_schema.tables` | 5 core MCP tables |
| `overdue_approvals` | `mcp_tool_approval_requests` | 0 pending > 48h |
| `failed_executions_24h` | `mcp_tool_execution_log` | < 100 errors/24h |
| `stale_tools` | `mcp_tool_registry` | < 5 active tools not updated in 90 days |
| `suspended_tools` | `mcp_tool_registry` | < 3 currently suspended |
| `recent_audit_activity` | `audit_trail` | > 0 entries in 24h |

## Lifecycle Registration

| Entity | States | Initial | Terminal |
|--------|--------|---------|----------|
| `mcp_tool_registry` | draft, active, suspended, deprecated, archived | draft | archived |
| `mcp_tool_approval_requests` | pending, approved, rejected, expired | pending | approved, rejected, expired |

## Approval Matrix (Rule 3.4 — Lifecycle-Aligned)

| Entity Type | Transitions | Notes |
|-------------|-------------|-------|
| `mcp_tool_registry` | draft→active, active→suspended, active→deprecated | Domain-specific states matching tool lifecycle |
| `mcp_tool_approval_requests` | pending→approved, pending→rejected | Approval workflow states |

## Audit Trail Coverage (Rule 6.2)

8 mutation endpoints have `setAuditData` calls: tool execute, tool status update, tool enable/disable, override upsert/delete, log purge, approval review.

## Admin Surfaces (Rule 6.3)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/mcp/admin/settings` | GET | Module settings |
| `/api/mcp/admin/health` | GET | Module health with table checks |
| `/api/mcp/admin/diagnostics` | GET | Full diagnostics report |
| `/api/mcp/admin/expire-approvals` | POST | Expire stale approvals |
| `/api/mcp/admin/sla` | GET | SLA configuration |
| `/api/mcp/admin/escalation-policy` | GET | Escalation policy |
| `/api/mcp/admin/runbooks` | GET | 6 bilingual runbook links |

## Scheduled Jobs

Registered in `products/shahin-ai/jobs/index.ts` via `getMcpJobs()`.

## Known Risks

1. `mcp_prompt_registry` and `mcp_resource_registry` tables defined but may not be fully utilized yet
2. Dynamic tool executor uses `require()` for lazy loading — works in CommonJS but needs attention for ESM migration

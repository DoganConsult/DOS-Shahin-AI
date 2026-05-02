# Mcp AS-BUILT

## Owned Artifacts
- **Database Tables** (tenant schema, created by `ops/migrations/tenant/126_mcp_core_schema.sql`):
  - `mcp_servers` — registered MCP servers per tenant
  - `mcp_tools` — tool registry exposed by each server
  - `mcp_resources` — resource catalog
  - `mcp_prompts` — prompt catalog
  - `mcp_sessions` — active MCP sessions (tracks `actor_type`)
  - `mcp_tool_invocations` — per-call audit rows
  - `mcp_audit_log` — non-invocation audit events
- **Frontend Pages**: TBD
- **APIs**: `/api/mcp/*`, served by `services/mcp-gateway-service` (W3)

The earlier `mcp_items` / `mcp_logs` stubs (pre-2026-04-19) had zero code
references and are dropped by `ops/migrations/tenant/127_drop_mcp_stubs.sql`.

## Protected Actions
- `mcp.create`, `mcp.read`, `mcp.update`, `mcp.delete` -> Evaluated via DAuth engine.

## DAuth Enforcement Points
- UI: Route guards + structural directives
- API: `requirePermission`, `auditMiddleware`, `automationMiddleware`

## Diagnostics
- **Health check**: `mcp-diagnostics.service.ts` ensures core tables exist.

## Known Risks
- TBD

# mcp-gateway-service

Model Context Protocol gateway. Hosts a per-tenant MCP server bound via
`@modelcontextprotocol/sdk` and exposes an HTTP admin API for registering
servers / listing tools / inspecting audit trails.

## Origin

The MCP server implementation lived under
`services/tenant-service/src/domain/mcp/**` (excluded from tenant-service's
tsconfig). W3 extracts it to this dedicated service so it can run on its
own port (default 3011) with an independent lifecycle.

## Extraction steps (follow-up PR)

```bash
# From repo root — preserves git history via `git mv`.
git mv services/tenant-service/src/domain/mcp services/mcp-gateway-service/src/domain/mcp
# Remove the tsconfig exclusion:
sed -i '/src\/domain\/mcp\/\*\*/d' services/tenant-service/tsconfig.json
# Update imports in moved files:
#   @dos/db        → already re-exports withTenantClient/ActorContext
#   @dos/auth      → provides authenticate + getPrincipalContextFromRequest
# Then:
pnpm install
pnpm --filter mcp-gateway-service build
```

## Transports

- `stdio` — `pnpm --filter mcp-gateway-service start:stdio` (MCP_ENABLED=true)
- `http` / `streamable-http` — `pnpm --filter mcp-gateway-service start`

## Admin routes

- `GET    /api/mcp/servers`
- `POST   /api/mcp/servers`
- `DELETE /api/mcp/servers/:serverId`
- `GET    /api/mcp/tools`

All routes go through DAuth `authenticate`; write ops require admin.
All writes emit an `mcp_audit_log` row carrying `actor_type`.

## Tenant data

Owned tables (tenant schema, created by
`ops/migrations/tenant/126_mcp_core_schema.sql`):

- `mcp_servers`, `mcp_tools`, `mcp_resources`, `mcp_prompts`
- `mcp_sessions`, `mcp_tool_invocations`, `mcp_audit_log`

RLS is `ENABLE + FORCE`; all rows are gated by the tenant_isolation policy.

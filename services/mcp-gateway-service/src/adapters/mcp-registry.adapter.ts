/**
 * MCP Registry adapter — thin DB accessor over the tables created by
 * ops/migrations/tenant/126_mcp_core_schema.sql. All calls go through
 * withTenantClient so RLS policies gate cross-tenant reads.
 */

import { withTenantClient, type ActorContext } from '@dos/db';

export interface McpServerRow {
  server_id: string;
  tenant_id: string;
  server_name: string;
  transport: string;
  endpoint: string | null;
  auth_config: Record<string, unknown>;
  status: string;
  capabilities: Record<string, unknown>;
  registered_at: Date;
  updated_at: Date;
}

export interface McpToolRow {
  tool_id: string;
  tenant_id: string;
  server_id: string;
  tool_name: string;
  description: string | null;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown> | null;
  permission_scope: string | null;
  is_enabled: boolean;
  created_at: Date;
}

export async function listServers(
  tenantId: string,
  actorContext?: ActorContext,
): Promise<McpServerRow[]> {
  return withTenantClient(tenantId, actorContext ?? { principalType: 'human' }, async (client) => {
    const { rows } = await client.query(
      `SELECT server_id, tenant_id, server_name, transport, endpoint,
              auth_config, status, capabilities, registered_at, updated_at
       FROM mcp_servers
       ORDER BY registered_at DESC`,
    );
    return rows as McpServerRow[];
  });
}

export async function registerServer(
  tenantId: string,
  input: {
    serverName: string;
    transport: 'stdio' | 'http' | 'sse' | 'streamable-http';
    endpoint?: string;
    authConfig?: Record<string, unknown>;
    capabilities?: Record<string, unknown>;
  },
  actorContext?: ActorContext,
): Promise<McpServerRow> {
  return withTenantClient(tenantId, actorContext ?? { principalType: 'human' }, async (client) => {
    const { rows } = await client.query(
      `INSERT INTO mcp_servers
         (tenant_id, server_name, transport, endpoint, auth_config, capabilities)
       VALUES ($1, $2, $3, $4, COALESCE($5::jsonb, '{}'::jsonb), COALESCE($6::jsonb, '{}'::jsonb))
       ON CONFLICT (tenant_id, server_name) DO UPDATE SET
         transport = EXCLUDED.transport,
         endpoint = EXCLUDED.endpoint,
         auth_config = EXCLUDED.auth_config,
         capabilities = EXCLUDED.capabilities,
         updated_at = NOW()
       RETURNING server_id, tenant_id, server_name, transport, endpoint,
                 auth_config, status, capabilities, registered_at, updated_at`,
      [
        tenantId,
        input.serverName,
        input.transport,
        input.endpoint ?? null,
        JSON.stringify(input.authConfig ?? {}),
        JSON.stringify(input.capabilities ?? {}),
      ],
    );
    return rows[0] as McpServerRow;
  });
}

export async function deregisterServer(
  tenantId: string,
  serverId: string,
  actorContext?: ActorContext,
): Promise<void> {
  await withTenantClient(
    tenantId,
    actorContext ?? { principalType: 'human' },
    async (client) => {
      await client.query(
        `DELETE FROM mcp_servers WHERE tenant_id = $1 AND server_id = $2`,
        [tenantId, serverId],
      );
    },
  );
}

export async function listTools(
  tenantId: string,
  actorContext?: ActorContext,
): Promise<McpToolRow[]> {
  return withTenantClient(tenantId, actorContext ?? { principalType: 'human' }, async (client) => {
    const { rows } = await client.query(
      `SELECT tool_id, tenant_id, server_id, tool_name, description,
              input_schema, output_schema, permission_scope, is_enabled, created_at
       FROM mcp_tools
       WHERE is_enabled = TRUE
       ORDER BY tool_name`,
    );
    return rows as McpToolRow[];
  });
}

export async function upsertTool(
  tenantId: string,
  input: {
    serverId: string;
    toolName: string;
    description?: string;
    inputSchema: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
    permissionScope?: string;
  },
  actorContext?: ActorContext,
): Promise<McpToolRow> {
  return withTenantClient(tenantId, actorContext ?? { principalType: 'human' }, async (client) => {
    const { rows } = await client.query(
      `INSERT INTO mcp_tools
         (tenant_id, server_id, tool_name, description, input_schema, output_schema, permission_scope)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)
       ON CONFLICT (tenant_id, server_id, tool_name) DO UPDATE SET
         description = EXCLUDED.description,
         input_schema = EXCLUDED.input_schema,
         output_schema = EXCLUDED.output_schema,
         permission_scope = EXCLUDED.permission_scope
       RETURNING tool_id, tenant_id, server_id, tool_name, description,
                 input_schema, output_schema, permission_scope, is_enabled, created_at`,
      [
        tenantId,
        input.serverId,
        input.toolName,
        input.description ?? null,
        JSON.stringify(input.inputSchema),
        input.outputSchema ? JSON.stringify(input.outputSchema) : null,
        input.permissionScope ?? null,
      ],
    );
    return rows[0] as McpToolRow;
  });
}

export async function openSession(
  tenantId: string,
  input: { serverId: string; userId?: string; agentCode?: string; actorType: string },
  actorContext?: ActorContext,
): Promise<string> {
  return withTenantClient(tenantId, actorContext ?? { principalType: 'human' }, async (client) => {
    const { rows } = await client.query(
      `INSERT INTO mcp_sessions (tenant_id, server_id, user_id, agent_code, actor_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING session_id`,
      [tenantId, input.serverId, input.userId ?? null, input.agentCode ?? null, input.actorType],
    );
    return rows[0].session_id as string;
  });
}

export async function closeSession(
  tenantId: string,
  sessionId: string,
  status: 'closed' | 'errored' = 'closed',
  actorContext?: ActorContext,
): Promise<void> {
  await withTenantClient(
    tenantId,
    actorContext ?? { principalType: 'human' },
    async (client) => {
      await client.query(
        `UPDATE mcp_sessions SET closed_at = NOW(), status = $3
         WHERE tenant_id = $1 AND session_id = $2`,
        [tenantId, sessionId, status],
      );
    },
  );
}

export async function recordInvocation(
  tenantId: string,
  input: {
    sessionId: string;
    toolId?: string;
    toolName: string;
    input?: unknown;
    output?: unknown;
    latencyMs?: number;
    error?: string;
    actorType: string;
    actorId?: string;
  },
  actorContext?: ActorContext,
): Promise<void> {
  await withTenantClient(
    tenantId,
    actorContext ?? { principalType: 'human' },
    async (client) => {
      await client.query(
        `INSERT INTO mcp_tool_invocations
           (tenant_id, session_id, tool_id, tool_name,
            input, output, latency_ms, error, actor_type, actor_id)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10)`,
        [
          tenantId,
          input.sessionId,
          input.toolId ?? null,
          input.toolName,
          input.input === undefined ? null : JSON.stringify(input.input),
          input.output === undefined ? null : JSON.stringify(input.output),
          input.latencyMs ?? null,
          input.error ?? null,
          input.actorType,
          input.actorId ?? null,
        ],
      );
    },
  );
}

export async function recordAuditEvent(
  tenantId: string,
  input: {
    eventType: string;
    actorId?: string;
    actorType: string;
    payload?: Record<string, unknown>;
  },
  actorContext?: ActorContext,
): Promise<void> {
  await withTenantClient(
    tenantId,
    actorContext ?? { principalType: 'human' },
    async (client) => {
      await client.query(
        `INSERT INTO mcp_audit_log
           (tenant_id, event_type, actor_id, actor_type, payload)
         VALUES ($1, $2, $3, $4, COALESCE($5::jsonb, '{}'::jsonb))`,
        [
          tenantId,
          input.eventType,
          input.actorId ?? null,
          input.actorType,
          JSON.stringify(input.payload ?? {}),
        ],
      );
    },
  );
}

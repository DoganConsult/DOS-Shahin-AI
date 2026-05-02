// @ts-nocheck
import { safeQuery, tenantSchema } from '@dos/db';
import { McpToolContract, McpAgentContract, McpExecutionLogContract } from '../contracts/mcp.contract';
import { setAuditData } from '../ports/middleware.port';

// ── Tool Registry ──
export async function createTool(tenantId: string, userId: string, data: { name: string, description?: string, parametersSchema: any, isActive?: boolean }): Promise<McpToolContract> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".mcp_tool_registry (name, description, parameters_schema, is_active)
     VALUES ($1, $2, $3, $4)
     RETURNING tool_id as "toolId", name, description, parameters_schema as "parametersSchema", is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"`,
    [data.name, data.description || null, data.parametersSchema, data.isActive ?? true]
  );
  await setAuditData(tenantId, 'mcp_tool_registry', result.rows[0].toolId, 'create', null, result.rows[0], userId);
  return result.rows[0] as McpToolContract;
}

export async function getTools(tenantId: string): Promise<McpToolContract[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT tool_id as "toolId", name, description, parameters_schema as "parametersSchema", is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
     FROM "${schema}".mcp_tool_registry ORDER BY name`
  );
  return result.rows as McpToolContract[];
}

// ── Agent Registry ──
export async function createAgent(tenantId: string, userId: string, data: { name: string, description?: string, systemPrompt?: string, isActive?: boolean }): Promise<McpAgentContract> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".mcp_agent_registry (name, description, system_prompt, is_active)
     VALUES ($1, $2, $3, $4)
     RETURNING agent_id as "agentId", name, description, system_prompt as "systemPrompt", is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"`,
    [data.name, data.description || null, data.systemPrompt || null, data.isActive ?? true]
  );
  await setAuditData(tenantId, 'mcp_agent_registry', result.rows[0].agentId, 'create', null, result.rows[0], userId);
  const agent = result.rows[0];
  agent.boundTools = [];
  return agent as McpAgentContract;
}

export async function bindToolToAgent(tenantId: string, userId: string, agentId: string, toolId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".mcp_agent_tools (agent_id, tool_id)
     VALUES ($1, $2) ON CONFLICT (agent_id, tool_id) DO NOTHING`,
    [agentId, toolId]
  );
  await safeQuery(`UPDATE "${schema}".mcp_agent_registry SET updated_at = NOW() WHERE agent_id = $1`, [agentId]);
  await setAuditData(tenantId, 'mcp_agent_tools', `${agentId}-${toolId}`, 'bind', null, { agentId, toolId }, userId);
}

export async function getAgents(tenantId: string): Promise<McpAgentContract[]> {
  const schema = tenantSchema(tenantId);
  const agentsResult = await safeQuery(
    `SELECT agent_id as "agentId", name, description, system_prompt as "systemPrompt", is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
     FROM "${schema}".mcp_agent_registry ORDER BY name`
  );
  
  const agents = agentsResult.rows as McpAgentContract[];

  const toolsResult = await safeQuery(
    `SELECT t.tool_id as "toolId", t.name, t.description, t.parameters_schema as "parametersSchema", t.is_active as "isActive", t.created_at as "createdAt", t.updated_at as "updatedAt", at.agent_id as "agentId"
     FROM "${schema}".mcp_tool_registry t
     JOIN "${schema}".mcp_agent_tools at ON t.tool_id = at.tool_id`
  );

  const toolMap = new Map<string, McpToolContract[]>();
  for (const row of toolsResult.rows) {
    if (!toolMap.has(row.agentId)) toolMap.set(row.agentId, []);
    toolMap.get(row.agentId)!.push(row as unknown as McpToolContract);
  }

  return agents.map(a => ({ ...a, boundTools: toolMap.get(a.agentId) || [] }));
}

// ── Execution Logs ──
export async function logExecution(tenantId: string, userId: string | null, data: { agentId: string, toolId?: string, executionPayload: any, executionResult: any, status: string, executionTimeMs: number }): Promise<McpExecutionLogContract> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".mcp_execution_logs (agent_id, tool_id, user_id, execution_payload, execution_result, status, execution_time_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING log_id as "logId", agent_id as "agentId", tool_id as "toolId", user_id as "userId", execution_payload as "executionPayload", execution_result as "executionResult", status, execution_time_ms as "executionTimeMs", created_at as "createdAt"`,
    [data.agentId, data.toolId || null, userId, JSON.stringify(data.executionPayload), JSON.stringify(data.executionResult), data.status, data.executionTimeMs]
  );
  return result.rows[0] as McpExecutionLogContract;
}

export async function getExecutionLogs(tenantId: string, agentId: string): Promise<McpExecutionLogContract[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT log_id as "logId", agent_id as "agentId", tool_id as "toolId", user_id as "userId", execution_payload as "executionPayload", execution_result as "executionResult", status, execution_time_ms as "executionTimeMs", created_at as "createdAt"
     FROM "${schema}".mcp_execution_logs WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 500`,
    [agentId]
  );
  return result.rows as McpExecutionLogContract[];
}

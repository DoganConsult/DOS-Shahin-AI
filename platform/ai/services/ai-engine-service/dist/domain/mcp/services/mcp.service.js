// @ts-nocheck
import { safeQuery, tenantSchema } from '@dos/db';
import { setAuditData } from '../ports/middleware.port';
// ── Tool Registry ──
export async function createTool(tenantId, userId, data) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`INSERT INTO "${schema}".mcp_tool_registry (name, description, parameters_schema, is_active)
     VALUES ($1, $2, $3, $4)
     RETURNING tool_id as "toolId", name, description, parameters_schema as "parametersSchema", is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"`, [data.name, data.description || null, data.parametersSchema, data.isActive ?? true]);
    await setAuditData(tenantId, 'mcp_tool_registry', result.rows[0].toolId, 'create', null, result.rows[0], userId);
    return result.rows[0];
}
export async function getTools(tenantId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT tool_id as "toolId", name, description, parameters_schema as "parametersSchema", is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
     FROM "${schema}".mcp_tool_registry ORDER BY name`);
    return result.rows;
}
// ── Agent Registry ──
export async function createAgent(tenantId, userId, data) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`INSERT INTO "${schema}".mcp_agent_registry (name, description, system_prompt, is_active)
     VALUES ($1, $2, $3, $4)
     RETURNING agent_id as "agentId", name, description, system_prompt as "systemPrompt", is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"`, [data.name, data.description || null, data.systemPrompt || null, data.isActive ?? true]);
    await setAuditData(tenantId, 'mcp_agent_registry', result.rows[0].agentId, 'create', null, result.rows[0], userId);
    const agent = result.rows[0];
    agent.boundTools = [];
    return agent;
}
export async function bindToolToAgent(tenantId, userId, agentId, toolId) {
    const schema = tenantSchema(tenantId);
    await safeQuery(`INSERT INTO "${schema}".mcp_agent_tools (agent_id, tool_id)
     VALUES ($1, $2) ON CONFLICT (agent_id, tool_id) DO NOTHING`, [agentId, toolId]);
    await safeQuery(`UPDATE "${schema}".mcp_agent_registry SET updated_at = NOW() WHERE agent_id = $1`, [agentId]);
    await setAuditData(tenantId, 'mcp_agent_tools', `${agentId}-${toolId}`, 'bind', null, { agentId, toolId }, userId);
}
export async function getAgents(tenantId) {
    const schema = tenantSchema(tenantId);
    const agentsResult = await safeQuery(`SELECT agent_id as "agentId", name, description, system_prompt as "systemPrompt", is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
     FROM "${schema}".mcp_agent_registry ORDER BY name`);
    const agents = agentsResult.rows;
    const toolsResult = await safeQuery(`SELECT t.tool_id as "toolId", t.name, t.description, t.parameters_schema as "parametersSchema", t.is_active as "isActive", t.created_at as "createdAt", t.updated_at as "updatedAt", at.agent_id as "agentId"
     FROM "${schema}".mcp_tool_registry t
     JOIN "${schema}".mcp_agent_tools at ON t.tool_id = at.tool_id`);
    const toolMap = new Map();
    for (const row of toolsResult.rows) {
        if (!toolMap.has(row.agentId))
            toolMap.set(row.agentId, []);
        toolMap.get(row.agentId).push(row);
    }
    return agents.map(a => ({ ...a, boundTools: toolMap.get(a.agentId) || [] }));
}
// ── Execution Logs ──
export async function logExecution(tenantId, userId, data) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`INSERT INTO "${schema}".mcp_execution_logs (agent_id, tool_id, user_id, execution_payload, execution_result, status, execution_time_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING log_id as "logId", agent_id as "agentId", tool_id as "toolId", user_id as "userId", execution_payload as "executionPayload", execution_result as "executionResult", status, execution_time_ms as "executionTimeMs", created_at as "createdAt"`, [data.agentId, data.toolId || null, userId, JSON.stringify(data.executionPayload), JSON.stringify(data.executionResult), data.status, data.executionTimeMs]);
    return result.rows[0];
}
export async function getExecutionLogs(tenantId, agentId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT log_id as "logId", agent_id as "agentId", tool_id as "toolId", user_id as "userId", execution_payload as "executionPayload", execution_result as "executionResult", status, execution_time_ms as "executionTimeMs", created_at as "createdAt"
     FROM "${schema}".mcp_execution_logs WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 500`, [agentId]);
    return result.rows;
}
//# sourceMappingURL=mcp.service.js.map
// @ts-nocheck
import { logger } from '../ports/logger.port.js';
import * as toolRepo from '../repositories/mcp-tool.repo.js';
import * as agentRepo from '../repositories/mcp-agent.repo.js';
export async function listTools(tenantId, filter = {}) {
    try {
        return await toolRepo.listTools(tenantId, filter);
    }
    catch (err) {
        logger.warn('[MCP-Registry] Failed to list tools', { error: err instanceof Error ? err.message : String(err) });
        return { rows: [], total: 0 };
    }
}
export async function getToolByName(toolName) {
    return toolRepo.getToolByName(toolName);
}
export async function getResolvedTool(tenantId, toolName) {
    const tool = await toolRepo.getToolByName(toolName);
    if (!tool)
        return null;
    const overrides = await toolRepo.getToolOverrides(tenantId);
    const override = overrides.get(toolName);
    if (!override)
        return tool;
    return applyOverride(tool, override);
}
export async function getToolsForAgent(tenantId, agentId) {
    const tools = await toolRepo.getToolsForAgent(agentId);
    const overrides = await toolRepo.getToolOverrides(tenantId);
    return tools
        .map(tool => {
        const override = overrides.get(tool.toolName);
        return override ? applyOverride(tool, override) : tool;
    })
        .filter(t => t.isEnabled);
}
export async function enableTool(toolName) {
    await toolRepo.updateToolEnabled(toolName, true);
    logger.info(`[MCP-Registry] Tool enabled: ${toolName}`);
}
export async function disableTool(toolName) {
    await toolRepo.updateToolEnabled(toolName, false);
    logger.info(`[MCP-Registry] Tool disabled: ${toolName}`);
}
export async function updateToolStatus(toolName, status) {
    await toolRepo.updateToolStatus(toolName, status);
    logger.info(`[MCP-Registry] Tool status updated: ${toolName} -> ${status}`);
}
export async function listAgents() {
    try {
        return await agentRepo.listAgents();
    }
    catch (err) {
        logger.warn('[MCP-Registry] Failed to list agents', { error: err instanceof Error ? err.message : String(err) });
        return [];
    }
}
export async function listAllAgents() {
    return agentRepo.listAllAgents();
}
export async function getAgent(agentId) {
    return agentRepo.getAgentById(agentId);
}
export async function enableAgent(agentId) {
    await agentRepo.updateAgentEnabled(agentId, true);
    logger.info(`[MCP-Registry] Agent enabled: ${agentId}`);
}
export async function disableAgent(agentId) {
    await agentRepo.updateAgentEnabled(agentId, false);
    logger.info(`[MCP-Registry] Agent disabled: ${agentId}`);
}
export async function upsertToolOverride(tenantId, override) {
    await toolRepo.upsertToolOverride(tenantId, override);
    logger.info(`[MCP-Registry] Tool override upserted: ${override.toolName} for tenant ${tenantId}`);
}
export async function deleteToolOverride(tenantId, toolName) {
    await toolRepo.deleteToolOverride(tenantId, toolName);
    logger.info(`[MCP-Registry] Tool override deleted: ${toolName} for tenant ${tenantId}`);
}
export async function getToolOverrides(tenantId) {
    return toolRepo.getToolOverrides(tenantId);
}
function applyOverride(tool, override) {
    return {
        ...tool,
        isEnabled: override.isEnabled ?? tool.isEnabled,
        approvalMode: (override.approvalMode ?? tool.approvalMode),
        minAutonomy: (override.minAutonomy ?? tool.minAutonomy),
        maxAutonomy: (override.maxAutonomy ?? tool.maxAutonomy),
        defaultAutonomy: (override.defaultAutonomy ?? tool.defaultAutonomy),
        maxCallsPerMin: override.maxCallsPerMin ?? tool.maxCallsPerMin,
        inputSchema: override.customInputSchema ?? tool.inputSchema,
        executionConfig: override.executionConfig ?? tool.executionConfig,
    };
}
//# sourceMappingURL=mcp-registry.service.js.map
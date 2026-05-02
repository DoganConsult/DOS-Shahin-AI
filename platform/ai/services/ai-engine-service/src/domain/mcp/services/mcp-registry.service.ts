// @ts-nocheck
import { logger } from '../ports/logger.port';
import * as toolRepo from '../repositories/mcp-tool.repo';
import * as agentRepo from '../repositories/mcp-agent.repo';
import type { McpToolDef, McpAgentDef, McpToolOverride, ToolListFilter, ToolListResult } from '@dos/types';
import { safeQuery } from "@dos/db";

export async function listTools(tenantId: string, filter: ToolListFilter = {}): Promise<ToolListResult> {
  try {
    return await toolRepo.listTools(tenantId, filter);
  } catch (err) {
    logger.warn('[MCP-Registry] Failed to list tools', { error: err instanceof Error ? err.message : String(err) });
    return { rows: [], total: 0 };
  }
}

export async function getToolByName(toolName: string): Promise<McpToolDef | null> {
  return toolRepo.getToolByName(toolName);
}

export async function getResolvedTool(tenantId: string, toolName: string): Promise<McpToolDef | null> {
  const tool = await toolRepo.getToolByName(toolName);
  if (!tool) return null;

  const overrides = await toolRepo.getToolOverrides(tenantId);
  const override = overrides.get(toolName);
  if (!override) return tool;

  return applyOverride(tool, override);
}

export async function getToolsForAgent(tenantId: string, agentId: string): Promise<McpToolDef[]> {
  const tools = await toolRepo.getToolsForAgent(agentId);
  const overrides = await toolRepo.getToolOverrides(tenantId);

  return tools
    .map(tool => {
      const override = overrides.get(tool.toolName);
      return override ? applyOverride(tool, override) : tool;
    })
    .filter(t => t.isEnabled);
}

export async function enableTool(toolName: string): Promise<void> {
  await toolRepo.updateToolEnabled(toolName, true);
  logger.info(`[MCP-Registry] Tool enabled: ${toolName}`);
}

export async function disableTool(toolName: string): Promise<void> {
  await toolRepo.updateToolEnabled(toolName, false);
  logger.info(`[MCP-Registry] Tool disabled: ${toolName}`);
}

export async function updateToolStatus(toolName: string, status: string): Promise<void> {
  await toolRepo.updateToolStatus(toolName, status);
  logger.info(`[MCP-Registry] Tool status updated: ${toolName} -> ${status}`);
}

export async function listAgents(): Promise<McpAgentDef[]> {
  try {
    return await agentRepo.listAgents();
  } catch (err) {
    logger.warn('[MCP-Registry] Failed to list agents', { error: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

export async function listAllAgents(): Promise<McpAgentDef[]> {
  return agentRepo.listAllAgents();
}

export async function getAgent(agentId: string): Promise<McpAgentDef | null> {
  return agentRepo.getAgentById(agentId);
}

export async function enableAgent(agentId: string): Promise<void> {
  await agentRepo.updateAgentEnabled(agentId, true);
  logger.info(`[MCP-Registry] Agent enabled: ${agentId}`);
}

export async function disableAgent(agentId: string): Promise<void> {
  await agentRepo.updateAgentEnabled(agentId, false);
  logger.info(`[MCP-Registry] Agent disabled: ${agentId}`);
}

export async function upsertToolOverride(tenantId: string, override: McpToolOverride): Promise<void> {
  await toolRepo.upsertToolOverride(tenantId, override);
  logger.info(`[MCP-Registry] Tool override upserted: ${override.toolName} for tenant ${tenantId}`);
}

export async function deleteToolOverride(tenantId: string, toolName: string): Promise<void> {
  await toolRepo.deleteToolOverride(tenantId, toolName);
  logger.info(`[MCP-Registry] Tool override deleted: ${toolName} for tenant ${tenantId}`);
}

export async function getToolOverrides(tenantId: string): Promise<Map<string, McpToolOverride>> {
  return toolRepo.getToolOverrides(tenantId);
}

function applyOverride(tool: McpToolDef, override: McpToolOverride): McpToolDef {
  return {
    ...tool,
    isEnabled: override.isEnabled ?? tool.isEnabled,
    approvalMode: (override.approvalMode ?? tool.approvalMode) as McpToolDef['approvalMode'],
    minAutonomy: (override.minAutonomy ?? tool.minAutonomy) as McpToolDef['minAutonomy'],
    maxAutonomy: (override.maxAutonomy ?? tool.maxAutonomy) as McpToolDef['maxAutonomy'],
    defaultAutonomy: (override.defaultAutonomy ?? tool.defaultAutonomy) as McpToolDef['defaultAutonomy'],
    maxCallsPerMin: override.maxCallsPerMin ?? tool.maxCallsPerMin,
    inputSchema: override.customInputSchema ?? tool.inputSchema,
    executionConfig: override.executionConfig ?? tool.executionConfig,
  };
}

// @ts-nocheck
import { logger } from '../ports/logger.port';
import type { McpServerInfo } from '@dos/types';
import { safeQuery } from "@dos/db";

export function getServerInfo(): McpServerInfo {
  try {
    const { getMcpServerInfo, getActiveSessionCount, isDynamicMode } = require('../../../mcp/server');
    const { getMcpConfig } = require('../../../mcp/config/mcp.config');
    const config = getMcpConfig();
    const info = getMcpServerInfo();

    return {
      enabled: info.enabled,
      agentsCount: info.agentsCount,
      toolsCount: info.toolsCount,
      promptsCount: 0,
      resourcesCount: 0,
      transport: config.transport,
      dynamicMode: isDynamicMode(),
      activeSessionCount: getActiveSessionCount(),
      version: '3.0.0',
    };
  } catch (err) {
    logger.warn('[MCP-Server] Failed to get server info', { error: err instanceof Error ? err.message : String(err) });
    return {
      enabled: false,
      agentsCount: 0,
      toolsCount: 0,
      promptsCount: 0,
      resourcesCount: 0,
      transport: 'http',
      dynamicMode: false,
      activeSessionCount: 0,
      version: '3.0.0',
    };
  }
}

export async function initializeServer(): Promise<boolean> {
  try {
    const { initializeMcpServer } = require('../../../mcp/server');
    const server = await initializeMcpServer();
    return server !== null;
  } catch (err) {
    logger.error('[MCP-Server] Initialization failed', { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

export function isServerEnabled(): boolean {
  try {
    const { getMcpConfig } = require('../../../mcp/config/mcp.config');
    return getMcpConfig().enabled;
  } catch {
    return false;
  }
}

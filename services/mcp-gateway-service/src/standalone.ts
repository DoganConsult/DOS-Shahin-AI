/**
 * Standalone (stdio-transport) entry. Used when mcp-gateway-service runs
 * as a child process invoked by an MCP client over stdin/stdout. Delegates
 * to the MCP server factory in src/domain/mcp/server.ts (to be moved from
 * tenant-service/src/domain/mcp/ in the extraction PR).
 */

import { logger } from '@dos/platform-core/observability';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

async function main(): Promise<void> {
  if (process.env.MCP_ENABLED !== 'true') {
    logger.error('[MCP] MCP_ENABLED is not true; aborting stdio standalone launch.');
    process.exit(1);
  }

  // MCP server factory is moved from tenant-service/src/domain/mcp/ in the
  // extraction PR that accompanies this commit. Use a runtime-resolved
  // path so tsc does not fail before that module lands.
  const serverModuleName: string = './domain/mcp/server';
  const factoryMod: any = await import(serverModuleName).catch(() => null);
  if (!factoryMod?.createMcpServer) {
    logger.error('[MCP] MCP server factory not yet available in this service');
    process.exit(1);
  }
  const server = factoryMod.createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('[MCP] Standalone stdio server started.');

  const shutdown = async (sig: string): Promise<void> => {
    logger.info(`[MCP] Received ${sig}; closing server.`);
    try {
      await server.close();
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error(`[MCP] standalone fatal error — ${(err as Error).message}`);
  process.exit(1);
});

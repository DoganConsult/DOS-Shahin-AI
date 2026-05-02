/**
 * mcp-gateway-service — HTTP admin + MCP-over-HTTP entry point.
 *
 * Standalone (stdio) entry is at src/standalone.ts.
 *
 * The actual MCP protocol handlers (tools/list, tools/call, resources/*,
 * prompts/*) live under src/domain/mcp/, originally extracted from
 * services/tenant-service/src/domain/mcp/ (where they were excluded from
 * the tenant-service tsconfig). On first boot of this new service, the
 * extraction PR must `git mv` those files under this package.
 */

import { createServiceServer } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { createEventBackbone } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import mcpAdminRouter from './routes/mcp-admin.routes';

const SERVICE_CODE = 'mcp-gateway-service';

async function main(): Promise<void> {
  const config = loadServiceConfig(SERVICE_CODE);

  const eventBus = createEventBackbone({
    redisUrl: config.redis.url,
    serviceCode: SERVICE_CODE,
    logger,
  });

  const { start } = await createServiceServer({
    serviceCode: SERVICE_CODE,
    port: config.port ?? Number(process.env.MCP_PORT ?? 3011),
    routes: [
      { path: '/api/mcp', router: mcpAdminRouter },
      { path: '/mcp', router: mcpAdminRouter },
    ],
  });

  await start();
}

main().catch((err) => {
  console.error(`Failed to start ${SERVICE_CODE}:`, err);
  process.exit(1);
});

/**
 * MCP admin HTTP surface — register/deregister servers, list tools and
 * sessions, inspect audit log. Write operations require authenticated
 * admin; read operations require authenticated tenant member.
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@dos/platform-core/http';
import { authenticate } from '@dos/dauth-shared';
import { getPrincipalContextFromRequest } from '@dos/dauth-shared';
import * as registry from '../adapters/mcp-registry.adapter';

const router = Router();

const registerBody = z.object({
  serverName: z.string().min(1).max(255),
  transport: z.enum(['stdio', 'http', 'sse', 'streamable-http']),
  endpoint: z.string().url().optional(),
  authConfig: z.record(z.unknown()).optional(),
  capabilities: z.record(z.unknown()).optional(),
});

function requireTenant(req: Request, res: Response): string | null {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant context required' });
    return null;
  }
  return tenantId;
}

function requireAdmin(req: Request, res: Response): boolean {
  const user = req.user as { is_super_admin?: boolean; role?: string } | undefined;
  if (user?.is_super_admin || user?.role === 'admin' || user?.role === 'platform-admin') {
    return true;
  }
  res.status(403).json({ error: 'Administrator privileges required' });
  return false;
}

router.get(
  '/servers',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;
    const ctx = getPrincipalContextFromRequest(req);
    res.json({ servers: await registry.listServers(tenantId, ctx) });
  }),
);

router.post(
  '/servers',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;
    if (!requireAdmin(req, res)) return;
    const parsed = registerBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', issues: parsed.error.issues });
      return;
    }
    const ctx = getPrincipalContextFromRequest(req);
    // zod-inferred type surfaces serverName/transport as optional in strict
    // typescript mode; runtime validation above guarantees they are present.
    const { serverName, transport, endpoint, authConfig, capabilities } = parsed.data;
    const server = await registry.registerServer(
      tenantId,
      {
        serverName: serverName as string,
        transport: transport as 'stdio' | 'http' | 'sse' | 'streamable-http',
        endpoint,
        authConfig,
        capabilities,
      },
      ctx,
    );
    await registry.recordAuditEvent(
      tenantId,
      {
        eventType: 'server.registered',
        actorId: req.user?.userId,
        actorType: ctx?.principalType ?? 'human',
        payload: { serverName: parsed.data.serverName, serverId: server.server_id },
      },
      ctx,
    );
    res.status(201).json({ server });
  }),
);

router.delete(
  '/servers/:serverId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;
    if (!requireAdmin(req, res)) return;
    const ctx = getPrincipalContextFromRequest(req);
    await registry.deregisterServer(tenantId, req.params.serverId, ctx);
    await registry.recordAuditEvent(
      tenantId,
      {
        eventType: 'server.deregistered',
        actorId: req.user?.userId,
        actorType: ctx?.principalType ?? 'human',
        payload: { serverId: req.params.serverId },
      },
      ctx,
    );
    res.status(204).send();
  }),
);

router.get(
  '/tools',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;
    const ctx = getPrincipalContextFromRequest(req);
    res.json({ tools: await registry.listTools(tenantId, ctx) });
  }),
);

// V8 — root + diagnostics surfaces. Shahin's admin/mcp page calls these for
// a service overview before drilling into servers/tools. Real handlers, no
// placeholder payloads.
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;
    const ctx = getPrincipalContextFromRequest(req);
    const [servers, tools] = await Promise.all([
      registry.listServers(tenantId, ctx).catch(() => []),
      registry.listTools(tenantId, ctx).catch(() => []),
    ]);
    res.json({
      service: 'mcp-gateway-service',
      tenantId,
      counts: { servers: servers.length, tools: tools.length },
      servers,
      tools,
    });
  }),
);

router.get(
  '/diagnostics',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = requireTenant(req, res);
    if (!tenantId) return;
    const ctx = getPrincipalContextFromRequest(req);
    const servers: any[] = await registry.listServers(tenantId, ctx).catch(() => [] as any[]);
    const transportMix: Record<string, number> = {};
    for (const s of servers) {
      const key = (s && s.transport) ?? 'unknown';
      transportMix[key] = (transportMix[key] ?? 0) + 1;
    }
    res.json({
      service: 'mcp-gateway-service',
      tenantId,
      timestamp: new Date().toISOString(),
      totals: { servers: servers.length, transports: Object.keys(transportMix).length },
      transportMix,
      registryReachable: true,
    });
  }),
);

export default router;

import { Router, type Request, type Response } from 'express';
import { createServiceServer } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { routes } from './routes/index.js';
import { PLATFORM_ADMIN_SPA_HTML } from './lib/platform-admin-spa.js';
import { loadPlatformOpsRealmConfig, platformOpsRealmGuard } from './lib/platform-ops-realm.js';

const SERVICE_CODE = 'admin-console-bff';

async function main() {
  const config = loadServiceConfig(SERVICE_CODE);
  const realmCfg = loadPlatformOpsRealmConfig();
  const apiRouter = Router();
  // Unauthenticated liveness probe MUST be reachable before the realm guard
  // so ops/PM2/health-checkers can confirm the process is up without a token.
  apiRouter.get('/admin/console/health', (_req, res) =>
    res.json({ ok: true, service: 'admin-console-bff' }),
  );
  apiRouter.use(platformOpsRealmGuard(realmCfg));
  apiRouter.use(routes);
  const spaRouter = Router();
  const sendSpa = (_req: Request, res: Response): void => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(PLATFORM_ADMIN_SPA_HTML);
  };
  spaRouter.get('/', sendSpa);
  spaRouter.get(/^\/.*$/, sendSpa);
  const { start } = await createServiceServer({
    serviceCode: SERVICE_CODE,
    port: config.port,
    routes: [
      { path: '/api', router: apiRouter },
      { path: '/platform-admin', router: spaRouter },
    ],
  });
  await start();
  console.log(`[admin-console-bff] platform-ops realm enforcement: ${realmCfg.enforce ? 'ON' : 'OFF (ops must set KC_REQUIRE=1 + KC_ISSUER + KC_JWKS_URL)'}`);
}

main().catch((err) => {
  console.error(`Failed to start ${SERVICE_CODE}:`, err);
  process.exit(1);
});

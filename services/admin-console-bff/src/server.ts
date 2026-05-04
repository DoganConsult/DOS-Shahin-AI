import { Router, type Request, type Response } from 'express';
import { createServiceServer } from '@dos/service-bootstrap';
import { loadServiceConfig } from '@dos/runtime-config';
import { routes } from './routes/index.js';
import { PLATFORM_ADMIN_SPA_HTML } from './lib/platform-admin-spa.js';

const SERVICE_CODE = 'admin-console-bff';

async function main() {
  const config = loadServiceConfig(SERVICE_CODE);
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
      { path: '/api', router: routes },
      { path: '/platform-admin', router: spaRouter },
    ],
  });
  await start();
}

main().catch((err) => {
  console.error(`Failed to start ${SERVICE_CODE}:`, err);
  process.exit(1);
});

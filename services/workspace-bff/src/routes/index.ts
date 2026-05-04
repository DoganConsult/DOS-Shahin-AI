import { Router } from 'express';
import { bootstrapRouter } from './bootstrap.route.js';
import { eventsRouter } from './events.route.js';

export const routes = Router();
routes.use('/workspace', bootstrapRouter);
routes.use('/workspace', eventsRouter);
const healthHandler = (_req: import('express').Request, res: import('express').Response) =>
  res.json({ ok: true, service: 'workspace-bff' });
routes.get('/workspace/health', healthHandler);
// /healthz alias for PM2 / Cloudflare / k8s-style probes that hit the
// service root rather than the prefixed mount.
routes.get('/healthz', healthHandler);

import { Router } from 'express';
import { publishRouter } from './publish.route.js';

export const routes = Router();
routes.use('/admin/publish', publishRouter);
routes.get('/admin/publish/health', (_req, res) =>
  res.json({ ok: true, service: 'publish-service' }),
);

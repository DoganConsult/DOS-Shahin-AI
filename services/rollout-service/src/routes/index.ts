import { Router } from 'express';
import { rolloutRouter } from './rollout.route.js';

export const routes = Router();
routes.use('/admin/rollout', rolloutRouter);
routes.get('/admin/rollout/health', (_req, res) =>
  res.json({ ok: true, service: 'rollout-service' }),
);

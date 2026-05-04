import { Router } from 'express';
import { rolloutRouter } from './rollout.route.js';

export const routes = Router();
// Health route registered BEFORE the prefix mount so it cannot be shadowed
// by a future router-internal '/health' (latent-regression hygiene).
routes.get('/admin/rollout/health', (_req, res) =>
  res.json({ ok: true, service: 'rollout-service' }),
);
routes.use('/admin/rollout', rolloutRouter);

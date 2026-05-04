import { Router } from 'express';
import { featureFlagOsRouter } from './feature-flag-os.route.js';

export const routes = Router();
routes.use('/admin/feature-flag-os', featureFlagOsRouter);
routes.get('/admin/feature-flag-os/health', (_req, res) => res.json({ ok: true, service: 'feature-flag-os-service' }));

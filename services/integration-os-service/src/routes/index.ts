import { Router } from 'express';
import { integrationOsRouter } from './integration-os.route.js';

export const routes = Router();
routes.use('/admin/integration-os', integrationOsRouter);
routes.get('/admin/integration-os/health', (_req, res) => res.json({ ok: true, service: 'integration-os-service' }));

import { Router } from 'express';
import { deploymentOsRouter } from './deployment-os.route.js';

export const routes = Router();
routes.use('/admin/deployment-os', deploymentOsRouter);
routes.get('/admin/deployment-os/health', (_req, res) => res.json({ ok: true, service: 'deployment-os-service' }));

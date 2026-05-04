import { Router } from 'express';
import { marketplaceOsRouter } from './marketplace-os.route.js';

export const routes = Router();
routes.use('/admin/marketplace-os', marketplaceOsRouter);
routes.get('/admin/marketplace-os/health', (_req, res) => res.json({ ok: true, service: 'marketplace-os-service' }));

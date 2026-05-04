import { Router } from 'express';
import { billingOsRouter } from './billing-os.route.js';

export const routes = Router();
routes.use('/admin/billing-os', billingOsRouter);
routes.get('/admin/billing-os/health', (_req, res) => res.json({ ok: true, service: 'billing-os-service' }));

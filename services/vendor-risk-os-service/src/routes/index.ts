import { Router } from 'express';
import { vendorRiskOsRouter } from './vendor-risk-os.route.js';

export const routes = Router();
routes.use('/admin/vendor-risk-os', vendorRiskOsRouter);
routes.get('/admin/vendor-risk-os/health', (_req, res) => res.json({ ok: true, service: 'vendor-risk-os-service' }));

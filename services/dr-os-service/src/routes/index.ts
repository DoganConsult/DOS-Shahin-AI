import { Router } from 'express';
import { drOsRouter } from './dr-os.route.js';

export const routes = Router();
routes.use('/admin/dr-os', drOsRouter);
routes.get('/admin/dr-os/health', (_req, res) => res.json({ ok: true, service: 'dr-os-service' }));

import { Router } from 'express';
import { releaseOsRouter } from './release-os.route.js';

export const routes = Router();
routes.use('/admin/release-os', releaseOsRouter);
routes.get('/admin/release-os/health', (_req, res) => res.json({ ok: true, service: 'release-os-service' }));

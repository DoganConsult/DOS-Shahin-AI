import { Router } from 'express';
import { aiOsRouter } from './ai-os.route.js';

export const routes = Router();
routes.use('/admin/ai-os', aiOsRouter);
routes.get('/admin/ai-os/health', (_req, res) => res.json({ ok: true, service: 'ai-os-service' }));

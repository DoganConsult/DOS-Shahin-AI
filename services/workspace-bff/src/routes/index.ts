import { Router } from 'express';
import { bootstrapRouter } from './bootstrap.route.js';

export const routes = Router();
routes.use('/workspace', bootstrapRouter);
routes.get('/workspace/health', (_req, res) => res.json({ ok: true, service: 'workspace-bff' }));

import { Router } from 'express';
import { bootstrapRouter } from './bootstrap.route.js';
import { eventsRouter } from './events.route.js';

export const routes = Router();
routes.use('/workspace', bootstrapRouter);
routes.use('/workspace', eventsRouter);
routes.get('/workspace/health', (_req, res) => res.json({ ok: true, service: 'workspace-bff' }));

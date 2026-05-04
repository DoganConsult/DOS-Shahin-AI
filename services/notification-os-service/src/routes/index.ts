import { Router } from 'express';
import { notificationOsRouter } from './notification-os.route.js';

export const routes = Router();
routes.use('/admin/notification-os', notificationOsRouter);
routes.get('/admin/notification-os/health', (_req, res) => res.json({ ok: true, service: 'notification-os-service' }));

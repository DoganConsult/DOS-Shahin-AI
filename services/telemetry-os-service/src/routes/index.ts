import { Router } from 'express';
import { telemetryOsRouter } from './telemetry-os.route.js';

export const routes = Router();
routes.use('/admin/telemetry-os', telemetryOsRouter);
routes.get('/admin/telemetry-os/health', (_req, res) => res.json({ ok: true, service: 'telemetry-os-service' }));

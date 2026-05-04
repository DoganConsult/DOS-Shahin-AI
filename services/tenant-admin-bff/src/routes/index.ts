import { Router } from 'express';
import { tenantAdminRouter } from './tenant-admin.route.js';

export const routes = Router();
routes.use('/tenant-admin', tenantAdminRouter);
routes.get('/tenant-admin/health', (_req, res) =>
  res.json({ ok: true, service: 'tenant-admin-bff' }),
);

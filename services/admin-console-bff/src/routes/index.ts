import { Router } from 'express';
import { consoleRouter } from './console.route.js';
import { dosMasterEvidenceRouter } from './dos-master-evidence.route.js';

export const routes = Router();
routes.use('/admin/console', consoleRouter);
routes.use('/admin/console', dosMasterEvidenceRouter);
routes.get('/admin/console/health', (_req, res) =>
  res.json({ ok: true, service: 'admin-console-bff' }),
);

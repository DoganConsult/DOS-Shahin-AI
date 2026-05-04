import { Router } from 'express';
import { dataGovernanceOsRouter } from './data-governance-os.route.js';

export const routes = Router();
routes.use('/admin/data-governance-os', dataGovernanceOsRouter);
routes.get('/admin/data-governance-os/health', (_req, res) => res.json({ ok: true, service: 'data-governance-os-service' }));

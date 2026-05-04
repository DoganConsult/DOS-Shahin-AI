import { Router } from 'express';
import { workflowRouter } from './workflow.route.js';

export const routes = Router();
routes.use('/admin/workflow', workflowRouter);
routes.get('/admin/workflow/health', (_req, res) =>
  res.json({ ok: true, service: 'workflow-service' }),
);

import { Router } from 'express';
import { siteRouter } from './site.route.js';

export const routes = Router();
routes.use('/public', siteRouter);
routes.get('/public/site/health', (_req, res) =>
  res.json({ ok: true, service: 'marketing-shell-service' }),
);

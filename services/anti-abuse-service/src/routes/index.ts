import { Router } from 'express';
import { antiAbuseRouter } from './anti-abuse.route.js';

export const routes = Router();
routes.use('/public/anti-abuse', antiAbuseRouter);
routes.get('/public/anti-abuse/health', (_req, res) =>
  res.json({ ok: true, service: 'anti-abuse-service' }),
);

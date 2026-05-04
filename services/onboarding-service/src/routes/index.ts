import { Router } from 'express';
import { onboardingRouter } from './onboarding.route.js';

export const routes = Router();
routes.use('/admin/onboarding', onboardingRouter);
routes.get('/admin/onboarding/health', (_req, res) =>
  res.json({ ok: true, service: 'onboarding-service' }),
);

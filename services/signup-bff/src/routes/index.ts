import { Router } from 'express';
import { signupRouter } from './signup.route.js';

export const routes = Router();
routes.use('/public/signup', signupRouter);
routes.get('/public/signup/health', (_req, res) =>
  res.json({ ok: true, service: 'signup-bff' }),
);

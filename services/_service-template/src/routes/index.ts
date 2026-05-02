import { Router } from 'express';

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({ service: 'template-service', version: '0.1.0' });
});

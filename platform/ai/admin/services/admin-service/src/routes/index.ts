import { Router } from 'express';
import dos from './dos.routes';
import dauth from './dauth.routes';
import dsoc from './dsoc.routes';
import dnoc from './dnoc.routes';

export const routes = Router();

routes.get('/info', (_req, res) => res.json({
  service: 'platform-admin-service', version: '0.1.0',
  layers: ['dos', 'dauth', 'dsoc', 'dnoc'],
}));

routes.use('/dos', dos);
routes.use('/dauth', dauth);
routes.use('/dsoc', dsoc);
routes.use('/dnoc', dnoc);

// unified overview
routes.get('/overview', async (_req, res) => {
  const base = `http://127.0.0.1:${process.env.PORT || 4080}/api/admin`;
  // best-effort: just include service descriptor
  res.json({ data: { api_base: base, layers: ['dos','dauth','dsoc','dnoc'] } });
});

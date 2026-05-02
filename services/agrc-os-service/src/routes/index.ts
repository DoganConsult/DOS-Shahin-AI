import { Router } from 'express';
import agrcTaskRouter from './agrc-task.routes';
import agrcCycleRouter from './agrc-cycle.routes';
import agrcAgentRouter from './agrc-agent.routes';

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({ service: 'agrc-os-service', version: '0.1.0', modules: 3 });
});

routes.use('/agrc', agrcTaskRouter);
routes.use('/cycles', agrcCycleRouter);
routes.use('/agents', agrcAgentRouter);

import { Router } from 'express';
import auditRouter from './audit.routes';

export const auditRoutes = Router();

auditRoutes.use('/', auditRouter);

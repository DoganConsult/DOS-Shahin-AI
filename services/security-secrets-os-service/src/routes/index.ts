import { Router } from 'express';
import { securitySecretsOsRouter } from './security-secrets-os.route.js';

export const routes = Router();
routes.use('/admin/security-secrets-os', securitySecretsOsRouter);
routes.get('/admin/security-secrets-os/health', (_req, res) => res.json({ ok: true, service: 'security-secrets-os-service' }));

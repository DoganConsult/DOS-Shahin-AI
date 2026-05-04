import { Router } from 'express';
import { schemaAuthoringOsRouter } from './schema-authoring-os.route.js';

export const routes = Router();
routes.use('/admin/schema-authoring-os', schemaAuthoringOsRouter);
routes.get('/admin/schema-authoring-os/health', (_req, res) => res.json({ ok: true, service: 'schema-authoring-os-service' }));

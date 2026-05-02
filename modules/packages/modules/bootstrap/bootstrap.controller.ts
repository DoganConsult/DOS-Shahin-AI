import type { Router as ExpressRouter } from 'express';
import { Router } from 'express';
import bootstrapRoutes from './routes/bootstrap.routes';
import bootstrapDiagnosticsRoutes from './routes/bootstrap-diagnostics.routes';
import bootstrapAdminRoutes from './admin/bootstrap-admin.routes';

const router: ExpressRouter = Router();

router.use('/', bootstrapRoutes);
router.use('/diagnostics', bootstrapDiagnosticsRoutes);
router.use('/admin', bootstrapAdminRoutes);

export default router;

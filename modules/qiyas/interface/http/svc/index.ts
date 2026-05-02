import { Router } from 'express';
import { loadModuleRoute, modulesDiagnosticRouter } from '@dos/service-bootstrap';
import maturityAssessmentRouter from './maturity-assessment.routes';

const qiyas_qiyas_adminRouter = loadModuleRoute('qiyas/qiyas-admin', '../../../modules/qiyas/dist/qiyas/routes/qiyas-admin.routes');
const qiyas_qiyas_diagnosticsRouter = loadModuleRoute('qiyas/qiyas-diagnostics', '../../../modules/qiyas/dist/qiyas/routes/qiyas-diagnostics.routes');
const qiyas_qiyas_strategyRouter = loadModuleRoute('qiyas/qiyas-strategy', '../../../modules/qiyas/dist/qiyas/routes/qiyas-strategy.routes');
const qiyas_qiyasRouter = loadModuleRoute('qiyas/qiyas', '../../../modules/qiyas/dist/qiyas/routes/qiyas.routes');
const qiyas_admin_qiyas_adminRouter = loadModuleRoute('qiyas/admin/qiyas-admin', '../../../modules/qiyas/dist/qiyas/admin/qiyas-admin.routes');
const benchmarks_benchmarksRouter = loadModuleRoute('benchmarks/benchmarks', '../../../modules/benchmarks/dist/benchmarks/routes/benchmarks.routes');
const journey_journey_diagnosticsRouter = loadModuleRoute('journey/journey-diagnostics', '../../../modules/journey/dist/journey/routes/journey-diagnostics.routes');
const journey_journeyRouter = loadModuleRoute('journey/journey', '../../../modules/journey/dist/journey/routes/journey.routes');
const journey_journey_1Router = loadModuleRoute('journey/misc/journey', '../../../modules/journey/dist/journey/routes/misc/journey.routes');
const journey_admin_journey_adminRouter = loadModuleRoute('journey/admin/journey-admin', '../../../modules/journey/dist/journey/admin/journey-admin.routes');

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({ service: 'qiyas-journey-service', version: '0.1.0', modules: 3 });
});

routes.use('/qiyas', maturityAssessmentRouter);

routes.use('/qiyas/qiyas-admin', qiyas_qiyas_adminRouter);
routes.use('/qiyas/qiyas-diagnostics', qiyas_qiyas_diagnosticsRouter);
routes.use('/qiyas/qiyas-strategy', qiyas_qiyas_strategyRouter);
routes.use('/qiyas', qiyas_qiyasRouter);
routes.use('/qiyas/admin', qiyas_admin_qiyas_adminRouter);
routes.use('/benchmarks', benchmarks_benchmarksRouter);
routes.use('/journey/journey-diagnostics', journey_journey_diagnosticsRouter);
routes.use('/journey', journey_journeyRouter);
routes.use('/journey/journey', journey_journey_1Router);
routes.use('/journey/admin', journey_admin_journey_adminRouter);
routes.use('/modules', modulesDiagnosticRouter());

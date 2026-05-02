import { Router } from 'express';
import { loadModuleRoute, modulesDiagnosticRouter } from '@dos/service-bootstrap';
import assetRouter from './asset.routes';

// ─────────────────────────────────────────────────────────────────────────
// Module router loaders
//
// Loaded once at module import; reused for both nested (back-compat) and
// top-level (FE-contract / REST-canonical) mount paths.
// ─────────────────────────────────────────────────────────────────────────
export const assetAssetAdminRouter         = loadModuleRoute('asset/asset-admin',          '../../../modules/asset/dist/asset/routes/asset-admin.routes');
export const assetApplicationsRouter       = loadModuleRoute('asset/asset-applications',   '../../../modules/asset/dist/asset/routes/asset-applications.routes');
export const assetClassificationRouter     = loadModuleRoute('asset/asset-classification', '../../../modules/asset/dist/asset/routes/asset-classification.routes');
export const assetCriticalityRouter        = loadModuleRoute('asset/asset-criticality',    '../../../modules/asset/dist/asset/routes/asset-criticality.routes');
export const assetDependenciesRouter       = loadModuleRoute('asset/asset-dependencies',   '../../../modules/asset/dist/asset/routes/asset-dependencies.routes');
export const assetDiagnosticsRouter        = loadModuleRoute('asset/asset-diagnostics',    '../../../modules/asset/dist/asset/routes/asset-diagnostics.routes');
export const assetHomeRouter               = loadModuleRoute('asset/asset-home',           '../../../modules/asset/dist/asset/routes/asset-home.routes');
export const assetLinkageRouter            = loadModuleRoute('asset/asset-linkage',        '../../../modules/asset/dist/asset/routes/asset-linkage.routes');
export const assetOwnershipRouter          = loadModuleRoute('asset/asset-ownership',      '../../../modules/asset/dist/asset/routes/asset-ownership.routes');
export const assetReportsRouter            = loadModuleRoute('asset/asset-reports',        '../../../modules/asset/dist/asset/routes/asset-reports.routes');
export const assetServiceMapRouter         = loadModuleRoute('asset/asset-service-map',    '../../../modules/asset/dist/asset/routes/asset-service-map.routes');
export const assetServicesRouter           = loadModuleRoute('asset/asset-services',       '../../../modules/asset/dist/asset/routes/asset-services.routes');
export const assetsRouter                  = loadModuleRoute('asset/assets',               '../../../modules/asset/dist/asset/routes/assets.routes');
export const assetAdminAdminRouter         = loadModuleRoute('asset/admin/asset-admin',    '../../../modules/asset/dist/asset/admin/asset-admin.routes');

export const routes = Router();

routes.get('/info', (_req, res) => {
  res.json({ service: 'asset-service', version: '0.1.0', modules: 1 });
});

// ─────────────────────────────────────────────────────────────────────────
// Aggregator (admin / debugging surface). Mounted by server.ts at
// /api/asset-service. Preserves original nested layout for back-compat.
// ─────────────────────────────────────────────────────────────────────────
routes.use('/asset', assetRouter);

routes.use('/asset/asset-admin',          assetAssetAdminRouter);
routes.use('/asset/asset-applications',   assetApplicationsRouter);
routes.use('/asset/asset-classification', assetClassificationRouter);
routes.use('/asset/asset-criticality',    assetCriticalityRouter);
routes.use('/asset/asset-dependencies',   assetDependenciesRouter);
routes.use('/asset/asset-diagnostics',    assetDiagnosticsRouter);
routes.use('/asset/asset-home',           assetHomeRouter);
routes.use('/asset/asset-linkage',        assetLinkageRouter);
routes.use('/asset/asset-ownership',      assetOwnershipRouter);
routes.use('/asset/asset-reports',        assetReportsRouter);
routes.use('/asset/asset-service-map',    assetServiceMapRouter);
routes.use('/asset/asset-services',       assetServicesRouter);
routes.use('/asset',                      assetsRouter);
routes.use('/asset/admin',                assetAdminAdminRouter);
routes.use('/modules',                    modulesDiagnosticRouter());

// ─────────────────────────────────────────────────────────────────────────
// Top-level mount table (FE-contract). server.ts iterates this so each
// hyphen prefix and the REST-plural canonical (/api/assets/*) work.
// Keeping this here (rather than inline in server.ts) keeps the
// asset-service routing surface in one file.
// ─────────────────────────────────────────────────────────────────────────
export interface AssetTopLevelMount { path: string; router: Router; }

export const assetTopLevelMounts: AssetTopLevelMount[] = [
  // Hyphen-form (FE asset-api.service.ts contract)
  { path: '/api/asset-applications',   router: assetApplicationsRouter },
  { path: '/api/asset-services',       router: assetServicesRouter },
  { path: '/api/asset-service-map',    router: assetServiceMapRouter },
  { path: '/api/asset-dependencies',   router: assetDependenciesRouter },
  { path: '/api/asset-criticality',    router: assetCriticalityRouter },
  { path: '/api/asset-linkage',        router: assetLinkageRouter },
  { path: '/api/asset-classification', router: assetClassificationRouter },
  { path: '/api/asset-ownership',      router: assetOwnershipRouter },
  { path: '/api/asset-lifecycle',      router: assetLinkageRouter },
  { path: '/api/asset-reports',        router: assetReportsRouter },
  { path: '/api/asset-admin',          router: assetAdminAdminRouter },
  { path: '/api/asset-home',           router: assetHomeRouter },
  // REST-plural canonical (matches the API-WIRE-AUDIT recommendation)
  { path: '/api/assets/applications',   router: assetApplicationsRouter },
  { path: '/api/assets/services',       router: assetServicesRouter },
  { path: '/api/assets/service-map',    router: assetServiceMapRouter },
  { path: '/api/assets/dependencies',   router: assetDependenciesRouter },
  { path: '/api/assets/criticality',    router: assetCriticalityRouter },
  { path: '/api/assets/linkage',        router: assetLinkageRouter },
  { path: '/api/assets/classification', router: assetClassificationRouter },
  { path: '/api/assets/ownership',      router: assetOwnershipRouter },
  { path: '/api/assets/lifecycle',      router: assetLinkageRouter },
  { path: '/api/assets/reports',        router: assetReportsRouter },
  { path: '/api/assets/admin',          router: assetAdminAdminRouter },
  { path: '/api/assets/home',           router: assetHomeRouter },
];

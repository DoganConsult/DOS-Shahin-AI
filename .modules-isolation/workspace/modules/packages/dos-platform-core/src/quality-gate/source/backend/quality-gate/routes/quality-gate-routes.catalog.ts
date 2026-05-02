/**
 * quality-gate — Route Catalog Registration
 * Registers quality gate routes in the platform route catalog.
 */

import qualityGateRoutes from './quality-gate.routes';

export const QUALITY_GATE_ROUTES = [
  {
    path: '/api/quality-gate',
    handler: qualityGateRoutes,
    module: 'quality-gate',
    product: 'agrc',
    tier: 'enterprise',
    description: 'Quality gate management, evaluation, and dashboard APIs',
  },
];

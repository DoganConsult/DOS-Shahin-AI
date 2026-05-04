import { Router } from 'express';
import { consoleRouter } from './console.route.js';
import { dosMasterEvidenceRouter } from './dos-master-evidence.route.js';
import { workflowProxyRouter } from './workflow-proxy.route.js';
import { aiOsProxyRouter } from './ai-os-proxy.route.js';
import { notificationOsProxyRouter } from './notification-os-proxy.route.js';
import { integrationOsProxyRouter } from './integration-os-proxy.route.js';
import { dataGovernanceOsProxyRouter } from './data-governance-os-proxy.route.js';
import { billingOsProxyRouter } from './billing-os-proxy.route.js';
import { featureFlagOsProxyRouter } from './feature-flag-os-proxy.route.js';
import { securitySecretsOsProxyRouter } from './security-secrets-os-proxy.route.js';
import { telemetryOsProxyRouter } from './telemetry-os-proxy.route.js';
import { schemaAuthoringOsProxyRouter } from './schema-authoring-os-proxy.route.js';
import { deploymentOsProxyRouter } from './deployment-os-proxy.route.js';
import { releaseOsProxyRouter } from './release-os-proxy.route.js';
import { vendorRiskOsProxyRouter } from './vendor-risk-os-proxy.route.js';
import { marketplaceOsProxyRouter } from './marketplace-os-proxy.route.js';
import { drOsProxyRouter } from './dr-os-proxy.route.js';

export const routes = Router();
routes.use('/admin/console', consoleRouter);
routes.use('/admin/console', dosMasterEvidenceRouter);
// L13 D2 — Workflow OS admin-zone proxy (Doctrine Article 4).
routes.use('/admin/console/workflow', workflowProxyRouter);
// L14..L27 — Phase 2 OS admin-zone proxies (Doctrine §14 Full-Stack-Per-OS).
routes.use('/admin/console/ai-os',                aiOsProxyRouter);
routes.use('/admin/console/notification-os',      notificationOsProxyRouter);
routes.use('/admin/console/integration-os',       integrationOsProxyRouter);
routes.use('/admin/console/data-governance-os',   dataGovernanceOsProxyRouter);
routes.use('/admin/console/billing-os',           billingOsProxyRouter);
routes.use('/admin/console/feature-flag-os',      featureFlagOsProxyRouter);
routes.use('/admin/console/security-secrets-os',  securitySecretsOsProxyRouter);
routes.use('/admin/console/telemetry-os',         telemetryOsProxyRouter);
routes.use('/admin/console/schema-authoring-os',  schemaAuthoringOsProxyRouter);
routes.use('/admin/console/deployment-os',        deploymentOsProxyRouter);
routes.use('/admin/console/release-os',           releaseOsProxyRouter);
routes.use('/admin/console/vendor-risk-os',       vendorRiskOsProxyRouter);
routes.use('/admin/console/marketplace-os',       marketplaceOsProxyRouter);
routes.use('/admin/console/dr-os',                drOsProxyRouter);
routes.get('/admin/console/health', (_req, res) =>
  res.json({ ok: true, service: 'admin-console-bff' }),
);

/**
 * Shahin-AI v1 → v2 API Rewrite Middleware
 *
 * OWNERSHIP: Product (Shahin-AI / AGRC)
 *
 * Maps legacy Angular frontend /api/v1/<PascalCaseDomain>/... paths to
 * the canonical /api/<kebab-domain>/... paths used by the current API.
 *
 * This is product-specific because the domain mappings (Governance, Risk,
 * Compliance, etc.) are Shahin-Ai domains. Platform-neutral code has
 * no knowledge of these domain names.
 *
 * The platform-generic entries (auth, Admin, Payment, etc.) are kept here
 * because they were introduced as part of the Shahin frontend compatibility
 * layer and will be removed when the legacy frontend is decommissioned.
 *
 * @removal-date When legacy Angular frontend is fully decommissioned
 * @owner Product (Shahin-AI)
 */

import { Request, Response, NextFunction } from 'express';

const V1_PATH_MAP: Record<string, string> = {
  // Platform-generic (introduced for Shahin Angular frontend compat)
  auth: 'auth',
  Auth: 'auth',
  landing: 'content/landing',
  Landing: 'content/landing',
  Admin: 'admin',
  Registry: 'registry',
  Profile: 'profiles',
  Onboarding: 'onboarding',
  Dashboard: 'dashboard',
  Payment: 'payment',
  Automation: 'automation',
  Ontology: 'ontology',
  Inference: 'inference',

  // Shahin-Ai domain mappings
  Governance: 'governance',
  Risk: 'risks',
  Compliance: 'compliance',
  Audit: 'audit',
  Incident: 'incidents',
  Vendor: 'vendors',
  BCP: 'bcp',
  AI: 'ai',
  Evidence: 'evidence',
  Workflow: 'workflows',
  Assessment: 'assessments',
  Report: 'reports',
  Notification: 'notifications',
  Analytics: 'analytics',
  Copilot: 'copilot',
};

/**
 * Express middleware that rewrites /api/v1/<PascalCase>/... to /api/<kebab>/...
 */
export function v1ApiRewriteMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const segments = req.path.split('/').filter(Boolean);
  if (segments.length > 0 && V1_PATH_MAP[segments[0]]) {
    segments[0] = V1_PATH_MAP[segments[0]];
  }
  const newPath = '/api/' + segments.join('/');
  req.url = newPath;
  req.originalUrl = newPath + (req.originalUrl.includes('?') ? '?' + req.originalUrl.split('?')[1] : '');
  next();
}

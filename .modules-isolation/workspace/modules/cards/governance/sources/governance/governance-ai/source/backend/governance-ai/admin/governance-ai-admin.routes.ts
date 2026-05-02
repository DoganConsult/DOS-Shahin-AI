import { authenticate as _authenticate } from '../ports/auth.port';
/**
 * Governance AI Admin Routes
 * Delegates to the admin controller which provides settings management,
 * diagnostics, dashboard summary, and feature flag endpoints.
 */
export { default } from '../controllers/governance_ai-admin.controller';

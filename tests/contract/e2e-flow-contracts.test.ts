import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf-8');
}

describe('E2E Flow Contracts — Login/OIDC Entry', () => {
  it('frontend routes map /login to AuthEntryRedirectComponent', () => {
    const src = readFile('frontend/products/shahin/src/app/blueprint/app.routes.ts');
    expect(src).toContain("path: 'login'");
    expect(src).toContain("import('./pages/auth-entry/auth-entry-redirect.component')");
    expect(src).toContain("data: { mode: 'login' }");
  });

  it('AuthEntryRedirectComponent starts login via AuthEntryService', () => {
    const src = readFile('frontend/products/shahin/src/app/blueprint/pages/auth-entry/auth-entry-redirect.component.ts');
    expect(src).toContain('this.entry.startLogin(returnUrl ?? undefined)');
    expect(src).toContain('this.entry.startRegistration(returnUrl ?? undefined)');
  });

  it('AuthEntryService redirects login to /api/auth/oidc/start with mode=login', () => {
    const src = readFile('frontend/products/shahin/src/app/blueprint/services/auth-entry.service.ts');
    expect(src).toContain('/api/auth/oidc/start?mode=${mode}');
    expect(src).toContain("this.redirect('login', returnUrl)");
  });

  it('backend auth-service mounts OIDC routes and exposes GET /start', () => {
    const indexSrc = readFile('platform/dauth/services/auth-service/src/routes/index.ts');
    const oidcSrc = readFile('platform/dauth/services/auth-service/src/routes/oidc.routes.ts');

    expect(indexSrc).toContain("authRoutes.use('/oidc', oidcRouter)");
    expect(oidcSrc).toMatch(/router\.get\(['"]\/start['"]\s*,/);
    expect(oidcSrc).toMatch(/router\.get\(['"]\/callback['"]\s*,/);
  });

  it('backend auth-service still exposes POST /mfa/verify', () => {
    const src = readFile('platform/dauth/services/auth-service/src/routes/auth.routes.ts');
    expect(src).toMatch(/router\.post\(['"]\/mfa\/verify['"]/);
  });

  it('oidc.routes.ts pins host-policy imports + state-cookie attributes', () => {
    const src = readFile('platform/dauth/services/auth-service/src/routes/oidc.routes.ts');
    // Host-policy is the SoT — never hardcode hosts here
    expect(src).toContain("from '@dos/platform-core/auth-host-policy'");
    expect(src).toMatch(/normalizeHost\s*\(/);
    expect(src).toMatch(/getAuthSurface\s*\(/);
    expect(src).toMatch(/isAllowedFrontendHost\s*\(/);
    // State cookie invariants
    expect(src).toMatch(/STATE_TTL_SECONDS\s*=\s*1800/);
    expect(src).toMatch(/STATE_COOKIE\s*=\s*'dos_oidc_state'/);
    expect(src).toContain("path: '/api/auth/oidc'");
    expect(src).toContain("sameSite: 'lax'");
    // Guard against accidental cross-host scope leak
    expect(src).not.toMatch(/^[^\n]*domain:\s*['"][^'"\n]+/m);
    // Drift policy is wired up
    expect(src).toMatch(/handleRedirectUriDrift\s*\(/);
    expect(src).toMatch(/REDIRECT_URI_DRIFT/);
    expect(src).toMatch(/OIDC_START_HOST_INVARIANT/);
  });
});

describe('E2E Flow Contracts — Session Routes', () => {
  const sessionDataFile = 'services/onboarding-service/src/routes/session-data.routes.ts';
  const sessionLifecycleFile = 'services/onboarding-service/src/routes/session-lifecycle.routes.ts';
  const catalogFile = 'services/onboarding-service/src/routes/catalog.routes.ts';

  it('exposes GET /sessions/:sessionId/stages', () => {
    const src = readFile(sessionDataFile);
    expect(src).toMatch(/router\.get\(['"]\/sessions\/:sessionId\/stages['"]/);
  });

  it('exposes GET /sessions/:sessionId/review', () => {
    const src = readFile(sessionDataFile);
    expect(src).toMatch(/router\.get\(['"]\/sessions\/:sessionId\/review['"]/);
  });

  it('exposes GET /sessions/:sessionId/blockers', () => {
    const src = readFile(sessionDataFile);
    expect(src).toMatch(/router\.get\(['"]\/sessions\/:sessionId\/blockers['"]/);
  });

  it('exposes POST /sessions/:sessionId/recalculate', () => {
    const src = readFile(sessionLifecycleFile);
    expect(src).toMatch(/router\.post\(['"]\/sessions\/:sessionId\/recalculate['"]/);
  });

  it('exposes POST /sessions/:sessionId/complete', () => {
    const src = readFile(sessionLifecycleFile);
    expect(src).toMatch(/router\.post\(['"]\/sessions\/:sessionId\/complete['"]/);
  });

  it('exposes GET /packs', () => {
    const src = readFile(catalogFile);
    expect(src).toMatch(/router\.get\(['"]\/packs['"]/);
  });
});

describe('E2E Flow Contracts — Provisioning Controller Port', () => {
  it('resolves provisioning controller bundle via shared path helper', () => {
    const src = readFile('services/onboarding-service/src/ports/provisioning-controller.port.ts');
    expect(src).toContain('resolveProvisioningControllerBundle');
    expect(src).toContain('CONTROLLER_PATH');
  });

  it('logs warning on controller load failure via structured logger', () => {
    const src = readFile('services/onboarding-service/src/ports/provisioning-controller.port.ts');
    expect(src).toContain("logger.warn('[provisioning-controller.port]");
    expect(src).toContain("import { logger } from '@dos/platform-core/observability'");
  });

  it('compiled provisioning controller exists at expected path', () => {
    const controllerPath = path.join(ROOT, 'packages/modules/onboarding/controllers/provisioning.controller.js');
    expect(fs.existsSync(controllerPath), 'provisioning.controller.js should exist').toBe(true);
  });

  it('compiled controller exports all required functions', () => {
    const src = readFile('packages/modules/onboarding/controllers/provisioning.controller.js');
    const required = ['approveOnboarding', 'provisionWorkspace', 'getProvisioningJob', 'getProvisioningSteps', 'getProvisioningEvents', 'retryProvisioningJob', 'cancelProvisioningJob', 'getTemporalStatus'];
    for (const fn of required) {
      expect(src, `should export ${fn}`).toContain(`exports.${fn}`);
    }
  });
});

describe('E2E Flow Contracts — Error Handling', () => {
  it('/complete route logs provisioning_jobs insert failures', () => {
    const src = readFile('services/onboarding-service/src/routes/session-lifecycle.routes.ts');
    expect(src).toContain("[complete] provisioning_jobs insert failed");
    expect(src).not.toMatch(/catch\s*\{\s*\/\*\s*provisioning_jobs/);
  });

  it('/packs route logs DB failures instead of silent fallback', () => {
    const src = readFile('services/onboarding-service/src/routes/catalog.routes.ts');
    expect(src).toContain("[packs]");
  });
});

describe('E2E Flow Contracts — Schema Alignment', () => {
  const sessionDataFile = 'services/onboarding-service/src/routes/session-data.routes.ts';
  const sessionLifecycleFile = 'services/onboarding-service/src/routes/session-lifecycle.routes.ts';
  const catalogFile = 'services/onboarding-service/src/routes/catalog.routes.ts';

  it('scores route queries onb.scores (not public.onboarding_scores)', () => {
    const src = readFile(sessionDataFile);
    expect(src).toContain('FROM onb.scores');
    expect(src).not.toContain('FROM public.onboarding_scores');
  });

  it('blockers route queries onb.blockers (not public.onboarding_blockers)', () => {
    const src = readFile(sessionDataFile);
    expect(src).toContain('FROM onb.blockers');
    expect(src).not.toContain('FROM public.onboarding_blockers');
  });

  it('recommendations route queries onb.recommendations (not public.onboarding_recommendations)', () => {
    const src = readFile(sessionDataFile);
    expect(src).toContain('FROM onb.recommendations');
    expect(src).not.toContain('FROM public.onboarding_recommendations');
  });

  it('packs route queries onb.product_packs and onb.pack_modules', () => {
    const src = readFile(catalogFile);
    expect(src).toContain('FROM onb.product_packs');
    expect(src).toContain('FROM onb.pack_modules');
  });

  it('provisioning_jobs INSERT uses requested_by_user_id (not tenant_id)', () => {
    const src = readFile(sessionLifecycleFile);
    expect(src).toContain('INSERT INTO public.provisioning_jobs (id, session_id, requested_by_user_id');
    expect(src).not.toMatch(/INSERT INTO public\.provisioning_jobs\s*\([^)]*tenant_id/);
  });

  it('migration for onb.product_packs exists', () => {
    const migration = readFile('ops/migrations/024_onboarding_product_packs.sql');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS onb.product_packs');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS onb.pack_modules');
  });
});

describe('E2E Flow Contracts — Frontend API Service', () => {
  it('frontend API service calls all session routes that backend exposes', () => {
    const src = readFile('frontend/products/shahin-ai/src/app/blueprint/features/onboarding-os/services/onboarding-api.service.ts');
    expect(src).toContain('/sessions/${sessionId}/stages');
    expect(src).toContain('/sessions/${sessionId}/review');
    expect(src).toContain('/sessions/${sessionId}/blockers');
    expect(src).toContain('/sessions/${sessionId}/recalculate');
    expect(src).toContain('/sessions/${sessionId}/complete');
    expect(src).toContain('/sessions/${sessionId}/scores');
  });

  it('pack-selection component calls GET /packs', () => {
    const src = readFile('frontend/products/shahin-ai/src/app/blueprint/features/onboarding-os/components/pack-selection/pack-selection.component.ts');
    expect(src).toContain('/onboarding/packs');
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, 'post-auth-orchestrator.service.ts'), 'utf-8');

describe('PostAuthOrchestratorService — structure', () => {
  it('is providedIn root', () => {
    expect(src).toContain("providedIn: 'root'");
  });

  it('exports PostAuthResponse interface', () => {
    expect(src).toContain('export interface PostAuthResponse');
  });

  it('has completePostAuth method', () => {
    expect(src).toContain('async completePostAuth(response: PostAuthResponse)');
  });

  it('has resolveEntryRoute method', () => {
    expect(src).toContain('async resolveEntryRoute(');
  });

  it('has sanitizeReturnUrl method', () => {
    expect(src).toContain('sanitizeReturnUrl(');
  });
});

describe('PostAuthOrchestratorService — completePostAuth sequence', () => {
  it('throws if token missing', () => {
    expect(src).toContain("if (!response.token)");
    expect(src).toContain("throw new Error('[PostAuthOrchestrator] No token");
  });

  it('persists full 9-field session shape via setSession', () => {
    expect(src).toContain('this.session.setSession({');
    expect(src).toContain('token: response.token');
    expect(src).toContain('refreshToken: response.refreshToken');
    expect(src).toContain('tenantId: response.tenantId');
    expect(src).toContain('role: response.role');
    expect(src).toContain('userName: response.userName');
    expect(src).toContain('orgName: response.orgName');
    expect(src).toContain('isSuperAdmin: response.isSuperAdmin');
    expect(src).toContain('memberOnboarded: response.memberOnboarded');
    expect(src).toContain('enterpriseAuthz:');
    expect(src).toContain('response.enterpriseAuthz');
  });

  it('stores onb_session_id when present', () => {
    expect(src).toContain("this.storage.set('onb_session_id', response.sessionId)");
  });

  it('stores grc_userId when present', () => {
    expect(src).toContain("this.storage.set('grc_userId', response.userId)");
  });

  it('configures idle timeout when present', () => {
    expect(src).toContain('this.idleTimeout.configure(response.sessionIdleTimeoutMinutes)');
  });

  it('yields one macrotask before bootstrap', () => {
    expect(src).toContain("await new Promise<void>(r => setTimeout(r, 0))");
  });

  it('waits for profile load', () => {
    expect(src).toContain('await this.session.waitForProfileLoad()');
  });

  it('loads unified bootstrap', () => {
    expect(src).toContain('this.bootstrapApi.loadUnifiedBootstrap()');
  });

  it('routes to /onboarding when onboarding incomplete', () => {
    expect(src).toContain("this.router.navigateByUrl('/onboarding')");
    expect(src).toContain('!response.onboardingComplete');
  });

  it('routes to /team-welcome for non-admin non-onboarded members', () => {
    expect(src).toContain("this.router.navigate(['/team-welcome'])");
    expect(src).toContain('!memberOnboarded');
    expect(src).toContain('!this.accessStore.isAdmin()');
  });

  it('default-deny when both bootstrap paths fail (Law 11)', () => {
    expect(src).toContain('!accessLoaded && !legacyLoaded');
    expect(src).toContain('throw new Error');
  });
});

describe('PostAuthOrchestratorService — resolveEntryRoute', () => {
  it('uses blocking bootstrap route when session bootstrap requires it', () => {
    expect(src).toContain('if (bootstrap?.next?.blocking) return bootstrap.next.route');
  });

  it('returns sanitized returnUrl before bootstrap next route', () => {
    expect(src).toContain('const safe = this.sanitizeReturnUrl(returnUrl ?? null)');
    expect(src).toContain('if (safe) return safe');
  });

  it('falls back to onboarding when bootstrap is unavailable and onboarding is incomplete', () => {
    expect(src).toContain('if (!this.session.isOnboardingComplete())');
    expect(src).toContain("return '/onboarding'");
  });

  it('returns null (no frontend invention) when bootstrap is unavailable and onboarding is complete', () => {
    // Doctrine: never fabricate a landing route. Source is dos.tenant_landing_config
    // via TenantLandingConfigService — orchestrator returns null for empty/no-op.
    const FORBIDDEN_LITERAL = "return '" + '/workspace-' + "home'";
    expect(src).not.toContain(FORBIDDEN_LITERAL);
    expect(src).toMatch(/return null/);
  });

  it('prefers accessStore landing page; never fabricates a fallback', () => {
    expect(src).toContain('if (this.accessStore.loaded())');
    expect(src).toContain('return this.accessStore.landingPage()');
    // bootstrapStore.landingPage() may return null; orchestrator forwards
    // it as-is. No frontend-fabricated landing-route fallback constant.
    const FORBIDDEN_LITERAL = "'" + '/workspace-' + "home'";
    expect(src).not.toContain(FORBIDDEN_LITERAL);
  });

  it('does NOT include mustChangePassword in route resolution', () => {
    expect(src).not.toContain('mustChangePassword');
  });
});

describe('PostAuthOrchestratorService — sanitizeReturnUrl', () => {
  it('rejects null input', () => {
    expect(src).toContain('if (!raw');
  });

  it('rejects double-slash (open redirect)', () => {
    expect(src).toContain("raw.startsWith('//')");
  });

  it('blocks auth and setup page paths', () => {
    expect(src).toContain("'/login'");
    expect(src).toContain("'/register'");
    expect(src).toContain("'/forgot-password'");
    expect(src).toContain("'/reset-password'");
    expect(src).toContain("'/verify-email'");
    expect(src).toContain("'/setup/verify'");
    expect(src).toContain("'/setup'");
  });
});

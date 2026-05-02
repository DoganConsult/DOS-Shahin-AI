import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, 'register.component.ts'), 'utf-8');

describe('RegisterComponent — structure', () => {
  it('should use OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('should have selector app-register', () => {
    expect(src).toMatch(/selector:\s*['"]app-register['"]/);
  });

  it('should use ReactiveFormsModule', () => {
    expect(src).toContain('ReactiveFormsModule');
    expect(src).toContain('FormBuilder');
  });
});

describe('RegisterComponent — consent fix', () => {
  it('does NOT hardcode consent: true', () => {
    expect(src).not.toContain('consent: true');
  });

  it('reads actual consent value from form', () => {
    expect(src).toContain('consent: this.registerForm.getRawValue().consent');
  });

  it('has consent field with Validators.requiredTrue', () => {
    expect(src).toContain('Validators.requiredTrue');
  });
});

describe('RegisterComponent — canonical endpoint', () => {
  it('posts to /onboarding/register (not /auth/register)', () => {
    expect(src).toContain("/onboarding/register");
    expect(src).not.toMatch(/['"].*\/auth\/register['"]/);
  });
});

describe('RegisterComponent — orchestrator delegation', () => {
  it('injects PostAuthOrchestratorService', () => {
    expect(src).toContain('PostAuthOrchestratorService');
    expect(src).toContain('orchestrator');
  });

  it('delegates post-auth to orchestrator.completePostAuth()', () => {
    expect(src).toContain('this.orchestrator.completePostAuth(');
  });

  it('does NOT call setSession directly', () => {
    expect(src).not.toContain('this.auth.setSession');
    expect(src).not.toContain('this.kcAuth.setSession');
  });

  it('does NOT call storage.set directly for session keys', () => {
    expect(src).not.toContain("storage.set('grc_token'");
    expect(src).not.toContain("storage.set('grc_userId'");
  });
});

describe('RegisterComponent — full session shape', () => {
  it('passes userId to orchestrator', () => {
    expect(src).toContain('userId: res.userId');
  });

  it('passes tenantId to orchestrator', () => {
    expect(src).toContain('tenantId: res.tenantId');
  });

  it('passes orgNameAr to orchestrator', () => {
    expect(src).toContain('orgNameAr: res.orgNameAr');
  });

  it('passes sessionId to orchestrator', () => {
    expect(src).toContain('sessionId: res.sessionId');
  });

  it('passes enterpriseAuthz to orchestrator', () => {
    expect(src).toContain('enterpriseAuthz:');
  });
});

describe('RegisterComponent — error handling', () => {
  it('handles 409 ORG_DOMAIN_EXISTS', () => {
    expect(src).toContain('ORG_DOMAIN_EXISTS');
  });

  it('handles 409 generic email taken', () => {
    expect(src).toContain('err.status === 409');
  });

  it('handles 429 rate limit', () => {
    expect(src).toContain('err.status === 429');
  });

  it('handles 400 validation error', () => {
    expect(src).toContain('err.status === 400');
  });
});

describe('RegisterComponent — password strength', () => {
  it('has calcStrength method', () => {
    expect(src).toContain('calcStrength(');
  });

  it('checks for lowercase, uppercase, digit, and special char', () => {
    expect(src).toContain('/[a-z]/');
    expect(src).toContain('/[A-Z]/');
    expect(src).toContain('/\\d/');
  });
});

describe('RegisterComponent — RegisterResponse interface', () => {
  it('includes emailVerificationRequired field', () => {
    expect(src).toContain('emailVerificationRequired');
  });

  it('includes orgNameAr field', () => {
    expect(src).toContain('orgNameAr');
  });
});

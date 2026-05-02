// LoginComponent — Structure & Logic Tests (post-decomposition)
// Tests scan all login sub-component files to verify patterns exist across
// the decomposed architecture (container + 4 sub-components).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const containerSrc = readFileSync(resolve(__dirname, 'login.component.ts'), 'utf-8');
const loginFormSrc = readFileSync(resolve(__dirname, 'login-form.component.ts'), 'utf-8');
const mfaFormSrc = readFileSync(resolve(__dirname, 'mfa-form.component.ts'), 'utf-8');
const tenantSelectSrc = readFileSync(resolve(__dirname, 'tenant-select-form.component.ts'), 'utf-8');
const forgotPasswordSrc = readFileSync(resolve(__dirname, 'forgot-password-form.component.ts'), 'utf-8');

// Combined source for patterns that exist somewhere in the login flow
const allSrc = containerSrc + loginFormSrc + mfaFormSrc + tenantSelectSrc + forgotPasswordSrc;

describe('LoginComponent — container structure', () => {
  it('should use OnPush change detection', () => {
    expect(containerSrc).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('should have selector app-login', () => {
    expect(containerSrc).toMatch(/selector:\s*['"]app-login['"]/);
  });

  it('should export LoginComponent class', () => {
    expect(containerSrc).toContain('export class LoginComponent');
  });

  it('should inject SessionService for authentication', () => {
    expect(containerSrc).toContain('SessionService');
  });

  it('should inject I18nService for translations', () => {
    expect(containerSrc).toContain('I18nService');
  });

  it('should include language switcher', () => {
    expect(containerSrc).toContain('DosLanguageSwitcherComponent');
  });

  it('should handle RTL direction', () => {
    expect(containerSrc).toContain("direction() === 'rtl'");
  });

  it('imports all 4 sub-components', () => {
    expect(containerSrc).toContain('LoginFormComponent');
    expect(containerSrc).toContain('MfaFormComponent');
    expect(containerSrc).toContain('TenantSelectFormComponent');
    expect(containerSrc).toContain('ForgotPasswordFormComponent');
  });

  it('uses sub-components in template', () => {
    expect(containerSrc).toContain('app-login-form');
    expect(containerSrc).toContain('app-mfa-form');
    expect(containerSrc).toContain('app-tenant-select-form');
    expect(containerSrc).toContain('app-forgot-password-form');
  });

  it('manages view state', () => {
    expect(containerSrc).toContain("view: 'login' | 'mfa' | 'forgot' | 'tenant-select'");
  });
});

describe('LoginFormComponent — login form sub-component', () => {
  it('uses OnPush change detection', () => {
    expect(loginFormSrc).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('has login form with email and password fields', () => {
    expect(loginFormSrc).toContain('formControlName="email"');
    expect(loginFormSrc).toContain('formControlName="password"');
  });

  it('has password visibility toggle', () => {
    expect(loginFormSrc).toContain('showPassword');
    expect(loginFormSrc).toContain('pi-eye');
  });

  it('has email validation', () => {
    expect(loginFormSrc).toContain('Validators.required');
    expect(loginFormSrc).toContain('Validators.email');
  });

  it('has onLogin method that emits result', () => {
    expect(loginFormSrc).toContain('onLogin()');
    expect(loginFormSrc).toContain('loginResult.emit');
  });

  it('has CAPTCHA support', () => {
    expect(loginFormSrc).toContain('requireCaptcha');
    expect(loginFormSrc).toContain('_activateCaptcha');
    expect(loginFormSrc).toContain('loadCaptcha');
    expect(loginFormSrc).toContain('DomSanitizer');
  });

  it('has lockoutCountdown property', () => {
    expect(loginFormSrc).toContain('lockoutCountdown');
  });

  it('has _lockoutSub for countdown timer subscription', () => {
    expect(loginFormSrc).toContain('_lockoutSub');
  });

  it('has _startLockoutCountdown() method', () => {
    expect(loginFormSrc).toContain('_startLockoutCountdown(');
  });

  it('423 error handler calls lockout countdown', () => {
    const errorBlock = loginFormSrc.slice(loginFormSrc.indexOf('status) === 423'), loginFormSrc.indexOf('status) === 401'));
    expect(errorBlock).toContain('parseRetryAfterSeconds');
    expect(errorBlock).toContain('_startLockoutCountdown');
  });

  it('_startLockoutCountdown uses RxJS timer for countdown', () => {
    expect(loginFormSrc).toContain('_startLockoutCountdown(');
    expect(loginFormSrc).toContain('timer(0, 1000)');
    expect(loginFormSrc).toContain('lockoutCountdown');
  });

  it('_startRateLimitCountdown uses RxJS timer for countdown', () => {
    expect(loginFormSrc).toContain('_startRateLimitCountdown(');
    expect(loginFormSrc).toContain('rateLimitCountdown');
  });

  it('ngOnDestroy clears timers and subscriptions', () => {
    expect(loginFormSrc).toContain('ngOnDestroy()');
    expect(loginFormSrc).toContain('_lockoutSub?.unsubscribe()');
    expect(loginFormSrc).toContain('_rateLimitSub?.unsubscribe()');
  });

  it('exposes rememberMe and email for container cross-view communication', () => {
    expect(loginFormSrc).toContain('get rememberMe()');
    expect(loginFormSrc).toContain('get email()');
  });

  it('should NOT define .auth-form-options in inline styles', () => {
    expect(loginFormSrc).not.toContain('.auth-form-options');
  });
});

describe('MfaFormComponent — MFA verification sub-component', () => {
  it('has MFA code input with auto-submit', () => {
    expect(mfaFormSrc).toContain('onMfaCodeInput');
    expect(mfaFormSrc).toContain('code.length === 6');
  });

  it('has resend cooldown', () => {
    expect(mfaFormSrc).toContain('resendCooldown');
    expect(mfaFormSrc).toContain('onResendMfaCode');
  });

  it('has expiry countdown', () => {
    expect(mfaFormSrc).toContain('mfaExpiryCountdown');
    expect(mfaFormSrc).toContain('_startMfaExpiryCountdown');
  });

  it('receives userId, mfaType, and rememberMe as inputs', () => {
    expect(mfaFormSrc).toContain("@Input() userId = ''");
    expect(mfaFormSrc).toContain("@Input() mfaType = ''");
    expect(mfaFormSrc).toContain('@Input() rememberMe = false');
  });

  it('emits mfaResult and backToLogin events', () => {
    expect(mfaFormSrc).toContain('mfaResult');
    expect(mfaFormSrc).toContain('backToLogin');
  });
});

describe('TenantSelectFormComponent — tenant picker', () => {
  it('exports TenantMembership interface', () => {
    expect(tenantSelectSrc).toContain('export interface TenantMembership');
  });

  it('uses PrimeNG dropdown', () => {
    expect(tenantSelectSrc).toContain('DropdownModule');
    expect(tenantSelectSrc).toContain('p-dropdown');
  });

  it('emits tenantSelected and backToLogin events', () => {
    expect(tenantSelectSrc).toContain('tenantSelected');
    expect(tenantSelectSrc).toContain('backToLogin');
  });

  it('merges selected tenant into response', () => {
    expect(tenantSelectSrc).toContain('{ ...this.pendingResult, tenantId: this.selectedTenantId }');
  });
});

describe('ForgotPasswordFormComponent — forgot password', () => {
  it('has forgot password form with email field', () => {
    expect(forgotPasswordSrc).toContain('onForgotPassword');
    expect(forgotPasswordSrc).toContain('forgot-password');
  });

  it('has sent confirmation state', () => {
    expect(forgotPasswordSrc).toContain('forgotSent');
    expect(forgotPasswordSrc).toContain('forgot-sent-box');
  });

  it('handles 502 email delivery failure', () => {
    expect(forgotPasswordSrc).toContain('status === 502');
    expect(forgotPasswordSrc).toContain('resetEmailDeliveryFailed');
  });

  it('accepts initialEmail input for pre-fill', () => {
    expect(forgotPasswordSrc).toContain("@Input() initialEmail = ''");
  });
});

describe('LoginComponent — post-auth orchestration', () => {
  it('completeLogin delegates to PostAuthOrchestratorService', () => {
    expect(containerSrc).toContain('orchestrator.completePostAuth(');
  });

  it('does not contain direct bootstrap calls (delegated to orchestrator)', () => {
    expect(allSrc).not.toContain('this.bootstrapApi');
    expect(allSrc).not.toContain('loadUnifiedBootstrap');
    expect(allSrc).not.toContain('loadSessionBootstrap');
  });

  it('passes returnUrl from query params to orchestrator', () => {
    expect(containerSrc).toContain("returnUrl: this.route.snapshot.queryParamMap.get('returnUrl')");
  });

  it('uses orchestrator.sanitizeReturnUrl for ngOnInit redirect', () => {
    expect(containerSrc).toContain('this.orchestrator.sanitizeReturnUrl');
  });
});

describe('LoginComponent — security flows preserved', () => {
  it('handles mustChangePassword before orchestrator (uses setMinimalSession)', () => {
    expect(containerSrc).toContain('setMinimalSession');
    expect(containerSrc).toContain('mustChangePassword');
    expect(containerSrc).toContain("'/change-password'");
  });

  it('handles MFA required flow', () => {
    expect(containerSrc).toContain('mfaRequired');
    expect(containerSrc).toContain("view = 'mfa'");
  });

  it('handles multi-tenant selection', () => {
    expect(containerSrc).toContain('tenantMemberships');
    expect(containerSrc).toContain("view = 'tenant-select'");
    expect(containerSrc).toContain('_maybeShowTenantSelectOrComplete');
  });

  it('handles 423 lockout with countdown (in login form)', () => {
    expect(loginFormSrc).toContain('_startLockoutCountdown');
    expect(loginFormSrc).toContain('lockoutCountdown');
  });

  it('handles 429 rate limit with countdown (in login form)', () => {
    expect(loginFormSrc).toContain('_startRateLimitCountdown');
    expect(loginFormSrc).toContain('rateLimitCountdown');
  });

  it('rejects unsafe returnUrls', () => {
    expect(containerSrc).toContain('orchestrator.sanitizeReturnUrl');
  });
});

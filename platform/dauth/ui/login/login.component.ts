/**
 * Legacy email/password + MFA login UI (dev / special flows).
 * Production `/login` is `AuthRedirectComponent` → Keycloak (`/api/auth/oidc/start`).
 * Post-auth orchestration here mirrors cookie-session paths after OIDC; keep error mapping aligned with `PostAuthOrchestratorService`.
 */
import { Component, inject, OnInit, ViewEncapsulation, ChangeDetectionStrategy, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { GrcAuthService } from '@app/core/services/grc-auth.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { DosLanguageSwitcherComponent } from '@dos/ui-system';
import { environment } from '@env/environment';
import { StorageService } from '@app/infrastructure';
import { GrcRecord } from '@app/core/models/shared.types';
import { PostAuthOrchestratorService } from '@app/dauth/session/post-auth-orchestrator.service';
import { Subject, takeUntil } from 'rxjs';

interface TenantMembership {
  tenantId: string;
  role: string;
  isPrimary: boolean;
  orgName: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DosLanguageSwitcherComponent],
  
  template: `
    <div class="auth-page" [class.rtl]="i18n.direction() === 'rtl'">
      <div class="auth-form-side">
        <div class="auth-form-container">
          <div class="auth-top-bar">
            <a routerLink="/" class="auth-back-home">
              <i class="pi pi-arrow-left"></i>
              {{ i18n.translate('auth.home') }}
            </a>
            <dos-language-switcher variant="light" />
          </div>

          <!-- ═══ VIEW: LOGIN FORM ═══ -->
          <ng-container *ngIf="view === 'login'">
            <h1 class="auth-title">{{ i18n.translate('auth.loginTitle') }}</h1>
            <p class="auth-subtitle">{{ i18n.translate('auth.loginSubtitle') }}</p>

            <form [formGroup]="loginForm" (ngSubmit)="onLogin()">
              <div class="auth-field">
                <label for="login-email"><i class="pi pi-envelope"></i> {{ i18n.translate('auth.email') }}</label>
                <input id="login-email" class="auth-input" type="email" formControlName="email"
                       [placeholder]="i18n.translate('auth.emailPlaceholder')" autocomplete="email"
                       [class.auth-input-error]="loginForm.get('email')!.invalid && loginForm.get('email')!.touched" [attr.aria-label]="i18n.translate('auth.emailPlaceholder')">
                <small class="auth-field-error" *ngIf="loginForm.get('email')!.touched && loginForm.get('email')!.hasError('required')">{{ i18n.translate('auth.emailRequired') || 'Email is required' }}</small>
                <small class="auth-field-error" *ngIf="loginForm.get('email')!.touched && loginForm.get('email')!.hasError('email')">{{ i18n.translate('auth.emailInvalid') || 'Enter a valid email' }}</small>
              </div>

              <div class="auth-field">
                <label for="login-password"><i class="pi pi-lock"></i> {{ i18n.translate('auth.password') }}</label>
                <div class="auth-password-wrapper">
                  <input id="login-password" class="auth-input" [type]="showPassword ? 'text' : 'password'"
                         formControlName="password" placeholder="••••••••"
                         autocomplete="current-password"
                         [class.auth-input-error]="loginForm.get('password')!.invalid && loginForm.get('password')!.touched"  [attr.aria-label]="i18n.translate('auth.password')" />
                  <button type="button" class="auth-toggle-pw" (click)="showPassword = !showPassword" aria-label="Toggle password visibility">
                    <i class="pi" [ngClass]="showPassword ? 'pi-eye-slash' : 'pi-eye'"></i>
                  </button>
                </div>
                <small class="auth-field-error" *ngIf="loginForm.get('password')!.touched && loginForm.get('password')!.hasError('required')">{{ i18n.translate('auth.passwordRequired') || 'Password is required' }}</small>
              </div>

              <div class="auth-form-options">
                <label class="auth-remember-me">
                  <input type="checkbox" formControlName="rememberMe" />
                  <span>{{ i18n.translate('auth.rememberMe') }}</span>
                </label>
                <a class="auth-forgot-link" (click)="switchToForgot()">{{ i18n.translate('auth.forgotPassword') }}</a>
              </div>

              <p class="auth-error" role="alert" *ngIf="error"><i class="pi pi-exclamation-triangle"></i> {{ error }}</p>

              <button class="auth-submit-btn" type="submit" [disabled]="loading || loginForm.invalid">
                <i class="pi pi-sign-in" *ngIf="!loading"></i>
                <i class="pi pi-spin pi-spinner" *ngIf="loading"></i>
                {{ loading ? i18n.translate('auth.signingIn') : i18n.translate('auth.signIn') }}
              </button>
            </form>

            <p class="auth-footer-link">
              {{ i18n.translate('auth.noAccount') }}
              <a routerLink="/register">{{ i18n.translate('auth.register') }}</a>
            </p>
          </ng-container>

          <!-- ═══ VIEW: MFA VERIFICATION ═══ -->
          <ng-container *ngIf="view === 'mfa'">
            <div class="mfa-icon-wrap">
              <i class="pi pi-shield mfa-shield-icon"></i>
            </div>
            <h1 class="auth-title">{{ i18n.translate('auth.mfaTitle') }}</h1>
            <p class="auth-subtitle">
              {{ mfaType === 'email' ? i18n.translate('auth.mfaEmailSent') : i18n.translate('auth.mfaTotpPrompt') }}
            </p>

            <form [formGroup]="mfaForm" (ngSubmit)="onVerifyMfa()">
              <div class="auth-field">
                <label for="mfa-code"><i class="pi pi-key"></i> {{ i18n.translate('auth.mfaCode') }}</label>
                <input id="mfa-code" class="auth-input mfa-code-input" type="text" formControlName="code"
                       [placeholder]="i18n.translate('auth.mfaCodePlaceholder')"
                       maxlength="6" pattern="[0-9]*" inputmode="numeric" autocomplete="one-time-code" [attr.aria-label]="i18n.translate('auth.mfaCodePlaceholder')">
              </div>

              <p class="auth-error" *ngIf="error"><i class="pi pi-exclamation-triangle"></i> {{ error }}</p>
              <p class="auth-success" *ngIf="mfaResent"><i class="pi pi-check-circle"></i> {{ i18n.translate('auth.mfaResent') }}</p>

              <button class="auth-submit-btn" type="submit" [disabled]="mfaLoading || mfaForm.invalid">
                <i class="pi pi-check-circle" *ngIf="!mfaLoading"></i>
                <i class="pi pi-spin pi-spinner" *ngIf="mfaLoading"></i>
                {{ mfaLoading ? i18n.translate('auth.mfaVerifying') : i18n.translate('auth.mfaVerify') }}
              </button>
            </form>

            <div class="mfa-actions">
              <button *ngIf="mfaType === 'email'" class="auth-text-btn" (click)="onResendMfaCode()" [disabled]="resending">
                <i class="pi pi-refresh"></i>
                {{ resending ? i18n.translate('auth.mfaResending') : i18n.translate('auth.mfaResend') }}
              </button>
              <button class="auth-text-btn" (click)="backToLogin()">
                <i class="pi pi-arrow-left"></i> {{ i18n.translate('auth.mfaBackToLogin') }}
              </button>
            </div>
          </ng-container>

          <!-- ═══ VIEW: FORGOT PASSWORD ═══ -->
          <ng-container *ngIf="view === 'forgot'">
            <h1 class="auth-title">{{ i18n.translate('auth.resetEmailTitle') }}</h1>
            <p class="auth-subtitle">{{ i18n.translate('auth.resetEmailSubtitle') }}</p>

            <div *ngIf="!forgotSent">
              <form [formGroup]="forgotForm" (ngSubmit)="onForgotPassword()">
                <div class="auth-field">
                  <label for="forgot-email"><i class="pi pi-envelope"></i> {{ i18n.translate('auth.email') }}</label>
                  <input id="forgot-email" class="auth-input" type="email" formControlName="email"
                         [placeholder]="i18n.translate('auth.emailPlaceholder')" autocomplete="email" [attr.aria-label]="i18n.translate('auth.emailPlaceholder')">
                </div>

                <p class="auth-error" *ngIf="error"><i class="pi pi-exclamation-triangle"></i> {{ error }}</p>

                <button class="auth-submit-btn" type="submit" [disabled]="forgotLoading || forgotForm.invalid">
                  <i class="pi pi-envelope" *ngIf="!forgotLoading"></i>
                  <i class="pi pi-spin pi-spinner" *ngIf="forgotLoading"></i>
                  {{ forgotLoading ? i18n.translate('auth.resetEmailSending') : i18n.translate('auth.resetEmailSend') }}
                </button>
              </form>
            </div>

            <div *ngIf="forgotSent" class="forgot-sent-box">
              <i class="pi pi-check-circle forgot-sent-icon"></i>
              <p class="forgot-sent-msg">{{ i18n.translate('auth.resetEmailSent') }}</p>
              <p class="forgot-sent-hint">{{ i18n.translate('auth.resetEmailCheck') }}</p>
            </div>

            <p class="auth-footer-link" style="margin-top:1.5rem">
              <a class="auth-text-btn" (click)="backToLogin()">
                <i class="pi pi-arrow-left"></i> {{ i18n.translate('auth.resetEmailBack') }}
              </a>
            </p>
          </ng-container>

        </div>
      </div>

      <div class="auth-brand-side">
        <div class="auth-brand-content">
          <a routerLink="/" class="auth-brand-logo-link">
            <div class="auth-brand-logo">
              <img src="logoiconapphero.png" alt="Shahin-AI governance platform logo" width="160" height="160" loading="eager" />
            </div>
          </a>
          <h2>{{ i18n.translate('app.title') }}</h2>
          <p class="auth-brand-tagline">{{ i18n.translate('app.tagline') }}</p>
          <p class="auth-brand-sub">{{ i18n.translate('app.subtitle') }}</p>
          <div class="auth-brand-features">
            <div class="auth-brand-feature"><i class="pi pi-shield"></i> <span>{{ i18n.translate('auth.featureEnterpriseSecurity') }}</span></div>
            <div class="auth-brand-feature"><i class="pi pi-chart-bar"></i> <span>{{ i18n.translate('auth.featureAiAnalytics') }}</span></div>
            <div class="auth-brand-feature"><i class="pi pi-check-circle"></i> <span>{{ i18n.translate('auth.feature60Frameworks') }}</span></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-brand-logo-link { text-decoration: none; display: block; }
    .auth-forgot-link { color: var(--primary); cursor: pointer; font-size: 0.875rem; text-decoration: none; }
    .auth-forgot-link:hover { text-decoration: underline; }
    .auth-form-options { display: flex; justify-content: space-between; align-items: center; }

    .mfa-icon-wrap { text-align: center; margin-bottom: 1rem; }
    .mfa-shield-icon { font-size: 48px; color: var(--primary); background: rgba(26,86,219,0.08); border-radius: var(--radius-pill); padding: 20px; }
    .mfa-code-input { font-size: 1.5rem; text-align: center; letter-spacing: 8px; font-family: monospace; }
    .mfa-actions { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; margin-top: 1.25rem; }

    .auth-text-btn {
      background: none; border: none; color: var(--primary); cursor: pointer;
      font-size: 0.875rem; display: inline-flex; align-items: center; gap: 0.4rem; padding: 0;
    }
    .auth-text-btn:hover { text-decoration: underline; }
    .auth-text-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .auth-success { color: var(--success, var(--success)); font-size: 0.875rem; display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.75rem; }

    .forgot-sent-box { text-align: center; padding: 1.5rem 0; }
    .forgot-sent-icon { font-size: 56px; color: var(--success, var(--success)); margin-bottom: 1rem; display: block; }
    .forgot-sent-msg { font-size: 1rem; color: var(--text-heading); margin-bottom: 0.5rem; font-weight: 500; }
    .forgot-sent-hint { font-size: 0.85rem; color: var(--text-muted); }
    .auth-field-error { color: var(--error, #da1e28); font-size: var(--font-size-xs); margin-top: 4px; display: block; }
    .auth-input-error { border-color: var(--error, #da1e28) !important; }
  `],
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  i18n = inject(I18nService);
  private kcAuth = inject(GrcAuthService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private _storage = inject(StorageService);
  private orchestrator = inject(PostAuthOrchestratorService);

  view: 'login' | 'mfa' | 'forgot' = 'login';
  error = '';
  loading = false;
  showPassword = false;

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    rememberMe: [false],
  });

  mfaForm = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  forgotForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  mfaUserId = '';
  mfaType = '';
  mfaLoading = false;
  mfaResent = false;
  resending = false;

  forgotLoading = false;
  forgotSent = false;

  ngOnInit(): void {
    if (this.kcAuth.isLoggedIn()) {
      if (this.kcAuth.isOnboardingComplete()) {
        this.router.navigate(['/workspace-home']);
      } else {
        this.router.navigate(['/onboarding']);
      }
      return;
    }
  }

  // ── Login ──
  onLogin(): void {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) return;
    this.loading = true;
    this.error = '';
    const { email, password } = this.loginForm.getRawValue();
    this.http.post<GrcRecord>(`${environment.apiUrl}/auth/login`, { email: email!, password: password! }).subscribe({
      next: (res) => {
        if (res.mustChangePassword) {
          this.loading = false;
          // Auth truth = httpOnly cookie set by /auth/login. Do NOT
          // persist `res.token` to localStorage; the SPA must remain
          // tokenless so all requests use withCredentials only.
          this.kcAuth.setMustChangePassword(true);
          this.router.navigate(['/change-password']);
          this.cdr.markForCheck();
          return;
        }
        if (res.mfaRequired) {
          this.loading = false;
          this.mfaUserId = res.userId as string;
          this.mfaType = (res.mfaType as string) || 'email';
          this.mfaForm.reset();
          this.error = '';
          this.view = 'mfa';
          this.cdr.markForCheck();
          return;
        }
        void this.runPostAuthAfterLogin(res);
      },
      error: (err) => {
        this.loading = false;
        this.cdr.markForCheck();
        if (((err as GrcRecord).status) === 429) {
          const retryAfterSec = ((err as GrcRecord).error)?.retryAfterMs
            ? Math.ceil(((err as GrcRecord).error).retryAfterMs / 1000)
            : (((err as GrcRecord).error)?.retryAfter || 60);
          const base = this.i18n.translate('auth.tooManyAttempts') || 'Too many failed attempts.';
          this.error = `${base} (${retryAfterSec}s)`;
        } else if (((err as GrcRecord).status) === 423) {
          this.error = this.i18n.translate('auth.accountLocked') || 'Account temporarily locked. Please try again later.';
        } else if (((err as GrcRecord).status) === 401) {
          this.error = this.i18n.translate('auth.invalidCredentials') || 'Invalid email or password.';
        } else {
          this.error = ((err as GrcRecord).error)?.error || this.i18n.translate('auth.loginFailed');
        }
      },
    });
  }

  // ── MFA Verify ──
  onVerifyMfa(): void {
    this.mfaForm.markAllAsTouched();
    if (this.mfaForm.invalid) return;
    this.mfaLoading = true;
    this.error = '';
    this.mfaResent = false;
    const code = this.mfaForm.getRawValue().code!;
    this.http.post<GrcRecord>(`${environment.apiUrl}/auth/mfa/login-verify`, { userId: this.mfaUserId, code: code.trim(), mfaType: this.mfaType }).subscribe({
      next: (res) => {
        void this.runPostAuthAfterMfa(res);
      },
      error: (err) => {
        this.mfaLoading = false;
        this.cdr.markForCheck();
        this.error = ((err as GrcRecord).error)?.error || this.i18n.translate('auth.mfaInvalid');
      },
    });
  }

  onResendMfaCode(): void {
    this.resending = true;
    this.mfaResent = false;
    this.error = '';
    const { email, password } = this.loginForm.getRawValue();
    this.http.post<GrcRecord>(`${environment.apiUrl}/auth/login`, { email: email!, password: password! }).subscribe({
      next: (res) => {
        this.resending = false;
        this.cdr.markForCheck();
        if (res.mfaRequired) {
          this.mfaResent = true;
          this.mfaForm.reset();
        }
      },
      error: () => { this.resending = false; this.cdr.markForCheck(); },
    });
  }

  // ── Forgot Password ──
  switchToForgot(): void {
    this.view = 'forgot';
    this.error = '';
    this.forgotSent = false;
    this.forgotForm.patchValue({ email: this.loginForm.getRawValue().email || '' });
  }

  onForgotPassword(): void {
    this.forgotForm.markAllAsTouched();
    if (this.forgotForm.invalid) return;
    this.forgotLoading = true;
    this.error = '';
    const forgotEmail = this.forgotForm.getRawValue().email!;
    this.http.post<any>(`${environment.apiUrl}/auth/forgot-password`, { email: forgotEmail.trim() }).subscribe({
      next: (res) => {
        this.forgotLoading = false;
        this.forgotSent = true;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.forgotLoading = false;
        this.cdr.markForCheck();
        const status = ((err as GrcRecord).status);
        if (status === 404) {
          this.error = this.i18n.translate('auth.resetEmailNotFound');
        } else if (status === 502) {
          this.error = this.i18n.translate('auth.resetEmailDeliveryFailed');
        } else {
          this.error = ((err as GrcRecord).error)?.error || this.i18n.translate('auth.resetEmailCheck');
        }
      },
    });
  }

  backToLogin(): void {
    this.view = 'login';
    this.error = '';
    this.mfaForm.reset();
    this.mfaResent = false;
    this.forgotSent = false;
  }

  /** Keeps `loading` true until session + workspace bootstrap finish (or fail). */
  private async runPostAuthAfterLogin(res: GrcRecord): Promise<void> {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    try {
      await this.invokePostAuthOrchestrator(res);
    } catch (e: unknown) {
      this.error = this.mapPostAuthError(e);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  /** Keeps `mfaLoading` true until post-MFA bootstrap finishes. */
  private async runPostAuthAfterMfa(res: GrcRecord): Promise<void> {
    this.mfaLoading = true;
    this.error = '';
    this.cdr.markForCheck();
    try {
      await this.invokePostAuthOrchestrator(res);
    } catch (e: unknown) {
      this.error = this.mapPostAuthError(e);
    } finally {
      this.mfaLoading = false;
      this.cdr.markForCheck();
    }
  }

  private async invokePostAuthOrchestrator(res: GrcRecord): Promise<void> {
    await this.orchestrator.completePostAuth({
      token: String(res.token ?? ''),
      refreshToken: typeof res.refreshToken === 'string' ? res.refreshToken : undefined,
      userId: String(res.userId ?? ''),
      tenantId: String(res.tenantId ?? ''),
      tenantCode: typeof res.tenantCode === 'string' ? res.tenantCode : undefined,
      role: typeof res.role === 'string' ? res.role : 'viewer',
      orgName: typeof res.orgName === 'string' ? res.orgName : undefined,
      orgNameAr: typeof res.orgNameAr === 'string' ? res.orgNameAr : undefined,
      userName: typeof res.userName === 'string' ? res.userName : undefined,
      sessionId: typeof res.sessionId === 'string' ? res.sessionId : null,
      onboardingComplete: res.onboardingComplete === true,
      emailVerificationRequired: res.emailVerificationRequired === true,
      isSuperAdmin: res.isSuperAdmin === true,
      memberOnboarded: res.memberOnboarded === true,
      enterpriseAuthz: res.enterpriseAuthz ?? null,
      sessionIdleTimeoutMinutes: typeof res.sessionIdleTimeoutMinutes === 'number' ? res.sessionIdleTimeoutMinutes : undefined,
      returnUrl: typeof res.returnUrl === 'string' ? res.returnUrl : null,
    });
  }

  private mapPostAuthError(e: unknown): string {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('Session bootstrap timed out')) {
      return this.i18n.translate('auth.sessionBootstrapTimeout');
    }
    if (msg.includes('Session bootstrap unavailable')) {
      return this.i18n.translate('auth.sessionBootstrapUnavailable');
    }
    if (msg.includes('Workspace bootstrap timed out')) {
      return this.i18n.translate('auth.workspaceBootstrapTimeout');
    }
    if (msg.includes('Both access-snapshot and legacy bootstrap failed')) {
      return this.i18n.translate('auth.workspaceBootstrapFailed');
    }
    return this.i18n.translate('auth.loginFailed');
  }
}

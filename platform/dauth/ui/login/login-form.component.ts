/**
 * LoginFormComponent — Handles email/password authentication with CAPTCHA support.
 *
 * Emits the raw login response for the container to route (MFA, tenant-select,
 * mustChangePassword, or direct orchestration).
 *
 * @owner DAuth
 * @since 2026-04-02  Step 4 decomposition
 */
import { Component, inject, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { I18nService } from '@app/infrastructure';
import { parseRetryAfterSeconds } from '@app/runtime/utils/retry-after.util';
import { environment } from '@env/environment';
import { GrcRecord } from '@app/core/models/shared.types';
import { Subject, Subscription, takeUntil, timer, map, takeWhile } from 'rxjs';

@Component({
    selector: 'app-login-form',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
    template: `
    <h1 class="auth-title">{{ i18n.translate('auth.loginTitle') }}</h1>
    <p class="auth-subtitle">{{ i18n.translate('auth.loginSubtitle') }}</p>

    <form [formGroup]="loginForm" (ngSubmit)="onLogin()">
      <div class="auth-field">
        <label for="login-email"><i class="pi pi-envelope"></i> {{ i18n.translate('auth.email') }}</label>
        <input id="login-email" class="auth-input" type="email" formControlName="email" autofocus
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
          <button type="button" class="auth-toggle-pw" (click)="showPassword = !showPassword" [attr.aria-label]="showPassword ? i18n.translate('auth.hidePassword') : i18n.translate('auth.showPassword')">
            <i class="pi" [ngClass]="showPassword ? 'pi-eye-slash' : 'pi-eye'"></i>
          </button>
        </div>
        <small class="auth-field-error" *ngIf="loginForm.get('password')!.touched && loginForm.get('password')!.hasError('required')">{{ i18n.translate('auth.passwordRequired') || 'Password is required' }}</small>
      </div>

      <div class="auth-form-options">
        <label class="auth-remember-label">
          <input type="checkbox" formControlName="rememberMe" class="auth-remember-checkbox" />
          {{ i18n.translate('auth.rememberMe') }}
        </label>
        <button type="button" class="auth-forgot-link" (click)="forgotClicked.emit()">{{ i18n.translate('auth.forgotPassword') }}</button>
      </div>

      <div class="auth-captcha-wrap" *ngIf="requireCaptcha">
        <div class="auth-captcha-row">
          <div class="auth-captcha-svg"><img [src]="captchaSrc" [attr.alt]="i18n.translate('auth.captchaLabel')" *ngIf="captchaSrc" /></div>
          <button type="button" class="auth-text-btn auth-captcha-refresh" (click)="refreshCaptcha()" [disabled]="captchaLoading" [attr.aria-label]="i18n.translate('auth.captchaRefresh')">
            <i class="pi" [ngClass]="captchaLoading ? 'pi-spin pi-spinner' : 'pi-refresh'"></i>
          </button>
        </div>
        <input class="auth-input auth-captcha-input" type="text" [(ngModel)]="captchaCode" [ngModelOptions]="{standalone: true}"
               [placeholder]="i18n.translate('auth.captchaPlaceholder')" autocomplete="off" maxlength="10" [attr.aria-label]="i18n.translate('auth.captchaLabel')" />
      </div>

      <p class="auth-error" role="alert" *ngIf="error"><i class="pi pi-exclamation-triangle"></i> {{ error }}</p>

      <button class="auth-submit-btn" type="submit" [disabled]="loading || submitCooldown || loginForm.invalid || (requireCaptcha && !captchaCode)">
        <i class="pi pi-sign-in" *ngIf="!loading"></i>
        <i class="pi pi-spin pi-spinner" *ngIf="loading"></i>
        {{ loading ? i18n.translate('auth.signingIn') : i18n.translate('auth.signIn') }}
      </button>
    </form>

    <p class="auth-footer-link">
      {{ i18n.translate('auth.noAccount') }}
      <a routerLink="/register">{{ i18n.translate('auth.register') }}</a>
    </p>
  `,
    styles: [`
    .auth-forgot-link { color: var(--primary); cursor: pointer; font-size: var(--font-size-base); text-decoration: none; margin-inline-start: auto; background: none; border: none; padding: 0; font-family: inherit; }
    .auth-forgot-link:hover { text-decoration: underline; }
    .auth-text-btn {
      background: none; border: none; color: var(--primary); cursor: pointer;
      font-size: var(--font-size-base); display: inline-flex; align-items: center; gap: 0.4rem; padding: 0;
    }
    .auth-text-btn:hover { text-decoration: underline; }
    .auth-text-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .auth-field-error { color: var(--error, #da1e28); font-size: var(--font-size-xs); margin-top: 4px; display: block; }
    .auth-input-error { border-color: var(--error, #da1e28) !important; }
    .auth-remember-label { display: inline-flex; align-items: center; gap: 0.4rem; font-size: var(--font-size-base); color: var(--text-secondary); cursor: pointer; }
    .auth-remember-checkbox { width: 1rem; height: 1rem; accent-color: var(--primary); cursor: pointer; }
    .auth-captcha-wrap { margin-bottom: 1rem; }
    .auth-captcha-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
    .auth-captcha-svg { flex: 1; border: 1px solid var(--border-color, #e0e0e0); border-radius: var(--radius-md, 6px); overflow: hidden; background: var(--bg-1, #f0f0f0); line-height: 0; }
    .auth-captcha-svg img { width: 100%; height: auto; display: block; }
    .auth-captcha-refresh { flex-shrink: 0; font-size: var(--font-size-body-md); }
    .auth-captcha-input { letter-spacing: 3px; font-family: monospace; }
  `]
})
export class LoginFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);

  /** Initial error message (e.g. from logout reason). */
  @Input() initialError = '';

  /** Emitted with the raw login response for the container to route. */
  @Output() loginResult = new EventEmitter<GrcRecord>();
  /** Emitted when user clicks "Forgot password?". */
  @Output() forgotClicked = new EventEmitter<void>();

  error = '';
  loading = false;
  showPassword = false;

  requireCaptcha = false;
  captchaId = '';
  captchaSrc: SafeUrl | '' = '';
  captchaCode = '';
  captchaLoading = false;

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    rememberMe: [false],
  });

  // H3: client-side login throttle
  private _failedAttempts = 0;
  submitCooldown = false;
  private _cooldownTimer: ReturnType<typeof setTimeout> | null = null;

  lockoutCountdown = 0;
  private _lockoutSub?: Subscription;
  rateLimitCountdown = 0;
  private _rateLimitSub?: Subscription;

  private destroy$ = new Subject<void>();

  /** Expose current rememberMe value so the container can pass it to MFA. */
  get rememberMe(): boolean { return this.loginForm.getRawValue().rememberMe ?? false; }

  /** Expose current email so the container can pre-fill forgot-password. */
  get email(): string { return this.loginForm.getRawValue().email ?? ''; }

  ngOnInit(): void {
    if (this.initialError) {
      this.error = this.initialError;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this._lockoutSub?.unsubscribe();
    this._rateLimitSub?.unsubscribe();
    if (this._cooldownTimer) { clearTimeout(this._cooldownTimer); this._cooldownTimer = null; }
  }

  // ── CAPTCHA ──

  loadCaptcha(): void {
    this.captchaLoading = true;
    this.captchaCode = '';
    this.http.get<{ captchaId: string; svg: string }>(`${environment.apiUrl}/auth/captcha`).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.captchaId = res.captchaId;
        const encoded = btoa(unescape(encodeURIComponent(res.svg)));
        this.captchaSrc = this.sanitizer.bypassSecurityTrustUrl(`data:image/svg+xml;base64,${encoded}`);
        this.captchaLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.captchaLoading = false; this.cdr.markForCheck(); },
    });
  }

  refreshCaptcha(): void { this.loadCaptcha(); }

  private _activateCaptcha(): void {
    if (!this.requireCaptcha) {
      this.requireCaptcha = true;
    }
    this.loadCaptcha();
  }

  // ── Login ──

  onLogin(): void {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) return;
    this.loading = true;
    this.error = '';
    const { email, password, rememberMe } = this.loginForm.getRawValue();
    const body: Record<string, unknown> = { email: email!.trim(), password: password!, rememberMe: rememberMe ?? false };
    if (this.requireCaptcha && this.captchaId) {
      body['captchaId'] = this.captchaId;
      body['captchaCode'] = this.captchaCode;
    }
    this.http.post<GrcRecord>(`${environment.apiUrl}/auth/login`, body).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.loading = false;
        this._failedAttempts = 0;
        this.cdr.markForCheck();
        this.loginResult.emit(res);
      },
      error: (err) => {
        this.loading = false;
        this._failedAttempts++;
        const errBody = (err as GrcRecord).error as GrcRecord | undefined;
        if (errBody?.requireCaptcha) {
          this._activateCaptcha();
        }
        // H3: exponential cooldown after failed attempts (1s, 2s, 3s, 4s, 5s max)
        this.submitCooldown = true;
        if (this._cooldownTimer) clearTimeout(this._cooldownTimer);
        this._cooldownTimer = setTimeout(() => {
          this.submitCooldown = false;
          this.cdr.markForCheck();
        }, Math.min(1000 * Math.pow(2, this._failedAttempts - 1), 30000));
        this.cdr.markForCheck();
        if (((err as GrcRecord).status) === 429) {
          const retryMs = parseRetryAfterSeconds(err as HttpErrorResponse) * 1000;
          if (retryMs > 0) {
            this._startRateLimitCountdown(retryMs);
          } else {
            this.error = this.i18n.translate('auth.tooManyAttempts') || 'Too many failed attempts.';
          }
        } else if (((err as GrcRecord).status) === 423) {
          const lockoutMs = parseRetryAfterSeconds(err as HttpErrorResponse) * 1000;
          if (lockoutMs > 0) {
            this._startLockoutCountdown(lockoutMs);
          } else {
            this.error = this.i18n.translate('auth.accountLocked') || 'Account temporarily locked. Please try again later.';
          }
        } else if (((err as GrcRecord).status) === 401) {
          this.error = this.i18n.translate('auth.invalidCredentials') || 'Invalid email or password. Please check your credentials and try again.';
        } else if (((err as GrcRecord).status) === 400 && errBody?.requireCaptcha) {
          this.error = this.i18n.translate('auth.captchaRequired') || 'CAPTCHA verification required.';
        } else if (((err as GrcRecord).status) === 403) {
          console.warn('[LoginForm] 403 error:', errBody?.error);
          this.error = this.i18n.translate('auth.accountSuspended') || 'Account suspended. Contact your administrator.';
        } else {
          console.warn('[LoginForm] Auth error:', errBody?.error);
          this.error = this.i18n.translate('auth.loginFailed') || 'Login failed. Please try again.';
        }
      },
    });
  }

  // ── Countdown timers ──

  private _startLockoutCountdown(ms: number): void {
    this._lockoutSub?.unsubscribe();
    const totalSec = Math.ceil(ms / 1000);
    const base = this.i18n.translate('auth.accountLocked') || 'Account temporarily locked.';
    this._lockoutSub = timer(0, 1000).pipe(
      map(tick => totalSec - tick),
      takeWhile(remaining => remaining >= 0),
      takeUntil(this.destroy$),
    ).subscribe(remaining => {
      this.lockoutCountdown = remaining;
      this.error = remaining > 0 ? `${base} (${remaining}s)` : '';
      this.cdr.markForCheck();
    });
  }

  private _startRateLimitCountdown(ms: number): void {
    this._rateLimitSub?.unsubscribe();
    const totalSec = Math.ceil(ms / 1000);
    const base = this.i18n.translate('auth.tooManyAttempts') || 'Too many failed attempts.';
    this._rateLimitSub = timer(0, 1000).pipe(
      map(tick => totalSec - tick),
      takeWhile(remaining => remaining >= 0),
      takeUntil(this.destroy$),
    ).subscribe(remaining => {
      this.rateLimitCountdown = remaining;
      this.error = remaining > 0 ? `${base} (${remaining}s)` : '';
      this.cdr.markForCheck();
    });
  }
}

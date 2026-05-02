import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { DosLanguageSwitcherComponent } from '@dos/ui-system';
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_RE } from '@app/dauth/access/password-policy';
import { environment } from '@env/environment';
import { Subject, takeUntil } from 'rxjs';
import { StorageService } from '@app/infrastructure';
import { WebSocketService } from '@app/websocket';

interface RegisterResponse {
  registrationId: string;
  userId: string;
  tenantId: string;
  status: 'email_pending';
  nextAction: 'verify_email';
  requiresEmailVerification: boolean;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-register',
    imports: [CommonModule, ReactiveFormsModule, RouterLink, DosLanguageSwitcherComponent],
    styleUrls: ['../../auth-form.styles.css'],
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

          <h1 class="auth-title">{{ i18n.translate('auth.registerTitle') }}</h1>
          <p class="auth-subtitle">{{ i18n.translate('auth.registerSubtitle') }}</p>

          <form [formGroup]="registerForm" (ngSubmit)="onRegister()">
            <div class="auth-field">
              <label for="reg-name"><i class="pi pi-user"></i> {{ i18n.translate('auth.fullName') }}</label>
              <input id="reg-name" class="auth-input" type="text" formControlName="userName" autofocus
                     [placeholder]="i18n.translate('auth.fullNamePlaceholder')"
                     autocomplete="name"
                     [class.auth-input-error]="registerForm.get('userName')!.invalid && registerForm.get('userName')!.touched"
                     [attr.aria-label]="i18n.translate('auth.fullName')">
              <small class="auth-field-error" *ngIf="registerForm.get('userName')!.touched && registerForm.get('userName')!.hasError('required')">{{ i18n.translate('auth.nameRequired') || 'Full name is required' }}</small>
              <small class="auth-field-error" *ngIf="registerForm.get('userName')!.touched && registerForm.get('userName')!.hasError('minlength')">{{ i18n.translate('auth.nameMinLength') || 'Name must be at least 2 characters' }}</small>
            </div>

            <div class="auth-field">
              <label for="reg-org"><i class="pi pi-building"></i> {{ i18n.translate('auth.orgName') || 'Organisation Name' }}</label>
              <input id="reg-org" class="auth-input" type="text" formControlName="companyNameEn"
                     [placeholder]="i18n.translate('auth.orgNamePlaceholder') || 'Enter your organisation name'"
                     autocomplete="organization"
                     [class.auth-input-error]="registerForm.get('companyNameEn')!.invalid && registerForm.get('companyNameEn')!.touched"
                     [attr.aria-label]="i18n.translate('auth.orgName')">
              <small class="auth-field-error" *ngIf="registerForm.get('companyNameEn')!.touched && registerForm.get('companyNameEn')!.hasError('required')">{{ i18n.translate('auth.orgNameRequired') || 'Organisation name is required' }}</small>
              <small class="auth-field-error" *ngIf="registerForm.get('companyNameEn')!.touched && registerForm.get('companyNameEn')!.hasError('minlength')">{{ i18n.translate('auth.orgNameMinLength') || 'Organisation name must be at least 2 characters' }}</small>
            </div>

            <div class="auth-field">
              <label for="reg-email"><i class="pi pi-envelope"></i> {{ i18n.translate('auth.email') }}</label>
              <input id="reg-email" class="auth-input" type="email" formControlName="email"
                     [placeholder]="i18n.translate('auth.emailPlaceholder')"
                     autocomplete="email"
                     [class.auth-input-error]="registerForm.get('email')!.invalid && registerForm.get('email')!.touched"
                     [attr.aria-label]="i18n.translate('auth.emailPlaceholder')">
              <small class="auth-field-error" *ngIf="registerForm.get('email')!.touched && registerForm.get('email')!.hasError('required')">{{ i18n.translate('auth.emailRequired') || 'Email is required' }}</small>
              <small class="auth-field-error" *ngIf="registerForm.get('email')!.touched && registerForm.get('email')!.hasError('email')">{{ i18n.translate('auth.emailInvalid') || 'Enter a valid email' }}</small>
            </div>

            <div class="auth-field">
              <label for="reg-password"><i class="pi pi-lock"></i> {{ i18n.translate('auth.password') }}</label>
              <div class="auth-password-wrapper">
                <input id="reg-password" class="auth-input" [type]="showPassword ? 'text' : 'password'"
                       formControlName="password" placeholder="••••••••"
                       autocomplete="new-password"
                       [class.auth-input-error]="registerForm.get('password')!.invalid && registerForm.get('password')!.touched"
                       [attr.aria-label]="i18n.translate('auth.password')" />
                <button type="button" class="auth-toggle-pw" (click)="showPassword = !showPassword"
                        [attr.aria-label]="showPassword ? i18n.translate('auth.hidePassword') : i18n.translate('auth.showPassword')">
                  <i class="pi" [ngClass]="showPassword ? 'pi-eye-slash' : 'pi-eye'"></i>
                </button>
              </div>
              <small class="auth-field-error" *ngIf="registerForm.get('password')!.touched && registerForm.get('password')!.hasError('required')">{{ i18n.translate('auth.passwordRequired') || 'Password is required' }}</small>
              <small class="auth-field-error" *ngIf="registerForm.get('password')!.touched && !registerForm.get('password')!.hasError('required') && registerForm.get('password')!.hasError('minlength')">{{ i18n.translate('auth.passwordMinLength') || 'Password must be at least 8 characters' }}</small>
              <small class="auth-field-error" *ngIf="registerForm.get('password')!.touched && !registerForm.get('password')!.hasError('required') && !registerForm.get('password')!.hasError('minlength') && registerForm.get('password')!.hasError('pattern')">{{ i18n.translate('auth.passwordPolicy') || 'Must include uppercase, lowercase, digit, and special character' }}</small>
              <div class="auth-pw-strength" *ngIf="registerForm.get('password')!.value">
                <div class="auth-pw-bar">
                  <div class="auth-pw-fill"
                    [style.width.%]="passwordStrength * 20"
                    [class.weak]="passwordStrength <= 2"
                    [class.fair]="passwordStrength === 3"
                    [class.good]="passwordStrength === 4"
                    [class.strong]="passwordStrength === 5"></div>
                </div>
              </div>
            </div>

            <div class="auth-form-options">
              <label class="auth-remember-label">
                <input type="checkbox" formControlName="consent" class="auth-remember-checkbox" />
                {{ i18n.translate('auth.consentLabel') }}
              </label>
            </div>

            <p class="auth-error" role="alert" *ngIf="error"><i class="pi pi-exclamation-triangle"></i> {{ error }}</p>

            <button class="auth-submit-btn" type="submit" [disabled]="loading || registerForm.invalid">
              <i class="pi pi-user-plus" *ngIf="!loading"></i>
              <i class="pi pi-spin pi-spinner" *ngIf="loading"></i>
              {{ loading ? i18n.translate('auth.registering') : i18n.translate('auth.register') }}
            </button>
          </form>

          <p class="auth-footer-link">
            {{ i18n.translate('auth.hasAccount') }}
            <a routerLink="/login">{{ i18n.translate('auth.signIn') }}</a>
          </p>
        </div>
      </div>

      <div class="auth-brand-side">
        <div class="auth-brand-content">
          <a routerLink="/" class="auth-brand-logo-link">
            <div class="auth-brand-logo">
              <img src="logoiconapphero.png" [attr.alt]="i18n.translate('auth.logoAlt')" width="160" height="160" loading="eager" />
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
    .auth-field-error { color: var(--error, #da1e28); font-size: var(--font-size-xs); margin-top: 4px; display: block; }
    .auth-input-error { border-color: var(--error, #da1e28) !important; }
    .auth-remember-label { display: inline-flex; align-items: center; gap: 0.4rem; font-size: var(--font-size-base); color: var(--text-secondary); cursor: pointer; }
    .auth-remember-checkbox { width: 1rem; height: 1rem; accent-color: var(--primary); cursor: pointer; }
  `]
})
export class RegisterComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  i18n = inject(I18nService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private storage = inject(StorageService);
  private ws = inject(WebSocketService);

  error = '';
  loading = false;
  showPassword = false;
  passwordStrength = 0;

  registerForm = this.fb.group({
    userName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    companyNameEn: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH), Validators.maxLength(PASSWORD_MAX_LENGTH), Validators.pattern(PASSWORD_RE)]],
    consent: [false, [Validators.requiredTrue]],
  });

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Registration is a public entry; clear stale auth artifacts from previous sessions.
    this.ws.disconnect();
    this.storage.remove('grc_token');
    this.storage.remove('grc_refreshToken');
    this.storage.remove('grc_role');
    this.storage.remove('grc_tenantId');

    this.registerForm.get('password')!.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(v => {
      this.passwordStrength = this.calcStrength(v || '');
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onRegister(): void {
    if (this.loading) return;
    this.registerForm.markAllAsTouched();
    if (this.registerForm.invalid) return;
    this.loading = true;
    this.error = '';

    const { userName, companyNameEn, email, password, consent } = this.registerForm.getRawValue();

    this.http.post<RegisterResponse>(`${environment.apiUrl}/public/onboarding/register`, {
      companyNameEn: companyNameEn!.trim(),
      email: email!.trim(),
      password: password!,
      userName: userName!.trim(),
      consent,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.loading = false;
        this.cdr.markForCheck();
        const emailParam = encodeURIComponent(email!.trim());
        const registrationParam = encodeURIComponent(res.registrationId);
        this.router.navigateByUrl(`/email-verification-pending?email=${emailParam}&registrationId=${registrationParam}`);
      },
      error: (err) => {
        this.loading = false;
        this.cdr.markForCheck();
        const body = err?.error;
        const resolveMessage = (messageKey?: string, fallbackKey?: string, fallbackText?: string): string => {
          if (messageKey) {
            const resolved = this.i18n.translate(messageKey);
            if (resolved && resolved !== messageKey) return resolved;
          }
          if (fallbackKey) {
            const resolved = this.i18n.translate(fallbackKey);
            if (resolved && resolved !== fallbackKey) return resolved;
          }
          return fallbackText || 'An unexpected error occurred. Please try again.';
        };
        if (err.status === 409) {
          if (body?.code === 'ORG_DOMAIN_EXISTS') {
            this.error = body?.hint
              || resolveMessage(body?.messageKey, 'auth.orgDomainExists', 'An organization with this email domain already exists.');
          } else {
            this.error = resolveMessage(body?.messageKey, 'auth.emailTaken', 'Email already registered');
          }
        } else if (err.status === 429) {
          this.error = resolveMessage(undefined, 'auth.tooManyAttempts', 'Too many attempts. Please try again later.');
        } else if (err.status === 400) {
          this.error = resolveMessage(body?.messageKey, 'auth.validationError', body?.error || 'Please check your input and try again.');
        } else if (err.status === 504) {
          this.error = resolveMessage(undefined, 'auth.gatewayTimeout', 'Registration is taking longer than expected. We are processing your request. Please check your email in a few minutes or try logging in.'); 
        } else {
          this.error = resolveMessage(body?.messageKey, 'auth.registerFailed', 'Registration failed. Please try again.');
        }
      },
    });
  }

  private calcStrength(p: string): number {
    let score = 0;
    if (p.length >= 8) score++;
    if (/[a-z]/.test(p)) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(p)) score++;
    return score;
  }
}

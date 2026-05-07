import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { environment } from '@env/environment';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-reset-password',
    imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, PasswordModule],
    template: `
    <div class="reset-page">
      <div class="auth-top-bar">
        <a routerLink="/">{{ i18n.translate('resetPassword.home') }}</a>
        <select class="auth-lang-dropdown" [value]="i18n.currentLang()" (change)="i18n.switchLanguage(($event.target as HTMLSelectElement).value)">
          <option value="en">EN</option>
          <option value="ar">عربي</option>
        </select>
      </div>
      <div class="reset-container">
        <img loading="eager" src="logoiconapphero.png" alt="Shahin GRC" width="48" height="48" style="border-radius:var(--radius-lg); margin-bottom:16px" />
        <h2>{{ i18n.translate('resetPassword.title') }}</h2>

        <div *ngIf="!success && token">
          <form [formGroup]="resetForm" (ngSubmit)="onSubmit()">
            <div class="auth-field" style="margin-bottom:1rem">
              <label for="reset-pw" class="sr-only">{{ i18n.translate('resetPassword.newPasswordPlaceholder') }}</label>
              <input id="reset-pw" pInputText type="password" formControlName="newPassword"
                     [placeholder]="i18n.translate('resetPassword.newPasswordPlaceholder')" style="width:100%"
                     [class.auth-input-error]="resetForm.get('newPassword')!.invalid && resetForm.get('newPassword')!.touched" [attr.aria-label]="i18n.translate('resetPassword.newPasswordPlaceholder')">
              <small class="auth-field-error" *ngIf="resetForm.get('newPassword')!.touched && resetForm.get('newPassword')!.hasError('required')">{{ i18n.translate('auth.passwordRequired') || 'Password is required' }}</small>
              <small class="auth-field-error" *ngIf="resetForm.get('newPassword')!.touched && resetForm.get('newPassword')!.hasError('minlength')">{{ i18n.translate('resetPassword.errorMinLength') || 'Min 8 characters' }}</small>
              <small class="auth-field-error" *ngIf="resetForm.get('newPassword')!.touched && resetForm.get('newPassword')!.hasError('pattern')">{{ i18n.translate('resetPassword.errorComplexity') || 'Must include upper, lower, digit, and special character' }}</small>
            </div>
            <div class="auth-field" style="margin-bottom:1rem">
              <label for="reset-confirm" class="sr-only">{{ i18n.translate('resetPassword.confirmPasswordPlaceholder') }}</label>
              <input id="reset-confirm" pInputText type="password" formControlName="confirmPassword"
                     [placeholder]="i18n.translate('resetPassword.confirmPasswordPlaceholder')" style="width:100%"
                     [class.auth-input-error]="resetForm.get('confirmPassword')!.invalid && resetForm.get('confirmPassword')!.touched" [attr.aria-label]="i18n.translate('resetPassword.confirmPasswordPlaceholder')">
              <small class="auth-field-error" *ngIf="resetForm.get('confirmPassword')!.touched && resetForm.hasError('mismatch')">{{ i18n.translate('resetPassword.errorMismatch') || 'Passwords do not match' }}</small>
            </div>
            <p *ngIf="error" style="color:var(--error);font-size:0.875rem" role="alert">{{ error }}</p>
            <p-button type="submit" [label]="i18n.translate('resetPassword.resetButton')" icon="pi pi-lock" [loading]="loading" [style]="{width:'100%'}" [disabled]="resetForm.invalid" />
          </form>
        </div>

        <div *ngIf="!token" style="text-align:center">
          <i class="pi pi-times-circle" style="font-size:48px;color:var(--error)"></i>
          <p>{{ i18n.translate('resetPassword.invalidLink') }}</p>
          <p-button [label]="i18n.translate('resetPassword.requestNewLink')" icon="pi pi-envelope" (onClick)="router.navigate(['/forgot-password'])" />
        </div>

        <div *ngIf="success" style="text-align:center">
          <i class="pi pi-check-circle" style="font-size:48px;color:var(--success)"></i>
          <h3>{{ i18n.translate('resetPassword.successTitle') }}</h3>
          <p>{{ i18n.translate('resetPassword.successMessage') }}</p>
          <p-button [label]="i18n.translate('resetPassword.goToLogin')" icon="pi pi-sign-in" (onClick)="router.navigate(['/login'])" />
        </div>
      </div>
    </div>
  `,
    styles: [`
    .reset-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--surface-sunken); position: relative; }
    .auth-top-bar { position: absolute; top: 1rem; right: 1rem; display: flex; align-items: center; gap: 1rem; }
    .auth-top-bar a { color: var(--text-muted); text-decoration: none; font-size: var(--font-size-body-sm); }
    .auth-top-bar a:hover { color: var(--primary); }
    .auth-lang-dropdown { padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); font-size: var(--font-size-base); }
    .reset-container { max-width: 420px; width: 100%; padding: 2rem; background: var(--surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); text-align: center; }
    h2 { margin: 0.5rem 0 1rem; color: var(--text-heading); }
    h3 { margin: 1rem 0 0.5rem; color: var(--text-heading); }
    p { color: var(--text-muted); margin-bottom: 1rem; }
    .auth-field-error { color: var(--error); font-size: var(--font-size-sm); display: block; margin-top: 4px; text-align: start; }
    .auth-input-error { border-color: var(--error) !important; }
  `]
})
export class ResetPasswordComponent implements OnInit {
  readonly router = inject(Router);
  readonly i18n = inject(I18nService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  token = '';
  loading = false;
  success = false;
  error = '';

  resetForm = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: [this.matchValidator] });

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParams['token'] || '';
    if (this.token) {
      try { window.history.replaceState({}, document.title, window.location.pathname); } catch { /* SSR safety */ }
    }
  }

  private matchValidator(group: AbstractControl): ValidationErrors | null {
    const pw = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return pw && confirm && pw !== confirm ? { mismatch: true } : null;
  }

  onSubmit(): void {
    this.resetForm.markAllAsTouched();
    if (this.resetForm.invalid) return;

    this.error = '';
    this.loading = true;
    const { newPassword } = this.resetForm.getRawValue();
    this.http.post(`${environment.apiUrl}/auth/reset-password`, { token: this.token, newPassword }).subscribe({
      next: () => { this.loading = false; this.cdr.markForCheck(); this.success = true; },
      error: (err) => {
        this.loading = false; this.cdr.markForCheck();
        const errorBody = (err as GrcRecord)?.['error'];
        const errorRecord = errorBody && typeof errorBody === 'object' ? (errorBody as GrcRecord) : null;
        this.error = (typeof errorRecord?.['error'] === 'string' ? errorRecord['error'] : '') || 'Reset failed. Token may be expired.';
      },
    });
  }
}

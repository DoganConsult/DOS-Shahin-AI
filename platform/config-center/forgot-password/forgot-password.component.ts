import { Component, inject, ChangeDetectionStrategy, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { environment } from '@env/environment';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-forgot-password',
    imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule],
    template: `
    <div class="forgot-page">
      <div class="auth-top-bar">
        <a routerLink="/">{{ i18n.translate('forgotPassword.home') }}</a>
        <select class="auth-lang-dropdown" [value]="i18n.currentLang()" (change)="i18n.switchLanguage($any($event.target).value)">
          <option value="en">EN</option>
          <option value="ar">عربي</option>
        </select>
      </div>
      <div class="forgot-container">
        <img loading="eager" src="logoiconapphero.png" alt="Shahin GRC" width="48" height="48" style="border-radius:var(--radius-lg); margin-bottom:16px" />
        <h2>{{ i18n.translate('forgotPassword.title') }}</h2>

        <div *ngIf="!sent">
          <p>{{ i18n.translate('forgotPassword.instructions') }}</p>
          <form [formGroup]="forgotForm" (ngSubmit)="onSubmit()">
            <div class="auth-field" style="margin-bottom:1rem">
              <label for="forgot-email" class="sr-only">{{ i18n.translate('forgotPassword.emailPlaceholder') }}</label>
              <input id="forgot-email" pInputText type="email" formControlName="email"
                     [placeholder]="i18n.translate('forgotPassword.emailPlaceholder')" style="width:100%"
                     [class.auth-input-error]="forgotForm.get('email')!.invalid && forgotForm.get('email')!.touched" [attr.aria-label]="i18n.translate('forgotPassword.emailPlaceholder')">
              <small class="auth-field-error" *ngIf="forgotForm.get('email')!.touched && forgotForm.get('email')!.hasError('required')">{{ i18n.translate('auth.emailRequired') || 'Email is required' }}</small>
              <small class="auth-field-error" *ngIf="forgotForm.get('email')!.touched && forgotForm.get('email')!.hasError('email')">{{ i18n.translate('auth.emailInvalid') || 'Enter a valid email' }}</small>
            </div>
            <p *ngIf="error" style="color:var(--error);font-size:0.875rem" role="alert">{{ error }}</p>
            <p-button [label]="i18n.translate('forgotPassword.sendResetLink')" icon="pi pi-envelope" [loading]="loading" (onClick)="onSubmit()" [style]="{width:'100%'}" [disabled]="forgotForm.invalid" />
          </form>
        </div>

        <div *ngIf="sent" style="text-align:center">
          <i class="pi pi-check-circle" style="font-size:48px;color:var(--success)"></i>
          <p>{{ i18n.translate('forgotPassword.sentMessage') }}</p>
          <p-button [label]="i18n.translate('forgotPassword.backToLogin')" icon="pi pi-arrow-left" (onClick)="router.navigate(['/login'])" />
        </div>
      </div>
    </div>
  `,
    styles: [`
    .forgot-page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--surface-sunken); position: relative; }
    .auth-top-bar { position: absolute; top: 1rem; right: 1rem; display: flex; align-items: center; gap: 1rem; }
    .auth-top-bar a { color: var(--text-muted); text-decoration: none; font-size: var(--font-size-body-sm); }
    .auth-top-bar a:hover { color: var(--primary); }
    .auth-lang-dropdown { padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); font-size: var(--font-size-base); }
    .forgot-container { max-width: 420px; width: 100%; padding: 2rem; background: var(--surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); text-align: center; }
    h2 { margin: 0.5rem 0 1rem; color: var(--text-heading); }
    p { color: var(--text-muted); margin-bottom: 1rem; }
    .auth-field-error { color: var(--error); font-size: var(--font-size-sm); display: block; margin-top: 4px; text-align: start; }
    .auth-input-error { border-color: var(--error) !important; }
  `]
})
export class ForgotPasswordComponent {
  readonly router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  readonly i18n = inject(I18nService);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  forgotForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  loading = false;
  sent = false;
  error = '';

  onSubmit(): void {
    this.forgotForm.markAllAsTouched();
    if (this.forgotForm.invalid) return;

    this.loading = true;
    this.error = '';
    const email = this.forgotForm.getRawValue().email!.trim();
    this.http.post(`${environment.apiUrl}/auth/forgot-password`, { email }).subscribe({
      next: () => { this.loading = false; this.sent = true; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.sent = true; this.cdr.markForCheck(); },
    });
  }
}

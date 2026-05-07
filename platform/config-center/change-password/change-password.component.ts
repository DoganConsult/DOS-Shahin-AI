/**
 * ChangePasswordComponent
 *
 * Handles forced password change for invited users on their first login.
 * Also available for regular users who want to change their password.
 *
 * When accessed with ?forced=true, the user cannot navigate away until
 * they successfully change their password.
 */

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { environment } from '@env/environment';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { GrcAuthService } from '@app/core/services/grc-auth.service';
import { SessionService } from '../../dauth/session/session.service';
import { StorageService } from '@app/infrastructure';
import { BootstrapStore } from '@app/core/services/platform/bootstrap.store';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonModule, InputTextModule, PasswordModule],
  template: `
    <div class="change-pw-page">
      <div class="auth-top-bar">
        <a *ngIf="!isForced" routerLink="/">{{ i18n.translate('changePassword.home') || 'Home' }}</a>
        <select class="auth-lang-dropdown" [value]="i18n.currentLang()" (change)="i18n.switchLanguage(($event.target as HTMLSelectElement).value)">
          <option value="en">EN</option>
          <option value="ar">عربي</option>
        </select>
      </div>
      <div class="change-pw-container">
        <img loading="eager" src="logoiconapphero.png" alt="Shahin GRC" width="48" height="48" style="border-radius:12px; margin-bottom:16px" />
        <h2>{{ isForced ? (i18n.translate('changePassword.forcedTitle') || 'Change Your Password') : (i18n.translate('changePassword.title') || 'Change Password') }}</h2>

        <p *ngIf="isForced" class="forced-notice">
          {{ i18n.translate('changePassword.forcedNotice') || 'You must change your temporary password before continuing.' }}
        </p>

        <div *ngIf="!success">
          <div style="margin-bottom:1rem">
            <label class="field-label">{{ i18n.translate('changePassword.currentPassword') || 'Current Password' }}</label>
            <input pInputText type="password" [(ngModel)]="currentPassword"
                   [placeholder]="isForced ? (i18n.translate('changePassword.tempPasswordPlaceholder') || 'Enter your temporary password') : (i18n.translate('changePassword.currentPasswordPlaceholder') || 'Enter current password')"
                   style="width:100%" />
          </div>
          <div style="margin-bottom:1rem">
            <label class="field-label">{{ i18n.translate('changePassword.newPassword') || 'New Password' }}</label>
            <input pInputText type="password" [(ngModel)]="newPassword"
                   [placeholder]="i18n.translate('changePassword.newPasswordPlaceholder') || 'Enter new password'"
                   style="width:100%" />
          </div>
          <div style="margin-bottom:1rem">
            <label class="field-label">{{ i18n.translate('changePassword.confirmPassword') || 'Confirm New Password' }}</label>
            <input pInputText type="password" [(ngModel)]="confirmPassword"
                   [placeholder]="i18n.translate('changePassword.confirmPasswordPlaceholder') || 'Confirm new password'"
                   style="width:100%" />
          </div>

          <!-- Password requirements -->
          <div class="pw-requirements">
            <div [class.met]="newPassword.length >= 8"><i class="pi" [class.pi-check-circle]="newPassword.length >= 8" [class.pi-circle]="newPassword.length < 8"></i> At least 8 characters</div>
            <div [class.met]="hasUppercase"><i class="pi" [class.pi-check-circle]="hasUppercase" [class.pi-circle]="!hasUppercase"></i> One uppercase letter</div>
            <div [class.met]="hasLowercase"><i class="pi" [class.pi-check-circle]="hasLowercase" [class.pi-circle]="!hasLowercase"></i> One lowercase letter</div>
            <div [class.met]="hasDigit"><i class="pi" [class.pi-check-circle]="hasDigit" [class.pi-circle]="!hasDigit"></i> One number</div>
            <div [class.met]="hasSpecial"><i class="pi" [class.pi-check-circle]="hasSpecial" [class.pi-circle]="!hasSpecial"></i> One special character</div>
          </div>

          <p *ngIf="error" style="color:var(--error);font-size:0.875rem">{{ error }}</p>
          <p-button [label]="i18n.translate('changePassword.submitButton') || 'Change Password'" icon="pi pi-lock"
                    [loading]="loading" (onClick)="onSubmit()" [style]="{width:'100%'}" />
        </div>

        <div *ngIf="success" style="text-align:center">
          <i class="pi pi-check-circle" style="font-size:48px;color:var(--success)"></i>
          <h3>{{ i18n.translate('changePassword.successTitle') || 'Password Changed' }}</h3>
          <p>{{ i18n.translate('changePassword.successMessage') || 'Your password has been changed successfully.' }}</p>
          <p-button [label]="i18n.translate('changePassword.continue') || 'Continue to Dashboard'" icon="pi pi-arrow-right"
                    (onClick)="onContinue()" [style]="{width:'100%'}" />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .change-pw-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--surface-sunken); position: relative; }
    .auth-top-bar { position: absolute; top: 1rem; right: 1rem; display: flex; align-items: center; gap: 1rem; }
    .auth-top-bar a { color: var(--text-muted); text-decoration: none; font-size: 0.9rem; }
    .auth-top-bar a:hover { color: var(--primary); }
    .auth-lang-dropdown { padding: 0.4rem 0.6rem; border-radius: 6px; border: 1px solid var(--border); background: var(--surface); font-size: 0.875rem; }
    .change-pw-container { max-width: 460px; width: 100%; padding: 2rem; background: var(--surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); text-align: center; }
    h2 { margin: 0.5rem 0 1rem; color: var(--text-heading); }
    h3 { margin: 1rem 0 0.5rem; color: var(--text-heading); }
    p { color: var(--text-muted); margin-bottom: 1rem; }
    .forced-notice { background: var(--warning-bg, #fff3cd); color: var(--warning-text, #856404); padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; margin-bottom: 1rem; }
    .field-label { display: block; text-align: left; margin-bottom: 0.375rem; font-weight: 500; font-size: 0.875rem; color: var(--text-heading); }
    .pw-requirements { text-align: left; margin-bottom: 1rem; font-size: 0.8rem; color: var(--text-muted); }
    .pw-requirements div { margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.5rem; }
    .pw-requirements .met { color: var(--success, #2e7d32); }
    .pw-requirements .pi { font-size: 0.75rem; }
  `],
})
export class ChangePasswordComponent implements OnInit {
  readonly router = inject(Router);
  readonly i18n = inject(I18nService);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private authService = inject(GrcAuthService);
  private bootstrap = inject(BootstrapStore);

  isForced = false;
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  loading = false;
  success = false;
  error = '';

  get hasUppercase(): boolean { return /[A-Z]/.test(this.newPassword); }
  get hasLowercase(): boolean { return /[a-z]/.test(this.newPassword); }
  get hasDigit(): boolean { return /[0-9]/.test(this.newPassword); }
  get hasSpecial(): boolean { return /[^A-Za-z0-9]/.test(this.newPassword); }

  ngOnInit(): void {
    this.isForced = this.route.snapshot.queryParams['forced'] === 'true';
  }

  onSubmit(): void {
    this.error = '';

    if (!this.currentPassword) {
      this.error = this.isForced
        ? 'Please enter your temporary password from the invitation email.'
        : 'Please enter your current password.';
      return;
    }
    if (!this.newPassword || this.newPassword.length < 8) {
      this.error = 'Password must be at least 8 characters.';
      return;
    }
    if (!this.hasUppercase) { this.error = 'Password must contain at least one uppercase letter.'; return; }
    if (!this.hasLowercase) { this.error = 'Password must contain at least one lowercase letter.'; return; }
    if (!this.hasDigit) { this.error = 'Password must contain at least one number.'; return; }
    if (!this.hasSpecial) { this.error = 'Password must contain at least one special character.'; return; }
    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }
    if (this.newPassword === this.currentPassword) {
      this.error = 'New password must be different from the current password.';
      return;
    }

    this.loading = true;
    this.http.post(`${environment.apiUrl}/auth/change-password`, {
      currentPassword: this.currentPassword,
      newPassword: this.newPassword,
    }).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        // Clear the must_change_password flag
        this.authService.clearMustChangePassword();
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Password change failed. Please check your current password and try again.';
      },
    });
  }

  onContinue(): void {
    // DB-driven landing route only (dos.tenant_landing_config via UI-OS).
    // null on every source = render empty/no-op; do not invent a route
    // (NO FRONTEND INVENTION per AGENTS.md).
    const landingPage = localStorage.getItem('grc_landing_page') || this.bootstrap.landingPage();
    if (landingPage) this.router.navigate([landingPage]);
  }
}

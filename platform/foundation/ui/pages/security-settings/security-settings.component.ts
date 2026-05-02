// ============================================
// Shahin-Ai — Security Settings (AGRC-OS full wiring)
// ============================================

import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
import { AccountService, type UserInfo } from '@app/core/services/user-account/account.service';
import { FoundationPageShellStubComponent as PageShellComponent } from '../shared/foundation-shared-components';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-security-settings',
    imports: [CommonModule, RouterLink, PageShellComponent, ButtonModule, CardModule, TagModule],
    template: `
    <app-page-shell
      icon="shield"
      [title]="i18n.translate('securitySettings.title') || 'Security Settings'"
      [subtitle]="i18n.translate('securitySettings.subtitle') || 'Manage password, MFA, and security options'"
      [breadcrumbs]="[i18n.translate('dashboard.title') || 'Dashboard', i18n.translate('securitySettings.title') || 'Security Settings']"
      [loading]="loading()">

      @if (!loading() && user()) {
        <div class="security-cards">
          <p-card [header]="i18n.translate('securitySettings.currentSession') || 'Current session'" styleClass="agrc-card">
            <div class="profile-row">
              <span class="label">{{ i18n.translate('securitySettings.signedInAs') || 'Signed in as' }}:</span>
              <span class="value">{{ user()!.userName || user()!.email }}</span>
            </div>
            @if (user()!.mfaEnabled !== undefined) {
              <div class="profile-row">
                <span class="label">{{ i18n.translate('securitySettings.mfa') || 'MFA' }}:</span>
                <p-tag [value]="user()!.mfaEnabled ? (i18n.translate('common.enabled') || 'Enabled') : (i18n.translate('common.disabled') || 'Disabled')" [severity]="user()!.mfaEnabled ? 'success' : 'secondary'" />
              </div>
            }
          </p-card>

          <p-card [header]="i18n.translate('securitySettings.actions') || 'Actions'" styleClass="agrc-card">
            <div class="action-list">
              <a pButton class="p-button-outlined" [routerLink]="['/profile']" icon="pi pi-key" [label]="i18n.translate('securitySettings.changePassword') || 'Change password'"></a>
              <a pButton class="p-button-outlined" [routerLink]="['/profile']" icon="pi pi-lock" [label]="i18n.translate('securitySettings.twoFactor') || 'Two-factor authentication'"></a>
            </div>
          </p-card>
        </div>
      }

      @if (!loading() && !user() && !error()) {
        <p-card>
          <p>{{ i18n.translate('securitySettings.loadFailed') || 'Unable to load. Sign in again or try later.' }}</p>
        </p-card>
      }

      @if (error()) {
        <p-card>
          <p class="error-msg">{{ error() }}</p>
          <button pButton (click)="load()" icon="pi pi-refresh" [label]="i18n.translate('common.retry') || 'Retry'"></button>
        </p-card>
      }
    </app-page-shell>
  `,
    styles: [`
    .security-cards { display: grid; gap: var(--space-lg); max-width: 640px; }
    .profile-row { display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-sm); }
    .profile-row .label { font-weight: 600; min-width: 140px; color: var(--text-muted); }
    .profile-row .value { color: var(--text-heading); }
    .action-list { display: flex; flex-direction: column; gap: var(--space-sm); }
    .error-msg { color: var(--red-500); margin-bottom: var(--space-md); }
  `]
})
export class SecuritySettingsComponent implements OnInit {
  i18n = inject(I18nService);
  private account = inject(AccountService);

  loading = signal(true);
  user = signal<UserInfo | null>(null);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.error.set(null);
    this.loading.set(true);
    this.account.getUserInfo().subscribe({
      next: (body) => {
        this.user.set(body);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Failed to load');
        this.loading.set(false);
      },
    });
  }
}

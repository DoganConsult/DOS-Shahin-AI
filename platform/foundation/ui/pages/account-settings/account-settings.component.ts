import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FOUNDATION_I18N, type FoundationI18n, type FoundationLang, NoopFoundationI18n } from '../ports/i18n.port';
import { SessionService } from '@app/core/dauth/session/session.service';
import { AccountService, type UserInfo } from '@app/core/services/user-account/account.service';
import { FoundationPageShellStubComponent as PageShellComponent } from '../shared/foundation-shared-components';
import { ButtonModule } from 'primeng/button';
import { environment } from '@env/environment';


const ROLE_LABELS_AR: Record<string, string> = {
  super_admin: 'مدير النظام الأعلى', owner: 'مالك', admin: 'مدير',
  ciso: 'مسؤول أمن المعلومات', ceo: 'الرئيس التنفيذي', cto: 'المدير التقني',
  cfo: 'المدير المالي', compliance_manager: 'مدير الامتثال',
  compliance_officer: 'مسؤول الامتثال', risk_manager: 'مدير المخاطر',
  auditor: 'مدقق', analyst: 'محلل', viewer: 'مشاهد',
};
const ROLE_LABELS_EN: Record<string, string> = {
  super_admin: 'Super Admin', owner: 'Owner', admin: 'Admin',
  ciso: 'CISO', ceo: 'CEO', cto: 'CTO', cfo: 'CFO',
  compliance_manager: 'Compliance Manager', compliance_officer: 'Compliance Officer',
  risk_manager: 'Risk Manager', auditor: 'Auditor', analyst: 'Analyst', viewer: 'Viewer',
};

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-account-settings',
    imports: [CommonModule, RouterLink, PageShellComponent, ButtonModule],
    template: `
    <app-page-shell
      icon="user"
      [title]="t('accountSettings.title')"
      [subtitle]="t('accountSettings.subtitle')"
      [breadcrumbs]="[t('home.breadcrumb'), t('accountSettings.title')]"
      [loading]="loading()">

      @if (!loading() && user()) {
        <div class="acct-grid">

          <!-- ═══ Profile Card ═══ -->
          <section class="acct-card">
            <div class="acct-card-header">
              <div class="acct-avatar">{{ userInitials() }}</div>
              <div>
                <h3 class="acct-card-title">{{ t('accountSettings.profile') }}</h3>
                <span class="acct-role-badge">{{ roleLabel() }}</span>
              </div>
            </div>
            <div class="acct-rows">
              <div class="acct-row">
                <span class="acct-label"><i class="pi pi-user"></i> {{ t('accountSettings.name') }}</span>
                <span class="acct-value">{{ user()!.userName || (user()!.email ? user()!.email!.split('@')[0] : '—') }}</span>
              </div>
              <div class="acct-row">
                <span class="acct-label"><i class="pi pi-envelope"></i> {{ t('accountSettings.email') }}</span>
                <span class="acct-value">{{ user()!.email || '—' }}</span>
              </div>
              <div class="acct-row">
                <span class="acct-label"><i class="pi pi-building"></i> {{ t('accountSettings.organization') }}</span>
                <span class="acct-value">{{ user()!.orgName || '—' }}</span>
              </div>
              <div class="acct-row">
                <span class="acct-label"><i class="pi pi-id-card"></i> {{ t('accountSettings.role') }}</span>
                <span class="acct-value">{{ roleLabel() }}</span>
              </div>
            </div>
          </section>

          <!-- ═══ Preferences Card ═══ -->
          <section class="acct-card">
            <h3 class="acct-card-title"><i class="pi pi-sliders-h"></i> {{ t('accountSettings.preferences') }}</h3>
            <div class="acct-rows">
              <div class="acct-row acct-row-between">
                <div>
                  <span class="acct-label"><i class="pi pi-globe"></i> {{ t('accountSettings.language') }}</span>
                  <p class="acct-desc">{{ t('accountSettings.languageDesc') }}</p>
                </div>
                <div class="lang-toggle">
                  <button class="lang-btn" [class.active]="i18n.isAr()" (click)="setLang('ar')">{{ t('accountSettings.arabic') }}</button>
                  <button class="lang-btn" [class.active]="!i18n.isAr()" (click)="setLang('en')">{{ t('accountSettings.english') }}</button>
                </div>
              </div>
              <div class="acct-divider"></div>
              <div class="acct-row acct-row-between">
                <div>
                  <span class="acct-label"><i class="pi pi-bell"></i> {{ t('accountSettings.emailNotifications') }}</span>
                  <p class="acct-desc">{{ t('accountSettings.emailNotificationsDesc') }}</p>
                </div>
                <span class="acct-status acct-status-on">{{ i18n.translate('accountSettings.on') }}</span>
              </div>
              <div class="acct-divider"></div>
              <div class="acct-row acct-row-between">
                <div>
                  <span class="acct-label"><i class="pi pi-desktop"></i> {{ t('accountSettings.browserNotifications') }}</span>
                  <p class="acct-desc">{{ t('accountSettings.browserNotificationsDesc') }}</p>
                </div>
                <span class="acct-status">{{ i18n.translate('accountSettings.off') }}</span>
              </div>
            </div>
          </section>

          <!-- ═══ Security Card ═══ -->
          <section class="acct-card">
            <h3 class="acct-card-title"><i class="pi pi-shield"></i> {{ t('accountSettings.security') }}</h3>
            <div class="acct-rows">
              <div class="acct-row">
                <span class="acct-label"><i class="pi pi-key"></i> {{ t('accountSettings.changePassword') }}</span>
                <button [attr.aria-label]="t('common.edit')" pButton class="p-button-outlined p-button-sm" icon="pi pi-pencil"
                  [label]="t('accountSettings.changePassword')" (click)="showPasswordDialog = true"></button>
              </div>
              <div class="acct-divider"></div>
              <div class="acct-row acct-row-between">
                <div>
                  <span class="acct-label"><i class="pi pi-lock"></i> {{ i18n.localize('Two-Factor Authentication', 'المصادقة الثنائية') }}</span>
                  <p class="acct-desc">{{ i18n.localize('Add an extra layer of security to your account', 'أضف طبقة أمان إضافية لحسابك') }}</p>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                  <span class="acct-status" [class.acct-status-on]="user()!.mfaEnabled">
                    {{ user()!.mfaEnabled ? t('accountSettings.mfaEnabled') : t('accountSettings.mfaDisabled') }}
                  </span>
                  <button pButton class="p-button-sm" [class.p-button-outlined]="user()!.mfaEnabled"
                    [icon]="user()!.mfaEnabled ? 'pi pi-times' : 'pi pi-shield'"
                    [label]="user()!.mfaEnabled ? i18n.localize('Disable', 'تعطيل') : i18n.localize('Enable', 'تفعيل')"
                    (click)="user()!.mfaEnabled ? disableMfa() : openMfaSetup()"></button>
                </div>
              </div>
              <div class="acct-divider"></div>
              <div class="acct-row acct-row-between">
                <span class="acct-label"><i class="pi pi-clock"></i> {{ t('accountSettings.sessionTimeout') }}</span>
                <span class="acct-value">30 {{ t('accountSettings.minutes') }}</span>
              </div>
            </div>
          </section>

          <!-- ═══ Admin Card (tenant admins only) ═══ -->
          @if (isAdmin()) {
            <section class="acct-card acct-admin-card">
              <h3 class="acct-card-title"><i class="pi pi-cog"></i> {{ t('accountSettings.tenantAdmin') }}</h3>
              <div class="acct-rows">
                <div class="acct-row acct-row-between">
                  <div>
                    <span class="acct-label"><i class="pi pi-wrench"></i> {{ t('accountSettings.tenantAdmin') }}</span>
                    <p class="acct-desc">{{ t('accountSettings.tenantAdminDesc') }}</p>
                  </div>
                  <a pButton class="p-button-sm" icon="pi pi-external-link"
                    [label]="t('accountSettings.openTenantConfig')"
                    [routerLink]="['/tenant-config']"></a>
                </div>
                <div class="acct-divider"></div>
                <div class="acct-row acct-row-between">
                  <div>
                    <span class="acct-label"><i class="pi pi-users"></i> {{ t('accountSettings.teamManagement') }}</span>
                    <p class="acct-desc">{{ t('accountSettings.teamManagementDesc') }}</p>
                  </div>
                  <a pButton class="p-button-sm p-button-outlined" icon="pi pi-external-link"
                    [label]="t('accountSettings.openTeamManagement')"
                    [routerLink]="['/team']"></a>
                </div>
              </div>
            </section>
          }
        </div>
      }

      @if (!loading() && !user() && !error()) {
        <div class="acct-card">
          <p>{{ t('accountSettings.loadFailed') }}</p>
        </div>
      }

      @if (error()) {
        <div class="acct-card">
          <p class="error-msg">{{ error() }}</p>
          <button pButton (click)="load()" icon="pi pi-refresh" [label]="t('common.retry')"></button>
        </div>
      }
    </app-page-shell>

    <!-- Password change dialog (inline) -->
    @if (showPasswordDialog) {
      <div tabindex="0" role="button" (keyup.enter)="showPasswordDialog = false" class="pwd-overlay" (click)="showPasswordDialog = false">
        <div tabindex="0" role="button" (keyup.enter)="$event.stopPropagation()" class="pwd-dialog" (click)="$event.stopPropagation()">
          <div class="pwd-header">
            <h4>{{ t('accountSettings.changePassword') }}</h4>
            <button [attr.aria-label]="t('common.close')" class="pwd-close" (click)="showPasswordDialog = false"><i class="pi pi-times"></i></button>
          </div>
          <div class="pwd-body">
            <label>{{ i18n.translate('accountSettings.currentPassword') }}</label>
            <input type="password" class="pwd-input" #currentPwd />
            <label>{{ i18n.translate('accountSettings.newPassword') }}</label>
            <input type="password" class="pwd-input" #newPwd />
            <label>{{ i18n.translate('accountSettings.confirmPassword') }}</label>
            <input type="password" class="pwd-input" #confirmPwd />
            @if (pwdError()) { <p class="error-msg">{{ pwdError() }}</p> }
            @if (pwdSuccess()) { <p class="success-msg">{{ t('accountSettings.saved') }}</p> }
          </div>
          <div class="pwd-footer">
            <button pButton class="p-button-outlined p-button-sm" (click)="showPasswordDialog = false"
              [label]="i18n.translate('accountSettings.cancel')"></button>
            <button [attr.aria-label]="t('common.confirm')" pButton class="p-button-sm" icon="pi pi-check" [loading]="pwdLoading()"
              [label]="i18n.translate('accountSettings.save')"
              (click)="doChangePassword(currentPwd.value, newPwd.value, confirmPwd.value)"></button>
          </div>
        </div>
      </div>
    }

    <!-- ═══ MFA Setup Dialog ═══ -->
    @if (showMfaDialog) {
      <div class="pwd-overlay" (click)="showMfaDialog = false">
        <div class="mfa-dialog" (click)="$event.stopPropagation()">
          <div class="pwd-header">
            <h4><i class="pi pi-shield" style="color:var(--primary)"></i> {{ i18n.localize('Set Up Two-Factor Authentication', 'إعداد المصادقة الثنائية') }}</h4>
            <button class="pwd-close" (click)="closeMfaDialog()"><i class="pi pi-times"></i></button>
          </div>
          <div class="pwd-body">

            <!-- Step 1: Choose MFA type -->
            @if (mfaStep() === 'choose') {
              <p class="mfa-desc">{{ i18n.localize(
                'Choose how you want to receive your verification codes:',
                'اختر طريقة تلقي رموز التحقق:'
              ) }}</p>
              <div class="mfa-options">
                <button class="mfa-option" (click)="enableMfa('email')">
                  <i class="pi pi-envelope mfa-option-icon"></i>
                  <div>
                    <strong>{{ i18n.localize('Email Verification', 'التحقق بالبريد الإلكتروني') }}</strong>
                    <p>{{ i18n.localize('Receive a 6-digit code via email each time you log in', 'تلقي رمز مكون من 6 أرقام عبر البريد الإلكتروني في كل تسجيل دخول') }}</p>
                  </div>
                </button>
                <button class="mfa-option" (click)="enableMfa('totp')">
                  <i class="pi pi-qrcode mfa-option-icon"></i>
                  <div>
                    <strong>{{ i18n.localize('Authenticator App', 'تطبيق المصادقة') }}</strong>
                    <p>{{ i18n.localize('Use Google Authenticator, Microsoft Authenticator, or similar apps', 'استخدم Google Authenticator أو Microsoft Authenticator أو تطبيقات مشابهة') }}</p>
                  </div>
                </button>
              </div>
            }

            <!-- Step 2: Show QR code (TOTP) or email sent message -->
            @if (mfaStep() === 'scan') {
              <div class="mfa-scan-step">
                @if (mfaSelectedType === 'totp' && mfaQrUri()) {
                  <p class="mfa-desc">{{ i18n.localize(
                    'Scan this QR code with your authenticator app:',
                    'امسح رمز QR هذا بتطبيق المصادقة:'
                  ) }}</p>
                  <div class="mfa-qr-container">
                    <img [src]="mfaQrUri()" alt="MFA QR Code" class="mfa-qr-img" />
                  </div>
                } @else {
                  <div class="mfa-email-sent">
                    <i class="pi pi-check-circle" style="font-size:2.5rem;color:#22c55e"></i>
                    <p>{{ i18n.localize(
                      'A verification code has been sent to your email address.',
                      'تم إرسال رمز التحقق إلى بريدك الإلكتروني.'
                    ) }}</p>
                  </div>
                }
                <label class="mfa-code-label">{{ i18n.localize('Enter the 6-digit verification code:', 'أدخل رمز التحقق المكون من 6 أرقام:') }}</label>
                <input type="text" class="mfa-code-input" maxlength="6" inputmode="numeric" pattern="[0-9]*"
                  placeholder="000000" #mfaCodeInput
                  (keyup.enter)="verifyMfa(mfaCodeInput.value)" />
                @if (mfaError()) { <p class="error-msg">{{ mfaError() }}</p> }
              </div>
            }

            <!-- Step 3: Success -->
            @if (mfaStep() === 'done') {
              <div class="mfa-success">
                <i class="pi pi-verified" style="font-size:3rem;color:#22c55e"></i>
                <h4>{{ i18n.localize('Two-Factor Authentication Enabled!', 'تم تفعيل المصادقة الثنائية!') }}</h4>
                <p>{{ i18n.localize(
                  'Your account is now protected with an extra layer of security.',
                  'حسابك محمي الآن بطبقة أمان إضافية.'
                ) }}</p>
              </div>
            }
          </div>

          @if (mfaStep() === 'scan') {
            <div class="pwd-footer">
              <button pButton class="p-button-outlined p-button-sm" (click)="mfaStep.set('choose')"
                [label]="i18n.localize('Back', 'رجوع')" icon="pi pi-arrow-left"></button>
              <button pButton class="p-button-sm" icon="pi pi-check" [loading]="mfaLoading()"
                [label]="i18n.localize('Verify & Enable', 'تحقق وتفعيل')"
                (click)="verifyMfa(mfaCodeInput.value)"></button>
            </div>
          }
          @if (mfaStep() === 'done') {
            <div class="pwd-footer">
              <button pButton class="p-button-sm" icon="pi pi-check"
                [label]="i18n.localize('Done', 'تم')"
                (click)="closeMfaDialog(); load()"></button>
            </div>
          }
        </div>
      </div>
    }
  `,
    styles: [`
    .acct-grid {
      display: grid;
      gap: 20px;
      max-width: 780px;
    }
    .acct-card {
      background: var(--surface, #fff);
      border: 1px solid var(--border-subtle, var(--border-subtle));
      border-radius: var(--radius-lg);
      padding: 20px 24px;
    }
    .acct-admin-card {
      border-color: var(--primary-200, #bfdbfe);
      background: var(--primary-50, #eff6ff);
    }
    .acct-card-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }
    .acct-avatar {
      width: 52px; height: 52px; border-radius: var(--radius-pill);
      background: linear-gradient(135deg, var(--primary, var(--primary)), var(--primary));
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: var(--font-size-lg); font-weight: 700; flex-shrink: 0;
    }
    .acct-card-title {
      font-size: var(--font-size-base); font-weight: 700; margin: 0 0 4px;
      color: var(--text-heading, var(--text-heading));
      display: flex; align-items: center; gap: 8px;
      i { font-size: var(--font-size-base); color: var(--primary, #4f46e5); }
    }
    .acct-role-badge {
      display: inline-block;
      padding: 2px 10px; border-radius: var(--radius-lg);
      font-size: var(--font-size-xs); font-weight: 600;
      background: var(--primary-100, #dbeafe);
      color: var(--primary-700, #1d4ed8);
    }
    .acct-rows { display: flex; flex-direction: column; gap: 12px; }
    .acct-row {
      display: flex; align-items: center; gap: 12px;
    }
    .acct-row-between {
      justify-content: space-between;
      flex-wrap: wrap;
    }
    .acct-label {
      font-size: var(--font-size-sm); font-weight: 600;
      color: var(--text-secondary, var(--text-muted));
      display: flex; align-items: center; gap: 6px;
      min-width: 140px;
      i { font-size: var(--font-size-sm); color: var(--primary, #4f46e5); }
    }
    .acct-value {
      font-size: var(--font-size-sm); font-weight: 500;
      color: var(--text-heading, var(--text-heading));
    }
    .acct-desc {
      font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted));
      margin: 2px 0 0; line-height: 1.4;
    }
    .acct-divider {
      height: 1px;
      background: var(--border-subtle, var(--surface-ice));
    }
    .acct-status {
      font-size: var(--font-size-sm); font-weight: 600;
      padding: 2px 10px; border-radius: var(--radius-md);
      background: var(--surface-200, var(--surface-ice));
      color: var(--text-muted, var(--text-muted));
      flex-shrink: 0;
    }
    .acct-status-on {
      background: #dcfce7; color: #166534;
    }
    .lang-toggle {
      display: flex; gap: 0; border: 1px solid var(--border-subtle, var(--border-subtle)); border-radius: var(--radius); overflow: hidden;
    }
    .lang-btn {
      padding: 5px 14px; border: none; background: transparent; cursor: pointer;
      font-size: var(--font-size-sm); font-weight: 600; color: var(--text-secondary, var(--text-muted));
      transition: background 0.15s, color 0.15s;
    }
    .lang-btn.active {
      background: var(--primary, #4f46e5); color: #fff;
    }
    .lang-btn:hover:not(.active) { background: var(--surface-ice, var(--surface-ice)); }
    .error-msg { color: var(--red-500, var(--error)); font-size: var(--font-size-sm); margin: 4px 0; }
    .success-msg { color: var(--green-600, var(--success)); font-size: var(--font-size-sm); margin: 4px 0; }

    /* MFA dialog */
    .mfa-dialog {
      background: var(--surface, #fff); border-radius: var(--radius-lg);
      width: 480px; max-width: 92vw;
      box-shadow: 0 20px 60px rgba(var(--color-black-rgb), 0.25);
      animation: mfaSlideIn 0.2s ease-out;
    }
    @keyframes mfaSlideIn {
      from { opacity: 0; transform: translateY(16px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .mfa-desc {
      font-size: var(--font-size-sm); color: var(--text-secondary, var(--text-muted));
      margin: 0 0 16px; line-height: 1.5;
    }
    .mfa-options { display: flex; flex-direction: column; gap: 12px; }
    .mfa-option {
      display: flex; align-items: flex-start; gap: 14px;
      padding: 14px 16px; border: 2px solid var(--border-subtle, #e2e8f0);
      border-radius: var(--radius-lg); background: var(--surface, #fff);
      cursor: pointer; text-align: start; transition: all 0.15s;
    }
    .mfa-option:hover {
      border-color: var(--primary, #4f46e5);
      background: var(--primary-50, #eff6ff);
    }
    .mfa-option-icon {
      font-size: var(--font-size-2xl); color: var(--primary, #4f46e5);
      margin-top: 2px; flex-shrink: 0;
    }
    .mfa-option strong {
      display: block; font-size: var(--font-size-sm); font-weight: 700;
      color: var(--text-heading); margin-bottom: 2px;
    }
    .mfa-option p {
      font-size: var(--font-size-xs); color: var(--text-muted);
      margin: 0; line-height: 1.4;
    }
    .mfa-qr-container {
      display: flex; justify-content: center; padding: 16px 0;
    }
    .mfa-qr-img {
      width: 200px; height: 200px; border-radius: var(--radius);
      border: 1px solid var(--border-subtle);
    }
    .mfa-email-sent {
      text-align: center; padding: 16px 0;
      p { font-size: var(--font-size-sm); color: var(--text-secondary); margin-top: 8px; }
    }
    .mfa-code-label {
      display: block; font-size: var(--font-size-sm); font-weight: 600;
      color: var(--text-secondary); margin: 12px 0 6px;
    }
    .mfa-code-input {
      width: 100%; padding: 12px 16px; border: 2px solid var(--border-subtle, #e2e8f0);
      border-radius: var(--radius); font-size: var(--font-size-2xl); text-align: center;
      letter-spacing: 0.5em; font-weight: 700; font-family: monospace;
      &:focus { outline: none; border-color: var(--primary, #4f46e5); }
    }
    .mfa-success {
      text-align: center; padding: 20px 0;
      h4 { margin: 12px 0 8px; font-size: var(--font-size-md); color: var(--text-heading); }
      p { font-size: var(--font-size-sm); color: var(--text-secondary); margin: 0; }
    }

    /* Password dialog */
    .pwd-overlay {
      position: fixed; inset: 0; background: rgba(var(--color-black-rgb), 0.4);
      display: flex; align-items: center; justify-content: center; z-index: var(--z-modal);
    }
    .pwd-dialog {
      background: var(--surface, #fff); border-radius: var(--radius-lg);
      width: 400px; max-width: 90vw;
      box-shadow: 0 20px 60px rgba(var(--color-black-rgb), 0.2);
    }
    .pwd-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 20px; border-bottom: 1px solid var(--border-subtle, var(--border-subtle));
      h4 { margin: 0; font-size: var(--font-size-base); font-weight: 700; }
    }
    .pwd-close {
      background: none; border: none; cursor: pointer;
      color: var(--text-muted, var(--text-muted)); font-size: var(--font-size-md);
    }
    .pwd-body {
      padding: 20px;
      label { display: block; font-size: var(--font-size-sm); font-weight: 600; color: var(--text-secondary, var(--text-muted)); margin-bottom: 4px; margin-top: 12px; }
      label:first-child { margin-top: 0; }
    }
    .pwd-input {
      width: 100%; padding: 8px 12px; border: 1px solid var(--border-subtle, var(--border-subtle));
      border-radius: var(--radius); font-size: var(--font-size-sm);
      &:focus { outline: none; border-color: var(--primary, #4f46e5); }
    }
    .pwd-footer {
      display: flex; justify-content: flex-end; gap: 8px;
      padding: 12px 20px; border-top: 1px solid var(--border-subtle, var(--border-subtle));
    }
  `]
})
export class AccountSettingsComponent implements OnInit {
  i18n = inject(I18nService);
  private auth = inject(SessionService);
  private account = inject(AccountService);
  private http = inject(HttpClient);

  loading = signal(true);
  user = signal<UserInfo | null>(null);
  error = signal<string | null>(null);

  showPasswordDialog = false;
  pwdLoading = signal(false);
  pwdError = signal<string | null>(null);
  pwdSuccess = signal(false);

  // MFA setup state
  showMfaDialog = false;
  mfaStep = signal<'choose' | 'scan' | 'done'>('choose');
  mfaSelectedType: 'email' | 'totp' = 'email';
  mfaQrUri = signal<string | null>(null);
  mfaLoading = signal(false);
  mfaError = signal<string | null>(null);

  isAdmin = computed(() => this.auth.isAdminProfile);

  t(key: string): string {
    return this.i18n.translate(key);
  }

  roleLabel(): string {
    const role = this.auth.currentRole();
    return this.i18n.localize(ROLE_LABELS_EN[role] || role, ROLE_LABELS_AR[role] || role);
  }

  userInitials(): string {
    const name = this.user()?.userName || this.user()?.email || '';
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

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
        this.error.set(err?.message || 'Failed to load profile');
        this.loading.set(false);
      },
    });
  }

  setLang(lang: Lang): void {
    this.i18n.switchLanguage(lang);
  }

  doChangePassword(current: string, newPwd: string, confirm: string): void {
    this.pwdError.set(null);
    this.pwdSuccess.set(false);
    if (!current || !newPwd) {
      this.pwdError.set(this.i18n.translate('accountSettings.pleaseFillAllFields'));
      return;
    }
    if (newPwd !== confirm) {
      this.pwdError.set(this.i18n.translate('accountSettings.passwordsDoNotMatch'));
      return;
    }
    if (newPwd.length < 8) {
      this.pwdError.set(this.i18n.translate('accountSettings.passwordMustBeAtLeast8Characters'));
      return;
    }
    this.pwdLoading.set(true);
    this.account.changePassword(current, newPwd).subscribe({
      next: () => {
        this.pwdLoading.set(false);
        this.pwdSuccess.set(true);
        setTimeout(() => { this.showPasswordDialog = false; this.pwdSuccess.set(false); }, 1500);
      },
      error: (err) => {
        this.pwdLoading.set(false);
        this.pwdError.set(err?.error?.message || err?.message || 'Failed');
      },
    });
  }

  // ── MFA Setup Methods ──

  openMfaSetup(): void {
    this.showMfaDialog = true;
    this.mfaStep.set('choose');
    this.mfaQrUri.set(null);
    this.mfaError.set(null);
  }

  closeMfaDialog(): void {
    this.showMfaDialog = false;
    this.mfaStep.set('choose');
    this.mfaQrUri.set(null);
    this.mfaError.set(null);
  }

  enableMfa(type: 'email' | 'totp'): void {
    this.mfaSelectedType = type;
    this.mfaLoading.set(true);
    this.mfaError.set(null);
    this.http.post<Record<string, any>>(`${environment.apiUrl}/auth/mfa/enable`, { type }).subscribe({
      next: (res) => {
        this.mfaLoading.set(false);
        if (type === 'totp' && res['qrCodeUri']) {
          this.mfaQrUri.set(res['qrCodeUri'] as string);
        }
        this.mfaStep.set('scan');
      },
      error: (err) => {
        this.mfaLoading.set(false);
        this.mfaError.set(err?.error?.error || err?.message || 'Failed to enable MFA');
      },
    });
  }

  verifyMfa(code: string): void {
    if (!code || code.trim().length < 4) {
      this.mfaError.set(this.i18n.localize('Please enter a valid verification code', 'يرجى إدخال رمز تحقق صالح'));
      return;
    }
    this.mfaLoading.set(true);
    this.mfaError.set(null);
    this.http.post<Record<string, any>>(`${environment.apiUrl}/auth/mfa/verify`, {
      code: code.trim(),
      type: this.mfaSelectedType,
    }).subscribe({
      next: (res) => {
        this.mfaLoading.set(false);
        if (res['verified']) {
          this.mfaStep.set('done');
          // Update local user state
          const u = this.user();
          if (u) this.user.set({ ...u, mfaEnabled: true });
        } else {
          this.mfaError.set(this.i18n.localize('Invalid code. Please try again.', 'رمز غير صالح. يرجى المحاولة مرة أخرى.'));
        }
      },
      error: (err) => {
        this.mfaLoading.set(false);
        this.mfaError.set(err?.error?.error || this.i18n.localize('Invalid code. Please try again.', 'رمز غير صالح. يرجى المحاولة مرة أخرى.'));
      },
    });
  }

  disableMfa(): void {
    if (!confirm(this.i18n.localize(
      'Are you sure you want to disable two-factor authentication? This will make your account less secure.',
      'هل أنت متأكد من رغبتك في تعطيل المصادقة الثنائية؟ هذا سيجعل حسابك أقل أمانًا.'
    ))) return;

    this.http.post<Record<string, any>>(`${environment.apiUrl}/auth/mfa/disable`, {}).subscribe({
      next: () => {
        const u = this.user();
        if (u) this.user.set({ ...u, mfaEnabled: false });
      },
      error: (err) => {
        console.warn('[MFA Disable]', err);
      },
    });
  }
}

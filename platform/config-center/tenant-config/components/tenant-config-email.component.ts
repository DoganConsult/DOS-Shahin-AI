import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { DropdownModule } from 'primeng/select';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { MessageModule } from 'primeng/message';
import { GrcRecord } from '@app/core/models/shared.types';

/**
 * Presentational child component for the Email & Integrations section
 * of the tenant configuration page. Handles email provider settings,
 * connection testing, and platform email access requests.
 */
@Component({
    selector: 'app-tenant-config-email',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, AppDatePipe, ButtonModule, InputTextModule, TagModule, DropdownModule, InputSwitchModule, TooltipModule, MessageModule],
    template: `
    <div class="sc-card">
      <div class="sc-section-header">
        <div class="sc-section-title-row">
          <h3 class="sc-card-title">{{ i18n.translate('tenantConfig.emailIntegrations') }}</h3>
          <p-tag
            [value]="!emailConfig.enabled ? (i18n.translate('tenantConfig.disabled')) :
              emailConfig.lastTestResult?.success ? (i18n.translate('tenantConfig.connected')) :
              emailConfig.lastTestResult?.success === false ? (i18n.translate('tenantConfig.error')) :
              (i18n.translate('tenantConfig.notTested'))"
            [severity]="!emailConfig.enabled ? 'secondary' :
              emailConfig.lastTestResult?.success ? 'success' :
              emailConfig.lastTestResult?.success === false ? 'danger' : 'warning'" />
        </div>
        <p class="sc-card-desc">{{ i18n.translate('tenantConfig.emailProviderSettingsAndConnectionTestin') }}</p>
      </div>
      @if (emailConfigLoading) {
        <div class="sc-loading"><i class="pi pi-spin pi-spinner" style="font-size:2rem"></i></div>
      } @else {
        <div class="sc-email-layout">

          <div class="sc-conn-status" [class.sc-conn-ok]="emailConfig.enabled && emailConfig.lastTestResult?.success"
            [class.sc-conn-err]="emailConfig.enabled && emailConfig.lastTestResult?.success === false"
            [class.sc-conn-off]="!emailConfig.enabled">
            <i class="pi" [ngClass]="emailConfig.enabled ? (emailConfig.lastTestResult?.success ? 'pi-check-circle' : emailConfig.lastTestResult?.success === false ? 'pi-times-circle' : 'pi-circle') : 'pi-minus-circle'"></i>
            <div class="sc-conn-info">
              <span class="sc-conn-label">{{ i18n.translate('tenantConfig.connectionStatus') }}</span>
              <span class="sc-conn-value">{{
                !emailConfig.enabled ? (i18n.translate('tenantConfig.disabled')) :
                emailConfig.lastTestResult?.success ? (i18n.translate('tenantConfig.connected')) :
                emailConfig.lastTestResult?.success === false ? (i18n.translate('tenantConfig.error')) :
                (i18n.translate('tenantConfig.notTested'))
              }}</span>
            </div>
            @if (emailConfig.enabled && emailConfig.lastTestResult?.success === false) {
              <span class="sc-conn-err-msg">{{ emailConfig.lastTestResult?.error || '' }}</span>
            }
          </div>

          <div class="sc-checklist" *ngIf="emailConfig.enabled && emailConfig.provider === 'microsoft_graph'">
            <h4 class="sc-sub-title"><i class="pi pi-list-check"></i> {{ i18n.translate('tenantConfig.requiredFieldsChecklist') }}</h4>
            <div class="sc-check-item" [class.sc-check-ok]="emailConfig.msTenantId">
              <i class="pi" [ngClass]="emailConfig.msTenantId ? 'pi-check-circle' : 'pi-circle'"></i>
              Azure Tenant ID
            </div>
            <div class="sc-check-item" [class.sc-check-ok]="emailConfig.msClientId">
              <i class="pi" [ngClass]="emailConfig.msClientId ? 'pi-check-circle' : 'pi-circle'"></i>
              Client ID
            </div>
            <div class="sc-check-item" [class.sc-check-ok]="emailConfig.msClientSecret">
              <i class="pi" [ngClass]="emailConfig.msClientSecret ? 'pi-check-circle' : 'pi-circle'"></i>
              Client Secret
            </div>
            <div class="sc-check-item" [class.sc-check-ok]="emailConfig.msFromEmail">
              <i class="pi" [ngClass]="emailConfig.msFromEmail ? 'pi-check-circle' : 'pi-circle'"></i>
              From Email
            </div>
          </div>

          <p-message *ngIf="emailTestResult?.success === true" severity="success" [text]="i18n.translate('tenantConfig.connectionTestPassed')" styleClass="mb-3" />
          <p-message *ngIf="emailTestResult?.success === false" severity="error" [text]="(i18n.translate('tenantConfig.testFailed')) + (emailTestResult?.error || '')" styleClass="mb-3" />

          <div class="sc-form-grid">
            <div class="sc-field">
              <label class="sc-label">{{ i18n.translate('tenantConfig.enabled') }}</label>
              <div class="sc-switch-row">
                <p-inputSwitch [(ngModel)]="emailConfig.enabled" (onChange)="markDirty.emit('email')" />
                <p-tag [value]="emailConfig.enabled ? (i18n.translate('tenantConfig.active')) : (i18n.translate('tenantConfig.inactive'))" [severity]="emailConfig.enabled ? 'success' : 'secondary'" />
              </div>
            </div>
            <div class="sc-field">
              <label class="sc-label">{{ i18n.translate('tenantConfig.provider') }}</label>
              <p-dropdown [options]="emailProviderOptions" [(ngModel)]="emailConfig.provider"
                optionLabel="label" optionValue="value" styleClass="w-full" appendTo="body" (onChange)="markDirty.emit('email')" />
            </div>
          </div>

          @if (emailConfig.provider === 'microsoft_graph') {
            <div class="sc-provider-block">
              <div class="sc-provider-header">
                <h4 class="sc-provider-title"><i class="pi pi-microsoft"></i> Microsoft Graph OAuth2</h4>
                <p-button [label]="i18n.translate('tenantConfig.copyRedirectUrl')" icon="pi pi-copy" severity="secondary" [text]="true" size="small" (onClick)="copyRedirectUrl.emit()" pTooltip="https://login.microsoftonline.com/common/oauth2/v2.0/authorize" />
              </div>
              <div class="sc-form-grid">
                <div class="sc-field">
                  <label class="sc-label">{{ i18n.translate('tenantConfig.azureTenantId') }}</label>
                  <input pInputText [(ngModel)]="emailConfig.msTenantId" class="w-full" placeholder="c8847e8a-..." aria-label="c8847e8a-..." (input)="markDirty.emit('email')" />
                </div>
                <div class="sc-field">
                  <label class="sc-label">{{ i18n.translate('tenantConfig.clientId') }}</label>
                  <input pInputText [(ngModel)]="emailConfig.msClientId" class="w-full" placeholder="4e2575c6-..." aria-label="4e2575c6-..." (input)="markDirty.emit('email')" />
                </div>
                <div class="sc-field">
                  <label class="sc-label">{{ i18n.translate('tenantConfig.clientSecret') }}</label>
                  <input pInputText [(ngModel)]="emailConfig.msClientSecret" class="w-full" type="password" placeholder="Wx38Q~..." aria-label="Wx38Q~..." (input)="markDirty.emit('email')" />
                </div>
                <div class="sc-field">
                  <label class="sc-label">{{ i18n.translate('tenantConfig.fromEmail') }}</label>
                  <input pInputText [(ngModel)]="emailConfig.msFromEmail" class="w-full" type="email" placeholder="noreply@company.com" aria-label="noreply@company.com" (input)="markDirty.emit('email')" />
                </div>
                <div class="sc-field">
                  <label class="sc-label">{{ i18n.translate('tenantConfig.senderNameEn') }}</label>
                  <input pInputText [(ngModel)]="emailConfig.msFromName" class="w-full" placeholder="Shahin GRC Platform" aria-label="Shahin GRC Platform" (input)="markDirty.emit('email')" />
                </div>
                <div class="sc-field">
                  <label class="sc-label">{{ i18n.translate('tenantConfig.senderNameAr') }}</label>
                  <input pInputText [(ngModel)]="emailConfig.msFromNameAr" class="w-full" dir="rtl" placeholder="&#1605;&#1606;&#1589;&#1577; &#1588;&#1575;&#1607;&#1610;&#1606;" aria-label="&#1605;&#1606;&#1589;&#1577; &#1588;&#1575;&#1607;&#1610;&#1606;" (input)="markDirty.emit('email')" />
                </div>
              </div>
            </div>
          }

          @if (emailConfig.provider === 'smtp') {
            <div class="sc-provider-block">
              <h4 class="sc-provider-title"><i class="pi pi-server"></i> SMTP</h4>
              <div class="sc-form-grid">
                <div class="sc-field">
                  <label class="sc-label">{{ i18n.translate('tenantConfig.smtpHost') }}</label>
                  <input pInputText [(ngModel)]="emailConfig.smtpHost" class="w-full" placeholder="smtp.office365.com" aria-label="smtp.office365.com" (input)="markDirty.emit('email')" />
                </div>
                <div class="sc-field">
                  <label class="sc-label">{{ i18n.translate('tenantConfig.port') }}</label>
                  <input pInputText [(ngModel)]="emailConfig.smtpPort" class="w-full" type="number" placeholder="587" aria-label="587" (input)="markDirty.emit('email')" />
                </div>
                <div class="sc-field">
                  <label class="sc-label">{{ i18n.translate('tenantConfig.username') }}</label>
                  <input pInputText [(ngModel)]="emailConfig.smtpUser" class="w-full" placeholder="user@company.com" aria-label="user@company.com" (input)="markDirty.emit('email')" />
                </div>
                <div class="sc-field">
                  <label class="sc-label">{{ i18n.translate('tenantConfig.password') }}</label>
                  <input pInputText [(ngModel)]="emailConfig.smtpPass" class="w-full" type="password" (input)="markDirty.emit('email')" />
                </div>
                <div class="sc-field sc-wide">
                  <label class="sc-label">{{ i18n.translate('tenantConfig.fromEmail') }}</label>
                  <input pInputText [(ngModel)]="emailConfig.smtpFrom" class="w-full" placeholder="noreply@company.com" aria-label="noreply@company.com" (input)="markDirty.emit('email')" />
                </div>
              </div>
            </div>
          }

          <div class="sc-save-bar sc-save-bar-multi">
            @if (dirtyFlags['email']) {
              <span class="sc-unsaved"><i class="pi pi-exclamation-circle"></i> {{ i18n.translate('tenantConfig.unsavedChanges') }}</span>
            }
            <span class="sc-save-spacer"></span>
            <a class="sc-audit-link" (click)="navigateToAudit.emit('email_config')">
              <i class="pi pi-history"></i> {{ i18n.translate('tenantConfig.audit') }}
            </a>
            <p-button [label]="i18n.translate('tenantConfig.save')" icon="pi pi-save" (onClick)="saveEmailConfig.emit()" [loading]="emailSaving" />
            <p-button [label]="i18n.translate('tenantConfig.testConnection')" icon="pi pi-bolt" severity="info" (onClick)="testEmailConfig.emit()" [loading]="emailTesting" [disabled]="!emailConfig.enabled" />
            <p-button [label]="i18n.translate('tenantConfig.sendTestEmail')" icon="pi pi-send" severity="secondary" (onClick)="sendTestEmail.emit()" [loading]="emailSendingTest" [disabled]="!emailConfig.enabled" />
          </div>

          <div *ngIf="emailConfig.lastTestAt" class="sc-last-test">
            {{ i18n.translate('tenantConfig.lastTested') }} {{ emailConfig.lastTestAt | appDate:'medium' }}
            <p-tag [value]="emailConfig.lastTestResult?.success ? 'Passed' : 'Failed'" [severity]="emailConfig.lastTestResult?.success ? 'success' : 'danger'" class="ms-2" />
          </div>

          <div class="sc-platform-email">
            <h4 class="sc-provider-title"><i class="pi pi-cloud"></i> {{ i18n.translate('tenantConfig.platformEmailService') }}</h4>
            <p class="sc-desc">{{ i18n.translate('tenantConfig.ifYouDon')t have your own email server, you can request to use the platform email service. Requires admin approval.' }}</p>
            <div *ngIf="platformApproval" class="sc-approval-row">
              <span class="sc-label">{{ i18n.translate('tenantConfig.status') }}</span>
              <p-tag
                [value]="platformApproval.status === 'approved' ? (i18n.translate('tenantConfig.approved')) :
                         platformApproval.status === 'pending' ? (i18n.translate('tenantConfig.pending')) :
                         platformApproval.status === 'denied' ? (i18n.translate('tenantConfig.denied')) :
                         (i18n.translate('tenantConfig.revoked'))"
                [severity]="platformApproval.status === 'approved' ? 'success' : platformApproval.status === 'pending' ? 'warning' : 'danger'" />
              <span *ngIf="platformApproval.reviewNote" class="sc-desc">{{ platformApproval.reviewNote }}</span>
            </div>
            <div *ngIf="!platformApproval || platformApproval?.status === 'denied' || platformApproval?.status === 'revoked'" class="mt-2">
              <p-button
                [label]="i18n.translate('tenantConfig.requestPlatformEmailAccess')"
                icon="pi pi-send" severity="warning"
                (onClick)="requestPlatformEmailAccess.emit()"
                [loading]="platformApprovalRequesting" />
            </div>
          </div>
        </div>
      }
    </div>
  `,
    styles: [`
    .sc-card{background:var(--surface-card,#fff);border:1px solid var(--surface-border,var(--border-subtle));border-radius:var(--radius-lg);padding:24px;display:flex;flex-direction:column;gap:16px}
    .sc-section-header{display:flex;flex-direction:column;gap:4px;margin-bottom:4px}
    .sc-section-title-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
    .sc-card-title{margin:0;font-size:17px;font-weight:700;color:var(--text-heading,#111)}
    .sc-card-desc{margin:0;font-size:var(--font-size-sm);color:var(--text-muted,var(--text-muted))}
    .sc-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 20px}
    .sc-field{display:flex;flex-direction:column;gap:5px}
    .sc-wide{grid-column:1/-1}
    .sc-label{font-size:var(--font-size-sm);font-weight:600;color:var(--text-muted,var(--text-muted));letter-spacing:.2px}
    .sc-switch-row{display:flex;align-items:center;gap:10px;padding-top:2px}
    .sc-save-bar{display:flex;align-items:center;gap:8px;padding-top:12px;border-top:1px solid var(--surface-border,var(--border-subtle));margin-top:4px;flex-wrap:wrap}
    .sc-save-bar-multi{flex-wrap:wrap}
    .sc-save-spacer{flex:1}
    .sc-unsaved{display:flex;align-items:center;gap:6px;font-size:var(--font-size-sm);color:var(--warning);font-weight:600}
    .sc-unsaved .pi{font-size:var(--font-size-sm)}
    .sc-audit-link{display:inline-flex;align-items:center;gap:5px;font-size:var(--font-size-sm);color:var(--primary-600,#2563eb);cursor:pointer;font-weight:500;text-decoration:none;padding:6px 10px;border-radius:var(--radius-sm);transition:background .15s}
    .sc-audit-link:hover{background:var(--primary-50,#eff6ff);text-decoration:underline}
    .sc-loading{text-align:center;padding:32px;color:var(--text-muted)}
    .sc-conn-status{display:flex;align-items:center;gap:12px;padding:14px 18px;border-radius:var(--radius-md);border:1px solid var(--surface-border);margin-bottom:8px}
    .sc-conn-status .pi{font-size:var(--font-size-2xl)}
    .sc-conn-ok{border-color:#86efac;background:var(--status-success-bg, #defbe6)}
    .sc-conn-ok .pi{color:var(--success)}
    .sc-conn-err{border-color:#fca5a5;background:var(--status-danger-bg, #fff1f1)}
    .sc-conn-err .pi{color:var(--error)}
    .sc-conn-off{border-color:var(--surface-border);background:var(--surface-ground)}
    .sc-conn-off .pi{color:var(--text-muted)}
    .sc-conn-info{display:flex;flex-direction:column;gap:1px;flex:1}
    .sc-conn-label{font-size:var(--font-size-xs);font-weight:600;text-transform:uppercase;letter-spacing:.4px;color:var(--text-muted)}
    .sc-conn-value{font-size:var(--font-size-base);font-weight:700;color:var(--text-heading)}
    .sc-conn-err-msg{font-size:var(--font-size-sm);color:var(--error);max-width:200px;text-align:end}
    .sc-email-layout{display:flex;flex-direction:column;gap:16px}
    .sc-provider-block{padding:16px;background:var(--surface-ground,var(--surface-ice));border-radius:var(--radius-md);border:1px solid var(--surface-border)}
    .sc-provider-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:14px}
    .sc-provider-title{margin:0;font-size:var(--font-size-base);font-weight:700;color:var(--primary);display:flex;align-items:center;gap:8px}
    .sc-last-test{font-size:var(--font-size-sm);color:var(--text-muted);padding-top:4px}
    .sc-platform-email{padding:16px;background:var(--surface-ground);border-radius:var(--radius-md);border:1px solid var(--surface-border)}
    .sc-desc{font-size:var(--font-size-sm);color:var(--text-muted);margin:4px 0 8px}
    .sc-approval-row{display:flex;align-items:center;gap:10px;margin-top:8px}
    .sc-checklist{padding:14px 16px;background:var(--surface-ground);border-radius:var(--radius-md);border:1px solid var(--surface-border)}
    .sc-check-item{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:var(--font-size-sm);color:var(--text-muted)}
    .sc-check-item .pi{font-size:var(--font-size-base);color:var(--text-muted)}
    .sc-check-ok{color:var(--text-heading)}
    .sc-check-ok .pi{color:var(--success)}
    .sc-sub-title{margin:0 0 10px;font-size:var(--font-size-base);font-weight:700;color:var(--text-heading);display:flex;align-items:center;gap:8px}
    .sc-sub-title .pi{color:var(--primary-600,#2563eb)}
    .ms-2{margin-inline-start:8px}
    .mt-2{margin-top:8px}
    .mb-3{margin-bottom:12px}
    .w-full{width:100%}
    @media(max-width:768px){.sc-form-grid{grid-template-columns:1fr}}
  `]
})
export class TenantConfigEmailComponent {
  /** Email configuration object (two-way bound in parent) */
  @Input() emailConfig: GrcRecord = {};
  /** Whether email config is loading */
  @Input() emailConfigLoading = false;
  /** Whether email save is in progress */
  @Input() emailSaving = false;
  /** Whether email test is in progress */
  @Input() emailTesting = false;
  /** Whether test email send is in progress */
  @Input() emailSendingTest = false;
  /** Latest email test result */
  @Input() emailTestResult: GrcRecord = null;
  /** Available email provider options */
  @Input() emailProviderOptions: { label: string; value: string }[] = [];
  /** Platform email approval status */
  @Input() platformApproval: GrcRecord = null;
  /** Whether platform approval request is in progress */
  @Input() platformApprovalRequesting = false;
  /** Dirty flags record from parent */
  @Input() dirtyFlags: Record<string, boolean> = {};

  @Output() markDirty = new EventEmitter<string>();
  @Output() saveEmailConfig = new EventEmitter<void>();
  @Output() testEmailConfig = new EventEmitter<void>();
  @Output() sendTestEmail = new EventEmitter<void>();
  @Output() copyRedirectUrl = new EventEmitter<void>();
  @Output() requestPlatformEmailAccess = new EventEmitter<void>();
  @Output() navigateToAudit = new EventEmitter<string>();

  constructor(public i18n: I18nService) {}
}

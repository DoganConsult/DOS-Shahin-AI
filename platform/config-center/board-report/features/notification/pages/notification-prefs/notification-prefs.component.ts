import { inject, Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { DropdownModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcOperationsService } from '@app/api';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-notification-prefs',
    imports: [CommonModule, FormsModule, PageShellComponent, CardModule, InputSwitchModule, ButtonModule, ToastModule, TagModule, DropdownModule, ConfirmDialogModule],
    providers: [MessageService, ConfirmationService],
    template: `
    <app-page-shell icon="bell" title="Notification Preferences"
      subtitle="Configure notification channels, module alerts, and delivery schedules"
      [breadcrumbs]="['Profile', 'Notification Preferences']" [loading]="loading">

      <!-- Channel Section -->
      <div class="section">
        <div class="section-header">
          <i class="pi pi-send"></i>
          <h3>Delivery Channels</h3>
        </div>
        <div class="channel-grid">
          @for (ch of channels; track ch.key) {
            <div class="channel-card" [class.active]="prefs[ch.key]">
              <div class="channel-icon"><i class="pi" [ngClass]="ch.icon"></i></div>
              <div class="channel-info">
                <div class="channel-name">{{ ch.label }}</div>
                <div class="channel-desc">{{ ch.description }}</div>
              </div>
              <p-inputSwitch [(ngModel)]="prefs[ch.key]" />
            </div>
          }
        </div>
      </div>

      <!-- Module Alerts -->
      <div class="section">
        <div class="section-header">
          <i class="pi pi-th-large"></i>
          <h3>Module Alerts</h3>
        </div>
        <div class="module-grid">
          @for (mod of modules; track mod.key) {
            <div class="module-row">
              <div class="module-info">
                <i class="pi" [ngClass]="mod.icon"></i>
                <span class="module-name">{{ mod.label }}</span>
              </div>
              <div class="module-controls">
                <p-tag [value]="prefs[mod.key] ? 'On' : 'Off'" [severity]="prefs[mod.key] ? 'success' : 'warning'" />
                <p-inputSwitch [(ngModel)]="prefs[mod.key]" />
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Digest & Schedule -->
      <div class="section">
        <div class="section-header">
          <i class="pi pi-clock"></i>
          <h3>Digest & Schedule</h3>
        </div>
        <div class="digest-grid">
          <div class="digest-card">
            <div class="digest-info">
              <h4>Weekly Digest</h4>
              <p>Receive a weekly summary of all GRC activity</p>
            </div>
            <p-inputSwitch [(ngModel)]="prefs.weeklyDigest" />
          </div>
          <div class="digest-card">
            <div class="digest-info">
              <h4>Daily Summary</h4>
              <p>Get a daily briefing of critical alerts</p>
            </div>
            <p-inputSwitch [(ngModel)]="prefs.dailySummary" />
          </div>
          <div class="digest-card">
            <div class="digest-info">
              <h4>Real-time Critical</h4>
              <p>Immediate alerts for critical findings and breaches</p>
            </div>
            <p-inputSwitch [(ngModel)]="prefs.realtimeCritical" />
          </div>
          <div class="digest-card">
            <div class="digest-info">
              <h4>Quiet Hours</h4>
              <p>Suppress non-critical notifications 22:00–07:00</p>
            </div>
            <p-inputSwitch [(ngModel)]="prefs.quietHours" />
          </div>
        </div>
      </div>

      <!-- Escalation -->
      <div class="section">
        <div class="section-header">
          <i class="pi pi-arrow-up"></i>
          <h3>Escalation Rules</h3>
        </div>
        <div class="escalation-grid">
          <div class="escalation-row">
            <label>If no response within</label>
            <p-dropdown [options]="escalationOptions" [(ngModel)]="prefs.escalationHours" appendTo="body" />
            <span>hours, escalate to manager</span>
          </div>
          <div class="escalation-row">
            <label>Auto-acknowledge after</label>
            <p-dropdown [options]="autoAckOptions" [(ngModel)]="prefs.autoAcknowledgeHours" appendTo="body" />
            <span>hours of inactivity</span>
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <div class="save-section">
        <p-button label="Save All Preferences" icon="pi pi-save" (onClick)="save()" [loading]="saving" />
        <p-button label="Reset to Defaults" icon="pi pi-undo" [outlined]="true" severity="secondary" class="ml-2" (onClick)="resetDefaults()" />
      </div>
    </app-page-shell>
    <p-toast />
    <p-confirmDialog />
  `,
    styles: [`
    .section { margin-bottom: 28px; }
    .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
    .section-header i { font-size: var(--font-size-lg); color: var(--primary, #2563eb); }
    .section-header h3 { margin: 0; font-size: var(--font-size-md); font-weight: 600; color: var(--text-0); }

    .channel-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .channel-card { display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: var(--radius-lg); border: 1px solid var(--border, var(--border-subtle)); background: var(--bg-0, #fff); transition: all 200ms; }
    .channel-card.active { border-color: var(--primary, #2563eb); background: var(--bg-1, var(--surface-ice)); }
    .channel-icon { width: 40px; height: 40px; border-radius: var(--radius-md); background: var(--bg-1, var(--surface-ice)); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-lg); color: var(--primary); flex-shrink: 0; }
    .channel-info { flex: 1; min-width: 0; }
    .channel-name { font-size: var(--font-size-base); font-weight: 600; color: var(--text-0); }
    .channel-desc { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); margin-top: 2px; }

    .module-grid { display: flex; flex-direction: column; gap: 4px; max-width: 600px; }
    .module-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-radius: var(--radius); border: 1px solid var(--border, var(--border-subtle)); background: var(--bg-0, #fff); }
    .module-info { display: flex; align-items: center; gap: 10px; }
    .module-info i { font-size: var(--font-size-md); color: var(--primary); }
    .module-name { font-size: var(--font-size-base); font-weight: 500; }
    .module-controls { display: flex; align-items: center; gap: 10px; }

    .digest-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .digest-card { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-radius: var(--radius-lg); border: 1px solid var(--border, var(--border-subtle)); background: var(--bg-0, #fff); }
    .digest-info h4 { margin: 0; font-size: var(--font-size-base); font-weight: 600; }
    .digest-info p { margin: 4px 0 0; font-size: var(--font-size-sm); color: var(--text-muted); }

    .escalation-grid { display: flex; flex-direction: column; gap: 12px; max-width: 600px; }
    .escalation-row { display: flex; align-items: center; gap: 10px; font-size: var(--font-size-base); }
    .escalation-row label { font-weight: 500; }

    .save-section { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border, var(--border-subtle)); }
    .ml-2 { margin-inline-start: 8px; }
  `]
})
export class NotificationPrefsComponent implements OnInit {
  private confirmSvc = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);
  loading = false; saving = false;
  prefs: GrcRecord = {};

  channels = [
    { key: 'email', label: 'Email', icon: 'pi-envelope', description: 'Receive alerts via email' },
    { key: 'inApp', label: 'In-App', icon: 'pi-bell', description: 'Browser push notifications' },
    { key: 'slack', label: 'Slack', icon: 'pi-comment', description: 'Slack channel integration' },
    { key: 'sms', label: 'SMS', icon: 'pi-mobile', description: 'Text message alerts (critical only)' },
  ];

  modules = [
    { key: 'riskAlerts', label: 'Risk Alerts', icon: 'pi-exclamation-triangle' },
    { key: 'complianceAlerts', label: 'Compliance Alerts', icon: 'pi-shield' },
    { key: 'auditAlerts', label: 'Audit Alerts', icon: 'pi-search' },
    { key: 'incidentAlerts', label: 'Incident Alerts', icon: 'pi-bolt' },
    { key: 'vendorAlerts', label: 'Vendor Alerts', icon: 'pi-users' },
    { key: 'policyAlerts', label: 'Policy Changes', icon: 'pi-file' },
    { key: 'evidenceAlerts', label: 'Evidence Due', icon: 'pi-paperclip' },
    { key: 'workflowAlerts', label: 'Workflow Tasks', icon: 'pi-sitemap' },
  ];

  escalationOptions = [
    { label: '2 hours', value: 2 }, { label: '4 hours', value: 4 },
    { label: '8 hours', value: 8 }, { label: '24 hours', value: 24 },
  ];
  autoAckOptions = [
    { label: '12 hours', value: 12 }, { label: '24 hours', value: 24 },
    { label: '48 hours', value: 48 }, { label: 'Never', value: 0 },
  ];

  constructor(public i18n: I18nService, private msg: MessageService, private operationsSvc: GrcOperationsService) {}

  ngOnInit() {
    this.loading = true;
    this.operationsSvc.getNotificationPreferences().subscribe({
      next: (d) => { this.prefs = d || this.getDefaults(); this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.prefs = this.getDefaults(); this.loading = false; this.cdr.markForCheck(); }
    });
  }

  getDefaults(): GrcRecord {
    return {
      email: true, inApp: true, slack: false, sms: false,
      riskAlerts: true, complianceAlerts: true, auditAlerts: true,
      incidentAlerts: true, vendorAlerts: true, policyAlerts: true,
      evidenceAlerts: true, workflowAlerts: true,
      weeklyDigest: true, dailySummary: false, realtimeCritical: true, quietHours: false,
      escalationHours: 4, autoAcknowledgeHours: 24,
    };
  }

  save() {
    this.saving = true;
    this.operationsSvc.updateNotificationPreferences(this.prefs).subscribe({
      next: () => { this.saving = false; this.cdr.markForCheck(); this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.preferencesSaved') }); },
      error: (e) => { this.saving = false; this.cdr.markForCheck(); this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: e.error?.error || this.i18n.translate('common.failedToSave') }); }
    });
  }

  resetDefaults() {
    this.confirmSvc.confirm({
      message: 'Reset all notification preferences to defaults?',
      header: "Confirm",
      icon: "pi pi-exclamation-triangle",
      acceptButtonStyleClass: "p-button-danger",
      accept: () => {
      this.prefs = this.getDefaults();
      this.save();
      },
    });
  }
}

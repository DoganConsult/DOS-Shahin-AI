import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    selector: 'app-ai-settings',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, PageShellComponent, CardModule, TableModule, TagModule, ButtonModule, InputTextModule],
    template: `
    <app-page-shell icon="settings"
      [title]="i18n.translate('aiSettings.title')"
      [subtitle]="i18n.translate('aiSettings.subtitle')"
      [breadcrumbs]="['Dashboard', 'AI Settings']" [loading]="loading()">
      <div headerActions>
        <p-button icon="pi pi-refresh" [label]="i18n.translate('common.refresh')" severity="secondary" (onClick)="loadData()" />
      </div>

      <div class="grid">
        <div class="col-12 md:col-6 lg:col-3">
          <p-card header="Agents">
            <div class="text-3xl font-bold">{{ settings().agentCount }}</div>
            <div class="flex gap-2 mt-2">
              <p-tag value="Active: {{ settings().enabledAgents }}" severity="success" />
              <p-tag value="Disabled: {{ settings().disabledAgents }}" severity="danger" />
            </div>
          </p-card>
        </div>
        <div class="col-12 md:col-6 lg:col-3">
          <p-card header="Policy Rules">
            <div class="text-3xl font-bold">{{ settings().policyStats?.totalRules || 0 }}</div>
            <div class="flex gap-2 mt-2">
              <p-tag value="Enabled: {{ settings().policyStats?.enabledRules || 0 }}" severity="success" />
              <p-tag value="Block: {{ settings().policyStats?.blockRules || 0 }}" severity="danger" />
            </div>
          </p-card>
        </div>
        <div class="col-12 md:col-6 lg:col-3">
          <p-card header="Signals">
            <div class="text-3xl font-bold">{{ settings().signalStats?.totalSignals || 0 }}</div>
            <div class="flex gap-2 mt-2">
              <p-tag value="Codes: {{ settings().signalStats?.uniqueCodes || 0 }}" severity="info" />
              <p-tag value="Warnings: {{ settings().signalStats?.warningCount || 0 }}" severity="warning" />
            </div>
          </p-card>
        </div>
        <div class="col-12 md:col-6 lg:col-3">
          <p-card header="Health">
            <div class="text-3xl font-bold" [ngClass]="{'text-green-500': health().status === 'healthy', 'text-orange-500': health().status === 'degraded'}">
              {{ health().status || 'any' | uppercase }}
            </div>
          </p-card>
        </div>
      </div>

      <div class="grid mt-3">
        <div class="col-12 lg:col-6">
          <p-card header="Data Retention">
            <div class="flex flex-column gap-2">
              <div class="flex justify-content-between align-items-center">
                <span>Signal retention</span>
                <p-tag value="{{ settings().retentionDays?.signals || 90 }} days" severity="info" />
              </div>
              <div class="flex justify-content-between align-items-center">
                <span>Decision retention</span>
                <p-tag value="{{ settings().retentionDays?.decisions || 180 }} days" severity="info" />
              </div>
            </div>
            <div class="flex gap-2 mt-3">
              <p-button label="Prune Signals" severity="warning" [outlined]="true" (onClick)="pruneSignals()" />
              <p-button label="Prune Decisions" severity="warning" [outlined]="true" (onClick)="pruneDecisions()" />
            </div>
          </p-card>
        </div>
        <div class="col-12 lg:col-6">
          <p-card header="Operational Alerts">
            <p-table [value]="alerts()" responsiveLayout="scroll">
              <ng-template pTemplate="header">
                <tr><th>Level</th><th>Source</th><th>Message</th></tr>
              </ng-template>
              <ng-template pTemplate="body" let-a>
                <tr>
                  <td><p-tag [value]="a.level" [severity]="getAlertSeverity(a.level)" /></td>
                  <td>{{ a.source }}</td>
                  <td>{{ a.message }}</td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr><td colspan="3" class="text-center p-4">No active alerts</td></tr>
              </ng-template>
            </p-table>
          </p-card>
        </div>
      </div>

      <div class="grid mt-3">
        <div class="col-12">
          <p-card header="Webhook Test">
            <div class="flex gap-2 align-items-end">
              <div class="flex flex-column gap-1 flex-grow-1">
                <label>Webhook URL (HTTPS only)</label>
                <input pInputText [(ngModel)]="webhookUrl" placeholder="https://example.com/webhook" class="w-full" />
              </div>
              <p-button label="Test" icon="pi pi-send" (onClick)="testWebhook()" />
            </div>
            <div *ngIf="webhookResult()" class="mt-2">
              <p-tag [value]="webhookResult()!.success ? 'Success' : 'Failed'" [severity]="webhookResult()!.success ? 'success' : 'danger'" />
              <span class="ml-2 text-sm text-color-secondary">{{ webhookResult()!.message }}</span>
            </div>
          </p-card>
        </div>
      </div>
    </app-page-shell>
  `
})
export class AiSettingsComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
  loading = signal(true);
  settings = signal<GrcRecord>({});
  health = signal<GrcRecord>({});
  alerts = signal<GrcRecord[]>([]);
  webhookUrl = '';
  webhookResult = signal<{ success: boolean; message: string } | null>(null);

  ngOnInit() { this.loadData(); }

  loadData() {
    this.loading.set(true);
    let pending = 3;
    const done = () => { pending--; if (pending <= 0) this.loading.set(false); };

    this.apiclientSvc.get('/api/ai-os/settings').subscribe({ next: (r) => this.settings.set(r || {}), complete: done, error: done });
    this.apiclientSvc.get('/api/ai-os/health').subscribe({ next: (r) => this.health.set(r || {}), complete: done, error: done });
    this.apiclientSvc.get('/api/ai-os/alerts').subscribe({ next: (r) => this.alerts.set(r?.items || []), complete: done, error: done });
  }

  pruneSignals() {
    this.apiclientSvc.post('/api/ai-os/maintenance/prune-signals', { retentionDays: 90 }).subscribe({ next: () => this.loadData() });
  }

  pruneDecisions() {
    this.apiclientSvc.post('/api/ai-os/maintenance/prune-decisions', { retentionDays: 180 }).subscribe({ next: () => this.loadData() });
  }

  testWebhook() {
    if (!this.webhookUrl) return;
    this.webhookResult.set(null);
    this.apiclientSvc.post('/api/ai-os/webhook/test', { url: this.webhookUrl }).subscribe({
      next: (r) => this.webhookResult.set({ success: r?.success, message: r?.success ? `HTTP ${r.status}` : r?.error || 'Failed' }),
      error: (err) => this.webhookResult.set({ success: false, message: err.message }),
    });
  }

  getAlertSeverity(level: string): 'success' | 'warning' | 'danger' | 'info' {
    switch (level) {
      case 'critical': return 'danger';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'info';
    }
  }
}

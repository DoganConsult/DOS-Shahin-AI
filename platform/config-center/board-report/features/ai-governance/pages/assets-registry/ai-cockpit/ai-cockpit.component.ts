import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    selector: 'app-ai-cockpit',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, PageShellComponent, CardModule, TableModule, TagModule, ButtonModule],
    template: `
    <app-page-shell icon="activity"
      [title]="i18n.translate('aiCockpit.title')"
      [subtitle]="i18n.translate('aiCockpit.subtitle')"
      [breadcrumbs]="['Dashboard', 'AI Cockpit']" [loading]="loading()">
      <div headerActions>
        <p-button icon="pi pi-refresh" [label]="i18n.translate('common.refresh')" severity="secondary" (onClick)="loadData()" />
      </div>

      <div class="grid">
        <div class="col-12 md:col-6 lg:col-3">
          <p-card header="Signals">
            <div class="text-3xl font-bold">{{ signalStats().totalSignals }}</div>
            <div class="text-sm text-color-secondary mt-1">{{ signalStats().uniqueCodes }} unique codes</div>
            <div class="flex gap-2 mt-2">
              <p-tag value="Warnings: {{ signalStats().warningCount }}" severity="warning" />
              <p-tag value="Critical: {{ signalStats().criticalCount }}" severity="danger" />
            </div>
          </p-card>
        </div>
        <div class="col-12 md:col-6 lg:col-3">
          <p-card header="Decisions (24h)">
            <div class="text-3xl font-bold">{{ decisionStats().total }}</div>
            <div class="text-sm text-color-secondary mt-1">across all agents</div>
          </p-card>
        </div>
        <div class="col-12 md:col-6 lg:col-3">
          <p-card header="Recommendations">
            <div class="text-3xl font-bold">{{ recStats().total }}</div>
            <div class="flex gap-2 mt-2">
              <p-tag value="Pending: {{ recStats().pending }}" severity="warning" />
              <p-tag value="Accepted: {{ recStats().accepted }}" severity="success" />
            </div>
          </p-card>
        </div>
        <div class="col-12 md:col-6 lg:col-3">
          <p-card header="Policy Rules">
            <div class="text-3xl font-bold">{{ policyStats().totalRules }}</div>
            <div class="flex gap-2 mt-2">
              <p-tag value="Active: {{ policyStats().enabledRules }}" severity="success" />
              <p-tag value="Block: {{ policyStats().blockRules }}" severity="danger" />
            </div>
          </p-card>
        </div>
      </div>

      <div class="grid mt-3">
        <div class="col-12 lg:col-6">
          <p-card header="Latest Signals">
            <p-table [value]="signals()" [rows]="10" [paginator]="true" responsiveLayout="scroll">
              <ng-template pTemplate="header">
                <tr><th>Code</th><th>Severity</th><th>Value</th><th>Recorded</th></tr>
              </ng-template>
              <ng-template pTemplate="body" let-s>
                <tr>
                  <td>{{ s.signal_code }}</td>
                  <td><p-tag [value]="s.severity" [severity]="getSeverity(s.severity)" /></td>
                  <td>{{ s.signal_value }}</td>
                  <td>{{ s.recorded_at | date:'short' }}</td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr><td colspan="4" class="text-center p-4">No signals</td></tr>
              </ng-template>
            </p-table>
          </p-card>
        </div>
        <div class="col-12 lg:col-6">
          <p-card header="Stuck Runs">
            <p-table [value]="stuckRuns()" responsiveLayout="scroll">
              <ng-template pTemplate="header">
                <tr><th>Run ID</th><th>Agent</th><th>Duration</th><th>Actions</th></tr>
              </ng-template>
              <ng-template pTemplate="body" let-r>
                <tr>
                  <td>{{ r.run_id | slice:0:8 }}...</td>
                  <td>{{ r.agent_id }}</td>
                  <td>{{ (r.duration_ms / 1000).toFixed(0) }}s</td>
                  <td><p-button icon="pi pi-times" severity="danger" [text]="true" label="Cancel" (onClick)="cancelRun(r)" /></td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr><td colspan="4" class="text-center p-4">No stuck runs</td></tr>
              </ng-template>
            </p-table>
          </p-card>
        </div>
      </div>
    </app-page-shell>
  `
})
export class AiCockpitComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
  loading = signal(true);
  signals = signal<GrcRecord[]>([]);
  stuckRuns = signal<GrcRecord[]>([]);
  signalStats = signal<GrcRecord>({ totalSignals: 0, uniqueCodes: 0, warningCount: 0, criticalCount: 0 });
  decisionStats = signal<GrcRecord>({ total: 0 });
  recStats = signal<GrcRecord>({ total: 0, pending: 0, accepted: 0, rejected: 0 });
  policyStats = signal<GrcRecord>({ totalRules: 0, enabledRules: 0, blockRules: 0, warnRules: 0 });

  ngOnInit() { this.loadData(); }

  loadData() {
    this.loading.set(true);
    let pending = 5;
    const done = () => { pending--; if (pending <= 0) this.loading.set(false); };

    this.apiclientSvc.get('/api/ai-os/signals').subscribe({ next: (r) => this.signals.set(r?.items || []), complete: done, error: done });
    this.apiclientSvc.get('/api/ai-os/stuck-runs').subscribe({ next: (r) => this.stuckRuns.set(r?.items || []), complete: done, error: done });
    this.apiclientSvc.get('/api/ai-os/signals/stats').subscribe({ next: (r) => this.signalStats.set(r || {}), complete: done, error: done });
    this.apiclientSvc.get('/api/ai-os/decisions/stats/summary').subscribe({ next: (r) => this.decisionStats.set(r || {}), complete: done, error: done });
    this.apiclientSvc.get('/api/ai-os/recommendations/stats').subscribe({ next: (r) => this.recStats.set(r || {}), complete: done, error: done });
    this.apiclientSvc.get('/api/ai-os/policy-rules/stats').subscribe({ next: (r) => this.policyStats.set(r || {}), complete: done, error: done });
  }

  cancelRun(r: GrcRecord) {
    this.apiclientSvc.post(`/api/ai-os/stuck-runs/${r.run_id}/cancel`, {}).subscribe({ next: () => this.loadData() });
  }

  getSeverity(sev: string): 'success' | 'warning' | 'danger' | 'info' {
    switch (sev) {
      case 'critical': return 'danger';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'success';
    }
  }
}

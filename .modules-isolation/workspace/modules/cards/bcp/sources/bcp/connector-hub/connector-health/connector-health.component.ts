import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { DropdownModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-connector-health',
  standalone: true,
  imports: [CommonModule, AppDatePipe, AppNumberPipe, FormsModule, PageShellComponent, CardModule, TableModule, TagModule, ButtonModule, ToolbarModule, DropdownModule, DialogModule, ProgressBarModule, TooltipModule],
  template: `
    <app-page-shell icon="link" [title]="i18n.translate('grcOs.connectorHealth')"
      [subtitle]="'Monitor evidence automation connectors, uptime, and sync status'"
      [breadcrumbs]="['Dashboard', 'Connectors']" [loading]="loading">

      <!-- Health Summary -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-icon-wrap"><i class="pi pi-link"></i></div>
          <div>
            <div class="kpi-value">{{ connectors.length }}</div>
            <div class="kpi-label">Total Connectors</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon-wrap green"><i class="pi pi-check-circle"></i></div>
          <div>
            <div class="kpi-value">{{ countByStatus('healthy') }}</div>
            <div class="kpi-label">Healthy</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon-wrap orange"><i class="pi pi-exclamation-triangle"></i></div>
          <div>
            <div class="kpi-value">{{ countByStatus('degraded') }}</div>
            <div class="kpi-label">Degraded</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon-wrap red"><i class="pi pi-times-circle"></i></div>
          <div>
            <div class="kpi-value">{{ countByStatus('error') + countByStatus('offline') }}</div>
            <div class="kpi-label">Error / Offline</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon-wrap blue"><i class="pi pi-percentage"></i></div>
          <div>
            <div class="kpi-value">{{ uptimeAvg() | appNumber:'decimal':'1.0-1' }}%</div>
            <div class="kpi-label">Avg Uptime</div>
          </div>
        </div>
      </div>

      <!-- Toolbar -->
      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-button label="Test All" icon="pi pi-play" severity="success" (onClick)="testAll()" [loading]="testingAll" />
          <p-button label="Refresh" icon="pi pi-refresh" [outlined]="true" class="ml-2" (onClick)="ngOnInit()" />
        </ng-template>
        <ng-template pTemplate="end">
          <p-dropdown [options]="statusOptions" [(ngModel)]="filterStatus" placeholder="All Statuses" [showClear]="true" />
        </ng-template>
      </p-toolbar>

      <!-- Connector Table -->
      <p-table aria-label="Data table" [value]="filteredConnectors()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm p-datatable-striped"
        [rowHover]="true" [showCurrentPageReport]="true"
        currentPageReportTemplate="{totalRecords} connectors">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="name">Connector <p-sortIcon field="name" /></th>
            <th>Type</th>
            <th pSortableColumn="status">Status <p-sortIcon field="status" /></th>
            <th>Uptime</th>
            <th pSortableColumn="last_run">Last Sync <p-sortIcon field="last_run" /></th>
            <th>Failures (30d)</th>
            <th>Latency</th>
            <th style="width:140px">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-c>
          <tr>
            <td>
              <div class="connector-name">
                <i class="pi" [ngClass]="typeIcon(c.connector_type)"></i>
                <span class="font-semibold">{{ c.name }}</span>
              </div>
            </td>
            <td><p-tag [value]="c.connector_type || 'api'" /></td>
            <td>
              <div class="status-cell">
                <span class="status-dot" [class.dot-green]="c.status === 'healthy'" [class.dot-orange]="c.status === 'degraded'" [class.dot-red]="c.status === 'error' || c.status === 'offline'"></span>
                <p-tag [value]="c.status || 'any'" [severity]="statusSeverity(c.status)" />
              </div>
            </td>
            <td>
              <div class="uptime-cell">
                <span>{{ (c.uptime_pct || 0) | appNumber:'decimal':'1.1-1' }}%</span>
                <p-progressBar [value]="c.uptime_pct || 0" [showValue]="false" [style]="{ height: '4px', width: '60px' }" />
              </div>
            </td>
            <td>{{ c.last_run | appDate:'short' }}</td>
            <td class="text-center">
              <span [class.text-red]="(c.failure_count || 0) > 5">{{ c.failure_count || 0 }}</span>
            </td>
            <td>
              <span class="latency" [class.slow]="(c.latency_ms || 0) > 2000">{{ c.latency_ms || '—' }}ms</span>
            </td>
            <td>
              <div class="action-btns">
                <p-button icon="pi pi-play" [text]="true" [rounded]="true" severity="success" (onClick)="runConnector(c)" pTooltip="Run Now" />
                <p-button icon="pi pi-heart" [text]="true" [rounded]="true" severity="info" (onClick)="testHealth(c)" pTooltip="Health Check" />
                <p-button icon="pi pi-history" [text]="true" [rounded]="true" (onClick)="showLogs(c)" pTooltip="Logs" />
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8" class="text-center p-4">
            <i class="pi pi-link" style="font-size: var(--font-size-4xl);color:var(--text-muted)"></i>
            <p style="margin-top:8px">No connectors configured</p>
          </td></tr>
        </ng-template>
      </p-table>

      <!-- Sync Log Dialog -->
      <p-dialog [header]="'Sync Log: ' + (selectedConnector?.name || '')" [(visible)]="showLogDialog" [modal]="true" [style]="{ width: '700px' }">
        <p-table aria-label="Sync Logs table" [value]="syncLogs" [rows]="10" [paginator]="true" styleClass="p-datatable-sm" *ngIf="syncLogs?.length">
          <ng-template pTemplate="header">
            <tr><th>Time</th><th>Action</th><th>Records</th><th>Duration</th><th>Status</th><th>Error</th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-l>
            <tr>
              <td>{{ l.started_at | appDate:'short' }}</td>
              <td>{{ l.action || 'sync' }}</td>
              <td>{{ l.records_synced || 0 }}</td>
              <td>{{ l.duration_ms || '—' }}ms</td>
              <td><p-tag [value]="l.status || 'completed'" [severity]="l.status === 'failed' ? 'danger' : 'success'" /></td>
              <td class="truncate">{{ l.error_message || '—' }}</td>
            </tr>
          </ng-template>
        </p-table>
        <div *ngIf="!syncLogs?.length" class="text-center p-4">No sync logs available</div>
      </p-dialog>
    </app-page-shell>
  `,
  styles: [`
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(185px, 1fr)); gap: 14px; margin-bottom: 20px; }
    .kpi-card { display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: var(--radius-lg); background: var(--bg-1, var(--surface-ice)); border: 1px solid var(--border, var(--border-subtle)); }
    .kpi-icon-wrap { width: 42px; height: 42px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; background: var(--primary-light, #eff6ff); color: var(--primary, #2563eb); font-size: var(--font-size-xl); }
    .kpi-icon-wrap.green { background: var(--status-success-bg, #defbe6); color: var(--success); }
    .kpi-icon-wrap.orange { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .kpi-icon-wrap.red { background: var(--status-danger-bg, #fff1f1); color: var(--error); }
    .kpi-icon-wrap.blue { background: #eff6ff; color: var(--primary); }
    .kpi-value { font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-0); }
    .kpi-label { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .mb-3 { margin-bottom: 16px; } .ml-2 { margin-inline-start: 8px; }
    .connector-name { display: flex; align-items: center; gap: 8px; }
    .connector-name i { font-size: var(--font-size-md); color: var(--primary); }
    .font-semibold { font-weight: 600; }
    .status-cell { display: flex; align-items: center; gap: 6px; }
    .status-dot { width: 8px; height: 8px; border-radius: var(--radius-pill); }
    .dot-green { background: var(--success); } .dot-orange { background: var(--warning); } .dot-red { background: var(--error); }
    .uptime-cell { display: flex; align-items: center; gap: 8px; }
    .latency { font-family: monospace; font-size: var(--font-size-sm); } .latency.slow { color: var(--error); font-weight: 600; }
    .text-red { color: var(--error); font-weight: 600; }
    .action-btns { display: flex; gap: 2px; }
    .truncate { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .text-center { text-align: center; } .p-4 { padding: 16px; }
  `]
})
export class ConnectorHealthComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = false; connectors: Record<string, unknown>[] = []; syncLogs: Record<string, unknown>[] = [];
  testingAll = false; showLogDialog = false; selectedConnector: Record<string, unknown> | null = null;
  filterStatus = '';
  statusOptions = [
    { label: 'Healthy', value: 'healthy' }, { label: 'Degraded', value: 'degraded' },
    { label: 'Error', value: 'error' }, { label: 'Offline', value: 'offline' },
  ];

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit() {
    this.loading = true;
    this.apiclientSvc.get('/connectors').subscribe({
      next: (data: any) => { this.connectors = data.connectors || data || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  filteredConnectors(): Record<string, unknown>[] {
    if (!this.filterStatus) return this.connectors;
    return this.connectors.filter(c => c.status === this.filterStatus);
  }

  countByStatus(s: string): number { return this.connectors.filter(c => c.status === s).length; }
  uptimeAvg(): number {
    if (!this.connectors.length) return 0;
    return this.connectors.reduce((s, c) => s + (c.uptime_pct || 0), 0) / this.connectors.length;
  }

  runConnector(c: Record<string, unknown>) {
    this.apiclientSvc.post(`/connectors/${c.connector_id || c.id}/run`, {}).subscribe({ next: () => this.ngOnInit() });
  }

  testHealth(c: Record<string, unknown>) {
    this.apiclientSvc.get(`/connector-health/${c.connector_id || c.id}/health`).subscribe({
      next: (r: Record<string, unknown>) => {
        const idx = this.connectors.findIndex(x => (x.connector_id || x.id) === (c.connector_id || c.id));
        if (idx >= 0) this.connectors[idx] = { ...this.connectors[idx], ...r };
      }
    });
  }

  testAll() {
    this.testingAll = true;
    this.apiclientSvc.post('/connectors/test-all', {}).subscribe({
      next: () => { this.testingAll = false; this.ngOnInit(); },
      error: () => { this.testingAll = false; }
    });
  }

  showLogs(c: Record<string, unknown>) {
    this.selectedConnector = c;
    this.apiclientSvc.get(`/connectors/${c.connector_id || c.id}/logs`).subscribe({
      next: (d: Record<string, unknown>) => { this.syncLogs = Array.isArray(d) ? d : d.logs || []; this.showLogDialog = true; },
      error: () => { this.syncLogs = []; this.showLogDialog = true; }
    });
  }

  statusSeverity(s: string): 'success' | 'warning' | 'danger' | 'info' {
    const m: Record<string, unknown> = { healthy: 'success', degraded: 'warning', error: 'danger', offline: 'danger' };
    return m[s] || 'info';
  }

  typeIcon(type: string): string {
    const m: Record<string, string> = { api: 'pi-cloud', database: 'pi-database', file: 'pi-file', email: 'pi-envelope', webhook: 'pi-bolt', jira: 'pi-ticket', slack: 'pi-comment' };
    return m[type] || 'pi-link';
  }
}

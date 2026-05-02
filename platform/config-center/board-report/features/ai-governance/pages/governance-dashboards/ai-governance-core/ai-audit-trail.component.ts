import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components';
import { AiBadgeComponent } from '@app/shared/components/ai/ai-badge.component';
import { environment } from '@env/environment';

interface AiAuditLogEntry {
  id: string;
  tenantId: string;
  userId: string;
  agentId: string;
  action: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  costUsd: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
  createdAt: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-audit-trail',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent, AiBadgeComponent],
  template: `
    <div class="audit-trail-page" [dir]="i18n.direction()">
      <header class="page-header">
        <div class="title-row">
          <div class="icon-wrap"><i class="pi pi-history"></i></div>
          <div>
            <h1>{{ i18n.translate('ai.auditTrail.title') }} <app-ai-badge variant="subtle" label="Audit" /></h1>
            <p class="subtitle">{{ i18n.translate('ai.auditTrail.subtitle') }}</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline" (click)="exportCsv()"><i class="pi pi-download"></i> Export CSV</button>
          <button class="btn btn-primary" (click)="loadAuditLogs()"><i class="pi pi-refresh"></i> Refresh</button>
        </div>
      </header>

      <div class="toolbar">
        <input class="search-input" type="text" placeholder="Search by agent, action, model..." [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event); applyFilters()">
        <select class="filter-select" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event); applyFilters()">
          <option value="">All Statuses</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
          <option value="timeout">Timeout</option>
        </select>
        <select class="filter-select" [ngModel]="agentFilter()" (ngModelChange)="agentFilter.set($event); applyFilters()">
          <option value="">All Agents</option>
          @for (a of uniqueAgents(); track a) {
            <option [value]="a">{{ a }}</option>
          }
        </select>
      </div>

      <div class="stats-strip">
        <div class="stat-card">
          <div class="stat-value">{{ filteredLogs().length }}</div>
          <div class="stat-label">Total Entries</div>
        </div>
        <div class="stat-card">
          <div class="stat-value success-text">{{ successCount() }}</div>
          <div class="stat-label">Success</div>
        </div>
        <div class="stat-card">
          <div class="stat-value error-text">{{ errorCount() }}</div>
          <div class="stat-label">Errors</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ avgLatency() }}ms</div>
          <div class="stat-label">Avg Latency</div>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state"><i class="pi pi-spin pi-spinner"></i> Loading audit trail...</div>
      } @else if (!filteredLogs().length) {
        <app-empty-state icon="pi-history" title="No Audit Entries" message="AI audit trail will populate as AI features are used." />
      } @else {
        <table class="audit-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Agent</th>
              <th>Action</th>
              <th>Model</th>
              <th>Tokens (In/Out)</th>
              <th>Latency</th>
              <th>Cost</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            @for (entry of paginatedLogs(); track entry.id) {
              <tr [class.error-row]="entry.status === 'error'" [class.timeout-row]="entry.status === 'timeout'">
                <td class="ts-cell">{{ entry.createdAt | date:'short' }}</td>
                <td class="agent-cell">{{ entry.agentId }}</td>
                <td>{{ entry.action }}</td>
                <td><span class="model-badge">{{ entry.model }}</span></td>
                <td>{{ formatNumber(entry.inputTokens) }} / {{ formatNumber(entry.outputTokens) }}</td>
                <td>{{ entry.latencyMs }}ms</td>
                <td class="cost-cell">{{ entry.costUsd ? formatCurrency(entry.costUsd) : '-' }}</td>
                <td>
                  <span class="status-badge" [class.st-success]="entry.status === 'success'" [class.st-error]="entry.status === 'error'" [class.st-timeout]="entry.status === 'timeout'">
                    {{ entry.status }}
                  </span>
                </td>
              </tr>
            }
          </tbody>
        </table>
        <div class="pagination">
          <span>Showing {{ (page() - 1) * pageSize + 1 }}-{{ Math.min(page() * pageSize, filteredLogs().length) }} of {{ filteredLogs().length }}</span>
          <div class="page-btns">
            <button class="page-btn" [disabled]="page() === 1" (click)="page.set(page() - 1)">Prev</button>
            <button class="page-btn" [disabled]="page() * pageSize >= filteredLogs().length" (click)="page.set(page() + 1)">Next</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .audit-trail-page { min-height: 100vh; background: var(--surface-ground); padding: 24px 28px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .title-row { display: flex; align-items: center; gap: 14px; }
    .icon-wrap { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; background: var(--indigo-50, #eef2ff); }
    .icon-wrap i { font-size: var(--font-size-2xl); color: var(--indigo-600); }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .subtitle { margin: 2px 0 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .header-actions { display: flex; gap: 8px; }
    .btn { padding: 8px 18px; border-radius: var(--radius); border: none; font-size: var(--font-size-base); cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 6px; }
    .btn-primary { background: var(--primary-500); color: #fff; }
    .btn-outline { background: var(--surface-card); border: 1px solid var(--surface-border); color: var(--text-color); }
    .toolbar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .search-input { padding: 8px 14px; border: 1px solid var(--surface-border); border-radius: var(--radius); font-size: var(--font-size-base); min-width: 260px; }
    .filter-select { padding: 8px 12px; border-radius: var(--radius); border: 1px solid var(--surface-border); font-size: var(--font-size-xs-plus); }
    .stats-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .stat-card { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 14px; text-align: center; }
    .stat-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .stat-label { font-size: var(--font-size-2xs); color: var(--text-color-secondary); margin-top: 2px; }
    .success-text { color: var(--green-600); }
    .error-text { color: var(--red-600); }
    .loading-state { text-align: center; padding: 60px; color: var(--text-color-secondary); }
    .audit-table { width: 100%; border-collapse: collapse; background: var(--surface-card); border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--surface-border); }
    .audit-table th { padding: 10px 14px; text-align: start; font-size: var(--font-size-2xs); font-weight: 600; color: var(--text-color-secondary); text-transform: uppercase; letter-spacing: 0.5px; background: var(--surface-50); border-bottom: 1px solid var(--surface-border); }
    .audit-table td { padding: 10px 14px; font-size: var(--font-size-xs-plus); border-bottom: 1px solid var(--surface-50); }
    .audit-table tr:hover td { background: var(--surface-50); }
    .error-row td { background: var(--red-50, #fef2f2); }
    .timeout-row td { background: var(--yellow-50, #fefce8); }
    .ts-cell { white-space: nowrap; font-size: var(--font-size-sm); color: var(--text-color-secondary); }
    .agent-cell { font-weight: 600; }
    .model-badge { padding: 2px 8px; border-radius: var(--radius-sm); font-size: 0.625rem; background: var(--primary-50); color: var(--primary-700); font-weight: 500; }
    .cost-cell { font-weight: 600; }
    .status-badge { padding: 2px 10px; border-radius: var(--radius-md); font-size: 0.625rem; font-weight: 600; text-transform: uppercase; }
    .st-success { background: var(--green-50); color: var(--green-700); }
    .st-error { background: var(--red-50); color: var(--red-700); }
    .st-timeout { background: var(--yellow-50); color: var(--yellow-700); }
    .pagination { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; font-size: var(--font-size-xs-plus); color: var(--text-color-secondary); }
    .page-btns { display: flex; gap: 4px; }
    .page-btn { padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--surface-border); background: var(--surface-card); cursor: pointer; font-size: var(--font-size-xs-plus); }
    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  `],
})
export class AiAuditTrailComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  readonly Math = Math;

  readonly loading = signal(true);
  readonly logs = signal<AiAuditLogEntry[]>([]);
  readonly filteredLogs = signal<AiAuditLogEntry[]>([]);
  readonly page = signal(1);
  readonly pageSize = 50;

  readonly searchTerm = signal('');
  readonly statusFilter = signal('');
  readonly agentFilter = signal('');
  readonly uniqueAgents = signal<string[]>([]);

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  loadAuditLogs(): void {
    this.loading.set(true);
    this.http
      .get<{ success: boolean; data: AiAuditLogEntry[] }>(`${environment.apiUrl}/ai-governance/ops/audit-trail`, {
        params: { limit: '500' },
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of({ success: false, data: [] as AiAuditLogEntry[] })),
      )
      .subscribe((res) => {
        const data = res.data || [];
        this.logs.set(data);
        this.filteredLogs.set(data);
        this.uniqueAgents.set([...new Set(data.map((e) => e.agentId))]);
        this.loading.set(false);
      });
  }

  applyFilters(): void {
    let result = this.logs();
    const search = this.searchTerm().toLowerCase();
    const status = this.statusFilter();
    const agent = this.agentFilter();

    if (search) {
      result = result.filter(
        (e) =>
          e.agentId.toLowerCase().includes(search) ||
          e.action.toLowerCase().includes(search) ||
          e.model.toLowerCase().includes(search),
      );
    }
    if (status) result = result.filter((e) => e.status === status);
    if (agent) result = result.filter((e) => e.agentId === agent);

    this.filteredLogs.set(result);
    this.page.set(1);
  }

  paginatedLogs(): AiAuditLogEntry[] {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredLogs().slice(start, start + this.pageSize);
  }

  successCount(): number {
    return this.filteredLogs().filter((e) => e.status === 'success').length;
  }

  errorCount(): number {
    return this.filteredLogs().filter((e) => e.status !== 'success').length;
  }

  avgLatency(): number {
    const logs = this.filteredLogs();
    if (!logs.length) return 0;
    return Math.round(logs.reduce((sum, e) => sum + e.latencyMs, 0) / logs.length);
  }

  exportCsv(): void {
    const rows = this.filteredLogs();
    const header = 'Timestamp,Agent,Action,Model,InputTokens,OutputTokens,LatencyMs,CostUsd,Status\n';
    const csv =
      header +
      rows
        .map(
          (r) =>
            `${r.createdAt},${r.agentId},${r.action},${r.model},${r.inputTokens},${r.outputTokens},${r.latencyMs},${r.costUsd || 0},${r.status}`,
        )
        .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 }).format(val);
  }

  formatNumber(val: number): string {
    return new Intl.NumberFormat('en-US').format(val);
  }
}

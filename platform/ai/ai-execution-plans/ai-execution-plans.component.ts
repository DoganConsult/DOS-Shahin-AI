import { Component, OnInit, inject, DestroyRef, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, catchError, of } from 'rxjs';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { GrcLiveService } from '../../core/interceptors/grc-live.service';
import { AGRCOSService } from '@app/services/agrc-os.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-execution-plans',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    PageShellComponent, AiPanelComponent,
    TableModule, TagModule, ToolbarModule, ButtonModule,
    InputTextModule, TooltipModule,
  ],
  template: `
    <app-page-shell
      icon="microchip-ai"
      [title]="i18n.translate('aiExecutionPlans.title')"
      [subtitle]="i18n.translate('aiExecutionPlans.subtitle')"
      [breadcrumbs]="['Dashboard', 'AI Execution Plans']"
      [loading]="!loaded()">

      <!-- ===== KPI Strip ===== -->
      <div class="kpi-strip">
        <div class="kpi-card">
          <div class="kpi-icon agents"><i class="pi pi-users"></i></div>
          <div class="kpi-body">
            <span class="kpi-value">{{ kpis().totalAgents }}</span>
            <span class="kpi-label">{{ i18n.translate('aiExecutionPlans.totalAgents') }}</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon runs"><i class="pi pi-play"></i></div>
          <div class="kpi-body">
            <span class="kpi-value">{{ kpis().activeRuns }}</span>
            <span class="kpi-label">{{ i18n.translate('aiExecutionPlans.activeRuns') }}</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon success"><i class="pi pi-check-circle"></i></div>
          <div class="kpi-body">
            <span class="kpi-value">{{ kpis().successRate }}%</span>
            <span class="kpi-label">{{ i18n.translate('aiExecutionPlans.successRate') }}</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon duration"><i class="pi pi-clock"></i></div>
          <div class="kpi-body">
            <span class="kpi-value">{{ kpis().avgDuration }}<small>ms</small></span>
            <span class="kpi-label">{{ i18n.translate('aiExecutionPlans.avgDuration') }}</span>
          </div>
        </div>
      </div>

      <!-- ===== Agent Fleet Grid ===== -->
      <h3 class="section-title">{{ i18n.translate('aiExecutionPlans.agentFleet') }}</h3>
      <div class="agent-grid">
        @for (agent of agents(); track agent.id) {
          <div class="agent-card" [class.agent-active]="agent.status === 'active' || agent.status === 'working'"
               [class.agent-error]="agent.status === 'error'">
            <div class="agent-card-top">
              <div class="agent-name">
                <strong>{{ agent.name || agent.id }}</strong>
              </div>
              <p-tag [value]="agent.status || 'idle'"
                     [severity]="agentSeverity(agent.status)"
                     [rounded]="true" />
            </div>
            <div class="agent-card-meta">
              <span class="meta-item">
                <i class="pi pi-history"></i>
                {{ agent.lastRun ? formatTimestamp(agent.lastRun) : i18n.translate('aiExecutionPlans.noRunsYet') }}
              </span>
              <span class="meta-item">
                <i class="pi pi-bolt"></i>
                {{ agent.actionCount ?? 0 }} {{ i18n.translate('aiExecutionPlans.actions') }}
              </span>
            </div>
          </div>
        } @empty {
          <div class="empty-fleet">
            <i class="pi pi-microchip-ai" style="font-size:2.5rem;opacity:0.3"></i>
            <p>{{ i18n.translate('aiExecutionPlans.noAgents') }}</p>
          </div>
        }
      </div>

      <!-- ===== Execution History Table ===== -->
      <h3 class="section-title mt-section">{{ i18n.translate('aiExecutionPlans.executionHistory') }}</h3>

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <span class="p-input-icon-left">
            <i class="pi pi-search"></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   [placeholder]="i18n.translate('aiExecutionPlans.search')" [attr.aria-label]="i18n.translate('aiExecutionPlans.search')"
                   (input)="filterHistory()" class="search-input" />
          </span>
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18n.translate('aiExecutionPlans.export')" icon="pi pi-download"
                    severity="secondary" [outlined]="true" (onClick)="exportCSV()" />
          <p-button [label]="i18n.translate('aiExecutionPlans.refresh')" icon="pi pi-refresh"
                    severity="secondary" [outlined]="true" (onClick)="load()" class="ms-2" />
        </ng-template>
      </p-toolbar>

      <p-table aria-label="Data table" [value]="filteredHistory()" [paginator]="filteredHistory().length > 10"
               [rows]="10" [rowsPerPageOptions]="[10, 25, 50]"
               styleClass="p-datatable-striped p-datatable-gridlines"
               [globalFilterFields]="['run_id', 'agent', 'status']">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('aiExecutionPlans.runId') }}</th>
            <th>{{ i18n.translate('aiExecutionPlans.agentSource') }}</th>
            <th>{{ i18n.translate('aiExecutionPlans.startedAt') }}</th>
            <th>{{ i18n.translate('aiExecutionPlans.duration') }}</th>
            <th>{{ i18n.translate('aiExecutionPlans.status') }}</th>
            <th>{{ i18n.translate('aiExecutionPlans.actionsTaken') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td><code class="run-id">{{ shortId(row.run_id ?? row.runId ?? row.id) }}</code></td>
            <td>{{ row.agent ?? row.agent_id ?? row.source ?? '-' }}</td>
            <td>{{ formatTimestamp(row.started_at ?? row.startedAt ?? row.executed_at ?? row.timestamp) }}</td>
            <td>{{ row.duration_ms ?? row.durationMs ?? row.duration ?? 0 }}ms</td>
            <td>
              <p-tag [value]="row.status ?? 'any'"
                     [severity]="statusSeverity(row.status)"
                     [rounded]="true" />
            </td>
            <td class="text-center">{{ row.actions_taken ?? row.actionsTaken ?? row.action_count ?? 0 }}</td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="empty-msg">{{ i18n.translate('aiExecutionPlans.noHistory') }}</td></tr>
        </ng-template>
      </p-table>

    </app-page-shell>
    <app-ai-panel module="ai-execution-plans" />
  `,
  styles: [`
    /* -- KPI Strip -- */
    .kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .kpi-card {
      display: flex; align-items: center; gap: 14px;
      background: var(--surface-card, #fff); border-radius: var(--radius-lg);
      padding: 18px 20px; box-shadow: var(--shadow-sm);
      border: 1px solid var(--border-subtle, var(--border-subtle));
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .kpi-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .kpi-icon {
      width: 44px; height: 44px; border-radius: var(--radius-md);
      display: flex; align-items: center; justify-content: center;
      font-size: var(--font-size-lg); color: #fff; flex-shrink: 0;
    }
    .kpi-icon.agents { background: linear-gradient(135deg, var(--primary), #818cf8); }
    .kpi-icon.runs { background: linear-gradient(135deg, var(--primary), #60a5fa); }
    .kpi-icon.success { background: linear-gradient(135deg, var(--success), var(--success)); }
    .kpi-icon.duration { background: linear-gradient(135deg, var(--warning), #fbbf24); }
    .kpi-body { display: flex; flex-direction: column; gap: 2px; }
    .kpi-value { font-size: var(--font-size-2xl); font-weight: 800; color: var(--text-heading, var(--text-heading)); line-height: 1; }
    .kpi-value small { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted, var(--text-muted)); }
    .kpi-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted, var(--text-muted)); }

    /* -- Section titles -- */
    .section-title { font-size: var(--font-size-lg); font-weight: 700; color: var(--text-heading, var(--text-heading)); margin: 0 0 14px 0; }
    .mt-section { margin-top: 28px; }

    /* -- Agent Fleet Grid -- */
    .agent-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; margin-bottom: 8px; }
    .agent-card {
      background: var(--surface-card, #fff); border-radius: var(--radius-md);
      padding: 16px 18px; box-shadow: var(--shadow-sm);
      border-inline-start: 4px solid var(--border-subtle, var(--border-subtle));
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .agent-card:hover { transform: translateY(-1px); box-shadow: var(--shadow-md); }
    .agent-card.agent-active { border-inline-start-color: var(--success); }
    .agent-card.agent-error { border-inline-start-color: var(--error); }
    .agent-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .agent-name { font-size: var(--font-size-base); font-weight: 700; color: var(--text-heading, var(--text-heading)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
    .agent-card-meta { display: flex; flex-direction: column; gap: 4px; }
    .meta-item { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); }
    .meta-item i { font-size: var(--font-size-sm); }
    .empty-fleet { grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted, var(--text-muted)); }

    /* -- Toolbar & table -- */
    .mb-3 { margin-bottom: var(--space-md, 12px); }
    .ms-2 { margin-inline-start: 8px; }
    .search-input { min-width: 220px; }
    .p-input-icon-left { position: relative; display: inline-flex; align-items: center; }
    .p-input-icon-left > i { position: absolute; inset-inline-start: 12px; color: var(--text-muted); z-index: var(--z-base); }
    .p-input-icon-left > input { padding-inline-start: 36px; }
    .run-id { font-size: var(--font-size-sm); font-family: 'Fira Code', monospace; background: var(--surface-ground, var(--surface-ice)); padding: 2px 6px; border-radius: var(--radius-xs); }
    .text-center { text-align: center; }
    .empty-msg { text-align: center; color: var(--text-muted); padding: var(--space-xl, 24px); }

    @media (max-width: 768px) {
      .kpi-strip { grid-template-columns: repeat(2, 1fr); }
      .agent-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class AIExecutionPlansComponent implements OnInit {
  i18n = inject(I18nService);
  private agrcOS = inject(AGRCOSService);
  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);

  loaded = signal(false);
  searchTerm = '';

  kpis = signal<{ totalAgents: number; activeRuns: number; successRate: number; avgDuration: number }>({
    totalAgents: 0, activeRuns: 0, successRate: 0, avgDuration: 0
  });
  agents = signal<GrcRecord[]>([]);
  history = signal<GrcRecord[]>([]);
  filteredHistory = signal<GrcRecord[]>([]);

  ngOnInit(): void {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.load();
  }

  load(): void {
    forkJoin({
      status: this.agrcOS.getStatus().pipe(catchError(() => of(null))),
      agentStatus: this.agrcOS.getAgentStatus().pipe(catchError(() => of(null))),
      history: this.agrcOS.getHistory(50).pipe(catchError(() => of([]))),
      metrics: this.agrcOS.getMetrics(24).pipe(catchError(() => of(null))),
      executions: this.agrcOS.getRunbookExecutions({ limit: 50 }).pipe(catchError(() => of([]))),
      ccmHistory: this.agrcOS.getCCMHistory(50).pipe(catchError(() => of([]))),
    }).subscribe({
      next: (res) => {
        // Build agent list from agentStatus
        const agentData = res.agentStatus;
        const agentList: Record<string, unknown>[] = Array.isArray(agentData?.agents)
          ? agentData.agents.map((a: Record<string, unknown>) => ({
              id: a.agentId ?? a.agent_id ?? a.id,
              name: a.nameEn ?? a.name_en ?? a.name ?? a.agentId ?? a.agent_id,
              status: a.status ?? 'idle',
              lastRun: a.lastRunAt ?? a.last_run_at ?? a.lastRun ?? null,
              actionCount: a.actionsToday ?? a.actions_today ?? a.actionCount ?? a.action_count ?? 0,
            }))
          : [];
        this.agents.set(agentList);

        // Build combined execution history from history + executions + ccmHistory
        const rawHistory: Record<string, unknown>[] = [
          ...(Array.isArray(res.history) ? res.history : []),
          ...(Array.isArray(res.executions) ? res.executions : []),
          ...(Array.isArray(res.ccmHistory) ? res.ccmHistory : []),
        ];
        // Deduplicate by run_id/id and sort by timestamp descending
        const seen = new Set<string>();
        const deduped = rawHistory.filter(r => {
          const key = r.run_id ?? r.runId ?? r.id ?? JSON.stringify(r);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).sort((a, b) => {
          const tsA = a.started_at ?? a.startedAt ?? a.executed_at ?? a.timestamp ?? '';
          const tsB = b.started_at ?? b.startedAt ?? b.executed_at ?? b.timestamp ?? '';
          return new Date(tsB).getTime() - new Date(tsA).getTime();
        });
        this.history.set(deduped);
        this.filterHistory();

        // Compute KPIs
        const totalAgents = agentList.length || (agentData?.total ?? 0);
        const activeRuns = agentList.filter(a => a.status === 'active' || a.status === 'working' || a.status === 'running').length;
        const completedRuns = deduped.filter(r => r.status === 'completed' || r.status === 'success');
        const failedRuns = deduped.filter(r => r.status === 'failed' || r.status === 'error');
        const totalRuns = completedRuns.length + failedRuns.length;
        const successRate = totalRuns > 0 ? Math.round((completedRuns.length / totalRuns) * 100) : 0;
        const durations = deduped
          .map(r => r.duration_ms ?? r.durationMs ?? r.duration ?? r.cycle_ms ?? 0)
          .filter((d: number) => d > 0);
        const avgDuration = durations.length > 0
          ? Math.round(durations.reduce((s: number, d: number) => s + d, 0) / durations.length)
          : 0;

        // Also blend in metrics data if available
        const m = res.metrics as any;
        this.kpis.set({
          totalAgents: totalAgents || (m?.agentCount ?? 10),
          activeRuns: activeRuns || (m?.activeRuns ?? 0),
          successRate: successRate || (m?.successRate ?? 0),
          avgDuration: avgDuration || (m?.avgCycleDurationMs ?? 0),
        });

        this.loaded.set(true);
      },
      error: () => { this.loaded.set(true); }
    });
  }

  filterHistory(): void {
    let items = this.history();
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      items = items.filter(r =>
        (r.run_id ?? r.runId ?? r.id ?? '').toLowerCase().includes(term) ||
        (r.agent ?? r.agent_id ?? r.source ?? '').toLowerCase().includes(term) ||
        (r.status ?? '').toLowerCase().includes(term)
      );
    }
    this.filteredHistory.set(items);
  }

  agentSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
    if (status === 'active' || status === 'working' || status === 'running') return 'success';
    if (status === 'idle') return 'info';
    if (status === 'stale' || status === 'degraded') return 'warning';
    if (status === 'error' || status === 'failed') return 'danger';
    return 'secondary';
  }

  statusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
    if (status === 'completed' || status === 'success') return 'success';
    if (status === 'running' || status === 'in_progress') return 'info';
    if (status === 'partial' || status === 'degraded') return 'warning';
    if (status === 'failed' || status === 'error') return 'danger';
    return 'secondary';
  }

  formatTimestamp(ts: string | null | undefined): string {
    if (!ts) return '-';
    try {
      const d = new Date(ts);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
             d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch { return ts; }
  }

  shortId(id: string | null | undefined): string {
    if (!id) return '-';
    return id.length > 12 ? id.slice(0, 8) + '...' : id;
  }

  exportCSV(): void {
    const items = this.filteredHistory();
    if (!items.length) return;
    const headers = ['Run ID', 'Agent/Source', 'Started At', 'Duration (ms)', 'Status', 'Actions Taken'];
    const rows = items.map(r => [
      r.run_id ?? r.runId ?? r.id ?? '',
      r.agent ?? r.agent_id ?? r.source ?? '',
      r.started_at ?? r.startedAt ?? r.executed_at ?? r.timestamp ?? '',
      r.duration_ms ?? r.durationMs ?? r.duration ?? 0,
      r.status ?? '',
      r.actions_taken ?? r.actionsTaken ?? r.action_count ?? 0,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ai-execution-plans.csv';
    a.click();
  }
}

import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface PrivacyBudget {
  id: string;
  pipeline: string;
  budgetType: 'epsilon' | 'delta' | 'renyi';
  allocated: number;
  consumed: number;
  remaining: number;
  status: 'healthy' | 'warning' | 'exhausted';
  dataSubjects: number;
  lastQuery: string;
}

@Component({
    selector: 'app-privacy-budget-dashboard',
    imports: [CommonModule, RouterModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="module-page" [dir]="i18n.direction()">
      <div class="page-header">
        <h1 class="page-title">{{ i18n.translate('privacy.budgetDashboard') || 'Privacy Budget Dashboard' }}</h1>
        <p class="page-subtitle">{{ i18n.translate('privacy.budgetDashboardDesc') || 'Monitor and manage differential privacy budgets across data processing pipelines.' }}</p>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card"><span class="kpi-value">{{ budgets().length }}</span><span class="kpi-label">Pipelines</span></div>
        <div class="kpi-card kpi-success"><span class="kpi-value">{{ healthyCount() }}</span><span class="kpi-label">Healthy</span></div>
        <div class="kpi-card kpi-warning"><span class="kpi-value">{{ warningCount() }}</span><span class="kpi-label">Warning</span></div>
        <div class="kpi-card kpi-danger"><span class="kpi-value">{{ exhaustedCount() }}</span><span class="kpi-label">Exhausted</span></div>
        <div class="kpi-card kpi-info"><span class="kpi-value">{{ avgUtilization() }}%</span><span class="kpi-label">Avg Utilization</span></div>
      </div>

      <div class="section-card">
        <div class="table-header"><h3>Budget Allocation</h3></div>
        <table class="data-table">
          <thead><tr><th>Pipeline</th><th>Type</th><th>Allocated</th><th>Consumed</th><th>Remaining</th><th>Utilization</th><th>Data Subjects</th><th>Status</th></tr></thead>
          <tbody>
            @for (b of budgets(); track b.id) {
              <tr>
                <td class="cell-title">{{ b.pipeline }}</td>
                <td><span class="type-badge">{{ b.budgetType }}</span></td>
                <td>{{ b.allocated }}</td>
                <td>{{ b.consumed }}</td>
                <td>{{ b.remaining }}</td>
                <td>
                  <div class="util-bar"><div class="util-fill" [class.util-warn]="utilization(b) > 70" [class.util-crit]="utilization(b) > 90" [style.width.%]="utilization(b)"></div></div>
                  <span class="util-text">{{ utilization(b) }}%</span>
                </td>
                <td>{{ b.dataSubjects | number }}</td>
                <td><span class="status-badge" [class]="'st-' + b.status">{{ b.status }}</span></td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="empty-cell">No privacy budgets configured</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
    styles: [`
    .module-page { padding: 1.5rem; } .page-header { margin-bottom: 1.5rem; }
    .page-title { margin: 0 0 0.25rem; font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-color); }
    .page-subtitle { margin: 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .kpi-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem; display: flex; flex-direction: column; gap: 0.25rem; }
    .kpi-value { font-size: var(--font-size-3xl); font-weight: 700; color: var(--primary-500); } .kpi-label { font-size: var(--font-size-caption); color: var(--text-color-secondary); }
    .kpi-success .kpi-value { color: var(--green-500); } .kpi-warning .kpi-value { color: var(--yellow-600); }
    .kpi-danger .kpi-value { color: var(--red-500); } .kpi-info .kpi-value { color: var(--blue-500); }
    .section-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem; }
    .table-header { margin-bottom: 1rem; } .table-header h3 { margin: 0; font-size: var(--font-size-md); font-weight: 600; }
    .data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-base); }
    .data-table th { text-align: start; padding: 0.625rem 0.75rem; border-bottom: 2px solid var(--border-subtle); color: var(--text-color-secondary); font-weight: 600; font-size: var(--font-size-caption); }
    .data-table td { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border-subtle); }
    .cell-title { font-weight: 500; }
    .type-badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-lg); background: var(--surface-ground); font-weight: 500; text-transform: capitalize; }
    .util-bar { width: 60px; height: 6px; background: var(--surface-ground); border-radius: 3px; display: inline-block; vertical-align: middle; margin-right: 0.5rem; }
    .util-fill { height: 100%; background: var(--green-500); border-radius: 3px; } .util-warn { background: var(--yellow-500); } .util-crit { background: var(--red-500); }
    .util-text { font-size: var(--font-size-caption); color: var(--text-color-secondary); }
    .status-badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-lg); font-weight: 500; text-transform: capitalize; }
    .st-healthy { background: var(--green-50); color: var(--green-700); } .st-warning { background: var(--yellow-50); color: var(--yellow-700); } .st-exhausted { background: var(--red-50); color: var(--red-700); }
    .empty-cell { text-align: center; color: var(--text-color-secondary); padding: 2rem !important; }
  `]
})
export class PrivacyBudgetDashboardComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  protected readonly budgets = signal<PrivacyBudget[]>([]);

  protected readonly healthyCount = () => this.budgets().filter(b => b.status === 'healthy').length;
  protected readonly warningCount = () => this.budgets().filter(b => b.status === 'warning').length;
  protected readonly exhaustedCount = () => this.budgets().filter(b => b.status === 'exhausted').length;
  protected readonly avgUtilization = () => { const l = this.budgets(); return l.length ? Math.round(l.reduce((s, b) => s + this.utilization(b), 0) / l.length) : 0; };

  utilization(b: PrivacyBudget): number { return b.allocated > 0 ? Math.round((b.consumed / b.allocated) * 100) : 0; }

  ngOnInit(): void { this.http.get<PrivacyBudget[]>('/api/privacy/budgets').subscribe({ next: (d) => this.budgets.set(d), error: () => {} }); }
}

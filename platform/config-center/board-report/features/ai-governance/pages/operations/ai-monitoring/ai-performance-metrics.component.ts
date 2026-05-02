import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface PerformanceMetric {
  id: string;
  systemName: string;
  metric: string;
  currentValue: number;
  threshold: number;
  trend: 'improving'|'stable'|'degrading';
  lastMeasured: string;
  alertActive: boolean;
}

@Component({
    selector: 'app-ai-performance-metrics',
    imports: [CommonModule, RouterModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="module-page" [dir]="i18n.direction()">
      <div class="page-header">
        <h1 class="page-title">{{ i18n.translate('aiGov.aiPerformanceMetrics') || 'Performance Metrics' }}</h1>
        <p class="page-subtitle">Track AI system performance metrics including accuracy, latency, and drift detection.</p>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card"><span class="kpi-value">{{ items().length }}</span><span class="kpi-label">Total</span></div>
      </div>

      <div class="section-card">
        <div class="table-header">
          <h3>Performance Metrics</h3>
          <input type="text" class="search-input" placeholder="Search..." (input)="onSearch($event)" />
        </div>
        <table class="data-table">
          <thead><tr><th>Systemname</th><th>Metric</th><th>Currentvalue</th><th>Threshold</th><th>Trend</th><th>Lastmeasured</th><th>Alertactive</th></tr></thead>
          <tbody>
            @for (item of filteredItems(); track item.id) {
              <tr>
                <td class="cell-title">{{ item.systemName }}</td>
                <td>{{ item.metric }}</td>
                <td>{{ item.currentValue }}</td>
                <td>{{ item.threshold }}</td>
                <td>{{ item.trend }}</td>
                <td>{{ item.lastMeasured | date:'short' }}</td>
                <td>{{ item.alertActive ? 'Yes' : 'No' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="empty-cell">No records found</td></tr>
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
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .kpi-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem; display: flex; flex-direction: column; gap: 0.25rem; }
    .kpi-value { font-size: var(--font-size-3xl); font-weight: 700; color: var(--primary-500); } .kpi-label { font-size: var(--font-size-caption); color: var(--text-color-secondary); }
    .section-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem; }
    .table-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .table-header h3 { margin: 0; font-size: var(--font-size-md); font-weight: 600; }
    .search-input { padding: 0.5rem 0.75rem; border: 1px solid var(--border-subtle); border-radius: var(--radius); font-size: var(--font-size-base); background: var(--surface-ground); color: var(--text-color); width: 220px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-base); }
    .data-table th { text-align: start; padding: 0.625rem 0.75rem; border-bottom: 2px solid var(--border-subtle); color: var(--text-color-secondary); font-weight: 600; font-size: var(--font-size-caption); }
    .data-table td { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border-subtle); }
    .cell-title { font-weight: 500; }
    .status-badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-lg); font-weight: 500; background: var(--surface-ground); text-transform: capitalize; }
    .empty-cell { text-align: center; color: var(--text-color-secondary); padding: 2rem !important; }
  `]
})
export class AiPerformanceMetricsComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  protected readonly items = signal<PerformanceMetric[]>([]);
  protected readonly searchTerm = signal('');

  protected readonly filteredItems = () => {
    const t = this.searchTerm().toLowerCase();
    if (!t) return this.items();
    return this.items().filter(item => {
      const first = (item as any)['systemName'] as string;
      return first?.toLowerCase().includes(t);
    });
  };

  ngOnInit(): void {
    this.http.get<PerformanceMetric[]>('/api/ai-governance/performance-metrics').subscribe({ next: (d) => this.items.set(d), error: () => {} });
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }
}

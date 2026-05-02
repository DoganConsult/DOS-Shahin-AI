import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface ResilienceTest {
  id: string;
  name: string;
  type: 'TLPT' | 'scenario' | 'tabletop' | 'switchover';
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed';
  scheduledDate: string;
  scope: string;
  testedBy: string;
  passRate: number;
}

@Component({
    selector: 'app-dora-resilience-tests',
    imports: [CommonModule, RouterModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="module-page" [dir]="i18n.direction()">
      <div class="page-header">
        <h1 class="page-title">{{ i18n.translate('dora.resilienceTests') || 'Resilience Testing' }}</h1>
        <p class="page-subtitle">{{ i18n.translate('dora.resilienceTestsDesc') || 'Plan, schedule, and manage digital operational resilience testing programs per DORA Article 24-27.' }}</p>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card"><span class="kpi-value">{{ tests().length }}</span><span class="kpi-label">Total Tests</span></div>
        <div class="kpi-card kpi-info"><span class="kpi-value">{{ scheduledCount() }}</span><span class="kpi-label">Scheduled</span></div>
        <div class="kpi-card kpi-success"><span class="kpi-value">{{ completedCount() }}</span><span class="kpi-label">Completed</span></div>
        <div class="kpi-card kpi-danger"><span class="kpi-value">{{ failedCount() }}</span><span class="kpi-label">Failed</span></div>
        <div class="kpi-card"><span class="kpi-value">{{ avgPassRate() }}%</span><span class="kpi-label">Avg Pass Rate</span></div>
      </div>

      <div class="section-card">
        <div class="table-header">
          <h3>Testing Program</h3>
          <input type="text" class="search-input" placeholder="Search tests..." (input)="onSearch($event)" />
        </div>
        <table class="data-table">
          <thead><tr><th>Test Name</th><th>Type</th><th>Status</th><th>Scheduled</th><th>Scope</th><th>Tested By</th><th>Pass Rate</th></tr></thead>
          <tbody>
            @for (test of filteredTests(); track test.id) {
              <tr>
                <td class="cell-title">{{ test.name }}</td>
                <td><span class="type-badge">{{ test.type }}</span></td>
                <td><span class="status-badge" [class]="'st-' + test.status">{{ test.status }}</span></td>
                <td>{{ test.scheduledDate | date:'mediumDate' }}</td>
                <td>{{ test.scope }}</td>
                <td>{{ test.testedBy }}</td>
                <td><span class="pass-rate" [class.pass-ok]="test.passRate >= 80" [class.pass-warn]="test.passRate < 80 && test.passRate >= 50" [class.pass-fail]="test.passRate < 50">{{ test.passRate }}%</span></td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="empty-cell">No resilience tests configured</td></tr>
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
    .kpi-info .kpi-value { color: var(--blue-500); } .kpi-success .kpi-value { color: var(--green-500); } .kpi-danger .kpi-value { color: var(--red-500); }
    .section-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem; }
    .table-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .table-header h3 { margin: 0; font-size: var(--font-size-md); font-weight: 600; }
    .search-input { padding: 0.5rem 0.75rem; border: 1px solid var(--border-subtle); border-radius: var(--radius); font-size: var(--font-size-base); background: var(--surface-ground); color: var(--text-color); width: 220px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-base); }
    .data-table th { text-align: start; padding: 0.625rem 0.75rem; border-bottom: 2px solid var(--border-subtle); color: var(--text-color-secondary); font-weight: 600; font-size: var(--font-size-caption); }
    .data-table td { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border-subtle); }
    .cell-title { font-weight: 500; }
    .type-badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-lg); font-weight: 500; background: var(--surface-ground); color: var(--text-color); text-transform: uppercase; }
    .status-badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-lg); font-weight: 500; text-transform: capitalize; }
    .st-scheduled { background: var(--blue-50); color: var(--blue-700); } .st-in_progress { background: var(--yellow-50); color: var(--yellow-700); }
    .st-completed { background: var(--green-50); color: var(--green-700); } .st-failed { background: var(--red-50); color: var(--red-700); }
    .pass-rate { font-weight: 600; } .pass-ok { color: var(--green-600); } .pass-warn { color: var(--yellow-600); } .pass-fail { color: var(--red-600); }
    .empty-cell { text-align: center; color: var(--text-color-secondary); padding: 2rem !important; }
  `]
})
export class DoraResilienceTestsComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  protected readonly tests = signal<ResilienceTest[]>([]);
  protected readonly searchTerm = signal('');

  protected readonly filteredTests = () => { const t = this.searchTerm().toLowerCase(); return t ? this.tests().filter(r => r.name.toLowerCase().includes(t) || r.scope.toLowerCase().includes(t)) : this.tests(); };
  protected readonly scheduledCount = () => this.tests().filter(t => t.status === 'scheduled').length;
  protected readonly completedCount = () => this.tests().filter(t => t.status === 'completed').length;
  protected readonly failedCount = () => this.tests().filter(t => t.status === 'failed').length;
  protected readonly avgPassRate = () => { const l = this.tests().filter(t => t.status === 'completed'); return l.length ? Math.round(l.reduce((s, t) => s + t.passRate, 0) / l.length) : 0; };

  ngOnInit(): void { this.http.get<ResilienceTest[]>('/api/dora/resilience-tests').subscribe({ next: (d) => this.tests.set(d), error: () => {} }); }
  onSearch(event: Event): void { this.searchTerm.set((event.target as HTMLInputElement).value); }
}

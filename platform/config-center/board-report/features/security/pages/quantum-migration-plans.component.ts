import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface MigrationPlan {
  id: string;
  name: string;
  targetAlgorithm: string;
  affectedSystems: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'planned' | 'in_progress' | 'testing' | 'completed';
  progress: number;
  deadline: string;
  owner: string;
}

@Component({
  selector: 'app-quantum-migration-plans',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="module-page" [dir]="i18n.direction()">
      <div class="page-header">
        <h1 class="page-title">{{ i18n.translate('quantum.migrationPlans') || 'PQC Migration Plans' }}</h1>
        <p class="page-subtitle">{{ i18n.translate('quantum.migrationPlansDesc') || 'Plan and track migration to post-quantum cryptographic algorithms across all systems.' }}</p>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card"><span class="kpi-value">{{ plans().length }}</span><span class="kpi-label">Total Plans</span></div>
        <div class="kpi-card kpi-info"><span class="kpi-value">{{ inProgressCount() }}</span><span class="kpi-label">In Progress</span></div>
        <div class="kpi-card kpi-success"><span class="kpi-value">{{ completedCount() }}</span><span class="kpi-label">Completed</span></div>
        <div class="kpi-card"><span class="kpi-value">{{ overallProgress() }}%</span><span class="kpi-label">Overall Progress</span></div>
      </div>

      <div class="section-card">
        <h3>Migration Roadmap</h3>
        <table class="data-table">
          <thead><tr><th>Plan Name</th><th>Target Algorithm</th><th>Systems</th><th>Priority</th><th>Status</th><th>Progress</th><th>Deadline</th><th>Owner</th></tr></thead>
          <tbody>
            @for (p of plans(); track p.id) {
              <tr>
                <td class="cell-title">{{ p.name }}</td>
                <td><code class="algo-code">{{ p.targetAlgorithm }}</code></td>
                <td>{{ p.affectedSystems }}</td>
                <td><span class="priority-badge" [class]="'pri-' + p.priority">{{ p.priority }}</span></td>
                <td><span class="status-badge" [class]="'st-' + p.status">{{ p.status }}</span></td>
                <td><div class="progress-bar"><div class="progress-fill" [style.width.%]="p.progress"></div></div><span class="progress-text">{{ p.progress }}%</span></td>
                <td>{{ p.deadline | date:'mediumDate' }}</td>
                <td>{{ p.owner }}</td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="empty-cell">No migration plans created</td></tr>
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
    .kpi-info .kpi-value { color: var(--blue-500); } .kpi-success .kpi-value { color: var(--green-500); }
    .section-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem; }
    .section-card h3 { margin: 0 0 1rem; font-size: var(--font-size-md); font-weight: 600; }
    .data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-base); }
    .data-table th { text-align: start; padding: 0.625rem 0.75rem; border-bottom: 2px solid var(--border-subtle); color: var(--text-color-secondary); font-weight: 600; font-size: var(--font-size-caption); }
    .data-table td { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border-subtle); }
    .cell-title { font-weight: 500; }
    .algo-code { font-family: monospace; font-size: var(--font-size-caption); background: var(--surface-ground); padding: 2px 6px; border-radius: var(--radius-xs); }
    .priority-badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-lg); font-weight: 500; text-transform: capitalize; }
    .pri-critical { background: var(--red-50); color: var(--red-700); } .pri-high { background: var(--orange-50); color: var(--orange-700); }
    .pri-medium { background: var(--yellow-50); color: var(--yellow-700); } .pri-low { background: var(--surface-ground); color: var(--text-color-secondary); }
    .status-badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-lg); font-weight: 500; text-transform: capitalize; }
    .st-planned { background: var(--surface-ground); color: var(--text-color-secondary); } .st-in_progress { background: var(--blue-50); color: var(--blue-700); }
    .st-testing { background: var(--yellow-50); color: var(--yellow-700); } .st-completed { background: var(--green-50); color: var(--green-700); }
    .progress-bar { width: 60px; height: 6px; background: var(--surface-ground); border-radius: 3px; display: inline-block; vertical-align: middle; margin-right: 0.5rem; }
    .progress-fill { height: 100%; background: var(--primary-500); border-radius: 3px; }
    .progress-text { font-size: var(--font-size-caption); color: var(--text-color-secondary); }
    .empty-cell { text-align: center; color: var(--text-color-secondary); padding: 2rem !important; }
  `],
})
export class QuantumMigrationPlansComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  protected readonly plans = signal<MigrationPlan[]>([]);

  protected readonly inProgressCount = () => this.plans().filter(p => p.status === 'in_progress').length;
  protected readonly completedCount = () => this.plans().filter(p => p.status === 'completed').length;
  protected readonly overallProgress = () => { const l = this.plans(); return l.length ? Math.round(l.reduce((s, p) => s + p.progress, 0) / l.length) : 0; };

  ngOnInit(): void { this.http.get<MigrationPlan[]>('/api/security/quantum/migration-plans').subscribe({ next: (d) => this.plans.set(d), error: () => {} }); }
}

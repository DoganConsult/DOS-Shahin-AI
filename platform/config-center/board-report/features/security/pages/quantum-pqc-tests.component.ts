import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface PqcTest {
  id: string;
  name: string;
  algorithm: string;
  testType: 'interoperability' | 'performance' | 'regression' | 'compliance';
  status: 'pending' | 'running' | 'passed' | 'failed';
  executedAt: string;
  latencyMs: number;
  throughputOps: number;
  notes: string;
}

@Component({
  selector: 'app-quantum-pqc-tests',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="module-page" [dir]="i18n.direction()">
      <div class="page-header">
        <h1 class="page-title">{{ i18n.translate('quantum.pqcTests') || 'PQC Validation Tests' }}</h1>
        <p class="page-subtitle">{{ i18n.translate('quantum.pqcTestsDesc') || 'Execute and monitor post-quantum cryptography interoperability and performance validation tests.' }}</p>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card"><span class="kpi-value">{{ tests().length }}</span><span class="kpi-label">Total Tests</span></div>
        <div class="kpi-card kpi-success"><span class="kpi-value">{{ passedCount() }}</span><span class="kpi-label">Passed</span></div>
        <div class="kpi-card kpi-danger"><span class="kpi-value">{{ failedCount() }}</span><span class="kpi-label">Failed</span></div>
        <div class="kpi-card kpi-info"><span class="kpi-value">{{ avgLatency() }}ms</span><span class="kpi-label">Avg Latency</span></div>
      </div>

      <div class="section-card">
        <div class="table-header"><h3>Test Suite</h3></div>
        <table class="data-table">
          <thead><tr><th>Test Name</th><th>Algorithm</th><th>Type</th><th>Status</th><th>Executed</th><th>Latency</th><th>Throughput</th></tr></thead>
          <tbody>
            @for (t of tests(); track t.id) {
              <tr>
                <td class="cell-title">{{ t.name }}</td>
                <td><code class="algo-code">{{ t.algorithm }}</code></td>
                <td>{{ t.testType }}</td>
                <td><span class="status-badge" [class]="'st-' + t.status">{{ t.status }}</span></td>
                <td>{{ t.executedAt | date:'short' }}</td>
                <td>{{ t.latencyMs }}ms</td>
                <td>{{ t.throughputOps | number }} ops/s</td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="empty-cell">No PQC tests configured</td></tr>
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
    .kpi-success .kpi-value { color: var(--green-500); } .kpi-danger .kpi-value { color: var(--red-500); } .kpi-info .kpi-value { color: var(--blue-500); }
    .section-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem; }
    .table-header { margin-bottom: 1rem; } .table-header h3 { margin: 0; font-size: var(--font-size-md); font-weight: 600; }
    .data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-base); }
    .data-table th { text-align: start; padding: 0.625rem 0.75rem; border-bottom: 2px solid var(--border-subtle); color: var(--text-color-secondary); font-weight: 600; font-size: var(--font-size-caption); }
    .data-table td { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border-subtle); }
    .cell-title { font-weight: 500; }
    .algo-code { font-family: monospace; font-size: var(--font-size-caption); background: var(--surface-ground); padding: 2px 6px; border-radius: var(--radius-xs); }
    .status-badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-lg); font-weight: 500; text-transform: capitalize; }
    .st-pending { background: var(--surface-ground); color: var(--text-color-secondary); } .st-running { background: var(--blue-50); color: var(--blue-700); }
    .st-passed { background: var(--green-50); color: var(--green-700); } .st-failed { background: var(--red-50); color: var(--red-700); }
    .empty-cell { text-align: center; color: var(--text-color-secondary); padding: 2rem !important; }
  `],
})
export class QuantumPqcTestsComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  protected readonly tests = signal<PqcTest[]>([]);

  protected readonly passedCount = () => this.tests().filter(t => t.status === 'passed').length;
  protected readonly failedCount = () => this.tests().filter(t => t.status === 'failed').length;
  protected readonly avgLatency = () => { const l = this.tests().filter(t => t.latencyMs > 0); return l.length ? Math.round(l.reduce((s, t) => s + t.latencyMs, 0) / l.length) : 0; };

  ngOnInit(): void { this.http.get<PqcTest[]>('/api/security/quantum/pqc-tests').subscribe({ next: (d) => this.tests.set(d), error: () => {} }); }
}

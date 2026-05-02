import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface TestResult {
  id: string;
  testName: string;
  testType: string;
  executedAt: string;
  result: 'pass' | 'fail' | 'partial';
  findings: number;
  criticalFindings: number;
  remediationDue: string;
  executor: string;
}

@Component({
    selector: 'app-dora-test-results',
    imports: [CommonModule, RouterModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="module-page" [dir]="i18n.direction()">
      <div class="page-header">
        <h1 class="page-title">{{ i18n.translate('dora.testResults') || 'Test Results' }}</h1>
        <p class="page-subtitle">{{ i18n.translate('dora.testResultsDesc') || 'Review and analyze results from resilience tests and threat-led penetration testing (TLPT).' }}</p>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card kpi-success"><span class="kpi-value">{{ passCount() }}</span><span class="kpi-label">Passed</span></div>
        <div class="kpi-card kpi-danger"><span class="kpi-value">{{ failCount() }}</span><span class="kpi-label">Failed</span></div>
        <div class="kpi-card kpi-warning"><span class="kpi-value">{{ partialCount() }}</span><span class="kpi-label">Partial</span></div>
        <div class="kpi-card kpi-danger"><span class="kpi-value">{{ totalCritical() }}</span><span class="kpi-label">Critical Findings</span></div>
      </div>

      <div class="section-card">
        <div class="table-header">
          <h3>Results Log</h3>
          <input type="text" class="search-input" placeholder="Search results..." (input)="onSearch($event)" />
        </div>
        <table class="data-table">
          <thead><tr><th>Test Name</th><th>Type</th><th>Executed</th><th>Result</th><th>Findings</th><th>Critical</th><th>Remediation Due</th><th>Executor</th></tr></thead>
          <tbody>
            @for (r of filteredResults(); track r.id) {
              <tr>
                <td class="cell-title">{{ r.testName }}</td>
                <td>{{ r.testType }}</td>
                <td>{{ r.executedAt | date:'short' }}</td>
                <td><span class="result-badge" [class]="'res-' + r.result">{{ r.result }}</span></td>
                <td>{{ r.findings }}</td>
                <td><span [class.critical-count]="r.criticalFindings > 0">{{ r.criticalFindings }}</span></td>
                <td>{{ r.remediationDue | date:'mediumDate' }}</td>
                <td>{{ r.executor }}</td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="empty-cell">No test results available</td></tr>
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
    .kpi-success .kpi-value { color: var(--green-500); } .kpi-danger .kpi-value { color: var(--red-500); } .kpi-warning .kpi-value { color: var(--yellow-600); }
    .section-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem; }
    .table-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .table-header h3 { margin: 0; font-size: var(--font-size-md); font-weight: 600; }
    .search-input { padding: 0.5rem 0.75rem; border: 1px solid var(--border-subtle); border-radius: var(--radius); font-size: var(--font-size-base); background: var(--surface-ground); color: var(--text-color); width: 220px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-base); }
    .data-table th { text-align: start; padding: 0.625rem 0.75rem; border-bottom: 2px solid var(--border-subtle); color: var(--text-color-secondary); font-weight: 600; font-size: var(--font-size-caption); }
    .data-table td { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border-subtle); }
    .cell-title { font-weight: 500; }
    .result-badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-lg); font-weight: 500; text-transform: capitalize; }
    .res-pass { background: var(--green-50); color: var(--green-700); } .res-fail { background: var(--red-50); color: var(--red-700); } .res-partial { background: var(--yellow-50); color: var(--yellow-700); }
    .critical-count { color: var(--red-600); font-weight: 700; }
    .empty-cell { text-align: center; color: var(--text-color-secondary); padding: 2rem !important; }
  `]
})
export class DoraTestResultsComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  protected readonly results = signal<TestResult[]>([]);
  protected readonly searchTerm = signal('');

  protected readonly filteredResults = () => { const t = this.searchTerm().toLowerCase(); return t ? this.results().filter(r => r.testName.toLowerCase().includes(t)) : this.results(); };
  protected readonly passCount = () => this.results().filter(r => r.result === 'pass').length;
  protected readonly failCount = () => this.results().filter(r => r.result === 'fail').length;
  protected readonly partialCount = () => this.results().filter(r => r.result === 'partial').length;
  protected readonly totalCritical = () => this.results().reduce((s, r) => s + r.criticalFindings, 0);

  ngOnInit(): void { this.http.get<TestResult[]>('/api/dora/test-results').subscribe({ next: (d) => this.results.set(d), error: () => {} }); }
  onSearch(event: Event): void { this.searchTerm.set((event.target as HTMLInputElement).value); }
}

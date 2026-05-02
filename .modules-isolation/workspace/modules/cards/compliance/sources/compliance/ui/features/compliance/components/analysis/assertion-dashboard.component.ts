/**
 * Compliance Assertion Dashboard Component
 *
 * Displays compliance assertion summary cards, average confidence gauge,
 * stale assertion warnings, and a table of recent assertions with status
 * badges, confidence bars, and last-evaluated dates.
 */
import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

/** Shape returned by GET /api/compliance-assertions/dashboard */
interface AssertionDashboard {
  totalControls: number;
  compliantCount: number;
  partialCount: number;
  nonCompliantCount: number;
  unknownCount: number;
  averageConfidence: number;
  staleCount: number;
  recentAssertions: AssertionRow[];
}

interface AssertionRow {
  controlId: string;
  controlRef: string;
  controlTitle: string;
  controlTitleAr?: string;
  status: 'compliant' | 'partial' | 'non_compliant' | 'any';
  confidence: number;
  lastEvaluated: string;
  frameworkName?: string;
}

@Component({
  selector: 'app-assertion-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="assertion-dashboard">
      <header class="page-header">
        <div>
          <h1>Compliance Assertions</h1>
          <span class="header-ar">تأكيدات الامتثال</span>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" (click)="loadDashboard()">Refresh / تحديث</button>
          <button class="btn-primary" (click)="evaluateFramework()">
            Evaluate Framework / تقييم الإطار
          </button>
        </div>
      </header>

      <!-- Summary cards -->
      <div class="summary-cards">
        <div class="summary-card">
          <span class="card-value">{{ dashboard()?.totalControls ?? 0 }}</span>
          <span class="card-label">Total Controls</span>
          <span class="card-label-ar">إجمالي الضوابط</span>
        </div>
        <div class="summary-card card-compliant">
          <span class="card-value">{{ dashboard()?.compliantCount ?? 0 }}</span>
          <span class="card-label">Compliant</span>
          <span class="card-label-ar">ملتزم</span>
        </div>
        <div class="summary-card card-partial">
          <span class="card-value">{{ dashboard()?.partialCount ?? 0 }}</span>
          <span class="card-label">Partial</span>
          <span class="card-label-ar">جزئي</span>
        </div>
        <div class="summary-card card-noncompliant">
          <span class="card-value">{{ dashboard()?.nonCompliantCount ?? 0 }}</span>
          <span class="card-label">Non-Compliant</span>
          <span class="card-label-ar">غير ملتزم</span>
        </div>
        <div class="summary-card card-any">
          <span class="card-value">{{ dashboard()?.unknownCount ?? 0 }}</span>
          <span class="card-label">Unknown</span>
          <span class="card-label-ar">غير معروف</span>
        </div>
      </div>

      <!-- Confidence gauge and stale warning -->
      <div class="gauge-row">
        <div class="confidence-gauge">
          <h3>Average Confidence / متوسط الثقة</h3>
          <div class="gauge-bar-container">
            <div class="gauge-bar" [style.width.%]="dashboard()?.averageConfidence ?? 0"
                 [class]="gaugeColorClass(dashboard()?.averageConfidence ?? 0)">
            </div>
          </div>
          <span class="gauge-label">{{ dashboard()?.averageConfidence ?? 0 }}%</span>
        </div>

        @if ((dashboard()?.staleCount ?? 0) > 0) {
          <div class="stale-warning">
            <span class="warning-icon">[!]</span>
            <div>
              <strong>{{ dashboard()?.staleCount }} stale assertions</strong>
              <p>تأكيدات قديمة تحتاج إعادة تقييم</p>
              <p>These assertions have not been re-evaluated recently.</p>
            </div>
          </div>
        }
      </div>

      <!-- Framework evaluation selector -->
      @if (showFrameworkSelect()) {
        <div class="framework-select-bar">
          <label>Select Framework / اختر الإطار:</label>
          <input class="form-input" [(ngModel)]="frameworkId"
                 placeholder="Framework ID" />
          <button class="btn-primary" (click)="runEvaluation()"
                  [disabled]="evaluating()">
            @if (evaluating()) { Evaluating... } @else { Run / تشغيل }
          </button>
          <button class="btn-secondary" (click)="showFrameworkSelect.set(false)">Cancel</button>
        </div>
      }

      <!-- Recent assertions table -->
      <div class="table-section">
        <h3>Recent Assertions / التأكيدات الأخيرة</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Control / الضابط</th>
              <th>Framework</th>
              <th>Status / الحالة</th>
              <th>Confidence / الثقة</th>
              <th>Last Evaluated / آخر تقييم</th>
            </tr>
          </thead>
          <tbody>
            @for (row of dashboard()?.recentAssertions ?? []; track row.controlId) {
              <tr>
                <td class="ref-cell">{{ row.controlRef }}</td>
                <td>
                  <span>{{ row.controlTitle }}</span>
                  @if (row.controlTitleAr) {
                    <span class="cell-ar">{{ row.controlTitleAr }}</span>
                  }
                </td>
                <td>{{ row.frameworkName ?? '-' }}</td>
                <td>
                  <span class="status-badge" [class]="'status-' + row.status">
                    {{ statusLabel(row.status) }}
                  </span>
                </td>
                <td>
                  <div class="confidence-bar-container">
                    <div class="confidence-bar" [style.width.%]="row.confidence"
                         [class]="gaugeColorClass(row.confidence)"></div>
                  </div>
                  <span class="confidence-text">{{ row.confidence }}%</span>
                </td>
                <td class="date-cell">{{ row.lastEvaluated | date:'mediumDate' }}</td>
              </tr>
            }
          </tbody>
        </table>

        @if ((dashboard()?.recentAssertions ?? []).length === 0 && !loading()) {
          <div class="empty-state">
            <p>No assertions available yet.</p>
            <p class="rtl">لا توجد تأكيدات متاحة حتى الآن.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .assertion-dashboard { padding: 20px; min-height: 100vh; background: var(--surface-ground, #11111b); color: var(--text-color, #cdd6f4); }

    /* Header */
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .page-header h1 { font-size: 22px; font-weight: 700; margin: 0; color: var(--primary-color, #89b4fa); }
    .header-ar { font-size: var(--font-size-base); color: var(--text-color-secondary, #a6adc8); direction: rtl; display: block; }
    .header-actions { display: flex; gap: 8px; align-items: center; }

    /* Buttons */
    .btn-primary { padding: 8px 16px; border: none; border-radius: var(--radius-sm); background: var(--primary-color, #89b4fa); color: var(--primary-color-text, #1e1e2e); font-weight: 600; cursor: pointer; font-size: var(--font-size-sm); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { padding: 8px 16px; border: 1px solid var(--surface-border, #45475a); border-radius: var(--radius-sm); background: transparent; color: var(--text-color, #cdd6f4); cursor: pointer; font-size: var(--font-size-sm); }

    /* Summary cards */
    .summary-cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 20px; }
    .summary-card { background: var(--surface-card, #1e1e2e); border: 1px solid var(--surface-border, #313244); border-radius: var(--radius); padding: 16px; text-align: center; }
    .card-value { font-size: 28px; font-weight: 700; display: block; }
    .card-label { font-size: var(--font-size-sm); color: var(--text-color-secondary, #a6adc8); display: block; }
    .card-label-ar { font-size: var(--font-size-xs); color: var(--text-color-secondary, #6c7086); direction: rtl; display: block; }
    .card-compliant { border-left: 3px solid var(--success); }
    .card-compliant .card-value { color: var(--success); }
    .card-partial { border-left: 3px solid var(--warning); }
    .card-partial .card-value { color: var(--warning); }
    .card-noncompliant { border-left: 3px solid var(--error); }
    .card-noncompliant .card-value { color: var(--error); }
    .card-any { border-left: 3px solid var(--text-muted); }
    .card-any .card-value { color: var(--text-muted); }

    /* Gauge */
    .gauge-row { display: flex; gap: 16px; margin-bottom: 20px; align-items: stretch; }
    .confidence-gauge { flex: 1; background: var(--surface-card, #1e1e2e); border: 1px solid var(--surface-border, #313244); border-radius: var(--radius); padding: 16px; }
    .confidence-gauge h3 { margin: 0 0 12px 0; font-size: var(--font-size-base); }
    .gauge-bar-container { height: 20px; background: var(--surface-ground, #11111b); border-radius: var(--radius-md); overflow: hidden; }
    .gauge-bar { height: 100%; border-radius: var(--radius-md); transition: width 0.4s ease; }
    .gauge-bar.gauge-high { background: var(--success); }
    .gauge-bar.gauge-medium { background: var(--warning); }
    .gauge-bar.gauge-low { background: var(--error); }
    .gauge-label { font-size: var(--font-size-xl); font-weight: 700; margin-top: 8px; display: inline-block; }

    /* Stale warning */
    .stale-warning { background: color-mix(in srgb, var(--warning) 10%, transparent); border: 1px solid var(--warning); border-radius: var(--radius); padding: 16px; display: flex; gap: 12px; align-items: flex-start; min-width: 280px; }
    .warning-icon { font-size: var(--font-size-xl); font-weight: 700; color: var(--warning); }
    .stale-warning p { margin: 2px 0; font-size: var(--font-size-sm); color: var(--text-color-secondary, #a6adc8); }

    /* Framework select */
    .framework-select-bar { display: flex; gap: 8px; align-items: center; margin-bottom: 16px; background: var(--surface-card, #1e1e2e); padding: 12px; border-radius: var(--radius); }
    .framework-select-bar label { font-size: var(--font-size-sm); white-space: nowrap; }
    .form-input { padding: 6px 10px; border: 1px solid var(--surface-border, #45475a); border-radius: var(--radius-sm); background: var(--surface-card, #1e1e2e); color: var(--text-color, #cdd6f4); font-size: var(--font-size-sm); }

    /* Table */
    .table-section { background: var(--surface-card, #1e1e2e); border: 1px solid var(--surface-border, #313244); border-radius: var(--radius); padding: 16px; }
    .table-section h3 { margin: 0 0 12px 0; font-size: var(--font-size-base); }
    .data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
    .data-table th { text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--surface-border, #45475a); color: var(--text-color-secondary, #a6adc8); font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.5px; }
    .data-table td { padding: 10px 12px; border-bottom: 1px solid var(--surface-border, #313244); }
    .ref-cell { font-family: monospace; font-size: var(--font-size-sm); color: var(--text-color-secondary, #a6adc8); }
    .cell-ar { display: block; font-size: var(--font-size-xs); color: var(--text-color-secondary, #6c7086); direction: rtl; }
    .date-cell { font-size: var(--font-size-sm); color: var(--text-color-secondary, #a6adc8); }

    /* Status badge */
    .status-badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-xs); font-weight: 600; white-space: nowrap; }
    .status-compliant { background: color-mix(in srgb, var(--success) 20%, transparent); color: var(--success); }
    .status-partial { background: color-mix(in srgb, var(--warning) 20%, transparent); color: var(--warning); }
    .status-non_compliant { background: color-mix(in srgb, var(--error) 20%, transparent); color: var(--error); }
    .status-any { background: color-mix(in srgb, var(--text-muted) 20%, transparent); color: var(--text-muted); }

    /* Confidence bar */
    .confidence-bar-container { height: 6px; background: var(--surface-ground, #11111b); border-radius: 3px; overflow: hidden; width: 80px; display: inline-block; vertical-align: middle; }
    .confidence-bar { height: 100%; border-radius: 3px; }
    .confidence-text { font-size: var(--font-size-xs); margin-left: 6px; color: var(--text-color-secondary, #a6adc8); }

    .empty-state { text-align: center; padding: 40px; color: var(--text-color-secondary, #a6adc8); }
    .rtl { direction: rtl; }

    @media (max-width: 900px) { .summary-cards { grid-template-columns: repeat(3, 1fr); } .gauge-row { flex-direction: column; } }
    @media (max-width: 600px) { .summary-cards { grid-template-columns: repeat(2, 1fr); } }
  `],
})
export class AssertionDashboardComponent implements OnInit {
  private http = inject(HttpClient);

  dashboard = signal<AssertionDashboard | null>(null);
  loading = signal(false);
  showFrameworkSelect = signal(false);
  evaluating = signal(false);
  frameworkId = '';

  ngOnInit(): void {
    this.loadDashboard();
  }

  /** Fetch dashboard data from API */
  loadDashboard(): void {
    this.loading.set(true);
    this.http.get<AssertionDashboard>('/api/compliance-assertions/dashboard').subscribe({
      next: (data) => { this.dashboard.set(data); this.loading.set(false); },
      error: () => { this.dashboard.set(null); this.loading.set(false); },
    });
  }

  /** Show framework evaluation selector */
  evaluateFramework(): void {
    this.showFrameworkSelect.set(true);
  }

  /** POST evaluation request for the selected framework */
  runEvaluation(): void {
    if (!this.frameworkId) return;
    this.evaluating.set(true);
    this.http.post(`/api/compliance-assertions/evaluate-framework/${this.frameworkId}`, {}).subscribe({
      next: () => {
        this.evaluating.set(false);
        this.showFrameworkSelect.set(false);
        this.loadDashboard();
      },
      error: () => { this.evaluating.set(false); },
    });
  }

  /** Return CSS class for gauge color based on percentage */
  gaugeColorClass(value: number): string {
    if (value >= 70) return 'gauge-high';
    if (value >= 40) return 'gauge-medium';
    return 'gauge-low';
  }

  /** Return bilingual status label */
  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      compliant: 'Compliant / ملتزم',
      partial: 'Partial / جزئي',
      non_compliant: 'Non-Compliant / غير ملتزم',
      any: 'Unknown / غير معروف',
    };
    return labels[status] ?? status;
  }
}

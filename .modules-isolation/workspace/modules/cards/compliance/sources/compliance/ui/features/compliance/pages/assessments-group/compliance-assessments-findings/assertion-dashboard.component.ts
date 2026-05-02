import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

interface AssertionSummary {
  totalControls: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  any: number;
  notApplicable: number;
  averageConfidence: number;
  lastEvaluated: string | null;
}

@Component({
    selector: 'app-assertion-dashboard',
    imports: [CommonModule, RouterModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="assertion-dashboard">
      <header class="dash-header">
        <h1>Compliance Assertions</h1>
        <p class="subtitle">Real-time compliance status evaluation engine</p>
      </header>

      @if (summary()) {
        <div class="kpi-grid">
          <div class="kpi-card compliant">
            <div class="kpi-value">{{ summary()!.compliant }}</div>
            <div class="kpi-label">Compliant</div>
            <div class="kpi-label-ar">ممتثل</div>
          </div>
          <div class="kpi-card partial">
            <div class="kpi-value">{{ summary()!.partial }}</div>
            <div class="kpi-label">Partial</div>
            <div class="kpi-label-ar">جزئي</div>
          </div>
          <div class="kpi-card non-compliant">
            <div class="kpi-value">{{ summary()!.nonCompliant }}</div>
            <div class="kpi-label">Non-Compliant</div>
            <div class="kpi-label-ar">غير ممتثل</div>
          </div>
          <div class="kpi-card any">
            <div class="kpi-value">{{ summary()!.any }}</div>
            <div class="kpi-label">Unknown</div>
            <div class="kpi-label-ar">غير محدد</div>
          </div>
          <div class="kpi-card confidence">
            <div class="kpi-value">{{ summary()!.averageConfidence }}%</div>
            <div class="kpi-label">Avg Confidence</div>
            <div class="kpi-label-ar">متوسط الثقة</div>
          </div>
        </div>

        <!-- Coverage bar -->
        <div class="coverage-section">
          <h3>Compliance Coverage</h3>
          <div class="coverage-bar">
            @if (summary()!.totalControls > 0) {
              <div class="bar-segment compliant-bg"
                   [style.width.%]="(summary()!.compliant / summary()!.totalControls) * 100">
              </div>
              <div class="bar-segment partial-bg"
                   [style.width.%]="(summary()!.partial / summary()!.totalControls) * 100">
              </div>
              <div class="bar-segment non-compliant-bg"
                   [style.width.%]="(summary()!.nonCompliant / summary()!.totalControls) * 100">
              </div>
              <div class="bar-segment any-bg"
                   [style.width.%]="(summary()!.any / summary()!.totalControls) * 100">
              </div>
            }
          </div>
          <div class="coverage-legend">
            <span class="legend-item"><span class="dot compliant-bg"></span> Compliant</span>
            <span class="legend-item"><span class="dot partial-bg"></span> Partial</span>
            <span class="legend-item"><span class="dot non-compliant-bg"></span> Non-Compliant</span>
            <span class="legend-item"><span class="dot any-bg"></span> Unknown</span>
          </div>
        </div>
      } @else {
        <div class="empty-state">
          <p>No assertions evaluated yet. Run an evaluation to see compliance status.</p>
          <p class="empty-ar">لم يتم تقييم أي تأكيدات حتى الآن. قم بتشغيل التقييم لعرض حالة الامتثال.</p>
        </div>
      }

      @if (summary()?.lastEvaluated) {
        <div class="last-evaluated">
          Last evaluated: {{ summary()!.lastEvaluated | date:'medium' }}
        </div>
      }
    </div>
  `,
    styles: [`
    .assertion-dashboard { padding: 20px; min-height: 100vh; background: var(--surface-ground, #11111b); color: var(--text-color, #cdd6f4); }
    .dash-header { margin-bottom: 24px; }
    .dash-header h1 { font-size: 22px; font-weight: 700; margin: 0; color: var(--primary-color, #89b4fa); }
    .subtitle { font-size: var(--font-size-sm); color: var(--text-color-secondary, #a6adc8); margin-top: 4px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .kpi-card { background: var(--surface-card, #1e1e2e); border: 1px solid var(--surface-border, #313244); border-radius: var(--radius); padding: 16px; text-align: center; }
    .kpi-value { font-size: 28px; font-weight: 700; }
    .kpi-label { font-size: var(--font-size-sm); color: var(--text-color-secondary, #a6adc8); margin-top: 4px; }
    .kpi-label-ar { font-size: var(--font-size-xs); color: var(--text-color-secondary, #6c7086); direction: rtl; }
    .kpi-card.compliant .kpi-value { color: #a6e3a1; }
    .kpi-card.partial .kpi-value { color: #f9e2af; }
    .kpi-card.non-compliant .kpi-value { color: #f38ba8; }
    .kpi-card.any .kpi-value { color: #6c7086; }
    .kpi-card.confidence .kpi-value { color: #89b4fa; }
    .coverage-section { background: var(--surface-card, #1e1e2e); border: 1px solid var(--surface-border, #313244); border-radius: var(--radius); padding: 16px; margin-bottom: 16px; }
    .coverage-section h3 { font-size: var(--font-size-base); margin: 0 0 12px 0; }
    .coverage-bar { display: flex; height: 24px; border-radius: var(--radius-xs); overflow: hidden; background: var(--surface-ground, #181825); }
    .bar-segment { min-width: 2px; transition: width 0.3s; }
    .compliant-bg { background: #a6e3a1; }
    .partial-bg { background: #f9e2af; }
    .non-compliant-bg { background: #f38ba8; }
    .any-bg { background: #6c7086; }
    .coverage-legend { display: flex; gap: 16px; margin-top: 8px; font-size: var(--font-size-sm); }
    .legend-item { display: flex; align-items: center; gap: 4px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; }
    .empty-state { text-align: center; padding: 40px; color: var(--text-color-secondary, #a6adc8); }
    .empty-ar { direction: rtl; font-size: var(--font-size-sm); margin-top: 8px; }
    .last-evaluated { font-size: var(--font-size-sm); color: var(--text-color-secondary, #6c7086); text-align: right; }
  `]
})
export class AssertionDashboardComponent {
  private http = inject(HttpClient);

  /** One-shot assertion summary load; falls back to null on error */
  summary = toSignal<AssertionSummary | null>(
    this.http.get<AssertionSummary>('/api/compliance-assertions').pipe(
      catchError(() => of(null))
    ),
    { initialValue: null }
  );
}

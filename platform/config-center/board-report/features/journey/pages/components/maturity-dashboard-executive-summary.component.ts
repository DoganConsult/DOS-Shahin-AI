/**
 * Maturity Dashboard Executive Summary — Bilingual executive summary panel
 * with highlights, risk areas, and recommendations.
 *
 * Presentational child of MaturityDashboardComponent.
 */

import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ExecutiveSummary } from '@app/core/services/user-account/journey.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-maturity-executive-summary',
    imports: [CommonModule, AppDatePipe],
    template: `
    <div class="summary-card">
      <div class="summary-header">
        <h2 class="section-title">{{ isAr() ? 'الملخص التنفيذي' : 'Executive Summary' }}</h2>
        <button class="btn-generate" (click)="generate.emit()" [disabled]="loadingSummary">
          @if (loadingSummary) {
            <i class="pi pi-spin pi-spinner"></i>
          } @else {
            <i class="pi pi-file-edit"></i>
          }
          {{ isAr() ? 'إنشاء ملخص' : 'Generate Summary' }}
        </button>
      </div>

      @if (summaryError) {
        <div class="summary-error" role="alert">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ summaryError }}</span>
        </div>
      }

      @if (summary) {
        <div class="summary-content">
          <!-- Bilingual summary text -->
          <div class="summary-text-block">
            <div class="summary-primary">
              {{ isAr() ? summary.summaryAr : summary.summaryEn }}
            </div>
            <div class="summary-secondary">
              {{ isAr() ? summary.summaryEn : summary.summaryAr }}
            </div>
          </div>

          <!-- Highlights -->
          @if (summary.highlights.length > 0) {
            <div class="summary-section">
              <h3 class="summary-section-title highlights-title">
                <i class="pi pi-star"></i>
                {{ isAr() ? 'أبرز النقاط' : 'Highlights' }}
              </h3>
              <ul class="summary-list">
                @for (h of summary.highlights; track $index) {
                  <li>{{ isAr() ? h.ar : h.en }}</li>
                }
              </ul>
            </div>
          }

          <!-- Risk areas -->
          @if (summary.riskAreas.length > 0) {
            <div class="summary-section">
              <h3 class="summary-section-title risk-title">
                <i class="pi pi-exclamation-triangle"></i>
                {{ isAr() ? 'مجالات المخاطر' : 'Risk Areas' }}
              </h3>
              <ul class="summary-list risk-list">
                @for (r of summary.riskAreas; track $index) {
                  <li>{{ isAr() ? r.ar : r.en }}</li>
                }
              </ul>
            </div>
          }

          <!-- Recommendations -->
          @if (summary.recommendations.length > 0) {
            <div class="summary-section">
              <h3 class="summary-section-title rec-title">
                <i class="pi pi-lightbulb"></i>
                {{ isAr() ? 'التوصيات' : 'Recommendations' }}
              </h3>
              <ul class="summary-list rec-list">
                @for (rec of summary.recommendations; track $index) {
                  <li>{{ isAr() ? rec.ar : rec.en }}</li>
                }
              </ul>
            </div>
          }

          <div class="summary-generated-at">
            {{ isAr() ? 'تم الإنشاء:' : 'Generated:' }}
            {{ summary.generatedAt | appDate:'medium' }}
          </div>
        </div>
      }

      @if (!summary && !loadingSummary && !summaryError) {
        <div class="summary-empty">
          <i class="pi pi-file-edit"></i>
          <span>{{ isAr()
            ? 'اضغط على "إنشاء ملخص" للحصول على ملخص تنفيذي ثنائي اللغة.'
            : 'Click "Generate Summary" to get a bilingual executive summary.' }}</span>
        </div>
      }
    </div>
  `,
    styles: [`
    .section-title {
      font-size: var(--font-size-base);
      font-weight: var(--font-bold);
      color: var(--text-heading);
      margin: 0 0 var(--space-md);
    }

    .summary-card {
      background: var(--surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
      padding: var(--space-lg);
    }

    .summary-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-md);
    }

    .summary-header .section-title { margin: 0; }

    .btn-generate {
      padding: var(--space-sm) var(--space-lg);
      border-radius: var(--radius);
      border: 2px solid var(--primary);
      background: var(--surface-ice);
      color: var(--primary);
      font-size: var(--font-size-sm);
      font-weight: var(--font-bold);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);
      transition: all 200ms ease;
    }

    .btn-generate:hover:not(:disabled) { background: var(--primary); color: var(--text-on-primary); }
    .btn-generate:disabled { opacity: 0.6; cursor: not-allowed; }

    .summary-error {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      padding: var(--space-sm);
      background: rgba(var(--module-accent-red-rgb), 0.06);
      border: 1px solid rgba(var(--module-accent-red-rgb), 0.2);
      border-radius: var(--radius-sm);
      color: var(--danger);
      font-size: var(--font-size-sm);
      margin-bottom: var(--space-md);
    }

    .summary-content { animation: fadeSlideIn 300ms ease; }

    .summary-text-block { margin-bottom: var(--space-lg); }

    .summary-primary {
      font-size: var(--font-size-base);
      color: var(--text-body);
      line-height: 1.7;
      margin-bottom: var(--space-sm);
    }

    .summary-secondary {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      line-height: 1.6;
      font-style: italic;
      padding-top: var(--space-sm);
      border-top: 1px solid var(--border-subtle);
    }

    .summary-section { margin-bottom: var(--space-md); }

    .summary-section-title {
      font-size: var(--font-size-sm);
      font-weight: var(--font-bold);
      margin: 0 0 var(--space-sm);
      display: flex;
      align-items: center;
      gap: var(--space-xs);
    }

    .highlights-title { color: var(--success); }
    .risk-title { color: var(--danger); }
    .rec-title { color: var(--primary); }

    .summary-list {
      margin: 0;
      padding-inline-start: var(--space-lg);
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .summary-list li { font-size: var(--font-size-sm); color: var(--text-body); line-height: 1.5; }
    .risk-list li { color: var(--danger); }

    .summary-generated-at {
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      margin-top: var(--space-md);
      padding-top: var(--space-sm);
      border-top: 1px solid var(--border-subtle);
    }

    .summary-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-xl) 0;
      color: var(--text-muted);
      font-size: var(--font-size-sm);
    }

    .summary-empty .pi { font-size: var(--font-size-2xl); opacity: 0.4; }

    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 768px) {
      .summary-header {
        flex-direction: column;
        gap: var(--space-sm);
        align-items: flex-start;
      }
    }
  `]
})
export class MaturityExecutiveSummaryComponent {
  readonly i18n = inject(I18nService);

  @Input() summary: ExecutiveSummary | null = null;
  @Input() loadingSummary = false;
  @Input() summaryError = '';
  @Output() generate = new EventEmitter<void>();

  isAr = computed(() => this.i18n.currentLang() === 'ar');
}

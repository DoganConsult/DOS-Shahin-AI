import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

export interface NarrativeSummary {
  executive_brief?: string;
  risk_posture?: string;
  compliance_status?: string;
  key_metrics?: { label: string; value: string | number }[];
  recommendations?: string[];
  generated_at?: string;
}

/**
 * NarrativeSummaryWidgetComponent
 *
 * Auto-generated executive summary from Shahin's Governance AI Narrative Engine.
 * Built from real governance data — not templates, not LLM hallucinations.
 *
 * Market differentiator: CISOs spend hours writing board reports. Shahin generates them.
 */
@Component({
  selector: 'app-narrative-summary-widget',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="narrative" [class.rtl]="lang === 'ar'" *ngIf="narrative">
      <div class="narrative-header">
        <div class="narrative-title-row">
          <i class="pi pi-file-edit narrative-icon"></i>
          <h3>{{ lang === 'ar' ? 'ملخص شاهين التنفيذي' : "Shahin's Executive Summary" }}</h3>
        </div>
        <span class="narrative-generated" *ngIf="narrative.generated_at">
          {{ lang === 'ar' ? 'تم الإنشاء:' : 'Generated:' }} {{ narrative.generated_at | date:'short' }}
        </span>
      </div>

      <!-- Executive Brief -->
      <div class="narrative-section" *ngIf="narrative.executive_brief">
        <p class="narrative-text">{{ narrative.executive_brief }}</p>
      </div>

      <!-- Key Metrics -->
      <div class="narrative-metrics" *ngIf="narrative.key_metrics?.length">
        <div *ngFor="let m of narrative.key_metrics" class="narrative-metric">
          <span class="metric-val">{{ m.value }}</span>
          <span class="metric-label">{{ m.label }}</span>
        </div>
      </div>

      <!-- Risk + Compliance -->
      <div class="narrative-section" *ngIf="narrative.risk_posture">
        <div class="narrative-section-label">
          <i class="pi pi-exclamation-triangle"></i>
          {{ lang === 'ar' ? 'وضع المخاطر' : 'Risk Posture' }}
        </div>
        <p class="narrative-text">{{ narrative.risk_posture }}</p>
      </div>

      <div class="narrative-section" *ngIf="narrative.compliance_status">
        <div class="narrative-section-label">
          <i class="pi pi-shield"></i>
          {{ lang === 'ar' ? 'حالة الامتثال' : 'Compliance Status' }}
        </div>
        <p class="narrative-text">{{ narrative.compliance_status }}</p>
      </div>

      <!-- Recommendations -->
      <div class="narrative-recs" *ngIf="narrative.recommendations?.length">
        <div class="narrative-section-label">
          <i class="pi pi-star"></i>
          {{ lang === 'ar' ? 'التوصيات' : 'Recommendations' }}
        </div>
        <div *ngFor="let rec of narrative.recommendations" class="narrative-rec">
          <i class="pi pi-arrow-right"></i>
          <span>{{ rec }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="narrative-actions">
        <button pButton class="p-button-sm p-button-outlined"
          [label]="lang === 'ar' ? 'تصدير' : 'Export'"
          icon="pi pi-download" (click)="exportRequested.emit('pdf')"></button>
      </div>

      <div class="narrative-source">
        <i class="pi pi-database"></i>
        {{ lang === 'ar' ? 'مُنشأ من بيانات الحوكمة الفعلية — ليس قوالب' : 'Generated from real governance data — not templates' }}
      </div>
    </div>
  `,
  styles: [`
    .narrative {
      background: var(--surface, #fff);
      border: 1px solid var(--border-subtle, rgba(var(--color-black-rgb), 0.08));
      border-radius: var(--radius-lg, 12px);
      padding: 1.25rem 1.5rem;
      border-inline-start: 3px solid var(--primary, #0f62fe);
    }
    .narrative.rtl { direction: rtl; }

    .narrative-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;
    }
    .narrative-title-row { display: flex; align-items: center; gap: 0.5rem; }
    .narrative-icon { font-size: var(--font-size-body-md); color: var(--primary, #0f62fe); }
    .narrative-header h3 {
      font-size: var(--font-size-md); font-weight: 700; color: var(--text-heading, #161616); margin: 0;
    }
    .narrative-generated {
      font-size: var(--font-size-xs); color: var(--text-muted, #6f6f6f);
      background: var(--surface-ice, #f4f4f4); padding: 0.15rem 0.5rem;
      border-radius: var(--radius-pill, 20px);
    }

    .narrative-section { margin-bottom: 0.75rem; }
    .narrative-section-label {
      font-size: var(--font-size-caption); font-weight: 600; color: var(--text-body, #525252);
      display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.25rem;
    }
    .narrative-section-label i { font-size: var(--font-size-xs); color: var(--primary, #0f62fe); }
    .narrative-text { font-size: var(--font-size-tag); color: var(--text-body, #525252); line-height: 1.6; margin: 0; }

    .narrative-metrics {
      display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap;
    }
    .narrative-metric {
      display: flex; flex-direction: column; align-items: center;
      padding: 0.5rem 0.75rem; background: var(--surface-ice, #f4f4f4);
      border-radius: var(--radius-md, 10px); min-width: 80px; text-align: center;
    }
    .metric-val { font-size: var(--font-size-body-md); font-weight: 700; color: var(--primary, #0f62fe); }
    .metric-label { font-size: var(--font-size-2xs); color: var(--text-muted, #6f6f6f); margin-top: 0.15rem; }

    .narrative-recs { margin-bottom: 0.75rem; }
    .narrative-rec {
      display: flex; align-items: flex-start; gap: 0.35rem;
      font-size: 0.82rem; color: var(--text-body, #525252);
      padding: 0.2rem 0; line-height: 1.5;
    }
    .narrative-rec i { font-size: var(--font-size-2xs); color: var(--primary); margin-top: 4px; flex-shrink: 0; }

    .narrative-actions {
      display: flex; gap: 0.5rem; margin-bottom: 0.5rem;
    }

    .narrative-source {
      display: flex; align-items: center; gap: 0.3rem;
      font-size: var(--font-size-2xs); color: var(--status-success, #24a148); font-weight: 500;
      padding-top: 0.5rem; border-top: 1px solid var(--border-subtle, rgba(var(--color-black-rgb), 0.06));
    }
    .narrative-source i { font-size: 0.6rem; }
  `]
})
export class NarrativeSummaryWidgetComponent {
  @Input() narrative: NarrativeSummary | null = null;
  @Input() lang: 'en' | 'ar' = 'en';
  @Output() exportRequested = new EventEmitter<'pdf' | 'docx'>();
}

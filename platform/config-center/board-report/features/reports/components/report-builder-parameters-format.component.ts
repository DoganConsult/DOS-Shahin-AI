/**
 * Report Builder Parameters & Format — Steps 2 and 3: configure parameters,
 * select sections, choose output format.
 *
 * Presentational child of ReportBuilderComponent.
 */

import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import type { ReportTemplate } from '../services/reports-api.service';

type Format = 'pdf' | 'excel' | 'html';

export interface ReportParams {
  dateFrom: string;
  dateTo: string;
  language: string;
  scope: string;
  reportName: string;
  orientation: 'portrait' | 'landscape';
}

export interface SectionOption {
  key: string;
  labelEn: string;
  labelAr: string;
  checked: boolean;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-report-builder-parameters-format',
    imports: [CommonModule, FormsModule],
    template: `
    <!-- STEP 2: Parameters -->
    @if (currentStep === 2) {
      <div class="rb-section">
        <div class="rb-section-header">
          <span class="rb-section-title">
            <i class="pi pi-sliders-h" aria-hidden="true"></i>
            {{ isAr() ? 'ضبط المعاملات' : 'Configure Parameters' }}
          </span>
        </div>

        <div class="rb-form-grid">
          <div class="rb-field-group">
            <label class="rb-label">{{ isAr() ? 'من تاريخ' : 'Date From' }}</label>
            <input type="date" [(ngModel)]="params.dateFrom" class="rb-input" />
          </div>
          <div class="rb-field-group">
            <label class="rb-label">{{ isAr() ? 'إلى تاريخ' : 'Date To' }}</label>
            <input type="date" [(ngModel)]="params.dateTo" class="rb-input" />
          </div>
          <div class="rb-field-group">
            <label class="rb-label">{{ isAr() ? 'لغة التقرير' : 'Report Language' }}</label>
            <select [(ngModel)]="params.language" class="rb-select">
              <option value="en">English</option>
              <option value="ar">عربي</option>
            </select>
          </div>
          <div class="rb-field-group">
            <label class="rb-label">{{ isAr() ? 'نطاق البيانات' : 'Data Scope' }}</label>
            <select [(ngModel)]="params.scope" class="rb-select">
              <option value="all">{{ isAr() ? 'جميع الوحدات' : 'All Business Units' }}</option>
              <option value="active">{{ isAr() ? 'النشطة فقط' : 'Active Only' }}</option>
              <option value="critical">{{ isAr() ? 'الحرجة والعالية' : 'Critical & High Only' }}</option>
            </select>
          </div>
          <div class="rb-field-group rb-field-full">
            <label class="rb-label">{{ isAr() ? 'اسم التقرير (اختياري)' : 'Report Name (optional)' }}</label>
            <input type="text" [(ngModel)]="params.reportName"
              [placeholder]="isAr() ? 'مثال: تقرير المخاطر الربع الثالث 2025' : 'e.g. Q3 2025 Risk Report'"
              [attr.aria-label]="isAr() ? 'مثال: تقرير المخاطر الربع الثالث 2025' : 'e.g. Q3 2025 Risk Report'"
              class="rb-input" />
          </div>
          <div class="rb-field-group rb-field-full">
            <label class="rb-label">{{ isAr() ? 'الأقسام المضمّنة' : 'Included Sections' }}</label>
            <div class="rb-checkboxes">
              @for (sec of availableSections; track sec.key) {
                <label class="rb-checkbox-label">
                  <input type="checkbox" [(ngModel)]="sec.checked" class="rb-checkbox" />
                  <span>{{ isAr() ? sec.labelAr : sec.labelEn }}</span>
                </label>
              }
            </div>
          </div>
        </div>

        <div class="rb-step-nav">
          <button class="rb-btn rb-btn-ghost" (click)="back.emit()">
            <i class="pi pi-arrow-left" aria-hidden="true"></i> {{ isAr() ? 'السابق' : 'Back' }}
          </button>
          <button class="rb-btn rb-btn-primary" (click)="next.emit()">
            {{ isAr() ? 'التالي' : 'Next' }} <i class="pi pi-arrow-right" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    }

    <!-- STEP 3: Format & Output -->
    @if (currentStep === 3 && selectedTemplate) {
      <div class="rb-section">
        <div class="rb-section-header">
          <span class="rb-section-title">
            <i class="pi pi-download" aria-hidden="true"></i>
            {{ isAr() ? 'تنسيق الإخراج' : 'Output Format' }}
          </span>
        </div>

        <div class="rb-format-row">
          @for (fmt of selectedTemplate.formats; track fmt) {
            <div class="rb-format-card"
              [class.selected]="selectedFormat === fmt"
              (click)="formatSelected.emit(fmt)"
              role="button" tabindex="0">
              <i class="pi" [ngClass]="fmtIcon(fmt)" aria-hidden="true"></i>
              <span class="fmt-name">{{ fmt.toUpperCase() }}</span>
              <span class="fmt-desc">{{ fmtDesc(fmt) }}</span>
            </div>
          }
        </div>

        @if (selectedFormat === 'pdf') {
          <div class="rb-field-group" style="margin-top:16px">
            <label class="rb-label">{{ isAr() ? 'اتجاه الصفحة' : 'Page Orientation' }}</label>
            <div class="rb-radio-group">
              <label class="rb-radio-label">
                <input type="radio" name="orientation" [(ngModel)]="params.orientation" value="portrait" class="rb-radio" />
                <i class="pi pi-align-justify" aria-hidden="true"></i>
                {{ isAr() ? 'عمودي' : 'Portrait' }}
              </label>
              <label class="rb-radio-label">
                <input type="radio" name="orientation" [(ngModel)]="params.orientation" value="landscape" class="rb-radio" />
                <i class="pi pi-align-center" aria-hidden="true"></i>
                {{ isAr() ? 'أفقي' : 'Landscape' }}
              </label>
            </div>
          </div>
        }

        <!-- Summary card -->
        <div class="rb-summary-card">
          <div class="rbs-row">
            <span class="rbs-key">{{ isAr() ? 'القالب' : 'Template' }}</span>
            <span class="rbs-val">{{ isAr() ? selectedTemplate.titleAr : selectedTemplate.titleEn }}</span>
          </div>
          <div class="rbs-row">
            <span class="rbs-key">{{ isAr() ? 'الفترة' : 'Period' }}</span>
            <span class="rbs-val">{{ params.dateFrom || '—' }} → {{ params.dateTo || '—' }}</span>
          </div>
          <div class="rbs-row">
            <span class="rbs-key">{{ isAr() ? 'اللغة' : 'Language' }}</span>
            <span class="rbs-val">{{ params.language === 'ar' ? 'عربي' : 'English' }}</span>
          </div>
          <div class="rbs-row">
            <span class="rbs-key">{{ isAr() ? 'التنسيق' : 'Format' }}</span>
            <span class="rbs-val">{{ selectedFormat?.toUpperCase() || '—' }}</span>
          </div>
        </div>

        <div class="rb-step-nav">
          <button class="rb-btn rb-btn-ghost" (click)="back.emit()">
            <i class="pi pi-arrow-left" aria-hidden="true"></i> {{ isAr() ? 'السابق' : 'Back' }}
          </button>
          <button class="rb-btn rb-btn-primary" [disabled]="!selectedFormat" (click)="next.emit()">
            {{ isAr() ? 'التالي' : 'Next' }} <i class="pi pi-arrow-right" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    }
  `,
    styles: [`
    .rb-section {
      background: var(--surface-card, #fff);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .rb-section-header { display: flex; align-items: center; justify-content: space-between; }
    .rb-section-title {
      display: flex; align-items: center; gap: 8px;
      font-size: var(--font-size-base); font-weight: 700; color: var(--text-heading);
    }
    .rb-section-title .pi { color: var(--primary-600, #2563eb); }

    .rb-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .rb-field-group { display: flex; flex-direction: column; gap: 6px; }
    .rb-field-full { grid-column: 1 / -1; }
    .rb-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-heading); }

    .rb-input, .rb-select {
      padding: 8px 12px;
      border-radius: var(--radius);
      border: 1px solid var(--border-subtle);
      font-size: var(--font-size-sm);
      background: var(--surface-ground, #fff);
      color: var(--text-body, #374151);
      width: 100%;
    }
    .rb-input:focus, .rb-select:focus { outline: none; border-color: var(--primary-400, #60a5fa); box-shadow: var(--shadow-glow); }

    .rb-checkboxes {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 8px;
      padding: 12px;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
      background: var(--surface-ground, var(--surface-ice));
    }

    .rb-checkbox-label {
      display: flex; align-items: center; gap: 8px;
      font-size: var(--font-size-sm); cursor: pointer;
      padding: 4px 6px; border-radius: var(--radius-sm);
    }
    .rb-checkbox-label:hover { background: var(--surface-100, var(--surface-ice)); }

    .rb-radio-group { display: flex; gap: 16px; flex-wrap: wrap; }
    .rb-radio-label {
      display: flex; align-items: center; gap: 6px;
      font-size: var(--font-size-sm); cursor: pointer;
      padding: 8px 14px;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
    }
    .rb-radio-label:has(input:checked) {
      border-color: var(--primary-600, #2563eb);
      background: var(--primary-50, #eff6ff);
      color: var(--primary-700, #1d4ed8);
    }

    /* -- Format cards -- */
    .rb-format-row { display: flex; gap: 14px; flex-wrap: wrap; }
    .rb-format-card {
      flex: 1; min-width: 120px; max-width: 180px;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 20px 16px; border-radius: var(--radius-lg);
      border: 2px solid var(--border-subtle); cursor: pointer; transition: all 0.15s;
    }
    .rb-format-card .pi { font-size: var(--font-size-3xl); color: var(--text-muted); }
    .rb-format-card:hover { border-color: var(--primary-300, #93c5fd); }
    .rb-format-card.selected {
      border-color: var(--primary-600, #2563eb);
      background: var(--primary-50, #eff6ff);
    }
    .rb-format-card.selected .pi { color: var(--primary-600, #2563eb); }
    .fmt-name { font-size: var(--font-size-md); font-weight: 700; }
    .fmt-desc { font-size: var(--font-size-xs); color: var(--text-muted); text-align: center; }

    /* -- Summary card -- */
    .rb-summary-card {
      background: var(--surface-ground, var(--surface-ice));
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 16px 20px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .rbs-row { display: flex; gap: 12px; font-size: var(--font-size-sm); }
    .rbs-key { font-weight: 600; color: var(--text-muted); min-width: 80px; }
    .rbs-val { color: var(--text-body, #374151); }

    /* -- Navigation -- */
    .rb-step-nav {
      display: flex; align-items: center; justify-content: space-between;
      padding-top: 8px; border-top: 1px solid var(--border-subtle);
    }

    .rb-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 18px; border-radius: var(--radius);
      border: 1px solid var(--border-subtle);
      font-size: var(--font-size-sm); font-weight: 600; cursor: pointer; transition: all 0.15s;
    }
    .rb-btn:disabled { opacity: .45; cursor: not-allowed; }

    .rb-btn-primary {
      background: var(--primary-600, #2563eb); color: #fff;
      border-color: var(--primary-600, #2563eb);
    }
    .rb-btn-primary:hover:not(:disabled) { background: var(--primary-700, #1d4ed8); }

    .rb-btn-ghost {
      background: var(--surface-card, #fff); color: var(--text-body, #374151);
    }
    .rb-btn-ghost:hover { background: var(--surface-100, var(--surface-ice)); }

    [dir="rtl"] .rb-btn .pi-arrow-right { transform: scaleX(-1); }
    [dir="rtl"] .rb-btn .pi-arrow-left  { transform: scaleX(-1); }

    @media (max-width: 1024px) {
      .rb-form-grid { grid-template-columns: 1fr; }
      .rb-field-full { grid-column: 1; }
    }

    @media (max-width: 768px) {
      .rb-format-row { flex-direction: column; }
      .rb-format-card { max-width: 100%; }
    }
  `]
})
export class ReportBuilderParametersFormatComponent {
  readonly i18n = inject(I18nService);

  @Input({ required: true }) currentStep!: number;
  @Input() selectedTemplate: ReportTemplate | null = null;
  @Input() selectedFormat: string | null = null;
  @Input({ required: true }) params!: ReportParams;
  @Input() availableSections: SectionOption[] = [];

  @Output() next = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
  @Output() formatSelected = new EventEmitter<string>();

  isAr = computed(() => this.i18n.currentLang() === 'ar');

  fmtIcon(fmt: string): string {
    switch (fmt) {
      case 'pdf':   return 'pi-file-pdf';
      case 'excel': return 'pi-file-excel';
      case 'html':  return 'pi-globe';
      default:      return 'pi-file';
    }
  }

  fmtDesc(fmt: string): string {
    const isAr = this.isAr();
    switch (fmt) {
      case 'pdf':   return isAr ? 'مناسب للطباعة والعرض' : 'Print-ready, shareable';
      case 'excel': return isAr ? 'جداول بيانات قابلة للتحرير' : 'Editable spreadsheet';
      case 'html':  return isAr ? 'صفحة تفاعلية في المتصفح' : 'Interactive in browser';
      default:      return '';
    }
  }
}

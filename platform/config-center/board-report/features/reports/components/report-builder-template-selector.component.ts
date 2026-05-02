/**
 * Report Builder Template Selector — Step 1: select a report template.
 *
 * Presentational child of ReportBuilderComponent.
 */

import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import type { ReportTemplate } from '../services/reports-api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-report-builder-template-selector',
    imports: [CommonModule],
    template: `
    <div class="rb-section">
      <div class="rb-section-header">
        <span class="rb-section-title">
          <i class="pi pi-th-large" aria-hidden="true"></i>
          {{ isAr() ? 'اختر قالب التقرير' : 'Select a Report Template' }}
        </span>
      </div>
      <div class="rb-template-grid">
        @for (t of templates; track t.id) {
          <div class="rb-template-card"
            [class.selected]="selectedTemplate?.id === t.id"
            (click)="templateSelected.emit(t)"
            role="button" tabindex="0"
            (keyup.enter)="templateSelected.emit(t)">
            <div class="rtc-header">
              <span class="rtc-icon">{{ t.icon }}</span>
              <div class="rtc-meta">
                <span class="rtc-category" [class]="'cat-' + t.category">{{ t.category }}</span>
              </div>
            </div>
            <div class="rtc-title">{{ isAr() ? t.titleAr : t.titleEn }}</div>
            <div class="rtc-desc">{{ isAr() ? t.descriptionAr : t.descriptionEn }}</div>
            <div class="rtc-formats">
              @for (fmt of t.formats; track fmt) {
                <span class="fmt-pill">{{ fmt }}</span>
              }
            </div>
            @if (selectedTemplate?.id === t.id) {
              <div class="rtc-selected-mark" aria-label="Selected">
                <i class="pi pi-check-circle" aria-hidden="true"></i>
              </div>
            }
          </div>
        }
      </div>
      <div class="rb-step-nav">
        <div></div>
        <button class="rb-btn rb-btn-primary" [disabled]="!selectedTemplate" (click)="next.emit()">
          {{ isAr() ? 'التالي' : 'Next' }} <i class="pi pi-arrow-right" aria-hidden="true"></i>
        </button>
      </div>
    </div>
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
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: var(--font-size-base);
      font-weight: 700;
      color: var(--text-heading);
    }
    .rb-section-title .pi { color: var(--primary-600, #2563eb); }

    .rb-template-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 14px;
    }

    .rb-template-card {
      position: relative;
      padding: 16px;
      border-radius: var(--radius-lg);
      border: 2px solid var(--border-subtle);
      background: var(--surface-card, #fff);
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .rb-template-card:hover { border-color: var(--primary-300, #93c5fd); box-shadow: 0 2px 10px rgba(var(--color-blue-600-rgb), .08); }

    .rb-template-card.selected {
      border-color: var(--primary-600, #2563eb);
      background: var(--primary-50, #eff6ff);
      box-shadow: var(--shadow-glow);
    }

    .rtc-header { display: flex; align-items: center; justify-content: space-between; }
    .rtc-icon { font-size: var(--font-size-2xl); }
    .rtc-category {
      display: inline-block;
      font-size: var(--font-size-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .5px;
      padding: 2px 8px;
      border-radius: var(--radius-xl);
    }
    .rtc-category.cat-executive { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .rtc-category.cat-risk { background: #fee2e2; color: #991b1b; }
    .rtc-category.cat-compliance { background: #d1fae5; color: #065f46; }
    .rtc-category.cat-audit { background: #dbeafe; color: #1e40af; }
    .rtc-category.cat-governance { background: var(--purple-50, #f5f3ff); color: #6d28d9; }
    .rtc-category.cat-vendor { background: #fce7f3; color: #9d174d; }

    .rtc-title { font-size: var(--font-size-base); font-weight: 700; color: var(--text-heading); }
    .rtc-desc { font-size: var(--font-size-sm); color: var(--text-muted); line-height: 1.5; }
    .rtc-formats { display: flex; gap: 4px; flex-wrap: wrap; }

    .fmt-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      font-size: var(--font-size-xs);
      font-weight: 700;
      text-transform: uppercase;
      background: var(--surface-100, var(--surface-ice));
      color: var(--text-muted);
    }

    .rtc-selected-mark {
      position: absolute;
      top: 10px;
      inset-inline-end: 10px;
      color: var(--primary-600, #2563eb);
      font-size: var(--font-size-lg);
    }

    .rb-step-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 8px;
      border-top: 1px solid var(--border-subtle);
    }

    .rb-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 18px;
      border-radius: var(--radius);
      border: 1px solid var(--border-subtle);
      font-size: var(--font-size-sm);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .rb-btn:disabled { opacity: .45; cursor: not-allowed; }

    .rb-btn-primary {
      background: var(--primary-600, #2563eb);
      color: #fff;
      border-color: var(--primary-600, #2563eb);
    }
    .rb-btn-primary:hover:not(:disabled) { background: var(--primary-700, #1d4ed8); }

    [dir="rtl"] .rb-btn .pi-arrow-right { transform: scaleX(-1); }

    @media (max-width: 768px) {
      .rb-template-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class ReportBuilderTemplateSelectorComponent {
  readonly i18n = inject(I18nService);

  @Input({ required: true }) templates: ReportTemplate[] = [];
  @Input() selectedTemplate: ReportTemplate | null = null;
  @Output() templateSelected = new EventEmitter<ReportTemplate>();
  @Output() next = new EventEmitter<void>();

  isAr = computed(() => this.i18n.currentLang() === 'ar');
}

import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

export interface QuickStartTemplate {
  code: string;
  sector_code: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  frameworks: string[];
  module_count: number;
  control_count: number;
  estimated_minutes: number;
}

@Component({
    selector: 'app-quick-start-selector',
    imports: [CommonModule, ButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="qs" [class.rtl]="lang === 'ar'" *ngIf="templates.length > 0 && !dismissed()">
      <div class="qs-header">
        <div class="qs-icon"><i class="pi pi-bolt"></i></div>
        <div class="qs-header-text">
          <h3>{{ lang === 'ar' ? 'بدء سريع — تخطي الأسئلة' : 'Quick Start — Skip the Questions' }}</h3>
          <p>{{ lang === 'ar' ? 'اختر قالب قطاعك وابدأ في أقل من دقيقتين' : 'Choose your sector template and launch in under 2 minutes' }}</p>
        </div>
        <button class="qs-dismiss" (click)="dismissed.set(true)" [attr.aria-label]="lang === 'ar' ? 'إغلاق' : 'Dismiss'">
          <i class="pi pi-times"></i>
        </button>
      </div>
      <div class="qs-grid">
        <div *ngFor="let t of templates" class="qs-card"
          [class.selected]="selectedCode() === t.code"
          (click)="selectedCode.set(t.code)"
          role="button" tabindex="0"
          (keydown.enter)="selectedCode.set(t.code)"
          [attr.aria-pressed]="selectedCode() === t.code">
          <h4>{{ lang === 'ar' ? t.name_ar : t.name_en }}</h4>
          <p class="qs-desc">{{ lang === 'ar' ? t.description_ar : t.description_en }}</p>
          <div class="qs-meta">
            <span class="qs-fw" *ngFor="let fw of (t.frameworks || []).slice(0, 3)">{{ fw }}</span>
            <span *ngIf="(t.frameworks?.length || 0) > 3" class="qs-fw-more">+{{ (t.frameworks?.length || 0) - 3 }}</span>
          </div>
          <div class="qs-stats">
            <span>{{ t.control_count }} {{ lang === 'ar' ? 'ضابط' : 'controls' }}</span>
            <span>{{ t.module_count }} {{ lang === 'ar' ? 'وحدة' : 'modules' }}</span>
            <span>~{{ t.estimated_minutes }} {{ lang === 'ar' ? 'دقيقة' : 'min' }}</span>
          </div>
        </div>
      </div>
      <button pButton class="qs-cta" *ngIf="selectedCode()"
        [label]="lang === 'ar' ? 'ابدأ بهذا القالب' : 'Start with this template'"
        icon="pi pi-bolt" (click)="templateSelected.emit(selectedCode()!)">
      </button>
      <p class="qs-or">{{ lang === 'ar' ? 'أو استمر بالإعداد التفصيلي أدناه' : 'Or continue with detailed setup below' }}</p>
    </div>
  `,
    styles: [`
    .qs {
      max-width: 780px; margin: 1.5rem auto;
      padding: 1.5rem; background: var(--surface, #fff);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg, 12px);
      box-shadow: 0 2px 8px rgba(var(--color-black-rgb), 0.04);
    }
    .qs-header { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 1.25rem; }
    .qs-icon {
      width: 40px; height: 40px; border-radius: 50%;
      background: var(--onb-ai-pulse, rgba(var(--primary-rgb), 0.1));
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .qs-icon i { font-size: var(--font-size-body-md); color: var(--primary); }
    .qs-header-text { flex: 1; }
    .qs-header-text h3 { font-size: var(--font-size-md); font-weight: 700; margin: 0 0 0.2rem; color: var(--text-heading); }
    .qs-header-text p { font-size: 0.82rem; color: var(--text-muted); margin: 0; }
    .qs-dismiss {
      background: none; border: none; cursor: pointer; color: var(--text-muted);
      padding: 0.25rem; font-size: var(--font-size-tag); opacity: 0.6;
    }
    .qs-dismiss:hover { opacity: 1; }
    .qs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; }
    .qs-card {
      padding: 1rem; border: 2px solid var(--border-subtle);
      border-radius: var(--radius, 8px); cursor: pointer;
      transition: all 250ms cubic-bezier(0.2, 0, 0.38, 0.9);
    }
    .qs-card:hover { border-color: rgba(var(--primary-rgb), 0.25); transform: translateY(-1px); }
    .qs-card.selected {
      border-color: var(--primary); background: rgba(var(--primary-rgb), 0.03);
      box-shadow: var(--onb-ai-glow, 0 0 24px rgba(var(--primary-rgb), 0.12));
    }
    .qs-card h4 { font-size: var(--font-size-body-sm); font-weight: 700; margin: 0 0 0.3rem; color: var(--text-heading); }
    .qs-desc { font-size: var(--font-size-sm); color: var(--text-muted); margin: 0 0 0.5rem; line-height: 1.4; }
    .qs-meta { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-bottom: 0.5rem; }
    .qs-fw {
      font-size: 0.6rem; font-weight: 700; padding: 0.1rem 0.35rem;
      background: var(--onb-ai-pulse, rgba(var(--primary-rgb), 0.08)); color: var(--primary);
      border-radius: var(--radius-xs, 4px);
    }
    .qs-fw-more { font-size: 0.6rem; color: var(--text-muted); font-weight: 600; }
    .qs-stats {
      display: flex; gap: 0.5rem; font-size: 0.68rem; color: var(--text-muted); font-weight: 500;
    }
    .qs-cta {
      width: 100%; margin-top: 1rem; justify-content: center;
      background: var(--gradient-primary, linear-gradient(135deg, #002d9c, #0f62fe, #4589ff)) !important;
      border: none !important; border-radius: var(--radius-md, 10px) !important;
    }
    .qs-or {
      text-align: center; font-size: var(--font-size-caption); color: var(--text-muted);
      margin: 0.75rem 0 0; font-style: italic;
    }
    .rtl { direction: rtl; }
    @media (max-width: 640px) { .qs-grid { grid-template-columns: 1fr; } }
  `]
})
export class QuickStartSelectorComponent {
  @Input() templates: QuickStartTemplate[] = [];
  @Input() lang: 'en' | 'ar' = 'en';
  @Output() templateSelected = new EventEmitter<string>();
  dismissed = signal(false);
  selectedCode = signal<string | null>(null);
}

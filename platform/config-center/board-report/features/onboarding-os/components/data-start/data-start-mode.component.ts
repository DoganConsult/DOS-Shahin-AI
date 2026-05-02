import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilingualPipe } from '../shared/bilingual.pipe';

interface DataMode {
  code: 'empty' | 'templates' | 'import';
  labelEn: string;
  labelAr: string;
  descEn: string;
  descAr: string;
  icon: string;
  tagEn: string;
  tagAr: string;
  detailsEn: string[];
  detailsAr: string[];
}

@Component({
    selector: 'app-data-start-mode',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, BilingualPipe],
    template: `
    <div class="data-start" [class.rtl]="lang === 'ar'">
      <h2 class="data-start-title">
        {{ { en: 'How would you like to begin?', ar: 'كيف تريد البدء؟' } | bilingual:lang }}
      </h2>
      <p class="data-start-subtitle">
        {{ { en: 'You can always import or add data later. This determines your initial workspace state.', ar: 'يمكنك دائماً استيراد أو إضافة بيانات لاحقاً. هذا يحدد حالة بيئة عملك الأولية.' } | bilingual:lang }}
      </p>

      <div class="mode-cards">
        <button *ngFor="let mode of modes; let i = index"
          class="mode-card"
          [class.selected]="selectedMode === mode.code"
          [style.animation-delay]="(i * 100) + 'ms'"
          (click)="modeSelected.emit(mode.code)"
          type="button"
          [attr.aria-pressed]="selectedMode === mode.code">
          <div class="mode-header">
            <div class="mode-icon"><i class="pi" [ngClass]="mode.icon"></i></div>
            <span class="mode-tag">{{ { en: mode.tagEn, ar: mode.tagAr } | bilingual:lang }}</span>
          </div>
          <h3>{{ { en: mode.labelEn, ar: mode.labelAr } | bilingual:lang }}</h3>
          <p class="mode-desc">{{ { en: mode.descEn, ar: mode.descAr } | bilingual:lang }}</p>
          <ul class="mode-details">
            <li *ngFor="let d of lang === 'ar' ? mode.detailsAr : mode.detailsEn">{{ d }}</li>
          </ul>
          <div class="mode-check" *ngIf="selectedMode === mode.code"><i class="pi pi-check"></i></div>
        </button>
      </div>
    </div>
  `,
    styles: [`
    .data-start { max-width: 820px; }
    .data-start-title { font-size: var(--font-size-2xl); font-weight: 700; margin: 0 0 0.5rem; }
    .data-start-subtitle { font-size: var(--font-size-body-sm); color: var(--text-secondary); margin: 0 0 1.5rem; line-height: 1.5; }
    .mode-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }
    .mode-card {
      position: relative; padding: 1.5rem; border-radius: var(--radius-lg);
      border: 2px solid var(--border-subtle, #e5e7eb); background: var(--surface-card, #fff);
      cursor: pointer; text-align: left; transition: all 0.25s ease;
      animation: mode-slide-up 0.5s ease both;
    }
    .mode-card:hover { border-color: var(--primary); transform: translateY(-3px); box-shadow: 0 6px 20px rgba(var(--color-black-rgb), 0.06); }
    .mode-card.selected { border-color: var(--primary); background: rgba(var(--primary-rgb), 0.03); }
    .mode-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .mode-icon { width: 40px; height: 40px; border-radius: var(--radius-md); background: rgba(var(--primary-rgb), 0.08); display: flex; align-items: center; justify-content: center; }
    .mode-icon i { font-size: var(--font-size-body-lg); color: var(--primary); }
    .mode-tag { font-size: var(--font-size-2xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); background: var(--surface-50, #f9fafb); padding: 0.15rem 0.4rem; border-radius: 3px; }
    .mode-card h3 { font-size: var(--font-size-md); font-weight: 700; margin: 0 0 0.5rem; }
    .mode-desc { font-size: var(--font-size-caption); color: var(--text-secondary); margin: 0 0 1rem; line-height: 1.4; }
    .mode-details { list-style: none; padding: 0; margin: 0; }
    .mode-details li { font-size: var(--font-size-sm); color: var(--text-secondary); padding: 0.2rem 0; }
    .mode-details li::before { content: '→ '; color: var(--primary); font-weight: 600; }
    .mode-check {
      position: absolute; top: 0.75rem; right: 0.75rem;
      width: 22px; height: 22px; border-radius: 50%; background: var(--primary);
      display: flex; align-items: center; justify-content: center;
    }
    .mode-check i { color: #fff; font-size: var(--font-size-2xs); }
    .rtl .mode-card { text-align: right; }
    .rtl .mode-check { right: auto; left: 0.75rem; }
    .rtl .mode-details li::before { content: '← '; }
    @media (max-width: 768px) { .mode-cards { grid-template-columns: 1fr; } }
    @keyframes mode-slide-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class DataStartModeComponent {
  @Input() lang: 'en' | 'ar' = 'en';
  @Input() selectedMode: string = '';
  @Output() modeSelected = new EventEmitter<string>();

  modes: DataMode[] = [
    {
      code: 'empty', labelEn: 'Start Empty', labelAr: 'ابدأ فارغاً',
      descEn: 'A clean workspace with only system defaults. Build everything from scratch.',
      descAr: 'بيئة عمل نظيفة مع الإعدادات الافتراضية فقط. ابنِ كل شيء من الصفر.',
      icon: 'pi-inbox', tagEn: 'Clean Slate', tagAr: 'صفحة بيضاء',
      detailsEn: ['Minimal starter records', 'Default dashboards only', 'No sample data'],
      detailsAr: ['سجلات بداية أساسية', 'لوحات بيانات افتراضية فقط', 'بدون بيانات نموذجية'],
    },
    {
      code: 'templates', labelEn: 'Use Starter Templates', labelAr: 'استخدم قوالب البداية',
      descEn: 'Pre-built templates for KSA compliance frameworks, risk registers, and workflows.',
      descAr: 'قوالب جاهزة لأُطر الامتثال السعودية وسجلات المخاطر وسير العمل.',
      icon: 'pi-copy', tagEn: 'Recommended', tagAr: 'موصى به',
      detailsEn: ['Baseline obligations & controls', 'Sample risks & policies', 'Starter workflows & dashboards'],
      detailsAr: ['التزامات وضوابط أساسية', 'مخاطر وسياسات نموذجية', 'سير عمل ولوحات بيانات'],
    },
    {
      code: 'import', labelEn: 'Import Existing Data', labelAr: 'استيراد بيانات موجودة',
      descEn: 'Upload your existing registers, policies, and evidence from Excel/CSV or another GRC tool.',
      descAr: 'ارفع سجلاتك وسياساتك وأدلتك الحالية من Excel/CSV أو أداة GRC أخرى.',
      icon: 'pi-upload', tagEn: 'Migration', tagAr: 'ترحيل',
      detailsEn: ['Import from Excel / CSV', 'Map fields to Shahin schema', 'Validation before commit'],
      detailsAr: ['استيراد من Excel / CSV', 'ربط الحقول بمخطط شاهين', 'تحقق قبل الحفظ'],
    },
  ];
}

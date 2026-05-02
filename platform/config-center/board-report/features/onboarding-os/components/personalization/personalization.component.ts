import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BilingualPipe } from '../shared/bilingual.pipe';

interface ThemeOption {
  code: string;
  labelEn: string;
  labelAr: string;
  primary: string;
  accent: string;
  gradient: string;
}

export interface PersonalizationResult {
  theme: string;
  logoUrl: string;
  language: 'en' | 'ar';
  dashboardLayout: string;
}

@Component({
    selector: 'app-personalization',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, BilingualPipe],
    template: `
    <div class="personalization" [class.rtl]="lang === 'ar'">
      <h2>{{ { en: 'Personalize Your Workspace', ar: 'خصّص بيئة عملك' } | bilingual:lang }}</h2>
      <p class="pers-subtitle">
        {{ { en: 'Make your governance cockpit feel like home. All settings can be changed later.', ar: 'اجعل قمرة الحوكمة تبدو كبيتك. يمكن تغيير جميع الإعدادات لاحقاً.' } | bilingual:lang }}
      </p>

      <div class="pers-section">
        <h3>{{ { en: 'Color Theme', ar: 'السمة اللونية' } | bilingual:lang }}</h3>
        <div class="theme-grid">
          <button *ngFor="let t of themes"
            class="theme-swatch"
            [class.selected]="selectedTheme() === t.code"
            (click)="selectTheme(t.code)"
            type="button">
            <div class="swatch-preview" [style.background]="t.gradient"></div>
            <span class="swatch-label">{{ { en: t.labelEn, ar: t.labelAr } | bilingual:lang }}</span>
            <div class="swatch-check" *ngIf="selectedTheme() === t.code"><i class="pi pi-check"></i></div>
          </button>
        </div>
      </div>

      <div class="pers-section">
        <h3>{{ { en: 'Organization Logo (optional)', ar: 'شعار المؤسسة (اختياري)' } | bilingual:lang }}</h3>
        <div class="logo-input">
          <input type="text" class="logo-url-field"
            [placeholder]="({ en: 'Paste your logo URL...', ar: 'الصق رابط شعارك...' } | bilingual:lang)"
            [ngModel]="logoUrl()" (ngModelChange)="onLogoChange($event)" />
          <div class="logo-preview" *ngIf="logoUrl()">
            <img [src]="logoUrl()" alt="Logo preview" (error)="logoUrl.set('')" />
          </div>
        </div>
      </div>

      <div class="pers-section">
        <h3>{{ { en: 'Dashboard Layout', ar: 'تخطيط لوحة البيانات' } | bilingual:lang }}</h3>
        <div class="layout-options">
          <button *ngFor="let lo of layouts"
            class="layout-option"
            [class.selected]="selectedLayout() === lo.code"
            (click)="selectLayout(lo.code)"
            type="button">
            <div class="layout-icon"><i class="pi" [ngClass]="lo.icon"></i></div>
            <span>{{ { en: lo.labelEn, ar: lo.labelAr } | bilingual:lang }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .personalization { max-width: 720px; display: flex; flex-direction: column; gap: 2rem; }
    .personalization h2 { font-size: 1.4rem; font-weight: 700; margin: 0 0 0.3rem; }
    .pers-subtitle { font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; margin: 0; }
    .pers-section h3 { font-size: var(--font-size-md); font-weight: 600; margin: 0 0 0.75rem; }
    .theme-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; }
    .theme-swatch {
      position: relative; padding: 0.75rem; border-radius: var(--radius-md);
      border: 2px solid var(--border-subtle, #e5e7eb); background: var(--surface-card, #fff);
      cursor: pointer; text-align: center; transition: all 0.2s ease;
    }
    .theme-swatch:hover { border-color: var(--primary); }
    .theme-swatch.selected { border-color: var(--primary); }
    .swatch-preview { height: 36px; border-radius: var(--radius-sm); margin-bottom: 0.5rem; }
    .swatch-label { font-size: var(--font-size-sm); font-weight: 600; }
    .swatch-check {
      position: absolute; top: 0.4rem; right: 0.4rem;
      width: 18px; height: 18px; border-radius: 50%; background: var(--primary);
      display: flex; align-items: center; justify-content: center;
    }
    .swatch-check i { color: #fff; font-size: 0.55rem; }
    .logo-input { display: flex; flex-direction: column; gap: 0.75rem; }
    .logo-url-field {
      width: 100%; padding: 0.6rem 0.8rem; border-radius: var(--radius);
      border: 1.5px solid var(--border-subtle, #e5e7eb); font-size: var(--font-size-tag);
      transition: border-color 0.2s;
    }
    .logo-url-field:focus { border-color: var(--primary); outline: none; }
    .logo-preview { width: 120px; height: 60px; overflow: hidden; border-radius: var(--radius); border: 1px solid var(--border-subtle); }
    .logo-preview img { width: 100%; height: 100%; object-fit: contain; }
    .layout-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
    .layout-option {
      padding: 1rem; border-radius: var(--radius-md); border: 2px solid var(--border-subtle, #e5e7eb);
      background: var(--surface-card, #fff); cursor: pointer; text-align: center; transition: all 0.2s;
    }
    .layout-option:hover { border-color: var(--primary); }
    .layout-option.selected { border-color: var(--primary); background: rgba(var(--primary-rgb), 0.03); }
    .layout-icon { margin-bottom: 0.4rem; }
    .layout-icon i { font-size: var(--font-size-body-lg); color: var(--primary); }
    .layout-option span { font-size: var(--font-size-caption); font-weight: 600; }
    .rtl .personalization { text-align: right; }
    .rtl .swatch-check { right: auto; left: 0.4rem; }
    @media (max-width: 640px) { .theme-grid { grid-template-columns: repeat(2, 1fr); } }
  `]
})
export class PersonalizationComponent {
  @Input() lang: 'en' | 'ar' = 'en';
  @Output() configChanged = new EventEmitter<PersonalizationResult>();

  selectedTheme = signal('carbon_blue');
  logoUrl = signal('');
  selectedLayout = signal('executive');

  themes: ThemeOption[] = [
    { code: 'carbon_blue', labelEn: 'Carbon Blue', labelAr: 'الأزرق الكربوني', primary: '#0f62fe', accent: '#002d9c', gradient: 'linear-gradient(135deg, #0f62fe, #002d9c)' },
    { code: 'desert_gold', labelEn: 'Desert Gold', labelAr: 'ذهب الصحراء', primary: '#c79c2a', accent: '#8b6914', gradient: 'linear-gradient(135deg, #c79c2a, #8b6914)' },
    { code: 'midnight', labelEn: 'Midnight', labelAr: 'منتصف الليل', primary: '#1e293b', accent: '#0f172a', gradient: 'linear-gradient(135deg, #1e293b, #0f172a)' },
    { code: 'emerald', labelEn: 'Emerald', labelAr: 'الزمردي', primary: '#059669', accent: '#065f46', gradient: 'linear-gradient(135deg, #059669, #065f46)' },
  ];

  layouts = [
    { code: 'executive', labelEn: 'Executive', labelAr: 'تنفيذي', icon: 'pi-chart-bar' },
    { code: 'operational', labelEn: 'Operational', labelAr: 'تشغيلي', icon: 'pi-list' },
    { code: 'compliance', labelEn: 'Compliance', labelAr: 'امتثال', icon: 'pi-shield' },
  ];

  selectTheme(code: string) { this.selectedTheme.set(code); this.emitChange(); }
  selectLayout(code: string) { this.selectedLayout.set(code); this.emitChange(); }
  onLogoChange(url: string) { this.logoUrl.set(url); this.emitChange(); }

  private emitChange() {
    this.configChanged.emit({
      theme: this.selectedTheme(), logoUrl: this.logoUrl(),
      language: this.lang, dashboardLayout: this.selectedLayout(),
    });
  }
}

import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JourneyProfile } from '../../models/onboarding.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-journey-profile-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="jp-selector" [class.rtl]="lang === 'ar'">
      <h3 class="jp-title">
        {{ lang === 'ar' ? 'اختر مسار التجربة' : 'Choose Your Journey' }}
      </h3>
      <p class="jp-subtitle">
        {{ lang === 'ar'
          ? 'حدد مستوى التفصيل الذي تفضله — يمكنك تغييره لاحقاً.'
          : 'Select the detail level you prefer — you can change it later.' }}
      </p>
      <div class="jp-grid">
        <button
          *ngFor="let p of profiles"
          class="jp-card"
          [class.jp-selected]="getCode(p) === selectedCode"
          (click)="profileSelected.emit(p)"
          [attr.aria-label]="getLabel(p)"
          type="button">
          <i [class]="getIcon(p)" class="jp-icon" aria-hidden="true"></i>
          <span class="jp-label">{{ getLabel(p) }}</span>
          <span class="jp-desc">{{ getDesc(p) }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .jp-selector {
      max-width: 800px; margin: 2rem auto; padding: 2rem;
      text-align: center;
    }
    .jp-selector.rtl { direction: rtl; }
    .jp-title {
      font-size: var(--font-size-2xl); font-weight: 800;
      color: var(--text-heading, #161616); margin: 0 0 0.5rem;
    }
    .jp-subtitle {
      font-size: var(--font-size-body-sm); color: var(--text-muted, #6f6f6f);
      margin: 0 0 1.5rem; line-height: 1.5;
    }
    .jp-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }
    .jp-card {
      display: flex; flex-direction: column; align-items: center;
      gap: 0.5rem; padding: 1.5rem 1rem; border-radius: var(--radius-lg, 12px);
      border: 2px solid var(--border-subtle, #e5e7eb);
      background: var(--surface-card, #fff);
      cursor: pointer; transition: all 0.2s;
      text-align: center;
    }
    .jp-card:hover {
      border-color: var(--primary, #0ea5e9);
      box-shadow: 0 4px 16px rgba(var(--module-accent-sky-rgb), 0.1);
      transform: translateY(-2px);
    }
    .jp-selected {
      border-color: var(--primary, #0ea5e9);
      background: color-mix(in srgb, var(--primary, #0ea5e9) 6%, transparent);
      box-shadow: 0 4px 16px rgba(var(--module-accent-sky-rgb), 0.15);
    }
    .jp-icon {
      font-size: var(--font-size-3xl); color: var(--primary, #0ea5e9);
    }
    .jp-label {
      font-size: var(--font-size-md); font-weight: 700;
      color: var(--text-heading, #161616);
    }
    .jp-desc {
      font-size: var(--font-size-caption); color: var(--text-muted, #6f6f6f);
      line-height: 1.4;
    }
    @media (max-width: 640px) {
      .jp-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class JourneyProfileSelectorComponent {
  @Input() profiles: JourneyProfile[] = [];
  @Input() selectedCode: string | null = null;
  @Input() lang: 'en' | 'ar' = 'en';
  @Output() profileSelected = new EventEmitter<JourneyProfile>();

  /** Resilient accessors — handle both snake_case and camelCase from backend */
  getCode(p: any): string {
    return p.profile_code || p.profileCode || '';
  }
  getIcon(p: any): string {
    return p.icon_class || p.iconClass || 'pi pi-compass';
  }
  getLabel(p: any): string {
    return this.lang === 'ar'
      ? (p.label_ar || p.labelAr || '')
      : (p.label_en || p.labelEn || '');
  }
  getDesc(p: any): string {
    return this.lang === 'ar'
      ? (p.description_ar || p.descriptionAr || '')
      : (p.description_en || p.descriptionEn || '');
  }
}

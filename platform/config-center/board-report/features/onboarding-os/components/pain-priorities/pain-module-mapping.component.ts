import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

interface PainModuleLink {
  pain_code: string;
  pain_label: string;
  modules: { code: string; priority: number }[];
}

@Component({
    selector: 'app-pain-module-mapping',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="pmm" *ngIf="mappings.length > 0" [class.rtl]="lang === 'ar'">
      <div class="pmm-header">
        <i class="pi pi-link"></i>
        {{ lang === 'ar' ? 'كيف تُترجم أولوياتك' : 'How Your Priorities Translate' }}
      </div>
      <div class="pmm-grid">
        <div *ngFor="let m of mappings" class="pmm-row">
          <span class="pmm-pain">{{ m.pain_label }}</span>
          <span class="pmm-arrow"><i class="pi pi-arrow-right"></i></span>
          <div class="pmm-modules">
            <span *ngFor="let mod of m.modules" class="pmm-mod"
              [class.high]="mod.priority >= 8"
              [class.medium]="mod.priority >= 5 && mod.priority < 8">
              {{ mod.code.replace('_', ' ') }}
            </span>
          </div>
        </div>
      </div>
      <p class="pmm-note">
        <i class="pi pi-info-circle"></i>
        {{ lang === 'ar' ? 'الوحدات ذات الأولوية العالية تُفعّل تلقائياً' : 'High-priority modules are activated automatically' }}
      </p>
    </div>
  `,
    styles: [`
    .pmm {
      padding: 1rem; margin-top: 1rem;
      background: var(--surface, #fff); border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg, 12px);
    }
    .pmm-header {
      display: flex; align-items: center; gap: 0.4rem;
      font-size: var(--font-size-tag); font-weight: 700; color: var(--text-heading);
      margin-bottom: 0.75rem;
    }
    .pmm-header i { color: var(--primary); }
    .pmm-grid { display: flex; flex-direction: column; gap: 0.5rem; }
    .pmm-row {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.5rem 0.75rem; background: var(--surface-ground, #f8fafc);
      border-radius: var(--radius-sm, 6px);
    }
    .pmm-pain {
      font-size: var(--font-size-caption); font-weight: 600; color: var(--text-heading);
      min-width: 120px; flex-shrink: 0;
    }
    .pmm-arrow { color: var(--text-muted); font-size: var(--font-size-xs); }
    .pmm-modules { display: flex; flex-wrap: wrap; gap: 0.25rem; }
    .pmm-mod {
      font-size: var(--font-size-2xs); font-weight: 600; padding: 0.15rem 0.4rem;
      border-radius: var(--radius-xs, 4px); text-transform: capitalize;
      background: var(--surface-ground, #f0f0f0); color: var(--text-muted);
      border: 1px solid var(--border-subtle);
    }
    .pmm-mod.high {
      background: var(--onb-ai-pulse, rgba(var(--primary-rgb), 0.08));
      color: var(--primary); border-color: rgba(var(--primary-rgb), 0.2);
    }
    .pmm-mod.medium {
      background: rgba(var(--success-rgb), 0.06);
      color: var(--status-success, #24a148); border-color: rgba(var(--success-rgb), 0.15);
    }
    .pmm-note {
      font-size: 0.72rem; color: var(--text-muted); margin: 0.75rem 0 0;
      display: flex; align-items: center; gap: 0.3rem;
    }
    .pmm-note i { font-size: var(--font-size-2xs); }
    .rtl { direction: rtl; }
    .rtl .pmm-arrow i { transform: scaleX(-1); }
    @media (max-width: 640px) { .pmm-pain { min-width: 80px; } }
  `]
})
export class PainModuleMappingComponent {
  @Input() mappings: PainModuleLink[] = [];
  @Input() lang: 'en' | 'ar' = 'en';
}

export { PainModuleLink };

import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilingualPipe } from '../shared/bilingual.pipe';

export type StructureMode = 'simple' | 'advanced';

interface ModeOption {
  code: StructureMode;
  labelEn: string;
  labelAr: string;
  descEn: string;
  descAr: string;
  icon: string;
  itemsEn: string[];
  itemsAr: string[];
}

@Component({
    selector: 'app-structure-mode-toggle',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, BilingualPipe],
    template: `
    <div class="struct-toggle" [class.rtl]="lang === 'ar'">
      <h3>{{ { en: 'Organization Structure Setup', ar: 'إعداد الهيكل المؤسسي' } | bilingual:lang }}</h3>
      <p class="struct-hint">
        {{ { en: 'Choose how detailed your initial structure should be. You can always expand later.', ar: 'اختر مستوى تفصيل هيكلك الأولي. يمكنك التوسع لاحقاً.' } | bilingual:lang }}
      </p>
      <div class="toggle-cards">
        <button *ngFor="let opt of options"
          class="toggle-card"
          [class.selected]="selectedMode() === opt.code"
          (click)="select(opt.code)"
          type="button">
          <div class="tc-icon"><i class="pi" [ngClass]="opt.icon"></i></div>
          <h4>{{ { en: opt.labelEn, ar: opt.labelAr } | bilingual:lang }}</h4>
          <p>{{ { en: opt.descEn, ar: opt.descAr } | bilingual:lang }}</p>
          <ul>
            <li *ngFor="let item of lang === 'ar' ? opt.itemsAr : opt.itemsEn">{{ item }}</li>
          </ul>
          <div class="tc-check" *ngIf="selectedMode() === opt.code"><i class="pi pi-check"></i></div>
        </button>
      </div>
    </div>
  `,
    styles: [`
    .struct-toggle { max-width: 640px; }
    .struct-toggle h3 { font-size: var(--font-size-body-md); font-weight: 700; margin: 0 0 0.3rem; }
    .struct-hint { font-size: 0.82rem; color: var(--text-secondary); margin: 0 0 1rem; }
    .toggle-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
    .toggle-card {
      position: relative; padding: 1.25rem; border-radius: var(--radius-md);
      border: 2px solid var(--border-subtle, #e5e7eb); background: var(--surface-card, #fff);
      cursor: pointer; text-align: left; transition: all 0.2s;
    }
    .toggle-card:hover { border-color: var(--primary); }
    .toggle-card.selected { border-color: var(--primary); background: rgba(var(--primary-rgb), 0.03); }
    .tc-icon { margin-bottom: 0.5rem; }
    .tc-icon i { font-size: var(--font-size-body-lg); color: var(--primary); }
    .toggle-card h4 { font-size: 0.92rem; font-weight: 700; margin: 0 0 0.3rem; }
    .toggle-card p { font-size: var(--font-size-caption); color: var(--text-secondary); margin: 0 0 0.75rem; line-height: 1.3; }
    .toggle-card ul { list-style: none; padding: 0; margin: 0; }
    .toggle-card li { font-size: 0.72rem; color: var(--text-muted); padding: 0.15rem 0; }
    .toggle-card li::before { content: '✓ '; color: #059669; font-weight: 700; }
    .tc-check {
      position: absolute; top: 0.6rem; right: 0.6rem;
      width: 20px; height: 20px; border-radius: 50%; background: var(--primary);
      display: flex; align-items: center; justify-content: center;
    }
    .tc-check i { color: #fff; font-size: 0.55rem; }
    .rtl .toggle-card { text-align: right; }
    .rtl .tc-check { right: auto; left: 0.6rem; }
    @media (max-width: 640px) { .toggle-cards { grid-template-columns: 1fr; } }
  `]
})
export class StructureModeToggleComponent {
  @Input() lang: 'en' | 'ar' = 'en';
  @Input() set initialMode(v: StructureMode) { if (v) this.selectedMode.set(v); }
  @Output() modeChanged = new EventEmitter<StructureMode>();

  selectedMode = signal<StructureMode>('simple');

  options: ModeOption[] = [
    {
      code: 'simple', labelEn: 'Simple', labelAr: 'بسيط',
      descEn: 'One legal entity, one business unit, one location.', descAr: 'كيان قانوني واحد، وحدة أعمال واحدة، موقع واحد.',
      icon: 'pi-home',
      itemsEn: ['1 Legal Entity', '1 Business Unit', '1 Main Location'],
      itemsAr: ['كيان قانوني واحد', 'وحدة أعمال واحدة', 'موقع رئيسي واحد'],
    },
    {
      code: 'advanced', labelEn: 'Advanced', labelAr: 'متقدم',
      descEn: 'Multiple entities, business units, locations, departments, and committees.', descAr: 'كيانات متعددة، وحدات أعمال، مواقع، إدارات، ولجان.',
      icon: 'pi-sitemap',
      itemsEn: ['Multiple Entities', 'Multiple BUs', 'Locations & Departments', 'Optional Committees'],
      itemsAr: ['كيانات متعددة', 'وحدات أعمال متعددة', 'مواقع وإدارات', 'لجان اختيارية'],
    },
  ];

  select(code: StructureMode) { this.selectedMode.set(code); this.modeChanged.emit(code); }
}

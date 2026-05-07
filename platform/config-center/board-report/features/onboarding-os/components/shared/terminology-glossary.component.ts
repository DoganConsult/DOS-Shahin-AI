import { Component, Input, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegionalTerm } from '../../models/onboarding.models';

@Component({
    selector: 'app-terminology-glossary',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="glossary" *ngIf="terms.length > 0" [class.rtl]="lang === 'ar'">
      <button class="glossary-toggle" (click)="toggleOpen()"
        [attr.aria-expanded]="open()" aria-controls="glossary-panel">
        <i class="pi pi-book"></i>
        {{ lang === 'ar' ? 'المصطلحات' : 'Glossary' }}
        <span class="glossary-count">{{ terms.length }}</span>
      </button>
      <div class="glossary-panel" id="glossary-panel" *ngIf="open()">
        <input class="glossary-search" [placeholder]="lang === 'ar' ? 'بحث...' : 'Search...'"
          (input)="filter.set(($event.target as HTMLInputElement).value)" />
        <div class="glossary-list">
          <div *ngFor="let t of filteredTerms()" class="glossary-item">
            <span class="glossary-en">{{ t.term_en }}</span>
            <span class="glossary-ar">{{ t.term_ar }}</span>
            <span class="glossary-cat">{{ t.category }}</span>
          </div>
          <div *ngIf="filteredTerms().length === 0" class="glossary-empty">
            {{ lang === 'ar' ? 'لا نتائج' : 'No results' }}
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .glossary { position: relative; }
    .glossary-toggle {
      display: flex; align-items: center; gap: 0.3rem;
      background: none; border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm, 6px); padding: 0.35rem 0.65rem;
      font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted);
      cursor: pointer; transition: all 200ms;
    }
    .glossary-toggle:hover { background: var(--surface-hover, rgba(var(--color-black-rgb), 0.03)); color: var(--text-heading); }
    .glossary-toggle i { font-size: var(--font-size-sm); }
    .glossary-count {
      font-size: 0.6rem; background: var(--onb-ai-pulse, rgba(var(--primary-rgb), 0.1));
      color: var(--primary); padding: 0.05rem 0.3rem; border-radius: var(--radius-pill, 20px);
      font-weight: 700;
    }
    .glossary-panel {
      position: absolute; top: 100%; inset-inline-end: 0; margin-top: 0.35rem;
      width: 280px; max-height: 320px; background: var(--surface, #fff);
      border: 1px solid var(--border-subtle); border-radius: var(--radius, 8px);
      box-shadow: 0 8px 24px rgba(var(--color-black-rgb), 0.12); z-index: var(--z-elevated, 10);
      display: flex; flex-direction: column; overflow: hidden;
      animation: glossary-open 0.2s ease;
    }
    .glossary-search {
      padding: 0.5rem 0.75rem; border: none;
      border-bottom: 1px solid var(--border-subtle);
      font-size: var(--font-size-caption); outline: none;
      background: var(--surface-ground, #f8fafc);
    }
    .glossary-list { overflow-y: auto; flex: 1; padding: 0.25rem; }
    .glossary-item {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 0.25rem; padding: 0.4rem 0.5rem;
      border-bottom: 1px solid var(--border-subtle);
      font-size: var(--font-size-sm);
    }
    .glossary-item:last-child { border-bottom: none; }
    .glossary-en { font-weight: 500; color: var(--text-heading); }
    .glossary-ar { font-weight: 500; color: var(--text-heading); direction: rtl; text-align: right; }
    .glossary-cat {
      grid-column: 1 / -1; font-size: 0.6rem; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    .glossary-empty {
      padding: 1rem; text-align: center; font-size: var(--font-size-caption); color: var(--text-muted);
    }
    .rtl { direction: rtl; }
    @keyframes glossary-open {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .glossary-panel { animation: none !important; }
    }
  `]
})
export class TerminologyGlossaryComponent {
  @Input() terms: RegionalTerm[] = [];
  @Input() lang: 'en' | 'ar' = 'en';

  open = signal(false);
  filter = signal('');

  toggleOpen(): void { this.open.update(v => !v); }

  filteredTerms(): RegionalTerm[] {
    const q = this.filter().toLowerCase();
    if (!q) return this.terms;
    return this.terms.filter(t =>
      t.term_en.toLowerCase().includes(q) ||
      t.term_ar.includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }
}

import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { OnboardingApiService, PainCard } from '../services/onboarding-api.service';
import { TypewriterDirective } from './shared/typewriter.directive';
import { BilingualPipe } from './shared/bilingual.pipe';

export interface PainCardOption {
  code: string;
  labelEn: string;
  labelAr: string;
  icon: string;
}

const MAX_SELECTIONS = 5;

@Component({
    selector: 'app-pain-cards',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TypewriterDirective, BilingualPipe],
    template: `
    <div class="pain-scene" [class.rtl]="lang === 'ar'">
      <h2 class="scene-title">
        {{ { en: 'What governance challenges matter most to your business?', ar: '\u0645\u0627 \u062A\u062D\u062F\u064A\u0627\u062A \u0627\u0644\u062D\u0648\u0643\u0645\u0629 \u0627\u0644\u0623\u0647\u0645 \u0644\u0645\u0624\u0633\u0633\u062A\u0643\u061F' } | bilingual:lang }}
      </h2>
      <p class="scene-subtitle">
        {{ { en: 'Shahin will prioritize your operating environment based on what you select', ar: '\u0633\u064A\u0631\u062A\u0628 \u0634\u0627\u0647\u064A\u0646 \u0628\u064A\u0626\u0629 \u0627\u0644\u062A\u0634\u063A\u064A\u0644 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0627\u062E\u062A\u064A\u0627\u0631\u0627\u062A\u0643' } | bilingual:lang }}
      </p>
      <p class="pain-guidance">
        {{ { en: 'Select your top 3\u20135 priorities', ar: '\u0627\u062E\u062A\u0631 \u0623\u0647\u0645 3\u20135 \u0623\u0648\u0644\u0648\u064A\u0627\u062A' } | bilingual:lang }}
      </p>

      <div *ngIf="loadError" class="pain-error" role="alert">
        <i class="pi pi-exclamation-circle"></i>
        {{ { en: 'Could not load priority cards', ar: '\u062A\u0639\u0630\u0631 \u062A\u062D\u0645\u064A\u0644 \u0628\u0637\u0627\u0642\u0627\u062A \u0627\u0644\u0623\u0648\u0644\u0648\u064A\u0627\u062A' } | bilingual:lang }}
        <button class="pain-retry" (click)="retryLoad()">{{ { en: 'Retry', ar: '\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629' } | bilingual:lang }}</button>
      </div>

      <div class="pain-grid">
        <button *ngFor="let card of cards; let i = index"
          class="pain-card"
          [class.selected]="isSelected(card.code)"
          [class.at-limit]="atLimit && !isSelected(card.code)"
          [style.animation-delay]="(i * 60) + 'ms'"
          (click)="toggle(card.code)"
          [attr.aria-pressed]="isSelected(card.code)"
          type="button">
          <span class="pain-icon" [class.icon-selected]="isSelected(card.code)">{{ card.icon }}</span>
          <span class="pain-text">{{ { en: card.labelEn, ar: card.labelAr } | bilingual:lang }}</span>
          <span class="pain-check" [class.checked]="isSelected(card.code)">
            <i class="pi pi-check" *ngIf="isSelected(card.code)"></i>
          </span>
        </button>
      </div>

      <!-- Limit reached note -->
      <p class="pain-limit-note" *ngIf="atLimit">
        {{ { en: 'Maximum of 5 priorities reached. Deselect one to choose another.', ar: '\u062A\u0645 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 (5). \u0623\u0644\u063A\u0650 \u0627\u062E\u062A\u064A\u0627\u0631 \u0648\u0627\u062D\u062F \u0644\u0625\u0636\u0627\u0641\u0629 \u063A\u064A\u0631\u0647.' } | bilingual:lang }}
      </p>

      <!-- Interpreted summary after selection -->
      <div class="pain-summary" *ngIf="selectedLabels.length > 0">
        <i class="pi pi-bolt"></i>
        <span>{{ { en: 'Based on your priorities, Shahin will focus on:', ar: '\u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0623\u0648\u0644\u0648\u064A\u0627\u062A\u0643\u060C \u0633\u064A\u0631\u0643\u0632 \u0634\u0627\u0647\u064A\u0646 \u0639\u0644\u0649:' } | bilingual:lang }}
          <strong appTypewriter>{{ selectedLabels.join(' \u00B7 ') }}</strong>
        </span>
      </div>
    </div>
  `,
    styles: [`
    .pain-scene { max-width: 720px; }
    .scene-title { font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-primary, #111827); margin: 0 0 0.5rem 0; }
    .scene-subtitle { font-size: 0.9375rem; color: var(--text-secondary, #6b7280); margin: 0 0 0.5rem 0; line-height: 1.5; }
    .pain-guidance {
      font-size: 0.82rem; font-weight: 600; color: var(--primary, #0f62fe);
      margin: 0 0 1.5rem 0; opacity: 0.85;
    }

    .pain-error {
      display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem;
      background: rgba(var(--module-accent-red-rgb), 0.06); border: 1px solid rgba(var(--module-accent-red-rgb), 0.15);
      border-radius: var(--radius, 8px); font-size: var(--font-size-tag); color: var(--error, #da1e28);
      margin-bottom: 1rem;
    }
    .pain-retry {
      background: none; border: 1px solid var(--error, #da1e28); color: var(--error, #da1e28);
      border-radius: var(--radius-sm, 6px); padding: 0.25rem 0.6rem; font-size: var(--font-size-caption);
      cursor: pointer; margin-inline-start: auto; font-weight: 600;
    }
    .pain-retry:hover { background: rgba(var(--module-accent-red-rgb), 0.08); }
    .pain-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.875rem; }

    .pain-card {
      display: flex; align-items: flex-start; gap: 0.875rem; padding: 1.125rem;
      border: 2px solid var(--border-subtle, rgba(var(--color-black-rgb), 0.08)); border-radius: var(--radius-lg, 12px);
      background: var(--surface, #fff); cursor: pointer; text-align: start;
      transition: all 250ms cubic-bezier(0.2, 0, 0.38, 0.9); min-height: 72px; position: relative;
      animation: painFadeUp 0.35s ease both;
    }
    .pain-card:hover { border-color: var(--primary, #0f62fe); background: var(--onb-ai-pulse, rgba(var(--primary-rgb), 0.08)); transform: translateY(-1px); }
    .pain-card.selected {
      border-color: var(--status-success, #24a148); background: var(--status-success-bg, #defbe6);
      box-shadow: 0 0 0 1px var(--status-success, #24a148);
    }
    .pain-card.at-limit {
      opacity: 0.5; pointer-events: none;
    }
    @keyframes painFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

    .pain-icon {
      font-size: 1.375rem; flex-shrink: 0; line-height: 1;
      transition: transform 200ms ease;
    }
    .pain-icon.icon-selected { transform: scale(1.2); }
    .pain-text {
      font-size: var(--font-size-base); line-height: 1.45; color: var(--text-primary, #111827);
      flex: 1; font-weight: 400;
    }
    .pain-card.selected .pain-text { font-weight: 500; }

    .pain-check {
      width: 22px; height: 22px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; background: var(--surface-200, #e5e7eb);
      transition: all 0.2s;
    }
    .pain-check.checked {
      background: var(--status-success, #24a148); color: white;
    }
    .pain-check i { font-size: var(--font-size-2xs); }

    .rtl .pain-card { text-align: end; }

    .pain-limit-note {
      font-size: var(--font-size-caption); color: var(--text-muted, #6f6f6f);
      margin: 0.75rem 0 0; font-style: italic; text-align: center;
    }

    .pain-summary {
      display: flex; align-items: flex-start; gap: 0.5rem;
      margin-top: 1.25rem; padding: 0.875rem 1rem;
      background: var(--onb-ai-pulse, rgba(var(--primary-rgb), 0.08));
      border: 1px solid rgba(var(--primary-rgb), 0.12);
      border-radius: var(--radius-md); font-size: var(--font-size-tag); line-height: 1.5;
      color: var(--text-heading, #111827);
      box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.08);
      animation: summaryIn 0.3s ease both;
    }
    .pain-summary i { color: var(--primary, #0f62fe); margin-top: 2px; flex-shrink: 0; }
    .pain-summary strong { color: var(--primary, #0f62fe); }
    @keyframes summaryIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 768px) {
      .pain-grid { grid-template-columns: 1fr; }
      .pain-card { min-height: 60px; padding: 0.875rem; }
    }
    @media (prefers-reduced-motion: reduce) {
      .pain-card, .pain-summary { animation: none !important; }
    }
  `]
})
export class PainCardsComponent implements OnInit, OnDestroy {
  private api = inject(OnboardingApiService);
  private sub?: Subscription;
  @Input() lang: 'en' | 'ar' = 'en';
  @Input() selected: string[] = [];
  @Output() selectionChange = new EventEmitter<string[]>();

  cards: PainCardOption[] = [];
  loadError = false;

  get atLimit(): boolean {
    return this.selected.length >= MAX_SELECTIONS;
  }

  ngOnInit(): void {
    this.loadCards();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  retryLoad(): void {
    this.loadError = false;
    this.loadCards();
  }

  private loadCards(): void {
    this.sub?.unsubscribe();
    this.sub = this.api.getPainCards().subscribe({
      next: (dbCards: PainCard[]) => {
        this.cards = dbCards.map(c => ({
          code: c.pain_code,
          labelEn: c.pain_label_en,
          labelAr: c.pain_label_ar,
          icon: c.pain_icon,
        }));
      },
      error: () => { this.loadError = true; },
    });
  }

  get selectedLabels(): string[] {
    return this.cards
      .filter(c => this.selected.includes(c.code))
      .map(c => this.lang === 'ar' ? c.labelAr : c.labelEn);
  }

  isSelected(code: string): boolean {
    return this.selected.includes(code);
  }

  toggle(code: string): void {
    const current = [...this.selected];
    const idx = current.indexOf(code);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      if (current.length >= MAX_SELECTIONS) return;
      current.push(code);
    }
    this.selectionChange.emit(current);
  }
}

/**
 * Guidance Card Component — Reusable AI guidance display.
 *
 * Shows title, explanation, examples, recommended actions, and related terms.
 * Supports bilingual display (en/ar).
 *
 * Requirements: 11.1, 11.5
 */

import { Component, inject, input, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

export interface GuidanceData {
  titleEn: string;
  titleAr: string;
  explanationEn: string;
  explanationAr: string;
  examplesEn?: string[];
  examplesAr?: string[];
  actionsEn?: string[];
  actionsAr?: string[];
  relatedTerms?: string[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-guidance-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="guidance-card" [attr.dir]="i18n.direction()" role="complementary" [attr.aria-label]="resolveField('title')">
      <div class="guidance-header">
        <i class="pi pi-lightbulb"></i>
        <span class="guidance-title">{{ resolveField('title') }}</span>
      </div>
      <p class="guidance-explanation">{{ resolveField('explanation') }}</p>

      @if (resolveList('examples').length > 0) {
        <div class="guidance-section">
          <strong>{{ i18n.translate('guidance.examples') }}</strong>
          <ul>
            @for (ex of resolveList('examples'); track ex) {
              <li>{{ ex }}</li>
            }
          </ul>
        </div>
      }

      @if (resolveList('actions').length > 0) {
        <div class="guidance-section">
          <strong>{{ i18n.translate('guidance.recommendedActions') }}</strong>
          <ul>
            @for (action of resolveList('actions'); track action) {
              <li>{{ action }}</li>
            }
          </ul>
        </div>
      }

      @if (guidance()?.relatedTerms?.length) {
        <div class="guidance-related">
          <strong>{{ i18n.translate('guidance.relatedTerms') }}</strong>
          <div class="term-chips">
            @for (term of guidance()!.relatedTerms!; track term) {
              <span class="term-chip">{{ term }}</span>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .guidance-card {
      background: var(--surface-card);
      border-radius: var(--radius-md);
      padding: var(--space-md);
      border-inline-start: 3px solid var(--primary);
    }
    .guidance-header { display: flex; align-items: center; gap: var(--space-sm); margin-block-end: var(--space-sm); }
    .guidance-title { font-weight: 600; font-size: 1.05rem; }
    .guidance-header .pi { color: var(--primary); }
    .guidance-explanation { color: var(--text-secondary); line-height: 1.6; margin-block-end: var(--space-sm); }
    .guidance-section { margin-block-end: var(--space-sm); }
    .guidance-section ul { padding-inline-start: var(--space-md); margin: var(--space-xs) 0; }
    .guidance-section li { margin-block-end: var(--space-xs); }
    .guidance-related { margin-block-start: var(--space-sm); }
    .term-chips { display: flex; flex-wrap: wrap; gap: var(--space-xs); margin-block-start: var(--space-xs); }
    .term-chip {
      background: var(--surface-hover);
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      font-size: var(--font-size-tag);
    }
  `],
})
export class GuidanceCardComponent {
  i18n = inject(I18nService);
  guidance = input<GuidanceData | null>(null);

  resolveField(base: string): string {
    const g = this.guidance();
    if (!g) return '';
    return this.i18n.getBilingualField(g, base);
  }

  resolveList(base: string): string[] {
    const g = this.guidance();
    if (!g) return [];
    const lang = this.i18n.currentLang();
    const enKey = `${base}En` as keyof GuidanceData;
    const arKey = `${base}Ar` as keyof GuidanceData;
    const list = lang === 'ar' ? (g[arKey] ?? g[enKey]) : (g[enKey] ?? g[arKey]);
    return Array.isArray(list) ? list : [];
  }
}

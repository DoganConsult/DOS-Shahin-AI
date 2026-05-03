import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DosNarrativeInput {
  title: string;
  titleAr?: string;
  summary: string;
  summaryAr?: string;
  highlights?: string[];
  generatedAt?: string;
  modelId?: string;
  modelVersion?: string;
}

@Component({
  selector: 'dos-narrative-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (narrative) {
      <article class="dos-narrative" role="region" [attr.aria-label]="narrative.title">
        <header class="dos-narrative__head">
          <span class="dos-narrative__eyebrow">Executive narrative</span>
          @if (narrative.modelId) {
            <span class="dos-narrative__provenance">{{ narrative.modelId }}{{ narrative.modelVersion ? ' · ' + narrative.modelVersion : '' }}</span>
          }
        </header>
        <h2 class="dos-narrative__title">{{ narrative.title }}</h2>
        <p class="dos-narrative__summary">{{ narrative.summary }}</p>
        @if (narrative.highlights?.length) {
          <ul class="dos-narrative__highlights">
            @for (h of narrative.highlights; track h) { <li>{{ h }}</li> }
          </ul>
        }
        @if (narrative.generatedAt) {
          <footer class="dos-narrative__footer">Generated {{ narrative.generatedAt }}</footer>
        }
      </article>
    }
  `,
  styles: [`
    .dos-narrative { padding: 1.25rem 1.5rem; border: 1px solid var(--dos-color-border, #e0e0e0);
      border-radius: var(--dos-radius-md, 8px); background: var(--dos-color-surface, #fff); }
    .dos-narrative__head { display: flex; justify-content: space-between; align-items: center; }
    .dos-narrative__eyebrow { font-size: 0.625rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--dos-color-text-subtle, #525252); }
    .dos-narrative__provenance { font-size: 0.625rem; color: var(--dos-color-text-subtle, #525252); font-family: var(--dos-font-mono, monospace); }
    .dos-narrative__title { font-size: 1rem; font-weight: 600; margin: 0.5rem 0 0.5rem; }
    .dos-narrative__summary { margin: 0 0 0.75rem; line-height: 1.5; }
    .dos-narrative__highlights { margin: 0 0 0.75rem 1rem; padding: 0; }
    .dos-narrative__highlights li { margin: 0.25rem 0; }
    .dos-narrative__footer { font-size: 0.75rem; color: var(--dos-color-text-subtle, #525252); }
  `],
})
export class DosNarrativePanelComponent {
  @Input() narrative: DosNarrativeInput | null = null;
}

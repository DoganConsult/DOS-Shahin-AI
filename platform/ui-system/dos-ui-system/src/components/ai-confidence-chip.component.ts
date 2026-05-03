import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export type DosAiConfidenceBand = 'low' | 'medium' | 'high';
export interface DosAiConfidenceInput {
  score: number;
  band: DosAiConfidenceBand;
  modelId: string;
  modelVersion?: string;
  rationale?: string;
  evidenceCount?: number;
}

@Component({
  selector: 'dos-ai-confidence-chip',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (meta) {
      <span class="dos-aic" [attr.data-band]="meta.band"
            [title]="(meta.rationale ?? '') + ' · ' + meta.modelId + (meta.modelVersion ? ' v' + meta.modelVersion : '')"
            role="note" tabindex="0">
        <span class="dos-aic__dot" aria-hidden="true"></span>
        <span class="dos-aic__label">AI {{ meta.score }}%</span>
        @if (meta.evidenceCount != null) {
          <span class="dos-aic__evidence">· {{ meta.evidenceCount }} evidence</span>
        }
      </span>
    }
  `,
  styles: [`
    .dos-aic { display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px;
      border-radius: 999px; font-size: 0.75rem; cursor: help;
      background: var(--dos-color-surface-muted, #f4f4f4); color: var(--dos-color-text, #161616); }
    .dos-aic[data-band='low']    { background: #fff1f1; color: #a2191f; }
    .dos-aic[data-band='medium'] { background: #fff8e1; color: #8a6d00; }
    .dos-aic[data-band='high']   { background: #defbe6; color: #0e6027; }
    .dos-aic__dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .dos-aic__evidence { color: var(--dos-color-text-subtle, #525252); }
  `],
})
export class DosAiConfidenceChipComponent {
  @Input() meta: DosAiConfidenceInput | null = null;
}

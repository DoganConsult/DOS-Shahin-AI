import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DosExplainTraceInput {
  factor: string;
  factorAr?: string;
  contribution: number;
  source?: string;
  evidenceUri?: string;
}

/**
 * DosWhyTooltip — multi-factor explainability popover. Distinct from
 * DosWhyChip (single sentence). Receives an array of ExplainTrace and
 * renders a stacked breakdown.
 */
@Component({
  selector: 'dos-why-tooltip',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="dos-why-tt" tabindex="0" role="note" aria-label="Explain why">
      <span class="dos-why-tt__chip">Why?</span>
      @if (traces?.length) {
        <span class="dos-why-tt__pop">
          <span class="dos-why-tt__head">Top contributing factors</span>
          <ul>
            @for (t of traces; track t.factor) {
              <li>
                <span class="dos-why-tt__factor">{{ t.factor }}</span>
                <span class="dos-why-tt__contrib"
                      [class.dos-why-tt__contrib--neg]="t.contribution < 0">
                  {{ t.contribution > 0 ? '+' : '' }}{{ t.contribution }}
                </span>
                @if (t.source) { <span class="dos-why-tt__source">{{ t.source }}</span> }
                @if (t.evidenceUri) { <a [href]="t.evidenceUri">evidence</a> }
              </li>
            }
          </ul>
        </span>
      }
    </span>
  `,
  styles: [`
    .dos-why-tt { position: relative; display: inline-block; }
    .dos-why-tt__chip { padding: 2px 8px; border-radius: 999px; background: var(--dos-color-surface-muted, #f4f4f4);
      color: var(--dos-color-text-subtle, #525252); font-size: 0.75rem; cursor: help; }
    .dos-why-tt__pop { display: none; position: absolute; top: calc(100% + 6px); left: 0; min-width: 240px;
      padding: 0.75rem; background: var(--dos-color-surface, #fff); border: 1px solid var(--dos-color-border, #e0e0e0);
      border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,.12); z-index: 50; }
    .dos-why-tt:hover .dos-why-tt__pop, .dos-why-tt:focus-within .dos-why-tt__pop { display: block; }
    .dos-why-tt__head { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--dos-color-text-subtle, #525252); }
    .dos-why-tt ul { list-style: none; padding: 0; margin: 0.5rem 0 0; display: flex; flex-direction: column; gap: 0.25rem; }
    .dos-why-tt li { display: flex; gap: 0.5rem; font-size: 0.8125rem; }
    .dos-why-tt__contrib { font-family: var(--dos-font-mono, monospace); color: #0e6027; }
    .dos-why-tt__contrib--neg { color: #a2191f; }
    .dos-why-tt__source { color: var(--dos-color-text-subtle, #525252); font-size: 0.6875rem; }
  `],
})
export class DosWhyTooltipComponent {
  @Input() traces: DosExplainTraceInput[] = [];
}

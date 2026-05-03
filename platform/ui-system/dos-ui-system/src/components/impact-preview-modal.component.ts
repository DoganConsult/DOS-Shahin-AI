import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DosImpactDelta { metric: string; direction: 'up' | 'down' | 'neutral'; magnitude: string; }
export interface DosImpactPreviewInput {
  actionKey: string;
  summary: string;
  summaryAr?: string;
  predictedDeltas: DosImpactDelta[];
  riskNote?: string;
  modelId?: string;
  modelVersion?: string;
}

@Component({
  selector: 'dos-impact-preview-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open && preview) {
      <div class="dos-impact__backdrop" (click)="cancel.emit()"></div>
      <div class="dos-impact" role="dialog" aria-modal="true" [attr.aria-labelledby]="'dos-impact-title-' + preview.actionKey">
        <header class="dos-impact__head">
          <h2 [id]="'dos-impact-title-' + preview.actionKey" class="dos-impact__title">Predicted impact</h2>
          <button class="dos-impact__close" type="button" aria-label="Close" (click)="cancel.emit()">×</button>
        </header>
        <p class="dos-impact__summary">{{ preview.summary }}</p>
        <table class="dos-impact__table">
          <thead><tr><th>Metric</th><th>Direction</th><th>Magnitude</th></tr></thead>
          <tbody>
            @for (d of preview.predictedDeltas; track d.metric) {
              <tr>
                <td>{{ d.metric }}</td>
                <td [attr.data-direction]="d.direction">{{ d.direction }}</td>
                <td>{{ d.magnitude }}</td>
              </tr>
            }
          </tbody>
        </table>
        @if (preview.riskNote) { <p class="dos-impact__risk"><strong>Risk:</strong> {{ preview.riskNote }}</p> }
        @if (preview.modelId) { <p class="dos-impact__model">Model: {{ preview.modelId }}{{ preview.modelVersion ? ' · ' + preview.modelVersion : '' }}</p> }
        <footer class="dos-impact__foot">
          <button type="button" class="dos-impact__btn dos-impact__btn--ghost" (click)="cancel.emit()">Cancel</button>
          <button type="button" class="dos-impact__btn dos-impact__btn--primary" (click)="confirm.emit(preview.actionKey)">Confirm action</button>
        </footer>
      </div>
    }
  `,
  styles: [`
    .dos-impact__backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 999; }
    .dos-impact { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: min(560px, 92vw); max-height: 86vh; overflow: auto; padding: 1.5rem;
      background: var(--dos-color-surface, #fff); border-radius: var(--dos-radius-md, 8px);
      box-shadow: 0 24px 60px rgba(0,0,0,.25); z-index: 1000; }
    .dos-impact__head { display: flex; justify-content: space-between; align-items: center; }
    .dos-impact__title { margin: 0; font-size: 1.125rem; font-weight: 600; }
    .dos-impact__close { background: none; border: none; font-size: 1.5rem; cursor: pointer; line-height: 1; }
    .dos-impact__summary { margin: 0.75rem 0; line-height: 1.5; }
    .dos-impact__table { width: 100%; border-collapse: collapse; margin: 0.5rem 0; }
    .dos-impact__table th, .dos-impact__table td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid var(--dos-color-border, #e0e0e0); font-size: 0.875rem; }
    .dos-impact__table td[data-direction='up']   { color: #a2191f; }
    .dos-impact__table td[data-direction='down'] { color: #0e6027; }
    .dos-impact__risk { color: #a2191f; }
    .dos-impact__model { font-size: 0.75rem; color: var(--dos-color-text-subtle, #525252); }
    .dos-impact__foot { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
    .dos-impact__btn { padding: 0.5rem 1rem; border: 1px solid transparent; cursor: pointer; font-size: 0.875rem; border-radius: 4px; }
    .dos-impact__btn--ghost { background: transparent; border-color: var(--dos-color-border, #e0e0e0); }
    .dos-impact__btn--primary { background: var(--dos-color-accent, #0f62fe); color: #fff; }
  `],
})
export class DosImpactPreviewModalComponent {
  @Input() preview: DosImpactPreviewInput | null = null;
  @Input() open = false;
  @Output() confirm = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();
}

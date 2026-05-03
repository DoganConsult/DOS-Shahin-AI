import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type DosReadinessBand = 'critical' | 'at-risk' | 'on-track' | 'leading';
export interface DosReadinessDriver { label: string; weight: number; status?: string; }
export interface DosReadinessInput {
  score: number;
  band: DosReadinessBand;
  computedAt: string;
  drivers: DosReadinessDriver[];
  evidenceUri?: string;
}

@Component({
  selector: 'dos-readiness-meter',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (readiness) {
      <section class="dos-rdy" [attr.data-band]="readiness.band" role="region" aria-label="Module readiness">
        <header class="dos-rdy__head">
          <span class="dos-rdy__eyebrow">Readiness</span>
          <span class="dos-rdy__band">{{ readiness.band }}</span>
        </header>
        <div class="dos-rdy__bar" role="progressbar"
             [attr.aria-valuenow]="readiness.score" aria-valuemin="0" aria-valuemax="100">
          <div class="dos-rdy__fill" [style.width.%]="readiness.score"></div>
        </div>
        <div class="dos-rdy__score">{{ readiness.score }} / 100</div>
        <ul class="dos-rdy__drivers">
          @for (d of readiness.drivers; track d.label) {
            <li>
              <span class="dos-rdy__driver-label">{{ d.label }}</span>
              <span class="dos-rdy__driver-weight">w{{ d.weight }}</span>
              @if (d.status) { <span class="dos-rdy__driver-status">{{ d.status }}</span> }
            </li>
          }
        </ul>
        <footer class="dos-rdy__foot">
          <span>Computed {{ readiness.computedAt }}</span>
          @if (readiness.evidenceUri) { <a [href]="readiness.evidenceUri">Evidence</a> }
        </footer>
      </section>
    }
  `,
  styles: [`
    .dos-rdy { padding: 1rem 1.25rem; border: 1px solid var(--dos-color-border, #e0e0e0);
      border-radius: var(--dos-radius-md, 8px); background: var(--dos-color-surface, #fff); }
    .dos-rdy__head { display: flex; justify-content: space-between; align-items: center; }
    .dos-rdy__eyebrow { font-size: 0.625rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--dos-color-text-subtle, #525252); }
    .dos-rdy__band { font-size: 0.75rem; text-transform: uppercase; font-weight: 600; }
    .dos-rdy[data-band='critical'] .dos-rdy__band { color: #a2191f; }
    .dos-rdy[data-band='at-risk']  .dos-rdy__band { color: #8a6d00; }
    .dos-rdy[data-band='on-track'] .dos-rdy__band { color: #0e6027; }
    .dos-rdy[data-band='leading']  .dos-rdy__band { color: #0043ce; }
    .dos-rdy__bar { width: 100%; height: 6px; background: var(--dos-color-surface-muted, #f4f4f4); border-radius: 3px; margin: 0.5rem 0 0.25rem; overflow: hidden; }
    .dos-rdy__fill { height: 100%; background: var(--dos-color-accent, #0f62fe); transition: width 0.3s ease-out; }
    .dos-rdy[data-band='critical'] .dos-rdy__fill { background: #da1e28; }
    .dos-rdy[data-band='at-risk']  .dos-rdy__fill { background: #f1c21b; }
    .dos-rdy[data-band='on-track'] .dos-rdy__fill { background: #24a148; }
    .dos-rdy__score { font-size: 1.25rem; font-weight: 300; margin-bottom: 0.5rem; }
    .dos-rdy__drivers { list-style: none; padding: 0; margin: 0.5rem 0; display: flex; flex-direction: column; gap: 0.25rem; }
    .dos-rdy__drivers li { display: flex; gap: 0.5rem; font-size: 0.75rem; align-items: center; }
    .dos-rdy__driver-weight { color: var(--dos-color-text-subtle, #525252); font-family: var(--dos-font-mono, monospace); }
    .dos-rdy__driver-status { color: var(--dos-color-text-subtle, #525252); }
    .dos-rdy__foot { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--dos-color-text-subtle, #525252); margin-top: 0.5rem; }
  `],
})
export class DosReadinessMeterComponent {
  @Input() readiness: DosReadinessInput | null = null;
}

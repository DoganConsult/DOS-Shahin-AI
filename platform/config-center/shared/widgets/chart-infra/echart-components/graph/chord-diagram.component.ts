/**
 * ChordDiagramComponent — Chord diagram showing inter-department risk/control dependencies.
 *
 * This component uses D3 for chord rendering (not ECharts).
 * Placeholder with basic structure — D3 integration to be wired separately.
 * Requirements: 10.3
 */
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    selector: 'app-chord-diagram',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="chord-placeholder" role="img" [attr.aria-label]="'Chord Diagram'">
      <span class="chord-icon">🔗</span>
      <p class="chord-label">Chord diagram — D3 rendering</p>
    </div>
  `,
    styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .chord-placeholder {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      height: 100%; min-height: 200px; color: var(--text-muted, #6f6f6f);
      font-size: var(--font-size-base); text-align: center; padding: 1rem;
    }
    .chord-icon { font-size: var(--font-size-4xl); margin-bottom: 0.5rem; }
    .chord-label { margin: 0; }
  `]
})
export class ChordDiagramComponent {
  @Input() data: GrcRecord;
}

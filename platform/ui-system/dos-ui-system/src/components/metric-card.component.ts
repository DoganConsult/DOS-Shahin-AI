import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DosCarbonTileComponent } from '../carbon/dos-carbon-tile.component';

@Component({
  selector: 'dos-metric-card',
  standalone: true,
  imports: [CommonModule, DosCarbonTileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dos-carbon-tile [clickable]="!!route" [route]="route">
      <div class="dos-metric-card">
        <span class="dos-metric-card__label">{{ label }}</span>
        <span class="dos-metric-card__value">{{ value }}</span>
        @if (delta !== null && delta !== undefined) {
          <span
            class="dos-metric-card__delta"
            [class.dos-metric-card__delta--up]="delta > 0"
            [class.dos-metric-card__delta--down]="delta < 0"
          >
            {{ delta > 0 ? '↑' : '↓' }} {{ delta }}{{ deltaSuffix }}
          </span>
        }
      </div>
    </dos-carbon-tile>
  `,
  styles: [`
    :host { display: block; }
    /* Overriding base card styles to work within the Carbon tile container */
    .dos-metric-card {
      padding: 0;
      background: transparent;
      border: 0;
      box-shadow: none;
    }
  `]
})
export class DosMetricCardComponent {
  @Input() label = '';
  @Input() value: string | number = '';
  @Input() delta: number | null = null;
  @Input() deltaSuffix = '%';
  @Input() route: string | null = null;
}

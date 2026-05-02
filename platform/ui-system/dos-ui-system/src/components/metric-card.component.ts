import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dos-metric-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="dos-metric-card">
      <span class="dos-metric-card__label">{{ label }}</span>
      <span class="dos-metric-card__value">{{ value }}</span>
      @if (delta !== null && delta !== undefined) {
        <span
          class="dos-metric-card__delta"
          [class.dos-metric-card__delta--up]="delta > 0"
          [class.dos-metric-card__delta--down]="delta < 0"
        >
          {{ delta > 0 ? '+' : '' }}{{ delta }}{{ deltaSuffix }}
        </span>
      }
    </article>
  `,
})
export class DosMetricCardComponent {
  @Input() label = '';
  @Input() value: string | number = '';
  @Input() delta: number | null = null;
  @Input() deltaSuffix = '%';
}

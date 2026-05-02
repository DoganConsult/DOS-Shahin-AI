import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonModule } from 'carbon-components-angular';

/**
 * Carbon-backed skeleton placeholder. Three shapes:
 *   - 'text'      → cds-skeleton-text (one or many lines)
 *   - 'placeholder' → cds-skeleton-placeholder (rectangle)
 *   - 'icon'      → cds-skeleton-placeholder small square
 *
 * For DOS-native skeleton (with shimmer + tone tokens) use
 * `<dos-skeleton>` from `@dos/ui-system`. This component is the
 * Carbon-compliant variant for surfaces inside Carbon contexts.
 */
@Component({
  selector: 'dos-carbon-skeleton',
  standalone: true,
  imports: [CommonModule, SkeletonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (shape) {
      @case ('text') {
        <cds-skeleton-text
          [paragraph]="paragraph"
          [lineCount]="lineCount"
          [width]="width"
          [heading]="heading"
        ></cds-skeleton-text>
      }
      @default {
        <cds-skeleton-placeholder></cds-skeleton-placeholder>
      }
    }
  `,
})
export class DosCarbonSkeletonComponent {
  @Input() shape: 'text' | 'placeholder' = 'text';
  @Input() paragraph = false;
  @Input() lineCount = 3;
  @Input() width = '100%';
  @Input() heading = false;
}

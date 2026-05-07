import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DosCarbonSkeletonComponent } from '../carbon/dos-carbon-skeleton.component';

/**
 * DosSkeleton — loading placeholder.
 * Refined to use Carbon Skeleton policies.
 */
@Component({
  selector: 'dos-skeleton',
  standalone: true,
  imports: [CommonModule, DosCarbonSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dos-carbon-skeleton
      [shape]="mapShape(shape)"
      [paragraph]="shape === 'line' && rows > 1"
      [lineCount]="rows"
      [width]="width || '100%'"
    ></dos-carbon-skeleton>
  `,
})
export class DosSkeletonComponent {
  @Input() shape: 'line' | 'circle' | 'square' | 'tile' = 'line';
  @Input() rows = 3;
  @Input() width?: string;
  @Input() height?: string;
  @Input() inline = false;
  @Input() ariaLabel = 'Loading';

  mapShape(s: string): 'text' | 'placeholder' {
    return s === 'line' ? 'text' : 'placeholder';
  }
}

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Carbon-backed aspect-ratio wrapper. carbon-components-angular@5 does not
 * ship a runtime AspectRatio module — `@carbon/styles` exposes the
 * `cds--aspect-ratio` utility class, which is the canonical Angular
 * surface. This wrapper applies the matching modifier class so the
 * `cds--aspect-ratio` token-driven layout takes effect.
 *
 * Carbon catalog: carbon_key='aspect-ratio' (active, layout).
 */
export type DosCarbonAspectRatio = '1x1' | '2x1' | '4x3' | '16x9' | '9x16' | '3x4';

@Component({
  selector: 'dos-carbon-aspect-ratio',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="className">
      <div class="cds--aspect-ratio--object">
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class DosCarbonAspectRatioComponent {
  @Input() ratio: DosCarbonAspectRatio = '16x9';

  get className(): string {
    return `cds--aspect-ratio cds--aspect-ratio--${this.ratio}`;
  }
}

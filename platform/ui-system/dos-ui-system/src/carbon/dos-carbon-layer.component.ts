import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayerModule } from 'carbon-components-angular';

/**
 * Carbon-backed layer wrapper. `cdsLayer` is a directive that scopes
 * the surrounding `--cds-layer-*` tokens. Apply via the directive on a
 * host `<div>` — Carbon resolves the layer level from the surrounding
 * context automatically.
 */
@Component({
  selector: 'dos-carbon-layer',
  standalone: true,
  imports: [CommonModule, LayerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [cdsLayer]="level">
      <ng-content></ng-content>
    </div>
  `,
})
export class DosCarbonLayerComponent {
  @Input() level: 0 | 1 | 2 = 1;
}

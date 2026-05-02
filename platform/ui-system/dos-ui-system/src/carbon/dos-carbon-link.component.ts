import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LinkModule } from 'carbon-components-angular';

/**
 * Carbon-backed link wrapper. Visited / inline / disabled / size variants.
 */
@Component({
  selector: 'dos-carbon-link',
  standalone: true,
  imports: [CommonModule, LinkModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      cdsLink
      [size]="size"
      [inline]="inline"
      [disabled]="disabled"
      [visited]="visited"
      [href]="href"
      [target]="target"
      [rel]="rel"
    ><ng-content></ng-content></a>
  `,
})
export class DosCarbonLinkComponent {
  @Input() href = '#';
  @Input() target: '_self' | '_blank' | '_parent' | '_top' = '_self';
  @Input() rel = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() inline = false;
  @Input() disabled = false;
  @Input() visited = false;
}

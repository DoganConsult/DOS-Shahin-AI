import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconModule } from 'carbon-components-angular';

/**
 * Carbon icon wrapper. Accepts an icon descriptor (e.g. an imported icon
 * from `@carbon/icons/lib/<name>/<size>`) plus a size; consumers MUST keep
 * the icon imports inside @dos/ui-system rather than scattering them.
 */
@Component({
  selector: 'dos-carbon-icon',
  standalone: true,
  imports: [CommonModule, IconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg [cdsIcon]="icon" [size]="size"></svg>`,
})
export class DosCarbonIconComponent {
  @Input() icon: unknown = null;
  @Input() size: '16' | '20' | '24' | '32' = '16';
}

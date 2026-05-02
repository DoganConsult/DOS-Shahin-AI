import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingModule } from 'carbon-components-angular';

/**
 * Carbon-backed full-screen / overlay loading spinner.
 * Use for blocking page-level loads. For inline / button loads use
 * `<dos-carbon-inline-loading>`.
 */
@Component({
  selector: 'dos-carbon-loading',
  standalone: true,
  imports: [CommonModule, LoadingModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-loading
      [isActive]="isActive"
      [size]="size"
      [overlay]="overlay"
    ></cds-loading>
  `,
})
export class DosCarbonLoadingComponent {
  @Input() isActive = true;
  @Input() size: 'sm' | 'normal' = 'normal';
  @Input() overlay = false;
}

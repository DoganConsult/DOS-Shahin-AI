import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopoverModule } from 'carbon-components-angular';

/**
 * Carbon-backed popover wrapper.
 *
 * Carbon's popover is a DIRECTIVE (`cdsPopover`) applied to a host
 * element, not a `<cds-popover>` element. The popover content lives
 * inside the host. Inputs: align/caret/dropShadow/highContrast/
 * autoAlign/isOpen/alignmentAxisOffset.
 *
 * Slots:
 *   default     — the trigger element (rendered)
 *   [slot=content] — the popover panel (rendered inside cds-popover-content)
 */
@Component({
  selector: 'dos-carbon-popover',
  standalone: true,
  imports: [CommonModule, PopoverModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      cdsPopover
      [isOpen]="isOpen"
      [align]="align"
      [autoAlign]="autoAlign"
      [caret]="caret"
      [dropShadow]="dropShadow"
      [highContrast]="highContrast"
      (isOpenChange)="isOpenChange.emit($event)"
    >
      <ng-content></ng-content>
      <cds-popover-content>
        <ng-content select="[slot=content]"></ng-content>
      </cds-popover-content>
    </span>
  `,
})
export class DosCarbonPopoverComponent {
  @Input() isOpen = false;
  @Input() align: 'top' | 'top-left' | 'top-right' | 'bottom' | 'bottom-left' | 'bottom-right' | 'left' | 'right' = 'bottom';
  @Input() autoAlign = false;
  @Input() caret = true;
  @Input() dropShadow = true;
  @Input() highContrast = false;
  @Output() isOpenChange = new EventEmitter<boolean>();
}

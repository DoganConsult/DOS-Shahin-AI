import { EventEmitter } from '@angular/core';
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
export declare class DosCarbonPopoverComponent {
    isOpen: boolean;
    align: 'top' | 'top-left' | 'top-right' | 'bottom' | 'bottom-left' | 'bottom-right' | 'left' | 'right';
    autoAlign: boolean;
    caret: boolean;
    dropShadow: boolean;
    highContrast: boolean;
    isOpenChange: EventEmitter<boolean>;
}

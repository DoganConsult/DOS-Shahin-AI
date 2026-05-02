import { EventEmitter } from '@angular/core';
export interface DosCarbonOverflowMenuItem {
    id: string;
    label: string;
    disabled?: boolean;
    danger?: boolean;
    divider?: boolean;
}
/**
 * Carbon-backed overflow (kebab) menu wrapper.
 *
 * Carbon's overflow-menu is a directive (`cdsOverflowMenu`) attached to
 * a trigger button; the menu options live in `cds-overflow-menu-pane`.
 * This wrapper composes both with a sensible default trigger.
 */
export declare class DosCarbonOverflowMenuComponent {
    items: DosCarbonOverflowMenuItem[];
    flip: boolean;
    offset: {
        x: number;
        y: number;
    };
    buttonLabel: string;
    selected: EventEmitter<string>;
}

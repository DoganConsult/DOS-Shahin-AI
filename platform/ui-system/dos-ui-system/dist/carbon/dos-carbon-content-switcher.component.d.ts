import { EventEmitter } from '@angular/core';
export interface DosCarbonContentSwitcherOption {
    id: string;
    label: string;
    selected?: boolean;
    disabled?: boolean;
}
/**
 * Carbon-backed content switcher. Carbon's `cds-content-switcher` only
 * exposes `ariaLabel` and `size`.
 */
export declare class DosCarbonContentSwitcherComponent {
    options: DosCarbonContentSwitcherOption[];
    size: 'sm' | 'md' | 'lg';
    ariaLabel: string;
    selected: EventEmitter<DosCarbonContentSwitcherOption>;
    onSelected(ev: {
        value?: string;
        index?: number;
    }): void;
}

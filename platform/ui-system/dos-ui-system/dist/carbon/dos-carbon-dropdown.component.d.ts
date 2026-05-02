import { EventEmitter } from '@angular/core';
export interface DosCarbonDropdownItem {
    content: string;
    selected?: boolean;
    disabled?: boolean;
}
/**
 * Carbon-backed single-select dropdown. For multi-select use
 * `dos-carbon-multi-select`.
 */
export declare class DosCarbonDropdownComponent {
    label: string;
    helperText: string;
    placeholder: string;
    items: DosCarbonDropdownItem[];
    size: 'sm' | 'md' | 'lg';
    disabled: boolean;
    readonly: boolean;
    skeleton: boolean;
    invalid: boolean;
    invalidText: string;
    warn: boolean;
    warnText: string;
    type: 'single' | 'multi';
    selected: EventEmitter<DosCarbonDropdownItem>;
    onSelected(ev: {
        item: DosCarbonDropdownItem | DosCarbonDropdownItem[] | null;
    }): void;
}

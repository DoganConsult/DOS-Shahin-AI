import { EventEmitter } from '@angular/core';
export interface DosCarbonMultiSelectItem {
    content: string;
    selected?: boolean;
    disabled?: boolean;
}
/**
 * Carbon-backed multi-select. Renders a dropdown with checkboxes.
 */
export declare class DosCarbonMultiSelectComponent {
    label: string;
    helperText: string;
    placeholder: string;
    items: DosCarbonMultiSelectItem[];
    size: 'sm' | 'md' | 'lg';
    theme: 'light' | 'dark';
    disabled: boolean;
    skeleton: boolean;
    invalid: boolean;
    invalidText: string;
    selected: EventEmitter<DosCarbonMultiSelectItem[]>;
    onSelected(ev: {
        item: DosCarbonMultiSelectItem | DosCarbonMultiSelectItem[] | null;
    }): void;
}

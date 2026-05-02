import { EventEmitter } from '@angular/core';
export interface DosCarbonComboBoxItem {
    content: string;
    selected?: boolean;
    disabled?: boolean;
}
/**
 * Carbon-backed combo-box. Single-select dropdown with type-ahead filtering.
 */
export declare class DosCarbonComboBoxComponent {
    label: string;
    helperText: string;
    placeholder: string;
    items: DosCarbonComboBoxItem[];
    size: 'sm' | 'md' | 'lg';
    theme: 'light' | 'dark';
    disabled: boolean;
    skeleton: boolean;
    invalid: boolean;
    invalidText: string;
    warn: boolean;
    warnText: string;
    type: 'single' | 'multi';
    selected: EventEmitter<DosCarbonComboBoxItem>;
    searched: EventEmitter<string>;
    onSelected(ev: {
        item: DosCarbonComboBoxItem | null;
    }): void;
}

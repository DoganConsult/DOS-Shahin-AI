import { EventEmitter } from '@angular/core';
export interface DosCarbonSelectOption {
    content: string;
    value: string | number;
    disabled?: boolean;
    selected?: boolean;
}
export declare class DosCarbonSelectComponent {
    label: string;
    helperText: string;
    invalid: boolean;
    invalidText: string;
    disabled: boolean;
    options: DosCarbonSelectOption[];
    selectedChange: EventEmitter<string | number>;
    onSelected(ev: {
        item?: DosCarbonSelectOption;
    } | null): void;
}

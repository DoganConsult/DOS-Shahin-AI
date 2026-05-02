import { EventEmitter } from '@angular/core';
/**
 * Carbon-backed date picker (single / range / simple). Uses flatpickr
 * under the hood.
 */
export declare class DosCarbonDatePickerComponent {
    label: string;
    helperText: string;
    placeholder: string;
    value: (Date | string)[];
    range: boolean;
    dateFormat: string;
    language: string;
    size: 'sm' | 'md' | 'lg';
    theme: 'light' | 'dark';
    disabled: boolean;
    readonly: boolean;
    skeleton: boolean;
    invalid: boolean;
    invalidText: string;
    warn: boolean;
    warnText: string;
    valueChange: EventEmitter<(string | Date)[]>;
}

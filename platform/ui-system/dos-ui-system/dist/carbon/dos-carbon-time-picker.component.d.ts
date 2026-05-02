import { EventEmitter } from '@angular/core';
/**
 * Carbon-backed time picker. Optional `am/pm` and `tz` selectors live
 * inside `cds-timepicker-select` slots.
 */
export declare class DosCarbonTimePickerComponent {
    label: string;
    value: string;
    ampm: 'AM' | 'PM';
    timezone: string;
    timezones: string[];
    showAmPm: boolean;
    pattern: string;
    maxlength: number;
    placeholder: string;
    size: 'sm' | 'md' | 'lg';
    theme: 'light' | 'dark';
    disabled: boolean;
    readonly: boolean;
    skeleton: boolean;
    invalid: boolean;
    invalidText: string;
    valueChange: EventEmitter<string>;
}

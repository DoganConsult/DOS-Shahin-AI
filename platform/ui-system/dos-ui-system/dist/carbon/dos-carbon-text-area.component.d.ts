import { EventEmitter } from '@angular/core';
/**
 * Carbon-backed text-area wrapper. Multi-line input with Carbon's
 * `cdsTextArea` directive for native styling + a11y.
 */
export declare class DosCarbonTextAreaComponent {
    label: string;
    value: string;
    placeholder: string;
    helperText: string;
    invalid: boolean;
    invalidText: string;
    disabled: boolean;
    readonly: boolean;
    rows: number;
    cols?: number;
    maxlength?: number;
    theme: 'light' | 'dark';
    valueChange: EventEmitter<string>;
    blurred: EventEmitter<void>;
    onInput(ev: Event): void;
}

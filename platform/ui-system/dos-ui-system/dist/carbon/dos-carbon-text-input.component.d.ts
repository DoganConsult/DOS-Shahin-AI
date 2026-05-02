import { EventEmitter } from '@angular/core';
export declare class DosCarbonTextInputComponent {
    label: string;
    value: string;
    placeholder: string;
    helperText: string;
    invalid: boolean;
    invalidText: string;
    disabled: boolean;
    readonly: boolean;
    size: 'sm' | 'md' | 'lg';
    theme: 'light' | 'dark';
    valueChange: EventEmitter<string>;
    blurred: EventEmitter<void>;
    onInput(ev: Event): void;
}

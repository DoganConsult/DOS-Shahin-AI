import { EventEmitter } from '@angular/core';
/**
 * Carbon-backed password input with show/hide toggle button.
 */
export declare class DosCarbonPasswordInputComponent {
    label: string;
    value: string;
    placeholder: string;
    helperText: string;
    invalid: boolean;
    invalidText: string;
    disabled: boolean;
    readonly: boolean;
    autocomplete: 'current-password' | 'new-password' | 'off';
    size: 'sm' | 'md' | 'lg';
    theme: 'light' | 'dark';
    showLabel: string;
    hideLabel: string;
    valueChange: EventEmitter<string>;
    blurred: EventEmitter<void>;
    readonly visible: import("@angular/core").WritableSignal<boolean>;
    onInput(ev: Event): void;
}

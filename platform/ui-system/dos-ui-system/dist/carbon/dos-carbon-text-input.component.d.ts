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
    name: string;
    id: string;
    autocomplete: string | null;
    inputmode: string | null;
    type: 'text' | 'email' | 'tel' | 'url' | 'search';
    valueChange: EventEmitter<string>;
    blurred: EventEmitter<void>;
    private readonly _autoId;
    get fieldId(): string;
    onInput(ev: Event): void;
}

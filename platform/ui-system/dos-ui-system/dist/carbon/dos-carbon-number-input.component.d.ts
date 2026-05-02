import { EventEmitter } from '@angular/core';
/**
 * Carbon-backed numeric input. Carbon ships `cdsNumber` as a directive
 * applied to a native `<input type="number">`. This wrapper composes
 * the directive with `cds-text-label` for label + helper-text rhythm.
 */
export declare class DosCarbonNumberInputComponent {
    label: string;
    helperText: string;
    value: number | null;
    min?: number;
    max?: number;
    step: number;
    size: 'sm' | 'md' | 'lg';
    theme: 'light' | 'dark';
    disabled: boolean;
    invalid: boolean;
    invalidText: string;
    valueChange: EventEmitter<number>;
    onInput(ev: Event): void;
}

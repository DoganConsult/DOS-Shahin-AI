import { EventEmitter } from '@angular/core';
export interface DosCarbonRadioOption {
    value: string;
    label: string;
    disabled?: boolean;
}
/**
 * Carbon-backed radio group. Carbon's `cds-radio-group` exposes
 * `value` two-way and emits `change` when the selection changes.
 */
export declare class DosCarbonRadioComponent {
    options: DosCarbonRadioOption[];
    value: string | null;
    name: string;
    legend: string;
    orientation: 'horizontal' | 'vertical';
    helperText: string;
    invalid: boolean;
    invalidText: string;
    warn: boolean;
    warnText: string;
    skeleton: boolean;
    disabled: boolean;
    valueChange: EventEmitter<string>;
    onChange(ev: {
        value?: string;
    }): void;
}

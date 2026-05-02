import { EventEmitter } from '@angular/core';
/**
 * Carbon-backed toggle. Carbon's `cds-toggle` is a ControlValueAccessor —
 * checked state binds via ngModel.
 */
export declare class DosCarbonToggleComponent {
    label: string;
    checked: boolean;
    skeleton: boolean;
    hideLabel: boolean;
    onText: string;
    offText: string;
    size: 'sm' | 'md';
    checkedChange: EventEmitter<boolean>;
}

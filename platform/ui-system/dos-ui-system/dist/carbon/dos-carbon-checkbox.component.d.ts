import { EventEmitter } from '@angular/core';
/**
 * Carbon-backed checkbox wrapper. One-source rule: import this from
 * @dos/ui-system, never `cds-checkbox` directly from products/modules.
 */
export declare class DosCarbonCheckboxComponent {
    label: string;
    checked: boolean;
    indeterminate: boolean;
    disabled: boolean;
    readOnly: boolean;
    skeleton: boolean;
    invalid: boolean;
    invalidText: string;
    warn: boolean;
    warnText: string;
    helperText: string;
    hideLabel: boolean;
    name: string;
    value: string;
    checkedChange: EventEmitter<boolean>;
    indeterminateChange: EventEmitter<boolean>;
}

import { EventEmitter } from '@angular/core';
/**
 * Carbon-backed search input. Carbon's `cds-search` exposes:
 *   theme/size/disabled/toolbar/expandable/skeleton/active/tableSearch/
 *   name/id/required/value/autocomplete/label/placeholder/clearButtonTitle/
 *   searchTitle/ariaLabel/fluid
 */
export declare class DosCarbonSearchComponent {
    label: string;
    placeholder: string;
    value: string;
    size: 'sm' | 'md' | 'lg';
    theme: 'light' | 'dark';
    disabled: boolean;
    skeleton: boolean;
    autocomplete: 'on' | 'off';
    name: string;
    toolbar: boolean;
    expandable: boolean;
    valueChange: EventEmitter<string>;
    cleared: EventEmitter<void>;
    onChange(value: string): void;
}

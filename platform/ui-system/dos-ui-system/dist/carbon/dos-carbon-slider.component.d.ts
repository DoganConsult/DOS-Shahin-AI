import { EventEmitter } from '@angular/core';
/**
 * Carbon-backed slider wrapper. Carbon's `cds-slider` only exposes:
 *   min/max/step/value/id/shiftMultiplier/skeleton/label/disabled/readonly/disableArrowKeys
 * Helper / warn / invalid states ride on the parent form context.
 */
export declare class DosCarbonSliderComponent {
    label: string;
    min: number;
    max: number;
    step: number;
    value: number;
    shiftMultiplier: number;
    disabled: boolean;
    readonly: boolean;
    skeleton: boolean;
    disableArrowKeys: boolean;
    valueChange: EventEmitter<number>;
}

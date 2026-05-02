import { EventEmitter } from '@angular/core';
export interface DosCarbonProgressStep {
    state: 'incomplete' | 'current' | 'complete' | 'invalid' | 'disabled';
    label: string;
    optionalLabel?: string;
    description?: string;
}
/**
 * Carbon-backed progress indicator (stepper). Supports horizontal
 * and vertical orientation. Required on multi-step wizards.
 */
export declare class DosCarbonProgressIndicatorComponent {
    steps: DosCarbonProgressStep[];
    current: number;
    orientation: 'horizontal' | 'vertical';
    skeleton: boolean;
    spaceEqually: boolean;
    stepSelected: EventEmitter<number>;
}

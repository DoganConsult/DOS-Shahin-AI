import { EventEmitter } from '@angular/core';
export type DosCarbonButtonKind = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger' | 'danger-tertiary' | 'danger-ghost';
export type DosCarbonButtonSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/**
 * @dos/ui-system Carbon wrapper — Button.
 *
 * Wraps `cds-button` from carbon-components-angular. Consumers MUST use
 * `<dos-carbon-button>` instead of importing `ButtonModule` directly so
 * the carbon-boundary-guard can enforce one-source ownership.
 */
export declare class DosCarbonButtonComponent {
    kind: DosCarbonButtonKind;
    size: DosCarbonButtonSize;
    disabled: boolean;
    type: 'button' | 'submit' | 'reset';
    clicked: EventEmitter<MouseEvent>;
}

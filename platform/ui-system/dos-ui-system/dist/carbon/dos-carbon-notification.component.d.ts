import { EventEmitter } from '@angular/core';
export type DosCarbonNotificationKind = 'error' | 'info' | 'info-square' | 'success' | 'warning' | 'warning-alt';
/**
 * Carbon Notification wrapper. Variants:
 *   - inline (default): `cds-inline-notification`
 *   - actionable:       `cds-actionable-notification` (renders an action button)
 *   - toast:            `cds-toast-notification`
 */
export declare class DosCarbonNotificationComponent {
    variant: 'inline' | 'actionable' | 'toast';
    kind: DosCarbonNotificationKind;
    title: string;
    subtitle: string | null;
    lowContrast: boolean;
    hideClose: boolean;
    actionLabel: string;
    action: EventEmitter<void>;
    closed: EventEmitter<void>;
}

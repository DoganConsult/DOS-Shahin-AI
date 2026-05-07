import { EventEmitter } from '@angular/core';
/**
 * Mobile shell — header / main / sticky bottom-nav layout for ≤480px.
 * Slots: shellHeader (top), default (main), shellBottomNav (sticky bottom),
 *        shellDrawer (overlay slide-in menu).
 */
export interface MobileShellConfig {
    breakpoint: string;
    density: 'compact' | 'normal' | 'comfortable';
    touchEnabled: boolean;
    layout: 'stacked' | 'bottom-nav' | 'drawer';
}
export declare class DosMobileShellComponent {
    mobileConfig?: MobileShellConfig;
    gestureEvent: EventEmitter<{
        type: string;
        data: unknown;
    }>;
}

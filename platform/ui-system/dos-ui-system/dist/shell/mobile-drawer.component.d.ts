import { EventEmitter } from '@angular/core';
/**
 * Mobile drawer — full-height slide-in overlay menu for the mobile shell.
 * RTL-safe: slides from logical inset-start (left in LTR, right in RTL).
 */
export declare class DosMobileDrawerComponent {
    open: boolean;
    title: string;
    dir: 'ltr' | 'rtl';
    closeLabel: string | null;
    touchTargetSize: number;
    swipeToNavigate: boolean;
    hapticFeedback: boolean;
    closed: EventEmitter<void>;
    swipeEvent: EventEmitter<{
        direction: string;
    }>;
    private startX;
    onEscape(): void;
    onTouchStart(event: TouchEvent): void;
    onTouchEnd(event: TouchEvent): void;
    handleClose(): void;
    private triggerHaptic;
}

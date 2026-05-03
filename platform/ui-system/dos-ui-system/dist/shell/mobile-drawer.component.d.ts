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
    closed: EventEmitter<void>;
    onEscape(): void;
}

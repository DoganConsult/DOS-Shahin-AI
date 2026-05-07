import { EventEmitter } from '@angular/core';
/**
 * DosServiceCard — workspace tile for a module, quick-action, or service.
 *
 * Refined enterprise styling: generous padding, optional icon badge, hover
 * lift, primary CTA at the bottom.
 */
export declare class DosServiceCardComponent {
    title: string;
    subtitle: string;
    description: string;
    icon: string | null;
    tone: 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral';
    ctaLabel: string;
    ctaKind: 'primary' | 'ghost';
    disabled: boolean;
    badge: string | null;
    open: EventEmitter<void>;
}

import { EventEmitter } from '@angular/core';
/**
 * DosServiceCard — workspace tile for a module, quick-action, or service.
 *
 * Refined enterprise styling: generous padding, optional icon badge, hover
 * lift, primary CTA at the bottom. Class hierarchy is its own (no longer
 * borrows .dos-metric-card) so the visual contract is independent.
 *
 * Inputs:
 *   title       — primary label
 *   subtitle    — caption / category (e.g. module code)
 *   description — short body copy
 *   icon        — DosIcon name (optional). Renders an icon badge in the corner.
 *   tone        — visual tone of the icon badge ('brand' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral')
 *   ctaLabel    — primary button label
 *   ctaKind     — 'primary' (default) | 'ghost' (less-emphasized variant)
 *   disabled    — true to render disabled
 *   badge       — optional small text badge (e.g. "soon", "trial")
 *
 * Output:
 *   open — fires when the user activates the CTA
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

import { EventEmitter } from '@angular/core';
/**
 * DosEmptyState — illustrated, brand-voiced empty state.
 *
 * Backwards-compatible: existing `title` + `description` + projected
 * content continues to work. New optional inputs add an icon glyph,
 * primary/secondary actions, and a tone variant. Projected content
 * still renders below the optional CTAs.
 */
export declare class DosEmptyStateComponent {
    title: string;
    description: string;
    icon?: string;
    showDefaultGlyph: boolean;
    tone: 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger';
    primaryAction?: string;
    secondaryAction?: string;
    primary: EventEmitter<void>;
    secondary: EventEmitter<void>;
}

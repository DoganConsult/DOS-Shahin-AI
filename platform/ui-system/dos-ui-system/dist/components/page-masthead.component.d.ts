import { EventEmitter } from '@angular/core';
/**
 * DosPageMasthead — §26.1 universal page hero.
 *
 * Every page in the platform must use this component as its top-level
 * surface (overview / list / object / workflow / analytics / audit /
 * settings). It enforces the required §26.1 layout slots:
 *
 *   • module name (eyebrow chip)
 *   • page title (display-md)
 *   • page subtitle (one-line purpose)
 *   • breadcrumb (optional)
 *   • status / readiness badge (optional)
 *   • primary actions (slot)
 *   • agent quick actions (slot)
 *   • "Why am I seeing this?" chip (uses dos-why-chip)
 *
 * The masthead also paints the §24 mesh + hairline signature surface
 * when `signature=true` so any page can opt into the cornerstone hero
 * treatment without re-implementing it.
 *
 * Inputs are pre-resolved strings (not i18n keys) — the resolver is
 * the only thing that knows how to translate. This keeps the component
 * presentation-pure.
 */
export declare class DosPageMastheadComponent {
    moduleName?: string;
    eyebrow?: string;
    title: string;
    subtitle?: string;
    breadcrumb?: {
        label: string;
        route?: string;
    }[];
    breadcrumbAria: string;
    statusBadge?: string;
    statusTone: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
    signature: boolean;
    density: 'compact' | 'cozy' | 'comfortable';
    pageType: 'overview' | 'list' | 'object' | 'workflow' | 'analytics' | 'audit' | 'settings' | 'report';
    whyVisible?: string;
    whyLabel: string;
    openHelp: EventEmitter<void>;
}

/**
 * DosWhyChip — §15.1 "Why am I seeing this?" inline chip.
 *
 * Renders a small "?" pill with a tooltip explaining why a UI element
 * is visible (or hidden / disabled). Use everywhere the spec demands
 * explainability:
 *   - on KPI tiles (data scope rationale)
 *   - on disabled nav items (missing-permission / not-entitled / …)
 *   - on hidden actions (whyHidden from ResolvedPageAction)
 *   - on page mastheads (page-level audience rationale)
 *
 * The reason string itself is i18n-resolved by the caller; this
 * component is purely presentational.
 */
export declare class DosWhyChipComponent {
    reason: string;
    label?: string;
    showLabel: boolean;
    tone: 'neutral' | 'info' | 'warning' | 'danger';
    size: 'sm' | 'md';
}

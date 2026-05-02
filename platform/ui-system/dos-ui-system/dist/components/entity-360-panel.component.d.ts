import { EventEmitter } from '@angular/core';
/**
 * DosEntity360Panel — §26.4 universal Entity 360 Panel.
 *
 * Object-page primary container. Renders:
 *   - Object header (title, status badge, primary actions, why-chip)
 *   - Tab strip (consumer projects tab content via slots)
 *   - Main / aside split (aside hosts evidence/audit/AI summary)
 *
 * Spec slot map (§26.4):
 *   • Profile summary
 *   • Relationships
 *   • Permissions/ownership
 *   • Workflow state
 *   • Audit timeline
 *   • Evidence
 *   • AI summary
 *   • Recommended actions
 *
 * The component is shell-only — content is projected. Status badge tone
 * comes from the resolver (not derived from the status code in markup).
 *
 * Slots:
 *   [slot=actions]      — primary + secondary actions (resolver-driven)
 *   [slot=tabs]         — `<button role="tab">` strip
 *   [slot=aside]        — right rail: evidence / audit / AI Workbench
 *   default             — main panel body
 */
export declare class DosEntity360PanelComponent {
    entityKind: string;
    title: string;
    subtitle?: string;
    statusLabel?: string;
    statusTone: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
    showSidePanel: boolean;
    readonly: boolean;
    whyVisible?: string;
    whyLabel: string;
    ariaLabel?: string;
    tabsAriaLabel: string;
    asideAriaLabel: string;
    actionClick: EventEmitter<string>;
}

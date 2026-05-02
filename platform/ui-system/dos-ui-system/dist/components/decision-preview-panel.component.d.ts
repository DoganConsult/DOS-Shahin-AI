import { EventEmitter } from '@angular/core';
/**
 * DosDecisionPreviewPanel — §26.7 / §15.2 / §19.3 Decision Preview.
 *
 * Renders the mandatory preview before any sensitive write:
 *   • Before state                   • After state
 *   • Affected users / entities      • Permission impact
 *   • SoD impact                     • Workflow impact
 *   • Audit event preview            • Rollback option
 *   • Reason input (when required)   • Approve / Reject / Request change
 *
 * §19.3 — AI-assisted writes route through here too. Risk level drives
 * tone + confirmation strength (low → simple confirm; medium → warning;
 * high → bold + reason required; critical → reason + 2FA / approval).
 *
 * Component is a controlled dialog — parent wires `confirm` / `reject` /
 * `requestChange` events to the actual write call.
 */
export interface DecisionDiffField {
    field: string;
    before?: string | number | boolean | null;
    after?: string | number | boolean | null;
    changed: boolean;
}
export interface DecisionAffected {
    kind: string;
    id: string;
    name?: string;
}
export interface DecisionPreview {
    title: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical' | 'blocked';
    diff?: DecisionDiffField[];
    beforeRaw?: unknown;
    afterRaw?: unknown;
    affected?: DecisionAffected[];
    permissionImpact?: string;
    sodImpact?: string;
    workflowImpact?: string;
    auditEventPreview?: string;
    rollbackOption: 'none' | 'manual' | 'automatic';
    rollbackNote?: string;
    reasonRequired?: boolean;
    approvalRequired?: boolean;
    whyBlocked?: string;
    approvers?: string[];
}
export declare class DosDecisionPreviewPanelComponent {
    preview?: DecisionPreview;
    eyebrowLabel: string;
    riskLabel: string;
    blockedTitle: string;
    diffFieldLabel: string;
    diffBeforeLabel: string;
    diffAfterLabel: string;
    diffAriaLabel: string;
    permissionImpactLabel: string;
    sodImpactLabel: string;
    workflowImpactLabel: string;
    auditEventLabel: string;
    affectedLabel: string;
    rollbackLabel: string;
    rollbackNoneLabel: string;
    rollbackManualLabel: string;
    rollbackAutoLabel: string;
    approversLabel: string;
    reasonLabel: string;
    reasonPlaceholder: string;
    cancelLabel: string;
    requestChangeLabel: string;
    confirmLabel: string;
    approveLabel: string;
    reason: string;
    rollbackOptionLabel(opt: 'none' | 'manual' | 'automatic'): string;
    confirm: EventEmitter<string>;
    requestChange: EventEmitter<string>;
    cancel: EventEmitter<void>;
}

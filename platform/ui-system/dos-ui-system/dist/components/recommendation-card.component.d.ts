import { EventEmitter } from '@angular/core';
/**
 * DosRecommendationCard — §26.6 Recommendation Card.
 *
 * Renders an AI/agent finding with the §19.1 Trust Layer baked in.
 * Severity drives the left-rail tone (low=green, medium=amber,
 * high=orange/red, critical=red+strong).
 *
 * Inputs map 1:1 to ResolvedAiTip + AiTrustLayer from @dos/ui-contracts.
 *
 * Outputs:
 *   primary    — emitted when the user clicks the primary CTA
 *   approve    — emitted on Approve (default action when approvable)
 *   dismiss    — emitted when user dismisses
 *   createTask — emitted when user wants to convert to a task
 *
 * Renders confidence + risk + source as inline chips; expanding the
 * trust drawer shows the full §19.1 block.
 */
export declare class DosRecommendationCardComponent {
    title: string;
    body: string;
    icon?: string;
    ctaLabel?: string;
    ctaRoute?: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    showApprove: boolean;
    showDismiss: boolean;
    approveLabel: string;
    dismissLabel: string;
    whyVisible?: string;
    whyLabel: string;
    trustSource?: string;
    trustConfidence?: number;
    trustReasoning?: string;
    trustDataUsed: string[];
    trustLastUpdated?: string;
    trustPermissionScope?: string;
    trustHumanApprovalRequired: boolean;
    trustLabels: {
        source: string;
        confidence: string;
        risk: string;
        scope: string;
        updated: string;
        approval: string;
    };
    primary: EventEmitter<void>;
    approve: EventEmitter<void>;
    dismiss: EventEmitter<void>;
    createTask: EventEmitter<void>;
}

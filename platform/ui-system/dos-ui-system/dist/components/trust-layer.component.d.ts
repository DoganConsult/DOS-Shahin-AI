/**
 * DosTrustLayer — the §19.1 AI Trust Layer primitive.
 *
 * Every AI output (recommendation, summary, draft, copilot reply) MUST
 * be wrapped in this component or render its fields manually. Without
 * a Trust Layer the §21 #21 acceptance gate fails.
 *
 * Surface contract:
 *   • source            — agentId or pipeline name
 *   • confidence        — 0–1 (rendered as % + tone)
 *   • reasoningSummary  — one-sentence rationale (i18n-resolved)
 *   • dataUsed          — list of dataResource keys (chips)
 *   • lastUpdated       — ISO timestamp (relative-time formatted)
 *   • permissionScope   — e.g. 'tenant', 'self', 'org_scope'
 *   • riskLevel         — low/medium/high/critical (drives tone)
 *   • humanApprovalRequired — boolean (renders required badge)
 *
 * Rendered as a compact footer strip below the AI output. In Arabic the
 * confidence % uses tabular figures and the chips flow in RTL.
 */
export declare class DosTrustLayerComponent {
    source?: string;
    confidence?: number;
    reasoningSummary?: string;
    dataUsed: string[];
    lastUpdated?: string;
    permissionScope?: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    humanApprovalRequired: boolean;
    sourceLabel: string;
    confidenceLabel: string;
    riskLabel: string;
    scopeLabel: string;
    updatedLabel: string;
    approvalLabel: string;
    ariaLabel: string;
    relativeTime(iso: string): string;
}

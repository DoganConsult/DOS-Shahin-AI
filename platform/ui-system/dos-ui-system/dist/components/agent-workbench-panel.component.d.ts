import { EventEmitter } from '@angular/core';
/**
 * DosAgentWorkbenchPanel — §26.5 / §19.4 Agent Workbench Panel.
 *
 * Per-page AI workbench. Hosts the available agent commands per route +
 * persona. The resolver supplies the `commands` array; this component
 * only renders. Default §19.4 commands (resolver decides which apply):
 *   ask · explain · summarize · detect-gaps · generate-draft · compare ·
 *   simulate · prepare-approval · create-task
 *
 * §20.8 enforces a permission level (L0–L6). L0–L2 = read/analyze, L3 =
 * draft, L4 = propose-write (approval required), L5 = execute approved
 * write, L6 = scheduled automation (policy-limited). The component
 * surfaces the level so the user can see at a glance whether running
 * a command will write or just analyze.
 *
 * §3.4 hard law — visibility/permission gating happens in the resolver,
 * not here. We render `disabled` + `whyHidden` if the resolver decides.
 *
 * Slots:
 *   [slot=output]      — last agent output (Recommendation Card etc.)
 *   [slot=history]     — list of prior runs (receipts, see §19.2)
 */
export interface AgentCommand {
    id: string;
    label: string;
    description?: string;
    /** §20.8 permission level. */
    level: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    requiresApproval?: boolean;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    disabled?: boolean;
    whyHidden?: string;
}
export declare class DosAgentWorkbenchPanelComponent {
    title: string;
    subtitle?: string;
    agentTone?: 'governance' | 'risk' | 'assurance' | 'operations' | 'security' | 'executive';
    mode: 'side-panel' | 'workbench' | 'inline';
    commands: AgentCommand[];
    approvalLabel: string;
    ariaLabel: string;
    trustSource?: string;
    trustConfidence?: number;
    trustReasoning?: string;
    trustDataUsed: string[];
    trustLastUpdated?: string;
    trustPermissionScope?: string;
    trustRiskLevel: 'low' | 'medium' | 'high' | 'critical';
    trustHumanApprovalRequired: boolean;
    trustLabels: {
        source: string;
        confidence: string;
        risk: string;
        scope: string;
        updated: string;
        approval: string;
    };
    commandRun: EventEmitter<string>;
    /** Tooltip text for the level chip — describes what L0-L6 means. */
    levelTooltip(level: number): string;
}

import { EventEmitter } from '@angular/core';
/**
 * DosWorkflowCanvas — §26.9 / §14 Workflow Canvas.
 *
 * Renders a workflow instance as a horizontal step strip with state per
 * step, current step highlight, approvers, SLA timers, and evidence
 * requirement indicators. Used on every workflow-enabled page.
 *
 * §14.1 — minimum surfaced states:
 *   draft · pending_review · approved · rejected · expired ·
 *   blocked_sod · needs_owner · needs_evidence · ready_for_approval
 *
 * §14.2 action validity — actions become available only when valid for
 * (user permissions + workflow step + SoD rules + tenant scope). The
 * resolver decides; this component renders only.
 *
 * §15.1 — when a step is blocked, a why-chip surfaces the reason.
 */
export type WorkflowStepStatus = 'draft' | 'pending_review' | 'in_progress' | 'ready_for_approval' | 'approved' | 'rejected' | 'expired' | 'blocked_sod' | 'needs_owner' | 'needs_evidence' | 'complete' | 'skipped';
export interface WorkflowStep {
    id: string;
    label: string;
    status: WorkflowStepStatus;
    blockedReason?: string;
    approvers?: string[];
    slaDueAt?: string;
    evidenceRequired?: boolean;
    evidenceCount?: number;
}
export declare class DosWorkflowCanvasComponent {
    title?: string;
    steps: WorkflowStep[];
    currentStep?: string;
    stateMachine?: string;
    ariaLabel: string;
    eyebrowLabel: string;
    approversLabel: string;
    blockedLabel: string;
    evidenceRequiredLabel: string;
    statusLabels: Partial<Record<WorkflowStepStatus, string>>;
    stepClick: EventEmitter<string>;
    statusDisplay(status: WorkflowStepStatus): string;
    isOverdue(iso: string): boolean;
    slaCountdown(iso: string): string;
}

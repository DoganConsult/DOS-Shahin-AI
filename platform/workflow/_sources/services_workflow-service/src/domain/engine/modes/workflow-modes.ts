/**
 * Platform Workflow Operating Modes — Patch 7 §2.1
 *
 * Three canonical working modes for the platform workflow engine.
 * Tenant-configurable, product-overridable, module-consumable.
 *
 * @owner DOS
 * @since 2026-03-31
 */

export const WORKFLOW_MODES = ['standard', 'express', 'enterprise'] as const;
export type WorkflowMode = (typeof WORKFLOW_MODES)[number];

export interface WorkflowModeConfig {
  mode: WorkflowMode;
  approvalLevels: number;
  requiresCommitteeSignOff: boolean;
  requiresRegulatoryGate: boolean;
  parallelReviewEnabled: boolean;
  autoEscalationHours: number;
  slaMultiplier: number;
  delegationDepth: number;
  sodEnforcement: 'strict' | 'standard' | 'relaxed';
  selfApprovalPrevention: boolean;
  makerCheckerRequired: boolean;
  auditTrailDepth: 'full' | 'standard' | 'minimal';
}

export const WORKFLOW_MODE_CONFIGS: Record<WorkflowMode, WorkflowModeConfig> = {
  standard: {
    mode: 'standard',
    approvalLevels: 2,
    requiresCommitteeSignOff: false,
    requiresRegulatoryGate: false,
    parallelReviewEnabled: false,
    autoEscalationHours: 48,
    slaMultiplier: 1.0,
    delegationDepth: 1,
    sodEnforcement: 'standard',
    selfApprovalPrevention: true,
    makerCheckerRequired: false,
    auditTrailDepth: 'standard',
  },

  express: {
    mode: 'express',
    approvalLevels: 1,
    requiresCommitteeSignOff: false,
    requiresRegulatoryGate: false,
    parallelReviewEnabled: false,
    autoEscalationHours: 24,
    slaMultiplier: 0.5,
    delegationDepth: 0,
    sodEnforcement: 'relaxed',
    selfApprovalPrevention: true,
    makerCheckerRequired: false,
    auditTrailDepth: 'minimal',
  },

  enterprise: {
    mode: 'enterprise',
    approvalLevels: 3,
    requiresCommitteeSignOff: true,
    requiresRegulatoryGate: true,
    parallelReviewEnabled: true,
    autoEscalationHours: 72,
    slaMultiplier: 1.5,
    delegationDepth: 3,
    sodEnforcement: 'strict',
    selfApprovalPrevention: true,
    makerCheckerRequired: true,
    auditTrailDepth: 'full',
  },
};

export function getWorkflowModeConfig(mode: WorkflowMode): WorkflowModeConfig {
  return WORKFLOW_MODE_CONFIGS[mode];
}

export function isValidWorkflowMode(mode: string): mode is WorkflowMode {
  return WORKFLOW_MODES.includes(mode as WorkflowMode);
}

export function getApprovalLevelsForMode(mode: WorkflowMode): number {
  return WORKFLOW_MODE_CONFIGS[mode].approvalLevels;
}

export function getSlaHoursForMode(mode: WorkflowMode, baseSlaHours: number): number {
  return Math.ceil(baseSlaHours * WORKFLOW_MODE_CONFIGS[mode].slaMultiplier);
}

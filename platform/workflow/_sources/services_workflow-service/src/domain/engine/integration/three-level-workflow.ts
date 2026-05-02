/**
 * Three-Level Workflow Integration — Patch 7 §2.1, §2.3
 *
 * Canonical 3-level workflow resolution for all platform operations:
 *   Level 1 — Operational (auto-approved for low-risk, express mode)
 *   Level 2 — Managerial (single approver, standard mode)
 *   Level 3 — Executive (multi-level committee, enterprise mode)
 *
 * Every entity transition routes through this resolver to determine
 * which approval chain is required based on:
 *   - Tenant workflow mode
 *   - Entity risk classification
 *   - Module workflow policy
 *   - User authority level
 *
 * @owner DOS
 * @since 2026-03-31
 */

import { logger } from '@dos/platform-core/observability';
import type { WorkflowMode, WorkflowModeConfig } from '../modes/workflow-modes';
import { getTenantWorkflowMode, resolveEffectiveModeConfig } from '../modes/tenant-workflow-config';

export const WORKFLOW_LEVELS = ['operational', 'managerial', 'executive'] as const;
export type WorkflowLevel = (typeof WORKFLOW_LEVELS)[number];

export interface WorkflowLevelConfig {
  level: WorkflowLevel;
  levelNumber: 1 | 2 | 3;
  autoApproveEligible: boolean;
  requiredApprovers: number;
  requiresCommittee: boolean;
  requiresDauthAuthority: boolean;
  requiresSodCheck: boolean;
  requiresSelfApprovalGuard: boolean;
  maxSlaHours: number;
  escalationChain: string[];
}

export const WORKFLOW_LEVEL_CONFIGS: Record<WorkflowLevel, WorkflowLevelConfig> = {
  operational: {
    level: 'operational',
    levelNumber: 1,
    autoApproveEligible: true,
    requiredApprovers: 0,
    requiresCommittee: false,
    requiresDauthAuthority: false,
    requiresSodCheck: false,
    requiresSelfApprovalGuard: false,
    maxSlaHours: 8,
    escalationChain: ['team_lead'],
  },
  managerial: {
    level: 'managerial',
    levelNumber: 2,
    autoApproveEligible: false,
    requiredApprovers: 1,
    requiresCommittee: false,
    requiresDauthAuthority: true,
    requiresSodCheck: true,
    requiresSelfApprovalGuard: true,
    maxSlaHours: 48,
    escalationChain: ['manager', 'department_head'],
  },
  executive: {
    level: 'executive',
    levelNumber: 3,
    autoApproveEligible: false,
    requiredApprovers: 2,
    requiresCommittee: true,
    requiresDauthAuthority: true,
    requiresSodCheck: true,
    requiresSelfApprovalGuard: true,
    maxSlaHours: 120,
    escalationChain: ['department_head', 'committee_chair', 'cro', 'board'],
  },
};

export type RiskClassification = 'low' | 'medium' | 'high' | 'critical';

const RISK_TO_LEVEL: Record<RiskClassification, WorkflowLevel> = {
  low: 'operational',
  medium: 'managerial',
  high: 'executive',
  critical: 'executive',
};

const MODE_LEVEL_CAPS: Record<WorkflowMode, WorkflowLevel> = {
  express: 'managerial',
  standard: 'executive',
  enterprise: 'executive',
};

const MODE_LEVEL_FLOORS: Record<WorkflowMode, WorkflowLevel> = {
  express: 'operational',
  standard: 'operational',
  enterprise: 'managerial',
};

export interface WorkflowLevelResolutionInput {
  tenantId: string;
  moduleCode: string;
  entityType: string;
  riskClassification: RiskClassification;
  entityValue?: number;
  isProtectedTransition?: boolean;
  productMode?: WorkflowMode;
  moduleMode?: WorkflowMode;
}

export interface WorkflowLevelResolution {
  resolvedLevel: WorkflowLevel;
  levelConfig: WorkflowLevelConfig;
  effectiveMode: WorkflowModeConfig;
  reason: string;
}

export async function resolveWorkflowLevel(
  input: WorkflowLevelResolutionInput,
): Promise<WorkflowLevelResolution> {
  const tenantMode = await getTenantWorkflowMode(input.tenantId);
  const effectiveMode = resolveEffectiveModeConfig(tenantMode, input.productMode, input.moduleMode);

  let baseLevel = RISK_TO_LEVEL[input.riskClassification];

  if (input.isProtectedTransition) {
    baseLevel = 'executive';
  }

  const floor = MODE_LEVEL_FLOORS[effectiveMode.mode];
  const cap = MODE_LEVEL_CAPS[effectiveMode.mode];

  let resolvedLevel = baseLevel;
  const levelOrder: WorkflowLevel[] = ['operational', 'managerial', 'executive'];
  const baseIdx = levelOrder.indexOf(baseLevel);
  const floorIdx = levelOrder.indexOf(floor);
  const capIdx = levelOrder.indexOf(cap);

  if (baseIdx < floorIdx) {
    resolvedLevel = floor;
  } else if (baseIdx > capIdx) {
    resolvedLevel = cap;
  }

  const levelConfig = WORKFLOW_LEVEL_CONFIGS[resolvedLevel];

  const reason = `risk=${input.riskClassification}, mode=${effectiveMode.mode}, ` +
    `base=${baseLevel}, floor=${floor}, cap=${cap}, resolved=${resolvedLevel}`;

  logger.info(`[3LevelWorkflow] ${input.moduleCode}:${input.entityType} → L${levelConfig.levelNumber} (${resolvedLevel})`, {
    tenantId: input.tenantId,
    reason,
  });

  return {
    resolvedLevel,
    levelConfig,
    effectiveMode,
    reason,
  };
}

export function getWorkflowLevelConfig(level: WorkflowLevel): WorkflowLevelConfig {
  return WORKFLOW_LEVEL_CONFIGS[level];
}

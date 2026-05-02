export interface LifecycleAuthRequestContract {
  userId: string;
  entityType: string;
  entityId: string;
  fromState: string;
  toState: string;
  moduleCode: string;
}

export interface LifecycleAuthDecisionContract {
  allowed: boolean;
  reason: string;
  requiresApproval: boolean;
  approvalWorkflowId?: string;
  delegationUsed?: string;
  sodCheck: { passed: boolean; violations: string[] };
  authorityCheck: { passed: boolean; authority?: string };
  checkedAt: string;
}

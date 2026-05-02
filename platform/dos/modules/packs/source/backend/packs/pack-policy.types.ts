export interface EvaluatePackPoliciesDto {
  sessionId: string;
  tenantId: string;
  userId: string;
}

export interface PackPolicyDecisionDto {
  policyCode: string;
  targetPackCode: string;
  decisionStatus: 'selected' | 'skipped' | 'not_matched' | 'error';
  matched: boolean;
  priority: number;
  rationale: string;
  evaluationSnapshot: Record<string, unknown>;
}

export interface EvaluatePackPoliciesResultDto {
  sessionId: string;
  tenantId: string;
  selectedPacks: Array<{
    packCode: string;
    reason: string;
    policyCode: string;
  }>;
  decisions: PackPolicyDecisionDto[];
}

export interface AuthorityCheckRequest {
  userId: string;
  tenantId: string;
  authorityCode: string;
  moduleCode?: string;
  entityType?: string;
  entityId?: string;
  requiredLevel?: number;
}

export interface AuthorityCheckResult {
  hasAuthority: boolean;
  authorityLevel: number;
  requiredLevel: number;
  source: 'direct' | 'delegated' | 'inherited';
  delegatedFrom?: string;
  reason?: string;
  correlationId: string;
}

export interface SignOffRequirement {
  entityType: string;
  action: string;
  requiredAuthorityLevel: number;
  requiredRoles: string[];
  selfApprovalAllowed: boolean;
  makerCheckerRequired: boolean;
}

export interface SignOffResult {
  signOffId: string;
  entityType: string;
  entityId: string;
  signedOffBy: string;
  authorityLevel: number;
  decision: 'approved' | 'rejected';
  reason?: string;
  timestamp: string;
}

export interface ApprovalChainNode {
  stepNumber: number;
  approverRole?: string;
  approverId?: string;
  slaHours: number;
  canDelegate: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'delegated' | 'escalated';
}

export interface ApprovalChainResult {
  chainId: string;
  entityType: string;
  entityId: string;
  steps: ApprovalChainNode[];
  currentStep: number;
  overallStatus: 'pending' | 'approved' | 'rejected';
}

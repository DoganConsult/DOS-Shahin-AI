export type DelegationScopeCode =
  | 'onboarding'
  | 'workspace_setup'
  | 'policy_drafting'
  | 'risk_seeding'
  | 'control_mapping'
  | 'evidence_upload'
  | 'assessment';

export interface DelegationGrantRequest {
  tenantId: string;
  userId: string;
  agentId: string;
  scopes: DelegationScopeCode[];
  durationMinutes?: number;
}

export interface DelegationGrant {
  grantId: string;
  tenantId: string;
  userId: string;
  agentId: string;
  scopes: DelegationScopeCode[];
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface DelegationRevocation {
  tenantId: string;
  grantId: string;
  revokedBy: string;
  reason?: string;
}

export interface DelegationValidation {
  valid: boolean;
  grant: DelegationGrant | null;
  reason?: string;
}

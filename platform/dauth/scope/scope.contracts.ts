export interface ScopeAssignmentContract {
  assignmentId: string;
  userId: string;
  scopeType: 'global' | 'tenant' | 'organization' | 'department' | 'team' | 'module' | 'entity' | 'custom';
  scopeId: string;
  scopeName: string;
  inherited: boolean;
}

export interface ScopeResolutionContract {
  userId: string;
  resolvedScopes: ScopeAssignmentContract[];
  effectiveScope: string[];
  resolvedAt: string;
}

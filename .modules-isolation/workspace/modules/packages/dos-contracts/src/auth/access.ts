export interface AccessDecisionContext {
  actorId: string;
  tenantId: string;
  permission: string;
  resourceType?: string;
  resourceId?: string;
  moduleCode?: string;
  scopeType?: 'own' | 'team' | 'department' | 'org' | 'global';
}

export interface AccessDecision {
  allowed: boolean;
  reason: string;
  evaluatedSteps: string[];
  matchedRule?: string;
  deniedAt?: string;
}

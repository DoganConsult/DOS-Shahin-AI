export interface AuthorityContract {
  authorityId: string;
  name: string;
  description: string;
  scope: string;
  level: 'system' | 'tenant' | 'module' | 'entity';
  grantedTo: string[];
  conditions: AuthorityConditionContract[];
  active: boolean;
}

export interface AuthorityConditionContract {
  field: string;
  operator: 'equals' | 'in' | 'gt' | 'lt' | 'between';
  value: unknown;
}

export interface AuthorityCheckContract {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  moduleCode: string;
}

export interface AuthorityDecisionContract {
  allowed: boolean;
  authority?: AuthorityContract;
  reason: string;
  checkedAt: string;
}

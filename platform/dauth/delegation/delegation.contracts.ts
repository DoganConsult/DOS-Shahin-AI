export interface DelegationContract {
  delegationId: string;
  delegatorId: string;
  delegateId: string;
  scope: DelegationScopeContract;
  permissions: string[];
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'revoked' | 'pending_approval';
  reason: string;
  createdAt: string;
}

export interface DelegationScopeContract {
  type: 'full' | 'module' | 'entity' | 'action';
  moduleCode?: string;
  entityType?: string;
  entityId?: string;
  actions?: string[];
}

export interface DelegationRequestContract {
  delegateId: string;
  scope: DelegationScopeContract;
  permissions: string[];
  startDate: string;
  endDate: string;
  reason: string;
}

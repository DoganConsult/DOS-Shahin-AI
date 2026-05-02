import type { PrincipalType } from '@dos/types';

export interface PrincipalContext {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  principalType: PrincipalType;
  status: 'active' | 'inactive' | 'locked' | 'pending';
  mfaEnabled: boolean;
  actorId?: string;
  actorType?: string;
  delegatedFrom?: string;
  permissions: string[];
  roles: string[];
  language?: string;
  departmentId?: string;
}

export interface AuthenticatedRequestContext {
  principal: PrincipalContext;
  sessionId: string;
  tenantId: string;
  correlationId: string;
  ip: string;
  userAgent: string;
}

export interface ActorContext {
  actorId: string;
  actorType: 'human' | 'agent' | 'service_account' | 'external';
  linkedUserId: string;
  status: 'active' | 'inactive' | 'suspended';
  capabilities: string[];
  createdAt: string;
}

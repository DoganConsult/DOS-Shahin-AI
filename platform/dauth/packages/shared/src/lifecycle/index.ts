export type {
  LifecycleTransitionRequest,
  TransitionCheckResult,
  LifecycleAuthDecision,
} from '@dos/contracts/auth';

export type { LifecycleAuthPort } from '../ports';

import type { LifecycleAuthPort } from '../ports';
import type { LifecycleAuthDecision } from '@dos/contracts/auth';

let _lifecycleAuthPort: LifecycleAuthPort | null = null;

export function setLifecycleAuthPort(port: LifecycleAuthPort): void {
  _lifecycleAuthPort = port;
}

export function getLifecycleAuthPort(): LifecycleAuthPort | null {
  return _lifecycleAuthPort;
}

export async function evaluateLifecycleTransition(
  tenantId: string,
  userId: string,
  input: {
    moduleCode: string;
    entityType: string;
    entityId: string;
    fromState: string;
    toState: string;
    permissionCode: string;
    userRoles?: string[];
    authorityLevelCode?: string;
    ownerId?: string;
  },
): Promise<LifecycleAuthDecision> {
  if (_lifecycleAuthPort) {
    return _lifecycleAuthPort.evaluateLifecycleTransition({
      tenantId,
      userId,
      ...input,
      userRoles: input.userRoles || [],
    });
  }
  return {
    allowed: true,
    reason: 'lifecycle-auth-port-not-configured',
    checks: [],
    evaluatedAt: new Date().toISOString(),
    permissionCode: input.permissionCode,
    approvalRequired: false,
  };
}

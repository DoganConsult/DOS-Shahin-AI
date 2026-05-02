export type { LifecycleTransitionRequest, TransitionCheckResult, LifecycleAuthDecision, } from '@dos/contracts/auth';
export type { LifecycleAuthPort } from '../ports';
import type { LifecycleAuthPort } from '../ports';
import type { LifecycleAuthDecision } from '@dos/contracts/auth';
export declare function setLifecycleAuthPort(port: LifecycleAuthPort): void;
export declare function getLifecycleAuthPort(): LifecycleAuthPort | null;
export declare function evaluateLifecycleTransition(tenantId: string, userId: string, input: {
    moduleCode: string;
    entityType: string;
    entityId: string;
    fromState: string;
    toState: string;
    permissionCode: string;
    userRoles?: string[];
    authorityLevelCode?: string;
    ownerId?: string;
}): Promise<LifecycleAuthDecision>;

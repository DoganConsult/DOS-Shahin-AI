export { authenticate, requirePermission, requireTenantId } from '@dos/dauth-shared';
export declare function logAuthDecision(...args: any[]): Promise<void>;
export declare function preventSelfApproval(...args: any[]): any;
export declare function evaluateLifecycleTransition(...args: any[]): {
    allowed: boolean;
    reason?: string;
    checks?: any[];
};

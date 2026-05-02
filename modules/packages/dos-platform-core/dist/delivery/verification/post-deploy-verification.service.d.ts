export type VerificationCheckStatus = 'pending' | 'passed' | 'failed' | 'skipped';
export type VerificationRunStatus = 'running' | 'passed' | 'failed' | 'partial';
export interface VerificationCheck {
    checkId: string;
    runId: string;
    releaseId: string;
    checkCode: string;
    category: 'health' | 'auth' | 'workflow' | 'integration' | 'ai' | 'admin' | 'smoke' | 'regression';
    status: VerificationCheckStatus;
    owner: string;
    durationMs: number | null;
    failureDetail: string | null;
    executedAt: string | null;
    createdAt: string;
}
export interface VerificationRun {
    runId: string;
    releaseId: string;
    deploymentId: string;
    status: VerificationRunStatus;
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    skippedChecks: number;
    rollbackDecision: 'no-rollback' | 'rollback' | 'pending' | null;
    startedAt: string;
    completedAt: string | null;
    completedBy: string | null;
}
export declare function startVerificationRun(input: {
    releaseId: string;
    deploymentId: string;
}): Promise<VerificationRun>;
export declare function registerVerificationCheck(input: {
    runId: string;
    releaseId: string;
    checkCode: string;
    category: VerificationCheck['category'];
    owner: string;
}): Promise<VerificationCheck>;
export declare function recordCheckResult(checkId: string, status: VerificationCheckStatus, durationMs?: number, failureDetail?: string): Promise<void>;
export declare function completeVerificationRun(runId: string, completedBy: string, rollbackDecision: VerificationRun['rollbackDecision']): Promise<VerificationRun | null>;
export declare function getVerificationRun(runId: string): Promise<VerificationRun | null>;
export declare function getVerificationCheck(checkId: string): Promise<VerificationCheck | null>;
export declare function listChecksByRun(runId: string): Promise<VerificationCheck[]>;
export declare function listRunsByRelease(releaseId: string): Promise<VerificationRun[]>;

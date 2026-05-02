import type { CutoverPlan } from '../contracts/delivery.types';
export type CutoverStatus = 'planned' | 'in_progress' | 'completed' | 'aborted' | 'rolled_back';
export interface CutoverExecution {
    executionId: string;
    cutoverId: string;
    releaseId: string;
    status: CutoverStatus;
    currentCheckpoint: string | null;
    passedCheckpoints: string[];
    noGoTriggered: boolean;
    noGoReason: string | null;
    executedBy: string;
    startedAt: string;
    completedAt: string | null;
    abortedAt: string | null;
    notes: string | null;
}
export declare function createCutoverPlan(input: {
    releaseId: string;
    scope: string;
    owner: string;
    executionSequence: string[];
    checkpoints: string[];
    noGoCriteria: string[];
    rollbackTriggers: string[];
    communicationPath: string;
    monitoringWindowMinutes?: number;
}): Promise<CutoverPlan>;
export declare function getCutoverPlan(cutoverId: string): Promise<CutoverPlan | null>;
export declare function getCutoverPlanByRelease(releaseId: string): Promise<CutoverPlan | null>;
export declare function startCutover(cutoverId: string, executedBy: string): Promise<CutoverExecution>;
export declare function advanceCutoverCheckpoint(executionId: string, checkpoint: string): Promise<void>;
export declare function completeCutover(executionId: string, notes?: string): Promise<void>;
export declare function abortCutover(executionId: string, reason: string): Promise<void>;
export declare function getCutoverExecution(executionId: string): Promise<CutoverExecution | null>;
export declare function listCutoverExecutionsByRelease(releaseId: string): Promise<CutoverExecution[]>;

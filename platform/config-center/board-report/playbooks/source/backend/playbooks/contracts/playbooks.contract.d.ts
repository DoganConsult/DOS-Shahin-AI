export interface PlaybookTemplateContract {
    templateId: string;
    name: string;
    version: number;
    status: string;
    triggeringEventsJson: string[];
    createdAt: string;
    updatedAt: string;
}
export interface PlaybookStepContract {
    stepId: string;
    templateId: string;
    stepOrder: number;
    title: string;
    instructionsMd: string | null;
    isAutomated: boolean;
    requiredRole: string | null;
    createdAt: string;
}
export interface PlaybookExecutionContract {
    executionId: string;
    templateId: string;
    triggerSourceEntity: string | null;
    status: string;
    startedAt: string;
    completedAt: string | null;
    updatedAt: string;
}
export interface PlaybookExecutionLogContract {
    logId: string;
    executionId: string;
    stepId: string;
    actedByUserId: string | null;
    resultData: Record<string, unknown>;
    createdAt: string;
}

import { PlaybookTemplateContract, PlaybookStepContract, PlaybookExecutionContract, PlaybookExecutionLogContract } from '../contracts/playbooks.contract';
export declare function createTemplate(tenantId: string, userId: string, data: {
    name: string;
    triggeringEventsJson?: string[];
}): Promise<PlaybookTemplateContract>;
export declare function addStep(tenantId: string, userId: string, templateId: string, data: {
    stepOrder: number;
    title: string;
    instructionsMd?: string;
    isAutomated?: boolean;
    requiredRole?: string;
}): Promise<PlaybookStepContract>;
export declare function getTemplateDetailed(tenantId: string, templateId: string): Promise<{
    template: PlaybookTemplateContract;
    steps: PlaybookStepContract[];
}>;
export declare function executePlaybook(tenantId: string, userId: string, templateId: string, triggerSourceEntity?: string): Promise<PlaybookExecutionContract>;
export declare function logExecutionStep(tenantId: string, executionId: string, userId: string, data: {
    stepId: string;
    resultData?: any;
}): Promise<PlaybookExecutionLogContract>;
export declare function completeExecution(tenantId: string, executionId: string, userId: string): Promise<void>;

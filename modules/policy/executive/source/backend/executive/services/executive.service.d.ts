import { ExecutiveBriefContract, ExecutiveObjectiveContract, ExecutiveRiskAppetiteContract } from '../contracts/executive.contract';
export declare function createBrief(tenantId: string, userId: string, data: {
    title: string;
    referenceDate?: string;
    generationMethod?: string;
}): Promise<ExecutiveBriefContract>;
export declare function listBriefs(tenantId: string): Promise<ExecutiveBriefContract[]>;
export declare function approveBrief(tenantId: string, briefId: string, userId: string, status: string): Promise<ExecutiveBriefContract>;
export declare function createObjective(tenantId: string, userId: string, data: {
    title: string;
    description?: string;
    parentId?: string;
    targetKpi?: string;
    targetValue?: number;
    ownerUserId?: string;
    dueDate?: string;
}): Promise<ExecutiveObjectiveContract>;
export declare function listObjectives(tenantId: string): Promise<ExecutiveObjectiveContract[]>;
export declare function updateObjective(tenantId: string, objectiveId: string, userId: string, data: {
    title?: string;
    currentValue?: number;
    targetValue?: number;
    progressPct?: number;
    status?: string;
}): Promise<ExecutiveObjectiveContract>;
export declare function createAppetite(tenantId: string, userId: string, data: {
    domainCategory: string;
    quantitativeLimit?: number;
    qualitativeLimitDesc?: string;
}): Promise<ExecutiveRiskAppetiteContract>;
export declare function listAppetites(tenantId: string): Promise<ExecutiveRiskAppetiteContract[]>;
export declare function evaluateAppetiteBreaches(tenantId: string): Promise<{
    totalDomains: number;
    breachedDomains: number;
    breaches: ExecutiveRiskAppetiteContract[];
}>;
export declare function runDiagnostics(tenantId: string): Promise<{
    status: string;
    checks: Record<string, unknown>[];
}>;

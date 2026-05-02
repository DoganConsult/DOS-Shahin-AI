export declare function orchestratedAssessRisk(tenantId: string, riskId: string, runId?: string): Promise<unknown>;
export declare function orchestratedAnalyzeGap(tenantId: string, frameworkId: string, runId?: string): Promise<unknown>;
export declare function orchestratedGeneratePolicy(tenantId: string, params: {
    frameworkId: string;
    policyType: string;
    orgProfile?: any;
}, runId?: string): Promise<unknown>;
export declare function orchestratedPrepareAudit(tenantId: string, frameworkId: string, runId?: string): Promise<unknown>;
export declare function orchestratedTriageIncident(tenantId: string, incidentId: string, runId?: string): Promise<unknown>;
export declare function orchestratedAnalyzeRegulatoryChange(tenantId: string, instrumentId: string, runId?: string): Promise<unknown>;
export declare function orchestratedAutoClassifyRisk(riskData: {
    title?: string;
    description?: string;
    category?: string;
}, tenantId: string, runId?: string): Promise<unknown>;
export declare function orchestratedAutoClassifyIncident(incidentData: {
    title?: string;
    description?: string;
    category?: string;
}, tenantId: string, runId?: string): Promise<unknown>;
export declare function orchestratedGetProactiveInsights(tenantId: string): Promise<Record<string, unknown>[]>;

export declare const ANALYTICS_AI_CONFIG: {
    readonly moduleCode: "analytics";
    readonly enabled: true;
    readonly allowedActions: readonly ["analytics.report.draft", "analytics.report.recommend", "analytics.report.summarize", "analytics.report.classify", "analytics.report.score", "analytics.report.analyze", "analytics.report.generate_report"];
    readonly blockedActions: readonly ["analytics.report.delete", "analytics.report.approve", "analytics.report.reject", "analytics.report.override", "analytics.report.bulk_delete"];
    readonly humanInLoopBoundaries: {
        readonly requiresHumanApproval: readonly ["analytics.report.approve", "analytics.report.reject", "analytics.report.delete"];
        readonly requiresHumanReview: readonly ["analytics.report.classify", "analytics.report.score"];
        readonly autoExecutable: readonly ["analytics.report.draft", "analytics.report.summarize", "analytics.report.analyze"];
    };
    readonly modelDependencies: {
        readonly primary: "azure-openai";
        readonly fallback: "ollama-llama3";
        readonly embeddingModel: "text-embedding-3-small";
    };
    readonly promptContracts: {
        readonly maxInputTokens: 8000;
        readonly maxOutputTokens: 4000;
        readonly temperature: 0.3;
        readonly systemPromptTemplate: "analytics_system_prompt_v1";
    };
    readonly safetyHooks: {
        readonly inputValidation: true;
        readonly outputValidation: true;
        readonly promptInjectionProtection: true;
        readonly piiRedaction: true;
        readonly auditAllInvocations: true;
        readonly maxInvocationsPerHour: 100;
        readonly rateLimitPerTenant: 50;
    };
};
export declare function isAnalyticsAiActionAllowed(action: string): boolean;
export declare function isAnalyticsAiActionBlocked(action: string): boolean;
export declare function requiresAnalyticsHumanApproval(action: string): boolean;
export declare function summarize(tenantId: string, entityId: string): Promise<{
    summary: string;
    keyPoints: string[];
    confidence: number;
}>;
export declare function classify(tenantId: string, entityId: string, _data?: Record<string, unknown>): Promise<{
    category: string;
    confidence: number;
    reasoning: string;
}>;
export declare function recommendActions(tenantId: string, entityId: string): Promise<{
    recommendations: Array<{
        action: string;
        priority: string;
        reasoning: string;
    }>;
    generatedAt: string;
}>;
export declare function generateReport(tenantId: string, filters?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
}): Promise<{
    totalCount: number;
    byStatus: Record<string, number>;
    insights: string[];
    generatedAt: string;
}>;

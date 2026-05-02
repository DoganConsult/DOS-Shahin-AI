export declare const ACTION_AI_CONFIG: {
    readonly moduleCode: "action";
    readonly enabled: true;
    readonly allowedActions: readonly ["action.item.draft", "action.item.recommend", "action.item.summarize", "action.item.classify", "action.item.score", "action.item.analyze", "action.item.generate_report"];
    readonly blockedActions: readonly ["action.item.delete", "action.item.approve", "action.item.reject", "action.item.override", "action.item.bulk_delete"];
    readonly humanInLoopBoundaries: {
        readonly requiresHumanApproval: readonly ["action.item.approve", "action.item.reject", "action.item.delete"];
        readonly requiresHumanReview: readonly ["action.item.classify", "action.item.score"];
        readonly autoExecutable: readonly ["action.item.draft", "action.item.summarize", "action.item.analyze"];
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
        readonly systemPromptTemplate: "action_system_prompt_v1";
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
export declare function isActionAiActionAllowed(action: string): boolean;
export declare function isActionAiActionBlocked(action: string): boolean;
export declare function requiresActionHumanApproval(action: string): boolean;
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

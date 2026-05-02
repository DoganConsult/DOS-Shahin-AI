export declare const ASSET_AI_CONFIG: {
    readonly moduleCode: "asset";
    readonly enabled: true;
    readonly allowedActions: readonly ["asset.record.draft", "asset.record.recommend", "asset.record.summarize", "asset.record.classify", "asset.record.score", "asset.record.analyze", "asset.record.generate_report"];
    readonly blockedActions: readonly ["asset.record.delete", "asset.record.approve", "asset.record.reject", "asset.record.override", "asset.record.bulk_delete"];
    readonly humanInLoopBoundaries: {
        readonly requiresHumanApproval: readonly ["asset.record.approve", "asset.record.reject", "asset.record.delete"];
        readonly requiresHumanReview: readonly ["asset.record.classify", "asset.record.score"];
        readonly autoExecutable: readonly ["asset.record.draft", "asset.record.summarize", "asset.record.analyze"];
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
        readonly systemPromptTemplate: "asset_system_prompt_v1";
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
export declare function isAssetAiActionAllowed(action: string): boolean;
export declare function isAssetAiActionBlocked(action: string): boolean;
export declare function requiresAssetHumanApproval(action: string): boolean;
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

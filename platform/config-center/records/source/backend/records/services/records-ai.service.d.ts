export declare const RECORDS_AI_CONFIG: {
    readonly moduleCode: "records";
    readonly enabled: true;
    readonly allowedActions: readonly ["records.entry.draft", "records.entry.recommend", "records.entry.summarize", "records.entry.classify", "records.entry.score", "records.entry.analyze", "records.entry.generate_report"];
    readonly blockedActions: readonly ["records.record.delete", "records.record.approve", "records.entry.reject", "records.entry.override", "records.entry.bulk_delete"];
    readonly humanInLoopBoundaries: {
        readonly requiresHumanApproval: readonly ["records.record.approve", "records.entry.reject", "records.record.delete"];
        readonly requiresHumanReview: readonly ["records.entry.classify", "records.entry.score"];
        readonly autoExecutable: readonly ["records.entry.draft", "records.entry.summarize", "records.entry.analyze"];
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
        readonly systemPromptTemplate: "records_system_prompt_v1";
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
export declare function isRecordsAiActionAllowed(action: string): boolean;
export declare function isRecordsAiActionBlocked(action: string): boolean;
export declare function requiresRecordsHumanApproval(action: string): boolean;
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

export interface AgentInvocationRequest {
    agentCode: string;
    prompt: string;
    threadId?: string;
    tenantId: string;
    userId: string;
}
export interface ProviderState {
    id: string;
    provider_name: string;
    is_active: boolean;
    base_endpoint?: string;
    routing_priority: number;
    configuration_json: Record<string, unknown>;
    updated_at: string;
}
export interface AgentExecutionStatus {
    execution_id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: Record<string, unknown>;
    error_message?: string;
}
export type AiNullable<T> = T | null;
export interface AiAssistantSuggestion {
    id: string;
    type: 'filter' | 'sort' | 'alert' | 'action' | 'view' | 'column';
    label: string;
    description?: string;
    field?: string;
    value?: unknown;
    order?: number;
    severity: 'info' | 'success' | 'warning' | 'danger';
    confidence: number;
    icon?: string;
    message?: string;
    action?: string;
}
export interface AiAssistantQueryResult {
    query: string;
    interpreted: string;
    filters: Record<string, unknown>;
    sort: {
        field: string;
        order: 'asc' | 'desc';
    } | null;
    confidence: number;
}
export interface AiAssistantClassification {
    category: string;
    confidence: number;
    suggestedTags: string[];
    suggestedOwners: string[];
    suggestedPriority: 'low' | 'medium' | 'high' | 'critical';
    explanation: string;
}
export interface AiAssistantPrediction {
    field: string;
    predictedValue: unknown;
    confidence: number;
    alternatives: {
        value: unknown;
        confidence: number;
    }[];
    reasoning: string;
}
export interface AiAssistantAnomaly {
    id: string;
    type: 'outlier' | 'trend-break' | 'missing-pattern' | 'spike' | 'drop';
    field: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
    confidence: number;
    affectedItemIds?: string[];
    timestamp: string;
}
export interface AiAssistantEmptyStateAnalysis {
    recommendation: string;
    suggestedActions: string[];
}
export interface AiAssistantComposeResponse {
    suggestion: string | null;
}
export interface AiAssistantImproveResponse {
    improved: string | null;
}

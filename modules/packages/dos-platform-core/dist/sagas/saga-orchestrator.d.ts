export type SagaStatus = 'pending' | 'running' | 'completed' | 'compensating' | 'failed' | 'compensated';
export type StepStatus = 'pending' | 'running' | 'completed' | 'compensating' | 'compensated' | 'failed';
export interface SagaContext {
    sagaId: string;
    tenantId: string;
    correlationId: string;
    data: Record<string, unknown>;
    startedAt: string;
}
export interface SagaStepDefinition<TCtx extends SagaContext = SagaContext> {
    name: string;
    execute: (ctx: TCtx) => Promise<void>;
    compensate: (ctx: TCtx) => Promise<void>;
    retryPolicy?: {
        maxAttempts: number;
        backoffMs: number;
        backoffMultiplier: number;
    };
    timeoutMs?: number;
}
export interface SagaStepResult {
    stepName: string;
    status: StepStatus;
    startedAt: string;
    completedAt?: string;
    error?: string;
    attemptCount: number;
}
export interface SagaResult {
    sagaId: string;
    sagaName: string;
    status: SagaStatus;
    steps: SagaStepResult[];
    context: SagaContext;
    startedAt: string;
    completedAt?: string;
    error?: string;
    durationMs: number;
}
export interface SagaDefinition<TCtx extends SagaContext = SagaContext> {
    name: string;
    steps: SagaStepDefinition<TCtx>[];
    onComplete?: (ctx: TCtx) => Promise<void>;
    onFailed?: (ctx: TCtx, error: Error) => Promise<void>;
    onCompensated?: (ctx: TCtx) => Promise<void>;
    timeoutMs?: number;
}
export interface SagaOrchestratorOptions {
    onStepStart?: (sagaId: string, stepName: string) => void;
    onStepComplete?: (sagaId: string, stepName: string) => void;
    onStepFailed?: (sagaId: string, stepName: string, error: Error) => void;
    onCompensationStart?: (sagaId: string, stepName: string) => void;
    onCompensationComplete?: (sagaId: string, stepName: string) => void;
    onCompensationFailed?: (sagaId: string, stepName: string, error: Error) => void;
}
export declare class SagaOrchestrator {
    private activeSagas;
    private options;
    constructor(options?: SagaOrchestratorOptions);
    execute<TCtx extends SagaContext>(definition: SagaDefinition<TCtx>, initialData: {
        tenantId: string;
        correlationId?: string;
        data?: Record<string, unknown>;
    }): Promise<SagaResult>;
    private executeStep;
    private compensate;
    private withTimeout;
    getActiveSaga(sagaId: string): SagaResult | undefined;
    getActiveSagas(): SagaResult[];
}

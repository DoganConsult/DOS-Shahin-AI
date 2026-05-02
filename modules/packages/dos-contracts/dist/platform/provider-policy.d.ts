export type TaskDeterminism = 'deterministic' | 'ai_enhanced' | 'ai_required';
export type FallbackBehavior = 'never' | 'graceful_degrade' | 'local_only' | 'skip_silently';
export interface ProviderPolicyEntry {
    task: string;
    domain: string;
    determinism: TaskDeterminism;
    fallbackBehavior: FallbackBehavior;
    description: string;
}
export declare const PROVIDER_POLICY_MATRIX: ProviderPolicyEntry[];
export declare function isDeterministicTask(task: string): boolean;
export declare function getTaskFallbackBehavior(task: string): FallbackBehavior;
export declare function getDeterministicTasks(): ProviderPolicyEntry[];
export declare function getAiEnhancedTasks(): ProviderPolicyEntry[];
export declare function validateProviderPolicyIntegrity(): string[];

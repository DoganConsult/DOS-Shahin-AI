export type { LifecycleDefinition, LifecycleTransition, TransitionCondition, LifecycleState, LifecycleHistoryEntry } from '@dos/contracts';
export interface LifecycleRegistry {
    register(definition: import('@dos/contracts').LifecycleDefinition): void;
    getDefinition(entityType: string): import('@dos/contracts').LifecycleDefinition | undefined;
    getAllDefinitions(): import('@dos/contracts').LifecycleDefinition[];
    validateTransition(entityType: string, from: string, to: string): {
        valid: boolean;
        reason?: string;
    };
}
export declare function setLifecycleRegistry(registry: LifecycleRegistry): void;
export declare function getLifecycleRegistry(): LifecycleRegistry;
export declare function registerLifecycleDefinition(definition: import('@dos/contracts').LifecycleDefinition): void;

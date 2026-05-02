export type { LifecycleDefinition, LifecycleTransition, TransitionCondition, LifecycleState, LifecycleHistoryEntry } from '@dos/contracts';

export interface LifecycleRegistry {
  register(definition: import('@dos/contracts').LifecycleDefinition): void;
  getDefinition(entityType: string): import('@dos/contracts').LifecycleDefinition | undefined;
  getAllDefinitions(): import('@dos/contracts').LifecycleDefinition[];
  validateTransition(entityType: string, from: string, to: string): { valid: boolean; reason?: string };
}

let _registry: LifecycleRegistry | null = null;

export function setLifecycleRegistry(registry: LifecycleRegistry): void {
  _registry = registry;
}

export function getLifecycleRegistry(): LifecycleRegistry {
  if (!_registry) {
    throw new Error('[DOS-SDK] LifecycleRegistry not initialized. Call setLifecycleRegistry() during platform startup.');
  }
  return _registry;
}

export function registerLifecycleDefinition(definition: import('@dos/contracts').LifecycleDefinition): void {
  getLifecycleRegistry().register(definition);
}

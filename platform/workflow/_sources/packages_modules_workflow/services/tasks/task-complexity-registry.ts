import { safeQuery } from "@dos/db";

export type ComplexityTier = 'low' | 'medium' | 'high' | 'critical';

const _registry = new Map<string, ComplexityTier>();

export function registerTaskComplexity(taskType: string, tier: ComplexityTier): void {
  _registry.set(taskType, tier);
}

export function getTaskComplexity(taskType: string): ComplexityTier | undefined {
  return _registry.get(taskType);
}

export function getAllTaskComplexities(): Map<string, ComplexityTier> {
  return new Map(_registry);
}

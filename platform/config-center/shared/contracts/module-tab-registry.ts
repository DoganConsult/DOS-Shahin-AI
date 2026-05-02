/**
 * Module Tab Registry
 *
 * Centralizes tab definitions so consuming modules can query tabs
 * without importing directly from the owning module's internals.
 *
 * Each module registers its tabs at init; consumers call getTabs().
 */
import type { ModuleTabVM } from '../models/module-overview.vm';

const _registry = new Map<string, ModuleTabVM[]>();

/** Register a module's tab definitions. Called once per module at init. */
export function registerModuleTabs(moduleCode: string, tabs: ModuleTabVM[]): void {
  _registry.set(moduleCode, Object.freeze([...tabs]) as ModuleTabVM[]);
}

/** Retrieve tab definitions for a module. Returns empty array if not registered. */
export function getModuleTabs(moduleCode: string): readonly ModuleTabVM[] {
  return _registry.get(moduleCode) ?? [];
}

/** Check if a module has registered tabs. */
export function hasModuleTabs(moduleCode: string): boolean {
  return _registry.has(moduleCode);
}

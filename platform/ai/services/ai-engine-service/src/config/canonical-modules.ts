/**
 * Canonical module registry — lists all registered AI engine modules.
 */
export interface CanonicalModule {
  code: string;
  name: string;
  description: string;
  category: 'governance' | 'compliance' | 'risk' | 'audit' | 'engine' | 'platform';
  enabled: boolean;
}

const _registry: CanonicalModule[] = [];

/**
 * Default AGRC module codes used by governance compliance workers.
 * TODO: implement — populate from registered canonical modules
 */
export const CANONICAL_AGRC_MODULE_CODES: string[] = [];

export function registerCanonicalModule(mod: CanonicalModule): void {
  const idx = _registry.findIndex(m => m.code === mod.code);
  if (idx >= 0) _registry[idx] = mod;
  else _registry.push(mod);
}

export function getCanonicalModules(): readonly CanonicalModule[] {
  return _registry;
}

export function getCanonicalModule(code: string): CanonicalModule | undefined {
  return _registry.find(m => m.code === code);
}

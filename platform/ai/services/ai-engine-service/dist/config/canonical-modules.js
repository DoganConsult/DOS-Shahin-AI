const _registry = [];
/**
 * Default AGRC module codes used by governance compliance workers.
 * TODO: implement — populate from registered canonical modules
 */
export const CANONICAL_AGRC_MODULE_CODES = [];
export function registerCanonicalModule(mod) {
    const idx = _registry.findIndex(m => m.code === mod.code);
    if (idx >= 0)
        _registry[idx] = mod;
    else
        _registry.push(mod);
}
export function getCanonicalModules() {
    return _registry;
}
export function getCanonicalModule(code) {
    return _registry.find(m => m.code === code);
}
//# sourceMappingURL=canonical-modules.js.map
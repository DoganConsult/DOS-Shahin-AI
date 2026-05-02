export async function discoverAndSeedAssets(_tenantId) {
    return { tenantId: _tenantId, timestamp: new Date().toISOString(), seeded: [], skipped: [], errors: [], summary: {} };
}
export function registerAiGovernanceSeedProvider(_code, _fn) { }
export function getRegisteredSeedProviders() { return new Map(); }
export function getCanonicalAgents() { return []; }
export function getCanonicalProviders() { return []; }
export function getCanonicalModels() { return []; }
export function getCanonicalWorkflows() { return []; }
export function getRuntimeToolDefinitions() { return []; }
export function buildCanonicalToolAssets() { return []; }
export function buildCanonicalPromptAssets() { return []; }
export function getAllowlistModels() { return []; }
export function getDefaultModelKey() { return ''; }
//# sourceMappingURL=ai-asset-discovery.service.js.map
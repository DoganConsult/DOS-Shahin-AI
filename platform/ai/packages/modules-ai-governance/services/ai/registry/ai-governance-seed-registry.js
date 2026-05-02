"use strict";
// Platform-reusable AI governance seed provider registry.
// Lightweight file with no database/service imports — safe for early-load registration.
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAiGovernanceSeedProvider = registerAiGovernanceSeedProvider;
exports.getAggregatedCatalog = getAggregatedCatalog;
exports.getRegisteredSeedProviders = getRegisteredSeedProviders;
const seedProviders = new Map();
function registerAiGovernanceSeedProvider(productCode, provider) {
    seedProviders.set(productCode, provider);
}
function getAggregatedCatalog() {
    const agents = [];
    const providers = [];
    const models = [];
    const tools = [];
    const toolAssets = [];
    const workflows = [];
    const prompts = [];
    const allowlistModels = [];
    let defaultModelKey = '';
    for (const [, providerFn] of seedProviders) {
        const catalog = providerFn();
        agents.push(...catalog.agents);
        providers.push(...catalog.providers);
        models.push(...catalog.models);
        tools.push(...catalog.tools);
        toolAssets.push(...catalog.toolAssets);
        workflows.push(...catalog.workflows);
        prompts.push(...catalog.prompts);
        allowlistModels.push(...catalog.allowlistModels);
        if (catalog.defaultModelKey && !defaultModelKey) {
            defaultModelKey = catalog.defaultModelKey;
        }
    }
    return { productCode: 'aggregated', agents, providers, models, tools, toolAssets, workflows, prompts, allowlistModels, defaultModelKey };
}
function getRegisteredSeedProviders() { return [...seedProviders.keys()]; }
//# sourceMappingURL=ai-governance-seed-registry.js.map
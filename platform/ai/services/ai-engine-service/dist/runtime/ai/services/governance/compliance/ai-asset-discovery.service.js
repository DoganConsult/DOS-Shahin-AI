// Platform-reusable AI governance discovery/seeding orchestration.
// Product-specific asset catalogs are registered via registerAiGovernanceSeedProvider()
// in ai-governance-seed-registry.ts.
// This file must NOT hardcode Shahin-specific agents, tools, prompts, or workflows.
import { upsertAsset } from './ai-asset-inventory.service';
import { getAggregatedCatalog } from '../../../../ai-governance/services/ai/registry/ai-governance-seed-registry';
import { toErrorMessage } from '@dos/module-sdk';
export { registerAiGovernanceSeedProvider, getRegisteredSeedProviders } from '../../../../ai-governance/services/ai/registry/ai-governance-seed-registry';
export async function discoverAndSeedAssets(tenantId) {
    const result = {
        tenantId,
        timestamp: new Date().toISOString(),
        seeded: [],
        skipped: [],
        errors: [],
        summary: { agents: 0, providers: 0, models: 0, tools: 0, workflows: 0, prompts: 0, total: 0 },
    };
    const catalog = getAggregatedCatalog();
    const allAssets = [
        ...catalog.agents,
        ...catalog.providers,
        ...catalog.models,
        ...catalog.toolAssets,
        ...catalog.workflows,
        ...catalog.prompts,
    ];
    for (const input of allAssets) {
        try {
            await upsertAsset(tenantId, input);
            result.seeded.push({ asset_type: input.asset_type, asset_key: input.asset_key, display_name: input.display_name });
            switch (input.asset_type) {
                case 'agent':
                    result.summary.agents++;
                    break;
                case 'provider':
                    result.summary.providers++;
                    break;
                case 'model':
                    result.summary.models++;
                    break;
                case 'tool':
                    result.summary.tools++;
                    break;
                case 'workflow':
                    result.summary.workflows++;
                    break;
                case 'prompt':
                    result.summary.prompts++;
                    break;
            }
        }
        catch (err) {
            result.errors.push({ asset_type: input.asset_type, asset_key: input.asset_key, error: toErrorMessage(err) });
        }
    }
    result.summary.total = result.seeded.length;
    return result;
}
export function getCanonicalAgents() { return [...getAggregatedCatalog().agents]; }
export function getCanonicalProviders() { return [...getAggregatedCatalog().providers]; }
export function getCanonicalModels() { return [...getAggregatedCatalog().models]; }
export function getCanonicalWorkflows() { return [...getAggregatedCatalog().workflows]; }
export function getRuntimeToolDefinitions() { return [...getAggregatedCatalog().tools]; }
export function buildCanonicalToolAssets() { return [...getAggregatedCatalog().toolAssets]; }
export function buildCanonicalPromptAssets() { return [...getAggregatedCatalog().prompts]; }
export function getAllowlistModels() { return [...getAggregatedCatalog().allowlistModels]; }
export function getDefaultModelKey() { return getAggregatedCatalog().defaultModelKey; }
//# sourceMappingURL=ai-asset-discovery.service.js.map
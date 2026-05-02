// Platform-reusable AI governance discovery/seeding orchestration.
// Product-specific asset catalogs are registered via registerAiGovernanceSeedProvider()
// in ai-governance-seed-registry.ts.
// This file must NOT hardcode Shahin-specific agents, tools, prompts, or workflows.

import { upsertAsset, type CreateAssetInput } from './ai-asset-inventory.service';
import { getAggregatedCatalog, getRegisteredSeedProviders as _getRegisteredSeedProviders } from '../../../../ai-governance/services/ai/registry/ai-governance-seed-registry';
import { toErrorMessage } from '@dos/module-sdk';
import { safeQuery } from "@dos/db";

export type { ToolSeedEntry, AllowlistModelEntry, AiGovernanceSeedCatalog } from '../../../../ai-governance/services/ai/registry/ai-governance-seed-registry';
export { registerAiGovernanceSeedProvider, getRegisteredSeedProviders } from '../../../../ai-governance/services/ai/registry/ai-governance-seed-registry';

export interface DiscoveryResult {
  tenantId: string;
  timestamp: string;
  seeded: { asset_type: string; asset_key: string; display_name: string }[];
  skipped: { asset_type: string; asset_key: string; reason: string }[];
  errors: { asset_type: string; asset_key: string; error: string }[];
  summary: {
    agents: number;
    providers: number;
    models: number;
    tools: number;
    workflows: number;
    prompts: number;
    total: number;
  };
}

export async function discoverAndSeedAssets(tenantId: string): Promise<DiscoveryResult> {
  const result: DiscoveryResult = {
    tenantId,
    timestamp: new Date().toISOString(),
    seeded: [],
    skipped: [],
    errors: [],
    summary: { agents: 0, providers: 0, models: 0, tools: 0, workflows: 0, prompts: 0, total: 0 },
  };

  const catalog = getAggregatedCatalog();

  const allAssets: CreateAssetInput[] = [
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
        case 'agent': result.summary.agents++; break;
        case 'provider': result.summary.providers++; break;
        case 'model': result.summary.models++; break;
        case 'tool': result.summary.tools++; break;
        case 'workflow': result.summary.workflows++; break;
        case 'prompt': result.summary.prompts++; break;
      }
    } catch (err: unknown) {
      result.errors.push({ asset_type: input.asset_type, asset_key: input.asset_key, error: toErrorMessage(err) });
    }
  }

  result.summary.total = result.seeded.length;
  return result;
}

export function getCanonicalAgents(): CreateAssetInput[] { return [...getAggregatedCatalog().agents]; }
export function getCanonicalProviders(): CreateAssetInput[] { return [...getAggregatedCatalog().providers]; }
export function getCanonicalModels(): CreateAssetInput[] { return [...getAggregatedCatalog().models]; }
export function getCanonicalWorkflows(): CreateAssetInput[] { return [...getAggregatedCatalog().workflows]; }
export function getRuntimeToolDefinitions() { return [...getAggregatedCatalog().tools]; }
export function buildCanonicalToolAssets(): CreateAssetInput[] { return [...getAggregatedCatalog().toolAssets]; }
export function buildCanonicalPromptAssets(): CreateAssetInput[] { return [...getAggregatedCatalog().prompts]; }
export function getAllowlistModels() { return [...getAggregatedCatalog().allowlistModels]; }
export function getDefaultModelKey(): string { return getAggregatedCatalog().defaultModelKey; }

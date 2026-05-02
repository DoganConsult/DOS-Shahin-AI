// Platform-reusable AI governance seed provider registry.
// Lightweight file with no database/service imports — safe for early-load registration.

import type { CreateAssetInput } from './ai-asset-inventory.service.js';
import { safeQuery } from "@dos/db";

export interface ToolSeedEntry { agent: string; name: string; privileged: boolean }

export interface AllowlistModelEntry { provider: string; model_id: string; asset_key: string }

export interface AiGovernanceSeedCatalog {
  productCode: string;
  agents: CreateAssetInput[];
  providers: CreateAssetInput[];
  models: CreateAssetInput[];
  tools: ToolSeedEntry[];
  toolAssets: CreateAssetInput[];
  workflows: CreateAssetInput[];
  prompts: CreateAssetInput[];
  allowlistModels: AllowlistModelEntry[];
  defaultModelKey: string;
}

type SeedProviderFn = () => AiGovernanceSeedCatalog;

const seedProviders = new Map<string, SeedProviderFn>();

export function registerAiGovernanceSeedProvider(productCode: string, provider: SeedProviderFn): void {
  seedProviders.set(productCode, provider);
}

export function getAggregatedCatalog(): AiGovernanceSeedCatalog {
  const agents: CreateAssetInput[] = [];
  const providers: CreateAssetInput[] = [];
  const models: CreateAssetInput[] = [];
  const tools: ToolSeedEntry[] = [];
  const toolAssets: CreateAssetInput[] = [];
  const workflows: CreateAssetInput[] = [];
  const prompts: CreateAssetInput[] = [];
  const allowlistModels: AllowlistModelEntry[] = [];
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

export function getRegisteredSeedProviders(): string[] { return [...seedProviders.keys()]; }

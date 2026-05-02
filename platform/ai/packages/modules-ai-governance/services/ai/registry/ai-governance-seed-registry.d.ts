import type { CreateAssetInput } from './ai-asset-inventory.service';
export interface ToolSeedEntry {
    agent: string;
    name: string;
    privileged: boolean;
}
export interface AllowlistModelEntry {
    provider: string;
    model_id: string;
    asset_key: string;
}
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
export declare function registerAiGovernanceSeedProvider(productCode: string, provider: SeedProviderFn): void;
export declare function getAggregatedCatalog(): AiGovernanceSeedCatalog;
export declare function getRegisteredSeedProviders(): string[];
export {};

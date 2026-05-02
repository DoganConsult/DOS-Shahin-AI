

export interface DiscoveryResult {
  tenantId: string;
  timestamp: string;
  seeded: { asset_type: string; asset_key: string; display_name: string }[];
  skipped: { asset_type: string; asset_key: string; reason: string }[];
  errors: { asset_type: string; asset_key: string; error: string }[];
  summary: Record<string, number>;
}

export interface ToolSeedEntry { agent: string; name: string; privileged: boolean }
export interface AllowlistModelEntry { provider: string; model_id: string; asset_key: string }
export interface AiGovernanceSeedCatalog {
  productCode: string;
  agents: any[];
  providers: any[];
  models: any[];
  tools: ToolSeedEntry[];
  toolAssets: any[];
  workflows: any[];
  prompts: any[];
  allowlistModels: AllowlistModelEntry[];
  defaultModelKey: string;
}

export async function discoverAndSeedAssets(_tenantId: string): Promise<DiscoveryResult> {
  return { tenantId: _tenantId, timestamp: new Date().toISOString(), seeded: [], skipped: [], errors: [], summary: {} };
}

export function registerAiGovernanceSeedProvider(_code: string, _fn: () => AiGovernanceSeedCatalog): void {}
export function getRegisteredSeedProviders(): Map<string, () => AiGovernanceSeedCatalog> { return new Map(); }
export function getCanonicalAgents(): any[] { return []; }
export function getCanonicalProviders(): any[] { return []; }
export function getCanonicalModels(): any[] { return []; }
export function getCanonicalWorkflows(): any[] { return []; }
export function getRuntimeToolDefinitions(): any[] { return []; }
export function buildCanonicalToolAssets(): any[] { return []; }
export function buildCanonicalPromptAssets(): any[] { return []; }
export function getAllowlistModels(): any[] { return []; }
export function getDefaultModelKey(): string { return ''; }

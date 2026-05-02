// Phase 11 (M5) — LLM provider registry shim. AI is disabled in Wave-1;
// this shim keeps reporting routes loadable without reaching a real LLM SDK.

export type LLMMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type FreeProvider =
  | 'groq'
  | 'gemini'
  | 'openrouter'
  | 'together'
  | 'cerebras'
  | 'mistral'
  | 'deepseek'
  | 'sambanova';

export type AnyProvider = 'auto' | 'claude' | 'azure-openai' | 'ollama' | 'free-first' | FreeProvider;

export interface FreeProviderConfig {
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface ClaudeConfig {
  apiKey: string;
  model: string;
}

export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  apiVersion: string;
  deploymentName?: string;
}

export interface OllamaConfig {
  endpoint: string;
  model: string;
}

export interface LLMCompletionResult {
  content: string;
  provider: string;
  model?: string;
  latencyMs?: number;
  tokensUsed?: number;
  tokens?: { input?: number; output?: number };
  text?: string;
}

export interface LLMConfig {
  provider: AnyProvider;
  enabled: boolean;
  maxTokens: number;
  claude?: ClaudeConfig;
  azure?: AzureOpenAIConfig;
  ollama?: OllamaConfig;
  freeProviders?: Partial<Record<FreeProvider, FreeProviderConfig>>;
  freeProviderOrder?: FreeProvider[];
}

export const DEFAULT_FREE_ORDER: FreeProvider[] = [
  'groq',
  'gemini',
  'openrouter',
  'together',
  'cerebras',
  'mistral',
  'deepseek',
  'sambanova',
];

export function buildFreeProvider(_name: FreeProvider, cfg?: unknown): FreeProviderConfig | null {
  const raw = (cfg ?? {}) as Record<string, unknown>;
  const enabled = raw.enabled === undefined ? true : Boolean(raw.enabled);
  const apiKey = typeof raw.apiKey === 'string' ? raw.apiKey : undefined;
  const baseUrl = typeof raw.baseUrl === 'string' ? raw.baseUrl : undefined;
  const model = typeof raw.model === 'string' ? raw.model : undefined;
  return { enabled, apiKey, baseUrl, model };
}

export async function callClaude(
  _messages: LLMMessage[],
  model: string,
  _maxTokens?: number,
): Promise<LLMCompletionResult> {
  return { content: '', text: '', provider: 'claude', model };
}

export async function callAzureOpenAI(
  cfg: AzureOpenAIConfig,
  _messages: LLMMessage[],
  _maxTokens?: number,
): Promise<LLMCompletionResult> {
  return { content: '', text: '', provider: 'azure-openai', model: cfg.deploymentName };
}

export async function callOllama(
  cfg: OllamaConfig,
  _messages: LLMMessage[],
  modelOverride?: string,
): Promise<LLMCompletionResult> {
  return { content: '', text: '', provider: 'ollama', model: modelOverride || cfg.model };
}

export async function callFreeProvider(
  provider: FreeProvider,
  cfg: FreeProviderConfig,
  _messages: LLMMessage[],
  _maxTokens?: number,
): Promise<LLMCompletionResult> {
  return { content: '', text: '', provider, model: cfg.model };
}

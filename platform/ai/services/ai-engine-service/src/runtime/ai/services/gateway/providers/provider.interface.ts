import { safeQuery } from "@dos/db";

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionResult {
  content: string;
  provider: string;
  model: string;
  tokensUsed?: number;
  latencyMs: number;
}

export type PremiumProvider = 'claude' | 'azure-openai';
export type FreeProvider = 'groq' | 'gemini' | 'openrouter' | 'together' | 'cerebras' | 'mistral' | 'deepseek' | 'sambanova';
export type LocalProvider = 'ollama';
export type MetaProvider = 'auto' | 'free-first' | 'premium-first';
export type AnyProvider = PremiumProvider | FreeProvider | LocalProvider | MetaProvider | 'openai' | 'lmstudio';

export interface FreeProviderConfig {
  apiKey: string;
  model: string;
  endpoint: string;
  enabled: boolean;
  maxTokens?: number;
  extraHeaders?: Record<string, string>;
}

export interface LLMConfig {
  provider: AnyProvider;
  claude?: { apiKey: string; model: string };
  azure?: { endpoint: string; apiKey: string; apiVersion: string; deploymentName?: string };
  ollama?: { endpoint: string; model: string };
  openai?: { endpoint: string; apiKey: string; model: string };
  freeProviders?: Partial<Record<FreeProvider, FreeProviderConfig>>;
  freeProviderOrder?: FreeProvider[];
  maxTokens: number;
  enabled: boolean;
}

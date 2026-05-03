import type { FreeProvider, FreeProviderConfig } from './provider.interface';
import { safeQuery } from "@dos/db";

export const DEFAULT_FREE_ORDER: FreeProvider[] = [
  'groq', 'gemini', 'openrouter', 'together',
  'cerebras', 'mistral', 'deepseek', 'sambanova',
];

export const FREE_PROVIDER_DEFAULTS: Record<FreeProvider, { endpoint: string; model: string }> = {
  groq:       { endpoint: 'https://api.groq.com/openai/v1/chat/completions',      model: 'llama-3.3-70b-versatile' },
  gemini:     { endpoint: 'https://generativelanguage.googleapis.com/v1beta',       model: 'gemini-2.0-flash' },
  openrouter: { endpoint: 'https://openrouter.ai/api/v1/chat/completions',          model: 'meta-llama/llama-3.3-70b-instruct:free' },
  together:   { endpoint: 'https://api.together.xyz/v1/chat/completions',           model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo' },
  cerebras:   { endpoint: 'https://api.cerebras.ai/v1/chat/completions',            model: 'llama-3.3-70b' },
  mistral:    { endpoint: 'https://api.mistral.ai/v1/chat/completions',             model: 'mistral-small-latest' },
  deepseek:   { endpoint: 'https://api.deepseek.com/v1/chat/completions',           model: 'deepseek-chat' },
  sambanova:  { endpoint: 'https://api.sambanova.ai/v1/chat/completions',           model: 'Meta-Llama-3.1-70B-Instruct' },
};

const ENV_KEY_MAP: Record<FreeProvider, string> = {
  groq:       'GROQ_API_KEY',
  gemini:     'GOOGLE_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  together:   'TOGETHER_API_KEY',
  cerebras:   'CEREBRAS_API_KEY',
  mistral:    'MISTRAL_API_KEY',
  deepseek:   'DEEPSEEK_API_KEY',
  sambanova:  'SAMBANOVA_API_KEY',
};

export function buildFreeProvider(name: FreeProvider, raw: unknown): FreeProviderConfig | undefined {
  const cfg = (raw ?? {}) as {
    apiKey?: string;
    model?: string;
    endpoint?: string;
    enabled?: boolean;
    maxTokens?: number;
    extraHeaders?: Record<string, string>;
  };
  const apiKey = cfg.apiKey || process.env[ENV_KEY_MAP[name]] || '';
  if (!apiKey) return undefined;
  const defaults = FREE_PROVIDER_DEFAULTS[name];
  return {
    apiKey,
    model: cfg.model || defaults.model,
    endpoint: cfg.endpoint || defaults.endpoint,
    enabled: cfg.enabled !== false,
    maxTokens: cfg.maxTokens,
    extraHeaders: cfg.extraHeaders,
  };
}

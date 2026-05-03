import * as http from 'http';
import * as https from 'https';
import { CLAUDE_MODEL, CLAUDE_MAX_TOKENS } from '../../ports/ai.port';
import { toErrorMessage } from '@dos/module-sdk';
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
export type AnyProvider = PremiumProvider | FreeProvider | LocalProvider | MetaProvider;

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
  freeProviders?: Partial<Record<FreeProvider, FreeProviderConfig>>;
  freeProviderOrder?: FreeProvider[];
  maxTokens: number;
  enabled: boolean;
}

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

export async function callClaude(
  messages: LLMMessage[],
  model: string,
  maxTokens: number,
): Promise<Omit<LLMCompletionResult, 'latencyMs'>> {
  const { getClaudeClient } = await import('../../../../config/claude-client');
  const client = getClaudeClient();

  const systemMessages = messages.filter(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const systemPrompt = systemMessages.map(m => m.content).join('\n\n');
  const apiMessages = chatMessages.length > 0
    ? chatMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
    : [{ role: 'user' as const, content: '(no user message)' }];

  const resp = await client.messages.create({
    model: model || CLAUDE_MODEL,
    max_tokens: maxTokens || CLAUDE_MAX_TOKENS,
    temperature: 0.3,
    system: systemPrompt || undefined,
    messages: apiMessages,
  });

  const block = resp.content[0];
  return {
    content: block.type === 'text' ? block.text : JSON.stringify(block),
    provider: 'claude',
    model: model || CLAUDE_MODEL,
    tokensUsed: (resp.usage?.input_tokens || 0) + (resp.usage?.output_tokens || 0),
  };
}

export function callAzureOpenAI(
  config: NonNullable<LLMConfig['azure']>,
  messages: LLMMessage[],
  maxTokens: number,
): Promise<Omit<LLMCompletionResult, 'latencyMs'>> {
  return new Promise((resolve, reject) => {
    const url = new URL(config.endpoint);
    const deploymentName = config.deploymentName || 'gpt-4o-mini';
    const path = `/openai/deployments/${deploymentName}/chat/completions?api-version=${config.apiVersion}`;

    const body = JSON.stringify({
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: maxTokens,
      temperature: 0.3,
    });

    const req = https.request(
      {
        hostname: url.hostname,
        port: 443,
        path,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': config.apiKey },
        timeout: 30000,
      },
      res => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              reject(new Error(toErrorMessage(parsed.error) || JSON.stringify(parsed.error)));
              return;
            }
            resolve({
              content: parsed.choices?.[0]?.message?.content || '',
              provider: 'azure-openai',
              model: deploymentName,
              tokensUsed: parsed.usage?.total_tokens,
            });
          } catch {
            reject(new Error('Failed to parse Azure OpenAI response'));
          }
        });
      },
    );

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Azure OpenAI request timed out')); });
    req.write(body);
    req.end();
  });
}

export function callOpenAICompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: LLMMessage[],
  maxTokens: number,
  providerName: string,
  extraHeaders?: Record<string, string>,
): Promise<Omit<LLMCompletionResult, 'latencyMs'>> {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);

    const body = JSON.stringify({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: maxTokens,
      temperature: 0.3,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    };

    const req = https.request(
      {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers,
        timeout: 45000,
      },
      res => {
        let data = '';
        res.on('data', (chunk: string) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              reject(new Error(`[${providerName}] ${toErrorMessage(parsed.error) || JSON.stringify(parsed.error)}`));
              return;
            }
            resolve({
              content: parsed.choices?.[0]?.message?.content || '',
              provider: providerName,
              model,
              tokensUsed: parsed.usage?.total_tokens,
            });
          } catch {
            reject(new Error(`[${providerName}] Failed to parse response`));
          }
        });
      },
    );

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`[${providerName}] Request timed out`)); });
    req.write(body);
    req.end();
  });
}

export function callGemini(
  apiKey: string,
  model: string,
  messages: LLMMessage[],
  maxTokens: number,
): Promise<Omit<LLMCompletionResult, 'latencyMs'>> {
  return new Promise((resolve, reject) => {
    const systemParts = messages
      .filter(m => m.role === 'system')
      .map(m => m.content)
      .join('\n\n');

    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const body = JSON.stringify({
      contents,
      systemInstruction: systemParts ? { parts: [{ text: systemParts }] } : undefined,
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
    });

    const path = `/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const req = https.request(
      {
        hostname: 'generativelanguage.googleapis.com',
        port: 443,
        path,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeout: 45000,
      },
      res => {
        let data = '';
        res.on('data', (chunk: string) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              reject(new Error(`[gemini] ${toErrorMessage(parsed.error) || JSON.stringify(parsed.error)}`));
              return;
            }
            const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const tokens =
              (parsed.usageMetadata?.promptTokenCount || 0) +
              (parsed.usageMetadata?.candidatesTokenCount || 0);
            resolve({ content, provider: 'gemini', model, tokensUsed: tokens || undefined });
          } catch {
            reject(new Error('[gemini] Failed to parse response'));
          }
        });
      },
    );

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('[gemini] Request timed out')); });
    req.write(body);
    req.end();
  });
}

export async function callFreeProvider(
  name: FreeProvider,
  cfg: FreeProviderConfig,
  messages: LLMMessage[],
  maxTokens: number,
): Promise<Omit<LLMCompletionResult, 'latencyMs'>> {
  if (name === 'gemini') {
    return callGemini(cfg.apiKey, cfg.model, messages, cfg.maxTokens || maxTokens);
  }
  return callOpenAICompatible(cfg.endpoint, cfg.apiKey, cfg.model, messages, cfg.maxTokens || maxTokens, name, cfg.extraHeaders);
}

export function callOllama(
  config: NonNullable<LLMConfig['ollama']>,
  messages: LLMMessage[],
  modelOverride?: string,
): Promise<Omit<LLMCompletionResult, 'latencyMs'>> {
  const selectedModel = modelOverride || config.model;
  return new Promise((resolve, reject) => {
    const url = new URL(config.endpoint);
    const body = JSON.stringify({
      model: selectedModel,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: false,
    });

    const req = http.request(
      {
        hostname: url.hostname,
        port: parseInt(url.port) || 11434,
        path: '/api/chat',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      },
      res => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ content: parsed.message?.content || '', provider: 'ollama', model: selectedModel, tokensUsed: parsed.eval_count });
          } catch {
            reject(new Error('Failed to parse Ollama response'));
          }
        });
      },
    );

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Ollama request timed out')); });
    req.write(body);
    req.end();
  });
}

import * as https from 'https';
import { toErrorMessage } from '@dos/module-sdk';
import type { LLMMessage, LLMCompletionResult, FreeProvider, FreeProviderConfig } from './provider.interface';
import { safeQuery } from "@dos/db";

export { DEFAULT_FREE_ORDER, FREE_PROVIDER_DEFAULTS, buildFreeProvider } from './llm-config';

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

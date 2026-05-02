/**
 * LM Studio / vLLM local provider.
 *
 * LM Studio and vLLM both expose an OpenAI-compatible /v1/chat/completions
 * endpoint. This provider reuses that shape with a dedicated config slot so
 * operators can run a local model concurrently with OpenAI/Claude.
 *
 * Env:
 *   LM_STUDIO_BASE_URL  (default http://localhost:1234/v1)
 *   LM_STUDIO_MODEL     (required: exact local model ID)
 *   LM_STUDIO_API_KEY   (optional; vLLM may require it)
 */

import * as http from 'http';
import * as https from 'https';
import { toErrorMessage } from '@dos/module-sdk';
import type { LLMMessage, LLMCompletionResult } from './provider.interface';

export interface LmStudioConfig {
  endpoint: string;
  model: string;
  apiKey?: string;
}

export function getLmStudioConfig(): LmStudioConfig | null {
  const endpoint = process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1';
  const model = process.env.LM_STUDIO_MODEL;
  if (!model) return null;
  return {
    endpoint,
    model,
    apiKey: process.env.LM_STUDIO_API_KEY,
  };
}

export function callLmStudioApi(
  config: LmStudioConfig,
  messages: LLMMessage[],
  maxTokens: number,
  overrideModel?: string,
): Promise<Omit<LLMCompletionResult, 'latencyMs'>> {
  const selectedModel = overrideModel || config.model;
  return new Promise((resolve, reject) => {
    let url: URL;
    try {
      url = new URL(config.endpoint);
    } catch {
      return reject(new Error('Invalid LM Studio endpoint URL'));
    }

    const body = JSON.stringify({
      model: selectedModel,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: maxTokens,
      temperature: 0.3,
      stream: false,
    });

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

    const isHttps = url.protocol === 'https:';
    const requestModule = isHttps ? https : http;
    const defaultPort = isHttps ? 443 : 80;

    const req = requestModule.request(
      {
        hostname: url.hostname,
        port: parseInt(url.port, 10) || defaultPort,
        path: url.pathname.endsWith('/chat/completions')
          ? url.pathname
          : `${url.pathname.replace(/\/$/, '')}/chat/completions`,
        method: 'POST',
        headers,
        timeout: 180000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              reject(
                new Error(`[lmstudio] ${toErrorMessage(parsed.error) || JSON.stringify(parsed.error)}`),
              );
              return;
            }
            resolve({
              content: parsed.choices?.[0]?.message?.content ?? '',
              provider: 'lmstudio',
              model: selectedModel,
              tokensUsed: parsed.usage?.total_tokens,
            });
          } catch {
            reject(new Error('[lmstudio] Failed to parse response'));
          }
        });
      },
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('[lmstudio] Request timed out'));
    });
    req.write(body);
    req.end();
  });
}

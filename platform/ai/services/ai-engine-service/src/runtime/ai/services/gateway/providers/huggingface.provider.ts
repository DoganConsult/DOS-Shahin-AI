/**
 * Hugging Face Inference API provider (draft — confirm before shipping).
 *
 * Targets the HF router chat-completion endpoint, which mirrors the OpenAI
 * /v1/chat/completions shape for accessible hosted models. Works for both
 * Inference-API-Serverless and Inference-Endpoints deployments.
 *
 * Env:
 *   HF_API_TOKEN        (required)
 *   HF_MODEL            (e.g. meta-llama/Llama-3.1-70B-Instruct)
 *   HF_BASE_URL         (default https://router.huggingface.co/v1)
 */

import * as https from 'https';
import { toErrorMessage } from '@dos/module-sdk';
import type { LLMMessage, LLMCompletionResult } from './provider.interface';

export interface HuggingFaceConfig {
  baseUrl: string;
  model: string;
  apiToken: string;
}

export function getHuggingFaceConfig(): HuggingFaceConfig | null {
  const token = process.env.HF_API_TOKEN;
  const model = process.env.HF_MODEL;
  if (!token || !model) return null;
  return {
    baseUrl: process.env.HF_BASE_URL || 'https://router.huggingface.co/v1',
    model,
    apiToken: token,
  };
}

export function callHuggingFaceApi(
  config: HuggingFaceConfig,
  messages: LLMMessage[],
  maxTokens: number,
  overrideModel?: string,
): Promise<Omit<LLMCompletionResult, 'latencyMs'>> {
  const selectedModel = overrideModel || config.model;
  return new Promise((resolve, reject) => {
    let url: URL;
    try {
      url = new URL(config.baseUrl);
    } catch {
      return reject(new Error('Invalid Hugging Face endpoint URL'));
    }
    const body = JSON.stringify({
      model: selectedModel,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: maxTokens,
      temperature: 0.3,
      stream: false,
    });
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiToken}`,
    };

    const req = https.request(
      {
        hostname: url.hostname,
        port: parseInt(url.port, 10) || 443,
        path: url.pathname.endsWith('/chat/completions')
          ? url.pathname
          : `${url.pathname.replace(/\/$/, '')}/chat/completions`,
        method: 'POST',
        headers,
        timeout: 120000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              reject(
                new Error(
                  `[huggingface] ${toErrorMessage(parsed.error) || JSON.stringify(parsed.error)}`,
                ),
              );
              return;
            }
            resolve({
              content: parsed.choices?.[0]?.message?.content ?? '',
              provider: 'huggingface',
              model: selectedModel,
              tokensUsed: parsed.usage?.total_tokens,
            });
          } catch {
            reject(new Error('[huggingface] Failed to parse response'));
          }
        });
      },
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('[huggingface] Request timed out'));
    });
    req.write(body);
    req.end();
  });
}

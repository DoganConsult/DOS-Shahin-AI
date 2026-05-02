import * as https from 'https';
import { toErrorMessage } from '@dos/module-sdk';
import type { LLMMessage, LLMCompletionResult, LLMConfig } from './provider.interface';
import { safeQuery } from "@dos/db";

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

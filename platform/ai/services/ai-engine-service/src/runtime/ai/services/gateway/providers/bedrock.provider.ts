/**
 * AWS Bedrock provider (draft — confirm before shipping).
 *
 * Uses Bedrock Runtime's InvokeModel REST shape via direct HTTPS + SigV4.
 * SigV4 signing is delegated to the optional `@aws-sdk/client-bedrock-runtime`
 * package when available; otherwise this provider is disabled at runtime.
 *
 * Env:
 *   AWS_REGION              (default us-east-1)
 *   BEDROCK_MODEL_ID        (e.g. anthropic.claude-3-5-sonnet-20241022-v2:0)
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 *   AWS_SESSION_TOKEN       (optional)
 */

import type { LLMMessage, LLMCompletionResult } from './provider.interface';

export interface BedrockConfig {
  region: string;
  modelId: string;
}

export function getBedrockConfig(): BedrockConfig | null {
  const modelId = process.env.BEDROCK_MODEL_ID;
  if (!modelId) return null;
  return {
    region: process.env.AWS_REGION || 'us-east-1',
    modelId,
  };
}

export async function callBedrockApi(
  config: BedrockConfig,
  messages: LLMMessage[],
  maxTokens: number,
  overrideModel?: string,
): Promise<Omit<LLMCompletionResult, 'latencyMs'>> {
  let client: any;
  try {
    // Dynamic import so the dependency is optional at build time.
    // Module name held in a runtime-only variable so tsc does not try to
    // resolve the type declarations for an optional peer dependency.
    const bedrockModuleName: string = '@aws-sdk/client-bedrock-runtime';
    const mod: any = await import(bedrockModuleName);
    client = new mod.BedrockRuntimeClient({ region: config.region });
    const selectedModel = overrideModel || config.modelId;

    // Anthropic-on-Bedrock shape; adjust if deployment targets a Titan/Llama model.
    const systemMsg = messages.find((m) => m.role === 'system')?.content ?? '';
    const nonSystem = messages.filter((m) => m.role !== 'system');
    const body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: maxTokens,
      temperature: 0.3,
      system: systemMsg || undefined,
      messages: nonSystem.map((m) => ({
        role: m.role,
        content: [{ type: 'text', text: m.content }],
      })),
    });

    const cmd = new mod.InvokeModelCommand({
      modelId: selectedModel,
      contentType: 'application/json',
      accept: 'application/json',
      body: new TextEncoder().encode(body),
    });
    const res = await client.send(cmd);
    const decoded = JSON.parse(new TextDecoder().decode(res.body));
    const content = decoded?.content?.[0]?.text ?? decoded?.completion ?? '';
    return {
      content,
      provider: 'bedrock',
      model: selectedModel,
      tokensUsed: decoded?.usage?.output_tokens,
    };
  } catch (err) {
    throw new Error(
      `[bedrock] Provider unavailable (install @aws-sdk/client-bedrock-runtime and set AWS credentials): ${(err as Error).message}`,
    );
  }
}

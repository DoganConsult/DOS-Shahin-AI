export interface GatewayJSONInput<T = unknown> {
  tenantId?: string;
  systemPrompt?: string;
  userMessage?: string;
  maxTokens?: number;
  temperature?: number;
  fallback?: T;
  [key: string]: unknown;
}

export async function gatewayJSON<T = unknown>(
  input: GatewayJSONInput<T> | string,
  _prompt?: string,
  _options: Record<string, unknown> = {},
): Promise<T> {
  if (typeof input === 'object' && input && 'fallback' in input) {
    return input.fallback as T;
  }

  return {} as T;
}
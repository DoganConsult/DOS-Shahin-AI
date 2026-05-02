export interface GatewayRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, unknown>;
}

export async function gatewayJSON<T = any>(
  _tenantId: string,
  _prompt: string,
  _opts: GatewayRequestOptions = {},
): Promise<T> {
  return {} as T;
}

export async function gatewayText(
  _tenantId: string,
  _prompt: string,
  _opts: GatewayRequestOptions = {},
): Promise<string> {
  return '';
}

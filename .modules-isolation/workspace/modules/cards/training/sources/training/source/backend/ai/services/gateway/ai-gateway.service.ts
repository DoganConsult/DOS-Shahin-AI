export interface GatewayRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function gatewayText(
  _tenantId: string,
  _prompt: string,
  _opts: GatewayRequestOptions = {},
): Promise<string> {
  return '';
}

export async function gatewayJSON<T = any>(
  _tenantId: string,
  _prompt: string,
  _opts: GatewayRequestOptions = {},
): Promise<T> {
  return {} as T;
}

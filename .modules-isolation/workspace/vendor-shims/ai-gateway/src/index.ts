// ISOLATION SHIM for @dos/ai-gateway
export interface AiRequest { prompt: string; context?: Record<string, unknown> }
export interface AiResponse { text: string; usage?: { promptTokens: number; completionTokens: number } }
export interface AiGatewayClient {
  invoke(req: AiRequest): Promise<AiResponse>;
}
export function createNoopAiGateway(): AiGatewayClient {
  return { async invoke(): Promise<AiResponse> { return { text: '' }; } };
}

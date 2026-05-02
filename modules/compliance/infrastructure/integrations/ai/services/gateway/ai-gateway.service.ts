// AI-off stub for compliance-controls-service Wave-1.
// Canonical AI gateway is not extracted into any module yet; enabling it
// requires Phase 10G (Compliance Agent certification) AND a flag flip of
// module.compliance_agent.enabled. Until then, these calls return a
// structured "ai.disabled" response so the compliance service never sends
// traffic to an external LLM or billing path in Wave-1.
//
// The real gateway (modules/<pkg>/source/backend/ai/gateway/ai-gateway.service.ts)
// must land before Phase 10G can pass. This stub is a safe no-op.

export interface GatewayRequestBase {
  prompt?: string;
  system?: string;
  context?: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
  [key: string]: unknown;
}

export interface GatewayJSONOptions<T> extends GatewayRequestBase {
  schema?: unknown;
  fallback?: T;
}

export interface GatewayCompleteOptions extends GatewayRequestBase {
  fallback?: string;
}

function disabledResponse<T>(fallback?: T): T {
  if (fallback !== undefined) return fallback;
  return {
    status: 'ai.disabled',
    reason: 'AI gateway not enabled in Wave-1 (module.compliance_agent.enabled=false)',
    findings: [],
    suggestions: [],
    summary: '',
    confidence: 0,
  } as unknown as T;
}

export async function gatewayJSON<T = unknown>(opts: GatewayJSONOptions<T>): Promise<T> {
  return disabledResponse<T>(opts?.fallback);
}

export async function gatewayComplete(opts: GatewayCompleteOptions): Promise<string> {
  if (opts?.fallback !== undefined) return opts.fallback;
  return '';
}

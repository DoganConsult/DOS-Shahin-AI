/**
 * AI port — outbound interface to whatever AI provider the host wires.
 *
 * Compliance does not embed model calls. Hosts bind a real adapter (Bedrock,
 * Azure OpenAI, internal RAG, etc.); the module narrows the surface to the
 * exact features we expose:
 *   - suggest         (suggestions for an entity / list view)
 *   - interpretQuery  (NL → structured filter for a list view)
 *   - classify        (tag a record against a taxonomy)
 *
 * Fail-closed: unbound throws.
 */

export interface AiSuggestion {
  id: string;
  title: string;
  rationale: string;
  confidence: number;
  evidence?: string[];
}

export interface AiSuggestInput {
  tenantId: string;
  actorId: string;
  scopeType: string;
  recordId?: string | null;
  context?: Record<string, unknown>;
}

export interface AiInterpretInput {
  tenantId: string;
  actorId: string;
  scopeType: string;
  query: string;
}

export interface AiInterpretResult {
  filter: Record<string, unknown>;
  explain: string;
  unparsed?: string;
}

export interface AiClassifyInput {
  tenantId: string;
  actorId: string;
  scopeType: string;
  text: string;
  taxonomy: string;
}

export interface AiClassifyResult {
  label: string;
  confidence: number;
  alternatives?: Array<{ label: string; confidence: number }>;
}

export interface AiGatewayJSONInput<T = unknown> {
  tenantId?: string;
  systemPrompt?: string;
  userMessage?: string;
  prompt?: string;
  context?: Record<string, unknown>;
  schema?: unknown;
  fallback?: T;
  maxTokens?: number;
  temperature?: number;
  [key: string]: unknown;
}

export interface AiGatewayCompleteInput {
  prompt: string;
  system?: string;
  context?: Record<string, unknown>;
  fallback?: string;
  maxTokens?: number;
  temperature?: number;
  [key: string]: unknown;
}

export interface AiPort {
  suggest(input: AiSuggestInput): Promise<AiSuggestion[]>;
  interpretQuery(input: AiInterpretInput): Promise<AiInterpretResult>;
  classify(input: AiClassifyInput): Promise<AiClassifyResult>;
  gatewayJSON<T = unknown>(input: AiGatewayJSONInput<T>): Promise<T>;
  gatewayComplete(tenantId: string, input: AiGatewayCompleteInput): Promise<string>;
}

const unbound = (name: string) => async () => {
  throw new Error(`[compliance] ai port not bound: bindAiPort() before using ${name}`);
};

const aiDisabled = <T>(fallback?: T): T => {
  if (fallback !== undefined) return fallback;
  return {
    status: 'ai.disabled',
    reason: 'AI gateway not bound (compliance ai.port). bindAiPort() to enable.',
    findings: [],
    suggestions: [],
    summary: '',
    confidence: 0,
  } as unknown as T;
};

let _impl: AiPort = {
  suggest: unbound('suggest') as AiPort['suggest'],
  interpretQuery: unbound('interpretQuery') as AiPort['interpretQuery'],
  classify: unbound('classify') as AiPort['classify'],
  async gatewayJSON<T = unknown>(input: AiGatewayJSONInput<T>): Promise<T> {
    return aiDisabled<T>(input?.fallback);
  },
  async gatewayComplete(_tenantId: string, input: AiGatewayCompleteInput): Promise<string> {
    return input?.fallback ?? '';
  },
};

export function bindAiPort(impl: Partial<AiPort>): void {
  _impl = { ..._impl, ...impl };
}
export function getAiPort(): AiPort { return _impl; }

// Legacy `claudeJSON` shim — used by ksa-regulatory services that pre-date
// the typed gatewayJSON interface. Forwards to `gatewayJSON` so behavior
// (ai-disabled fallback) is preserved without the caller knowing about ports.
export interface ClaudeJSONInput<T = unknown> {
  tenantId?: string;
  agentId?: string;
  decisionType?: string;
  systemPrompt?: string;
  userMessage?: string;
  prompt?: string;
  context?: Record<string, unknown>;
  schema?: unknown;
  fallback?: T;
  maxTokens?: number;
  temperature?: number;
  [key: string]: unknown;
}
export async function claudeJSON<T = unknown>(input: ClaudeJSONInput<T>): Promise<T> {
  return getAiPort().gatewayJSON<T>(input);
}

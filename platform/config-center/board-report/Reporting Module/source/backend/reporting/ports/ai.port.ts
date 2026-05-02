// Phase 11 (M5) — AI port stub. Reporting references an AI gateway for
// narrative/summary features that are NOT certified in Wave-1 (see the
// Phase 10G Compliance Agent disabled-state doc). Return `ai.disabled`
// shape so any consumer bails cleanly.

export interface AiGatewayResponse {
  status: string;
  reason?: string;
  summary?: string;
  findings?: unknown[];
  suggestions?: unknown[];
  confidence?: number;
}

export const CLAUDE_MODEL = 'claude';

export async function aiGenerate(_opts: Record<string, unknown> = {}): Promise<AiGatewayResponse> {
  return {
    status: 'ai.disabled',
    reason: 'AI gateway not enabled in Wave-1',
    summary: '',
    findings: [],
    suggestions: [],
    confidence: 0,
  };
}

export async function aiComplete(_opts: Record<string, unknown> = {}): Promise<string> {
  return '';
}

export interface AgentTrustScore {
  composite_trust_score: number;
  [key: string]: unknown;
}

export async function getAgentTrustScores(_tenantId: string): Promise<AgentTrustScore[]> {
  return [];
}
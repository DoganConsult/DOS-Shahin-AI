export interface RagContextChunk {
  id: string;
  text: string;
  score?: number;
}

export async function buildRAGContext(
  _tenantId: string,
  _agentId: string,
  _query: string,
  _k: number,
): Promise<RagContextChunk[]> {
  return [];
}

export function formatRAGForPrompt(chunks: RagContextChunk[]): string {
  if (!chunks.length) return '';
  return `RAG Context:\n` + chunks.map(c => `- ${c.text}`).join('\n');
}

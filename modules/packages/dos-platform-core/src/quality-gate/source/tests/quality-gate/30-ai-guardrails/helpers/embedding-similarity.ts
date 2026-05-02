export interface SimilarityComputerOptions {
  embeddingEndpoint?: string;
  apiKey?: string;
}

export interface SimilarityComputer {
  similarity(textA: string, textB: string): Promise<number>;
  cosineSimilarity(vecA: number[], vecB: number[]): number;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function tokenize(text: string): Map<string, number> {
  const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) ?? 0) + 1);
  }
  return freq;
}

function tfidfVector(text: string, vocabulary: string[]): number[] {
  const freq = tokenize(text);
  return vocabulary.map(term => freq.get(term) ?? 0);
}

function localSimilarity(textA: string, textB: string): number {
  const freqA = tokenize(textA);
  const freqB = tokenize(textB);
  const vocabulary = [...new Set([...freqA.keys(), ...freqB.keys()])];
  const vecA = tfidfVector(textA, vocabulary);
  const vecB = tfidfVector(textB, vocabulary);
  return cosineSimilarity(vecA, vecB);
}

async function fetchEmbedding(text: string, endpoint: string, apiKey: string): Promise<number[]> {
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ input: text, model: 'text-embedding-3-small' }),
  });
  if (!resp.ok) throw new Error(`Embedding API error: ${resp.status}`);
  const json = (await resp.json()) as { data?: Array<{ embedding: number[] }> };
  return json.data?.[0]?.embedding ?? [];
}

export function createSimilarityComputer(opts: SimilarityComputerOptions = {}): SimilarityComputer {
  const endpoint = opts.embeddingEndpoint ?? process.env['OPENAI_EMBEDDING_ENDPOINT'] ?? '';
  const apiKey = opts.apiKey ?? process.env['OPENAI_API_KEY'] ?? '';

  return {
    async similarity(textA: string, textB: string): Promise<number> {
      if (endpoint && apiKey) {
        try {
          const [vecA, vecB] = await Promise.all([
            fetchEmbedding(textA, endpoint, apiKey),
            fetchEmbedding(textB, endpoint, apiKey),
          ]);
          return cosineSimilarity(vecA, vecB);
        } catch {
          // fall back to local token-based similarity
        }
      }
      return localSimilarity(textA, textB);
    },

    cosineSimilarity(vecA: number[], vecB: number[]): number {
      return cosineSimilarity(vecA, vecB);
    },
  };
}

/**
 * Workflow AI memory shim.
 *
 * The canonical memory-store service lives deep inside the AI-OS engine package.
 * Rather than creating a long relative import chain, this module exposes a
 * minimal in-process shim with the same public surface. Replace the no-op
 * function bodies with real implementations once the AI-OS memory interface
 * is exposed via a @dos/ai-sdk package (Phase D milestone).
 */
export async function getMemory(..._args: any[]): Promise<any> { return null; }
export async function setMemory(..._args: any[]): Promise<void> {}
export async function searchMemory(..._args: any[]): Promise<any[]> { return []; }
export async function deleteMemory(..._args: any[]): Promise<void> {}
export async function getMemoryStats(..._args: any[]): Promise<any> { return { total: 0 }; }
export async function commitMemory(..._args: any[]): Promise<void> {}
export async function forgetMemory(..._args: any[]): Promise<void> {}

export async function embedText(text: string): Promise<number[]> {
  const host = process.env.OLLAMA_HOST;
  const model = process.env.OLLAMA_EMBED_MODEL;
  if (!host || !model) {
    throw new Error('Embedding not configured');
  }
  const { request } = await import('node:http');
  const [hostname, portStr] = host.split(':');
  const port = parseInt(portStr || '11434', 10);
  const body = JSON.stringify({ model, input: text.slice(0, 8000) });
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname,
        port,
        path: '/api/embed',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        timeout: 30_000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: string) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data) as any;
            const emb: number[] = parsed.embeddings?.[0] || [];
            if (!Array.isArray(emb) || emb.length === 0) {
              reject(new Error('Embedding response missing'));
              return;
            }
            resolve(emb);
          } catch (err) {
            reject(err);
          }
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('Embedding request timeout'));
    });
    req.write(body);
    req.end();
  });
}

export function vectorToSql(vec: number[]): string {
  return `[${vec.join(',')}]`;
}

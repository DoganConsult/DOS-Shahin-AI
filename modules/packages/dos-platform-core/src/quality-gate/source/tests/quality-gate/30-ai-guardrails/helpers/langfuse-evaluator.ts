export interface LangfuseEvaluatorOptions {
  publicKey?: string;
  secretKey?: string;
  baseUrl?: string;
  enabled?: boolean;
}

export interface EvaluationTrace {
  traceId: string;
  name: string;
  input: string;
  output: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface LangfuseEvaluator {
  trace(trace: EvaluationTrace): Promise<void>;
  score(traceId: string, name: string, value: number, comment?: string): Promise<void>;
  flush(): Promise<void>;
}

interface QueuedItem {
  type: 'trace-create' | 'score-create';
  body: Record<string, unknown>;
}

async function sendBatch(
  baseUrl: string,
  publicKey: string,
  secretKey: string,
  batch: QueuedItem[],
): Promise<void> {
  const credentials = Buffer.from(`${publicKey}:${secretKey}`).toString('base64');
  const resp = await fetch(`${baseUrl}/api/public/ingestion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({
      batch: batch.map(item => ({
        type: item.type,
        body: item.body,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      })),
    }),
  });
  if (!resp.ok) {
    throw new Error(`Langfuse API error: ${resp.status} ${await resp.text()}`);
  }
}

export function createLangfuseEvaluator(opts: LangfuseEvaluatorOptions = {}): LangfuseEvaluator {
  const publicKey = opts.publicKey ?? process.env['LANGFUSE_PUBLIC_KEY'] ?? '';
  const secretKey = opts.secretKey ?? process.env['LANGFUSE_SECRET_KEY'] ?? '';
  const baseUrl = opts.baseUrl ?? process.env['LANGFUSE_BASE_URL'] ?? 'https://cloud.langfuse.com';
  const enabled = opts.enabled ?? (publicKey !== '' && secretKey !== '');

  const queue: QueuedItem[] = [];

  return {
    async trace(trace: EvaluationTrace): Promise<void> {
      if (!enabled) return;
      queue.push({
        type: 'trace-create',
        body: {
          id: trace.traceId,
          name: trace.name,
          input: trace.input,
          output: trace.output,
          metadata: trace.metadata ?? {},
        },
      });
    },

    async score(traceId: string, name: string, value: number, comment?: string): Promise<void> {
      if (!enabled) return;
      queue.push({
        type: 'score-create',
        body: { traceId, name, value, comment },
      });
    },

    async flush(): Promise<void> {
      if (!enabled || queue.length === 0) return;
      const batch = [...queue];
      queue.length = 0;
      try {
        await sendBatch(baseUrl, publicKey, secretKey, batch);
      } catch (err) {
        console.warn('[LangfuseEvaluator] flush failed:', err instanceof Error ? err.message : String(err));
      }
    },
  };
}

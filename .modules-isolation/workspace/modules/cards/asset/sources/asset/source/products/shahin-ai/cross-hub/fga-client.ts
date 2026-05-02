// @ts-nocheck — cross-hub helper compiled outside the module's main rootDir.
//
// Production-grade OpenFGA HTTP client using global `fetch`. Avoids a
// hard dependency on the @openfga/sdk npm package (not present in the
// monorepo) while preserving the same `check`, `read`, and `write` ergonomics
// the privacy-gate consumes.
//
// Canonical env-var precedence:
//   OPENFGA_API_URL   > FGA_API_URL   > http://localhost:8080
//   OPENFGA_STORE_ID  > FGA_STORE_ID  > default-store
//   OPENFGA_MODEL_ID  > FGA_MODEL_ID  > undefined (latest)
// All four cross-hub fga-client stubs MUST resolve identically.

const apiUrl = process.env.OPENFGA_API_URL || process.env.FGA_API_URL || 'http://localhost:8080';
const storeId = process.env.OPENFGA_STORE_ID || process.env.FGA_STORE_ID || 'default-store';
const authorizationModelId = process.env.OPENFGA_MODEL_ID || process.env.FGA_MODEL_ID || undefined;

export interface FgaTuple {
  user: string;
  relation: string;
  object: string;
}

export interface CheckRequest {
  user: string;
  relation: string;
  object: string;
  contextualTuples?: { tuple_keys: FgaTuple[] };
}

export interface ReadRequest {
  tuple_key?: Partial<FgaTuple>;
  page_size?: number;
  continuation_token?: string;
}

export interface WriteRequest {
  writes?: { tuple_keys: FgaTuple[] };
  deletes?: { tuple_keys: FgaTuple[] };
}

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const url = `${apiUrl.replace(/\/$/, '')}/stores/${encodeURIComponent(storeId)}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const init: RequestInit = { method, headers };
  if (body !== undefined) init.body = JSON.stringify(body);
  const r = await fetch(url, init);
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`OpenFGA ${method} ${path} -> ${r.status}: ${text || r.statusText}`);
  }
  return (await r.json()) as T;
}

export const fgaClient = {
  /** Check whether `user` has `relation` to `object`. */
  async check(req: CheckRequest): Promise<{ allowed: boolean }> {
    return call('POST', '/check', {
      tuple_key: { user: req.user, relation: req.relation, object: req.object },
      authorization_model_id: authorizationModelId,
      contextual_tuples: req.contextualTuples,
    });
  },

  /** Read tuples matching the partial tuple key. */
  async read(req: ReadRequest = {}): Promise<{ tuples: Array<{ key: FgaTuple; timestamp: string }>; continuation_token?: string }> {
    return call('POST', '/read', {
      tuple_key: req.tuple_key,
      page_size: req.page_size,
      continuation_token: req.continuation_token,
    });
  },

  /** Apply a batch of writes / deletes. */
  async write(req: WriteRequest): Promise<{}> {
    return call('POST', '/write', {
      ...req,
      authorization_model_id: authorizationModelId,
    });
  },

  /** Expose the configured store/model for diagnostics. */
  config(): { apiUrl: string; storeId: string; authorizationModelId?: string } {
    return { apiUrl, storeId, authorizationModelId };
  },
};

const OPENSEARCH_URL = process.env['OPENSEARCH_URL'] || 'http://localhost:9200';
const OPENSEARCH_USER = process.env['OPENSEARCH_USER'] || '';
const OPENSEARCH_PASS = process.env['OPENSEARCH_PASS'] || '';

function getAuthHeader(): Record<string, string> {
  if (OPENSEARCH_USER && OPENSEARCH_PASS) {
    return { Authorization: `Basic ${Buffer.from(`${OPENSEARCH_USER}:${OPENSEARCH_PASS}`).toString('base64')}` };
  }
  return {};
}

async function osRequest<T>(
  path: string,
  method: string = 'GET',
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${OPENSEARCH_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getAuthHeader(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenSearch ${method} ${path} failed: ${response.status} ${text}`);
  }
  return response.json() as Promise<T>;
}

export interface SearchHit {
  _index: string;
  _id: string;
  _score: number;
  _source: Record<string, unknown>;
}

export interface SearchResponse {
  hits: {
    total: { value: number; relation: string };
    hits: SearchHit[];
  };
  took: number;
}

export async function search(
  index: string,
  query: Record<string, unknown>,
  options?: { size?: number; from?: number; sort?: Record<string, unknown>[] },
): Promise<SearchResponse> {
  const body: Record<string, unknown> = { query };
  if (options?.size !== undefined) body.size = options.size;
  if (options?.from !== undefined) body.from = options.from;
  if (options?.sort) body.sort = options.sort;
  return osRequest<SearchResponse>(`/${index}/_search`, 'POST', body);
}

export async function createIndex(
  index: string,
  settings?: Record<string, unknown>,
  mappings?: Record<string, unknown>,
): Promise<{ acknowledged: boolean; index: string }> {
  const body: Record<string, unknown> = {};
  if (settings) body.settings = settings;
  if (mappings) body.mappings = mappings;
  return osRequest(`/${index}`, 'PUT', Object.keys(body).length ? body : undefined);
}

export async function bulkIndex(
  index: string,
  documents: Array<{ id?: string; document: Record<string, unknown> }>,
): Promise<{ errors: boolean; items: unknown[] }> {
  const lines: string[] = [];
  for (const { id, document } of documents) {
    const action = id
      ? JSON.stringify({ index: { _index: index, _id: id } })
      : JSON.stringify({ index: { _index: index } });
    lines.push(action);
    lines.push(JSON.stringify(document));
  }
  const body = lines.join('\n') + '\n';
  const response = await fetch(`${OPENSEARCH_URL}/_bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-ndjson', ...getAuthHeader() },
    body,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenSearch bulk failed: ${response.status} ${text}`);
  }
  return response.json() as Promise<{ errors: boolean; items: unknown[] }>;
}

export async function indexDocument(
  index: string,
  id: string,
  document: Record<string, unknown>,
): Promise<{ _id: string; result: string }> {
  return osRequest(`/${index}/_doc/${encodeURIComponent(id)}`, 'PUT', document);
}

export async function deleteDocument(
  index: string,
  id: string,
): Promise<{ _id: string; result: string }> {
  return osRequest(`/${index}/_doc/${encodeURIComponent(id)}`, 'DELETE');
}

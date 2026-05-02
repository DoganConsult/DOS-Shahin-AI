import { toErrorMessage } from '../resilience';
import { logger } from '../observability';
import { getPool } from '@dos/db';
import { catchHandler, EC } from '../resilience';

const SAFE_TABLE_RE = /^[a-z][a-z0-9_]{0,62}$/;
const SAFE_KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;

function assertSafeTableName(name: string): void {
  if (!SAFE_TABLE_RE.test(name)) {
    throw new Error(`Invalid vector table name: ${name}`);
  }
}

function assertSafeKey(key: string): void {
  if (!SAFE_KEY_RE.test(key)) {
    throw new Error(`Invalid filter key: ${key}`);
  }
}

export interface VectorDocument {
  id: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
}

export interface VectorSearchResult {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export const DEFAULT_EMBEDDING_DIM = 1536;

export async function ensureVectorTable(
  tableName: string,
  dimensions: number = DEFAULT_EMBEDDING_DIM,
): Promise<void> {
  assertSafeTableName(tableName);
  if (!Number.isInteger(dimensions) || dimensions < 1 || dimensions > 4096) {
    throw new Error(`Invalid vector dimensions: ${dimensions}`);
  }
  try {
    const pool = getPool();
    // secrets-scan-allow: tableName validated by assertSafeTableName, dimensions integer-bounded
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        embedding vector(${dimensions}),
        metadata JSONB DEFAULT '{}',
        tenant_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    // secrets-scan-allow: tableName validated by assertSafeTableName
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_${tableName}_embedding
      ON ${tableName} USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
    `).catch(catchHandler(EC.EVENT_BUS));
    // secrets-scan-allow: tableName validated by assertSafeTableName
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_${tableName}_tenant
      ON ${tableName} (tenant_id)
    `).catch(catchHandler(EC.EVENT_BUS));
  } catch (err: unknown) {
    logger.error(`[VectorStore] ensureVectorTable failed: ${toErrorMessage(err)}`);
  }
}

export async function upsertVectors(
  tenantId: string,
  tableName: string,
  docs: VectorDocument[],
): Promise<number> {
  assertSafeTableName(tableName);
  if (docs.length === 0) return 0;

  try {
    const pool = getPool();
    let inserted = 0;
    for (const doc of docs) {
      if (!doc.embedding || doc.embedding.length === 0) continue;
      const embStr = `[${doc.embedding.join(',')}]`;
      await pool.query(
        `INSERT INTO ${tableName} (id, content, embedding, metadata, tenant_id)
         VALUES ($1, $2, $3::vector, $4, $5)
         ON CONFLICT (id) DO UPDATE SET content = $2, embedding = $3::vector, metadata = $4
         WHERE ${tableName}.tenant_id = $5`,
        [doc.id, doc.content, embStr, JSON.stringify(doc.metadata), tenantId],
      );
      inserted++;
    }
    return inserted;
  } catch (err: unknown) {
    logger.error(`[VectorStore] upsertVectors failed: ${toErrorMessage(err)}`);
    return 0;
  }
}

export async function searchVectors(
  tenantId: string,
  tableName: string,
  queryEmbedding: number[],
  topK: number = 10,
  filter?: Record<string, unknown>,
): Promise<VectorSearchResult[]> {
  assertSafeTableName(tableName);
  try {
    const pool = getPool();
    const embStr = `[${queryEmbedding.join(',')}]`;

    const conditions: string[] = [`tenant_id = $3`];
    const params: unknown[] = [embStr, topK, tenantId];
    if (filter) {
      Object.entries(filter).forEach(([key, value], i) => {
        assertSafeKey(key);
        params.push(JSON.stringify(value));
        conditions.push(`metadata->>'${key}' = $${i + 4}`);
      });
    }
    const filterClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await pool.query(
      `SELECT id, content, metadata, 1 - (embedding <=> $1::vector) AS similarity
       FROM ${tableName}
       ${filterClause}
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      params,
    );

    return result.rows.map((r: Record<string, any>) => ({
      id: r.id as string,
      content: r.content as string,
      metadata: r.metadata as Record<string, unknown>,
      similarity: parseFloat(String(r.similarity)),
    }));
  } catch (err: unknown) {
    logger.error(`[VectorStore] searchVectors failed: ${toErrorMessage(err)}`);
    return [];
  }
}

export async function deleteVectors(tenantId: string, tableName: string, ids: string[]): Promise<number> {
  assertSafeTableName(tableName);
  if (ids.length === 0) return 0;
  try {
    const pool = getPool();
    const result = await pool.query(
      `DELETE FROM ${tableName} WHERE id = ANY($1) AND tenant_id = $2`,
      [ids, tenantId],
    );
    return result.rowCount ?? 0;
  } catch (err: unknown) {
    logger.error(`[VectorStore] deleteVectors failed: ${toErrorMessage(err)}`);
    return 0;
  }
}

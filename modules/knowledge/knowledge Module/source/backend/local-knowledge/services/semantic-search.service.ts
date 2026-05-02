import { safeQuery, tenantSchema } from '../ports/database.port';
import type { GenericRow } from '@dos/types';

export interface SearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  score: number;
  headingContext: string | null;
}

export interface SearchQuery {
  topK?: number;
  minScore?: number;
  sourceIds?: string[];
  tags?: string[];
}

export async function search(tenantId: string, q: string, query?: SearchQuery): Promise<SearchResult[]> {
  if (!q || q.trim().length < 2) return [];

  const schema = tenantSchema(tenantId);
  const topK = Math.min(query?.topK ?? 10, 50);
  const minScore = query?.minScore ?? 0;
  const term = `%${q.trim().toLowerCase()}%`;

  const conditions = [
    `c.deleted_at IS NULL`,
    `d.deleted_at IS NULL`,
    `d.status = 'embedded'`,
    `LOWER(c.content) LIKE $1`,
  ];
  const params: unknown[] = [term];
  let idx = 2;

  if (query?.sourceIds?.length) {
    conditions.push(`d.source_id = ANY($${idx++})`);
    params.push(query.sourceIds);
  }
  if (query?.tags?.length) {
    conditions.push(`d.tags && $${idx++}::text[]`);
    params.push(query.tags);
  }

  const { rows } = await safeQuery(
    `SELECT c.chunk_id, c.document_id, d.title AS document_title, c.content, c.heading_context,
            SIMILARITY(LOWER(c.content), LOWER($1)) AS score
     FROM "${schema}".local_knowledge_chunks c
     JOIN "${schema}".local_knowledge_documents d ON d.document_id = c.document_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY score DESC
     LIMIT ${topK}`,
    params as string[],
  ).catch(() => {
    return safeQuery(
      `SELECT c.chunk_id, c.document_id, d.title AS document_title, c.content, c.heading_context, 0.5 AS score
       FROM "${schema}".local_knowledge_chunks c
       JOIN "${schema}".local_knowledge_documents d ON d.document_id = c.document_id
       WHERE c.deleted_at IS NULL AND d.deleted_at IS NULL AND LOWER(c.content) LIKE $1
       ORDER BY c.created_at DESC
       LIMIT ${topK}`,
      [term],
    );
  });

  return rows
    .map((r: GenericRow) => ({
      chunkId: r.chunk_id as string,
      documentId: r.document_id as string,
      documentTitle: r.document_title as string,
      content: r.content as string,
      score: Number(r.score ?? 0),
      headingContext: (r.heading_context as string) ?? null,
    }))
    .filter(r => r.score >= minScore);
}

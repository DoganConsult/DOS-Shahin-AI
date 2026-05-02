import { safeQuery, tenantSchema } from '../ports/database.port';
import type { GenericRow } from '@dos/types';

export interface KnowledgeDocument {
  documentId: string;
  sourceId: string | null;
  title: string;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  status: string;
  chunkCount: number;
  embeddingModel: string | null;
  languageCode: string | null;
  tags: string[];
  ingestedAt: string | null;
  embeddedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentListQuery {
  page?: number;
  limit?: number;
  status?: string;
  sourceId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function listDocuments(tenantId: string, query?: DocumentListQuery): Promise<{ data: KnowledgeDocument[]; total: number; page: number; limit: number }> {
  const schema = tenantSchema(tenantId);
  const conditions = [`deleted_at IS NULL`];
  const params: unknown[] = [];
  let idx = 1;

  if (query?.status) { conditions.push(`status = $${idx++}`); params.push(query.status); }
  if (query?.sourceId) { conditions.push(`source_id = $${idx++}`); params.push(query.sourceId); }

  const where = conditions.join(' AND ');
  const page = query?.page ?? 1;
  const limit = Math.min(query?.limit ?? 50, 200);
  const offset = (page - 1) * limit;
  const sortCol = query?.sortBy === 'title' ? 'title' : 'created_at';
  const sortDir = query?.sortOrder === 'asc' ? 'ASC' : 'DESC';

  const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".local_knowledge_documents WHERE ${where}`, params as string[]);
  const total = countResult.rows[0]?.total ?? 0;

  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".local_knowledge_documents WHERE ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${limit} OFFSET ${offset}`,
    params as string[],
  );

  return { data: rows.map((r: GenericRow) => mapDocument(r)), total, page, limit };
}

export async function getDocument(tenantId: string, id: string): Promise<KnowledgeDocument | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".local_knowledge_documents WHERE document_id = $1 AND deleted_at IS NULL LIMIT 1`,
    [id],
  );
  if (!rows.length) return null;
  return mapDocument(rows[0] as GenericRow);
}

function mapDocument(r: GenericRow): KnowledgeDocument {
  return {
    documentId: r.document_id as string,
    sourceId: (r.source_id as string) ?? null,
    title: r.title as string,
    fileName: (r.file_name as string) ?? null,
    mimeType: (r.mime_type as string) ?? null,
    fileSizeBytes: r.file_size_bytes != null ? Number(r.file_size_bytes) : null,
    status: r.status as string,
    chunkCount: Number(r.chunk_count ?? 0),
    embeddingModel: (r.embedding_model as string) ?? null,
    languageCode: (r.language_code as string) ?? null,
    tags: (r.tags as string[]) ?? [],
    ingestedAt: r.ingested_at ? String(r.ingested_at) : null,
    embeddedAt: r.embedded_at ? String(r.embedded_at) : null,
    createdBy: r.created_by as string,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

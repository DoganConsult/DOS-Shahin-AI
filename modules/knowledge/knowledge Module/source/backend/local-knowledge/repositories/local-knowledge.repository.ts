import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

export class LocalKnowledgeRepository {
  private schema: string;
  constructor(tenantId: string) { this.schema = tenantSchema(tenantId); }

  async findDocumentById(id: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".knowledge_documents WHERE id = $1 AND deleted_at IS NULL`, [id]);
    return getFirstRow(result);
  }

  async findAllDocuments(filters: { sourceType?: string; status?: string; page?: number; pageSize?: number } = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;
    if (filters.sourceType) { conditions.push(`source_type = $${idx++}`); params.push(filters.sourceType); }
    if (filters.status) { conditions.push(`embedding_status = $${idx++}`); params.push(filters.status); }
    const where = 'WHERE ' + conditions.join(' AND ');
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const offset = (page - 1) * pageSize;
    const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${this.schema}".knowledge_documents ${where}`, params);
    const total = getFirstRow(countResult)?.total ?? 0;
    const dataResult = await safeQuery(
      `SELECT * FROM "${this.schema}".knowledge_documents ${where} ORDER BY ingested_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset]);
    return { rows: dataResult.rows, total };
  }

  async createDocument(data: Record<string, unknown>): Promise<GenericRow | null> {
    const id = uuid();
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".knowledge_documents (id, tenant_id, title, source_type, source_uri, content_hash, embedding_status, ingested_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), $7) RETURNING *`,
      [id, data.tenant_id, data.title, data.source_type, data.source_uri, data.content_hash, data.created_by]);
    return getFirstRow(result);
  }

  async findChunksByDocumentId(documentId: string): Promise<GenericRow[]> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".knowledge_chunks WHERE document_id = $1 ORDER BY chunk_index ASC`, [documentId]);
    return result.rows;
  }

  async semanticSearch(queryEmbedding: number[], limit = 10): Promise<GenericRow[]> {
    const result = await safeQuery(
      `SELECT c.*, d.title AS document_title, d.source_type
       FROM "${this.schema}".knowledge_chunks c
       JOIN "${this.schema}".knowledge_documents d ON d.id = c.document_id
       WHERE d.deleted_at IS NULL AND d.embedding_status = 'completed'
       ORDER BY c.embedding <=> $1::vector LIMIT $2`,
      [JSON.stringify(queryEmbedding), limit]);
    return result.rows;
  }

  async getEmbeddingStats(): Promise<{ total: number; pending: number; completed: number; failed: number }> {
    const result = await safeQuery(
      `SELECT embedding_status, COUNT(*)::int AS count FROM "${this.schema}".knowledge_documents WHERE deleted_at IS NULL GROUP BY embedding_status`);
    const stats = { total: 0, pending: 0, completed: 0, failed: 0 };
    for (const row of result.rows) {
      stats[row.embedding_status as keyof typeof stats] = row.count;
      stats.total += row.count;
    }
    return stats;
  }
}

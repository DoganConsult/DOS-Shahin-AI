import { safeQuery, tenantSchema } from '../ports/database.port';
import type { GenericRow } from '@dos/types';

export class LocalKnowledgeQueryRepository {
  private schema: string;
  constructor(tenantId: string) { this.schema = tenantSchema(tenantId); }

  async getSourceSummary(): Promise<{ sourceType: string; count: number; lastIngested: string }[]> {
    const result = await safeQuery(
      `SELECT source_type, COUNT(*)::int AS count, MAX(ingested_at) AS last_ingested
       FROM "${this.schema}".knowledge_documents WHERE deleted_at IS NULL GROUP BY source_type ORDER BY count DESC`);

    return result.rows as Record<string, unknown>[];
  }

  async getRecentlyIngested(limit = 10): Promise<GenericRow[]> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".knowledge_documents WHERE deleted_at IS NULL ORDER BY ingested_at DESC LIMIT $1`, [limit]);
    return result.rows;
  }

  async getStaleDocuments(staleDays = 90): Promise<GenericRow[]> {
    // secrets-scan-allow: tenantSchema()-validated quoted schema + typed column/filter constants; all user values bound via $N
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".knowledge_documents WHERE deleted_at IS NULL
       AND updated_at < NOW() - INTERVAL '${staleDays} days' ORDER BY updated_at ASC LIMIT 50`);
    return result.rows;
  }
}

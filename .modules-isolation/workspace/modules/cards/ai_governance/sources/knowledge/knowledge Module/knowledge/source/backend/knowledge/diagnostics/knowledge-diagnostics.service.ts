/**
 * Knowledge Module Diagnostics
 * @owner knowledge
 */
import { safeQuery, tenantSchema } from '../ports/database.port';
import { KnowledgeDiagnosticsContract } from '../contracts/knowledge.contract';

export async function runDiagnostics(tenantId: string): Promise<KnowledgeDiagnosticsContract> {
  const schema = tenantSchema(tenantId);
  const diagnostics: KnowledgeDiagnosticsContract = {
    staleArticles: 0,
    orphanedLinks: 0,
    uncategorizedArticles: 0,
    searchIndexStatus: 'offline'
  };

  try {
    // 1. Articles that have not been updated in a year
    const staleResult = await safeQuery(`
      SELECT COUNT(*) as count 
      FROM "${schema}".knowledge_articles 
      WHERE updated_at < NOW() - INTERVAL '365 days' AND deleted_at IS NULL
    `);
    diagnostics.staleArticles = parseInt(staleResult.rows[0].count, 10);

    // 2. Links that point to missing entities (simulated cross-module check logic via orphaned condition)
    const orphanedResult = await safeQuery(`
      SELECT COUNT(*) as count
      FROM "${schema}".knowledge_links kl
      LEFT JOIN "${schema}".knowledge_articles ka ON kl.article_id = ka.article_id
      WHERE ka.article_id IS NULL OR ka.deleted_at IS NOT NULL
    `);
    diagnostics.orphanedLinks = parseInt(orphanedResult.rows[0].count, 10);

    // 3. Articles without any mapped category structure
    const uncategorizedResult = await safeQuery(`
      SELECT COUNT(*) as count
      FROM "${schema}".knowledge_articles
      WHERE category_id IS NULL AND deleted_at IS NULL
    `);
    diagnostics.uncategorizedArticles = parseInt(uncategorizedResult.rows[0].count, 10);

    diagnostics.searchIndexStatus = 'healthy';
    diagnostics.lastSyncAt = new Date().toISOString();

  } catch (err) {
    // Structural regression — tables might be degraded
    diagnostics.searchIndexStatus = 'degraded';
  }

  return diagnostics;
}

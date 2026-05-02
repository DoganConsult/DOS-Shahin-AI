/**
 * Knowledge Module Service — Deep DB Queries & DAuth Lifecycle
 * @owner knowledge
 */
import { safeQuery, tenantSchema } from '../ports/database.port';
import { emitEvent } from '../ports/events.port';
import { evaluateLifecycleTransition, setAuditData } from '../ports/auth.port';
import { KnowledgeArticleContract } from '../contracts/knowledge.contract';

export async function createArticle(tenantId: string, authorId: string, data: { title: string; contentRaw: string; contentHtml: string; categoryId?: string }): Promise<KnowledgeArticleContract> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".knowledge_articles (title, content_raw, content_html, category_id, status, author_id)
     VALUES ($1, $2, $3, $4, 'draft', $5)
     RETURNING article_id as "articleId", title, content_raw as "contentRaw", content_html as "contentHtml", category_id as "categoryId", status, author_id as "authorId", version, created_at as "createdAt", updated_at as "updatedAt"`,
    [data.title, data.contentRaw, data.contentHtml, data.categoryId || null, authorId]
  );
  
  const article = result.rows[0];
  await emitEvent({
    event: 'knowledge.article_created',
    module: 'knowledge',
    tenantId,
    entityType: 'knowledge_article',
    entityId: article.articleId,
    userId: authorId,
    data: article,
  });
  await setAuditData(tenantId, 'knowledge_articles', article.articleId, 'create', null, article, authorId);
  
  return article as KnowledgeArticleContract;
}

export async function getArticleById(tenantId: string, articleId: string): Promise<KnowledgeArticleContract | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT article_id as "articleId", title, content_raw as "contentRaw", content_html as "contentHtml", category_id as "categoryId", status, author_id as "authorId", published_at as "publishedAt", version, created_at as "createdAt", updated_at as "updatedAt"
     FROM "${schema}".knowledge_articles WHERE article_id = $1 AND deleted_at IS NULL`,
    [articleId]
  );
  return result.rows[0] ? (result.rows[0] as KnowledgeArticleContract) : null;
}

export async function listArticles(tenantId: string): Promise<KnowledgeArticleContract[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT article_id as "articleId", title, status, author_id as "authorId", version, created_at as "createdAt", updated_at as "updatedAt"
     FROM "${schema}".knowledge_articles WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 100`
  );
  return result.rows as KnowledgeArticleContract[];
}

export async function updateArticle(tenantId: string, articleId: string, updateContext: { userId: string }, data: Partial<{ title: string; contentRaw: string; contentHtml: string; categoryId: string }>): Promise<KnowledgeArticleContract> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.knowledge_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function transitionStatus(tenantId: string, articleId: string, targetStatus: string, context: { userId: string }): Promise<KnowledgeArticleContract> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.knowledge_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function deleteArticle(tenantId: string, articleId: string, context: { userId: string }): Promise<void> {
  const schema = tenantSchema(tenantId);
  const existing = await getArticleById(tenantId, articleId);
  if (!existing) return;

  await safeQuery(
    `UPDATE "${schema}".knowledge_articles SET deleted_at = NOW(), status = 'retired' WHERE article_id = $1`,
    [articleId]
  );
  await setAuditData(tenantId, 'knowledge_articles', articleId, 'delete', existing, null, context.userId);
}

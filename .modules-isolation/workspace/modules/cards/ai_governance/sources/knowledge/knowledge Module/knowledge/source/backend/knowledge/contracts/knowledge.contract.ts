/**
 * Knowledge Module Contracts
 * @owner knowledge
 */

export interface KnowledgeArticleContract {
  articleId: string;
  categoryId?: string;
  title: string;
  contentRaw: string;
  contentHtml: string;
  status: 'draft' | 'in_review' | 'published' | 'archived' | 'retired';
  authorId: string;
  publishedAt?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeCategoryContract {
  categoryId: string;
  parentId?: string;
  name: string;
  description?: string;
  level: number;
  createdAt: string;
}

export interface KnowledgeLinkContract {
  linkId: string;
  articleId: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  createdBy: string;
}

export interface KnowledgeDiagnosticsContract {
  staleArticles: number;
  orphanedLinks: number;
  uncategorizedArticles: number;
  searchIndexStatus: 'healthy' | 'degraded' | 'offline';
  lastSyncAt?: string;
}

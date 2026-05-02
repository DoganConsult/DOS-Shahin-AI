export type KnowledgeArticleStatus = 'draft' | 'in_review' | 'published' | 'outdated' | 'archived';
export type KnowledgeCategory = 'policy_guidance' | 'procedure' | 'faq' | 'regulatory_brief' | 'best_practice' | 'lesson_learned' | 'reference';
export type KnowledgeAccessLevel = 'public' | 'internal' | 'restricted' | 'confidential';

export interface KnowledgeArticleContract {
  articleId: string; tenantId: string; code: string; titleEn: string; titleAr: string | null;
  status: KnowledgeArticleStatus; category: KnowledgeCategory;
  accessLevel: KnowledgeAccessLevel; description: string;
  authorId: string; reviewerId: string | null;
  contentHash: string; versionNumber: number;
  tags: string[]; linkedModules: string[];
  viewCount: number; lastReviewedAt: string | null;
  publishedAt: string | null; expiresAt: string | null;
  createdAt: string; updatedAt: string;
}

export interface KnowledgeIndexContract {
  indexId: string; tenantId: string; articleCount: number;
  lastRebuiltAt: string; freshness: 'fresh' | 'stale' | 'rebuilding';
  searchableFields: string[];
}

export interface KnowledgeCurationContract {
  curationId: string; articleId: string; curatorId: string;
  action: 'approved' | 'rejected' | 'revision_requested' | 'expired';
  notes: string | null; performedAt: string;
}

export interface LocalKnowledgeDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalArticles: number;
  outdatedCount: number; pendingReviewCount: number;
  indexFreshness: 'fresh' | 'stale' | 'rebuilding';
  avgRetrievalLatencyMs: number | null;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface LocalKnowledgeDashboardContract {
  totalArticles: number; byStatus: Record<string, number>;
  byCategory: Record<string, number>; byAccessLevel: Record<string, number>;
  outdatedCount: number; pendingReviewCount: number;
  topViewedArticles: Array<{ articleId: string; titleEn: string; viewCount: number }>;
}

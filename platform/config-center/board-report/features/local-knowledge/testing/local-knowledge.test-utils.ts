import type { KnowledgeArticleContract, KnowledgeCurationContract, LocalKnowledgeDiagnosticsContract } from '../contracts/local-knowledge.contracts';

export function mockKnowledgeArticle(overrides?: Partial<KnowledgeArticleContract>): KnowledgeArticleContract {
  return {
    articleId: 'art-001', tenantId: 'tenant-001', code: 'KB-RISK-001',
    titleEn: 'Enterprise Risk Assessment Procedure', titleAr: null,
    status: 'published', category: 'procedure', accessLevel: 'internal',
    description: 'Standard operating procedure for conducting enterprise risk assessments',
    authorId: 'user-001', reviewerId: 'user-002',
    contentHash: 'sha256-abc123', versionNumber: 3,
    tags: ['risk', 'assessment', 'procedure'], linkedModules: ['risk', 'controls'],
    viewCount: 142, lastReviewedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides,
  };
}

export function mockKnowledgeCuration(overrides?: Partial<KnowledgeCurationContract>): KnowledgeCurationContract {
  return {
    curationId: 'cur-001', articleId: 'art-001', curatorId: 'user-002',
    action: 'approved', notes: 'Content verified and approved for publication',
    performedAt: new Date().toISOString(), ...overrides,
  };
}

export function mockLocalKnowledgeDiagnostics(overrides?: Partial<LocalKnowledgeDiagnosticsContract>): LocalKnowledgeDiagnosticsContract {
  return {
    moduleCode: 'local-knowledge', healthy: true, totalArticles: 250,
    outdatedCount: 8, pendingReviewCount: 12, indexFreshness: 'fresh',
    avgRetrievalLatencyMs: 45,
    checks: [{ name: 'index-freshness', passed: true }, { name: 'outdated-articles', passed: true }],
    checkedAt: new Date().toISOString(), ...overrides,
  };
}

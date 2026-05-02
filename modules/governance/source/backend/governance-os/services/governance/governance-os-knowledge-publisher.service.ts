// ============================================
// Shahin-Ai — Governance OS Knowledge Publisher Service
// Phase F: Convert approved lessons into reusable knowledge
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';
import { getApprovedLessons } from '../learning/governance-os-learning-memory.service';
import { getConfigValue, setConfigValue } from './governance-os-config.service';
import { getCachedKnowledgeArticles, setCachedKnowledgeArticles } from '../learning/governance-os-learning-cache.service';
import { processInBatchesParallel } from '../../../../utils/batch-processor.util';
import { recordKnowledgePublishing } from '../learning/governance-os-learning-metrics.service';
import type { GenericRow } from '@dos/types';

export type KnowledgeStore = 'case_base' | 'playbook_base' | 'domain_base' | 'executive_base';

interface LessonRecord {
  lessonId: string;
  lessonCode: string;
  titleEn?: string;
  situationEn?: string;
  whatHappenedEn?: string;
  rootCauseEn?: string;
  bestActionEn?: string;
  scope: Record<string, unknown> & { module?: string; initiativeCode?: string; entityType?: string };
  confidence?: number;
}

export interface KnowledgeArticle {
  articleId: string;
  tenantId: string;
  articleCode: string;
  knowledgeStore: KnowledgeStore;
  titleEn: string;
  titleAr?: string;
  contentEn: string;
  contentAr?: string;
  tags: string[];
  scope: Record<string, unknown>;
  sourceLessonId?: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Publish approved lessons to knowledge bases
 */
export async function publishApprovedLessons(tenantId: string): Promise<{
  articlesCreated: number;
  expertPacksUpdated: number;
  nextBestActionsUpdated: number;
  digestGuidanceUpdated: number;
}> {
  const startTime = Date.now();
  const schema = tenantSchema(tenantId);
  let articlesCreated = 0;
  let expertPacksUpdated = 0;
  let nextBestActionsUpdated = 0;
  let digestGuidanceUpdated = 0;

  try {
    // Get approved lessons not yet published
    const lessons = await getApprovedLessons(tenantId, {
      published: false,
    });

    // Process lessons in batches with concurrency control
    const batchResults = await processInBatchesParallel(
      lessons,
      async (batch) => {
        const batchStats = {
          articlesCreated: 0,
          expertPacksUpdated: 0,
          nextBestActionsUpdated: 0,
          digestGuidanceUpdated: 0,
        };

        for (const lesson of batch) {
          // 1. Publish to case_base
          const caseArticleId = await publishLessonToKnowledge(tenantId, (lesson as any), 'case_base');
          if (caseArticleId) batchStats.articlesCreated++;

          // 2. Update expert pack hints if module-specific

          if (lesson.scope.module) {
            const updated = await updateExpertPackHints(tenantId, (lesson as any));
            if (updated) batchStats.expertPacksUpdated++;
          }

          // 3. Update next-best-action templates
          const nbaUpdated = await updateNextBestActionTemplates(tenantId, (lesson as any));
          if (nbaUpdated) batchStats.nextBestActionsUpdated++;

          // 4. Update digest guidance
          const digestUpdated = await updateDigestGuidance(tenantId, (lesson as any));
          if (digestUpdated) batchStats.digestGuidanceUpdated++;

          // 5. Update module guidance if applicable

          if (lesson.scope.module) {
            await updateModuleGuidance(tenantId, (lesson as any));
          }

          // 6. Update executive guidance
          await updateExecutiveGuidance(tenantId, (lesson as any));

          // Mark lesson as published
          await safeQuery(
            `
            UPDATE "${schema}".os_approved_lessons
            SET updated_at = NOW()
            WHERE lesson_id = $1
            `,
            [lesson.lessonId]
          );
        }

        return [batchStats];
      },
      {
        batchSize: 5,
        concurrency: 3,
        operationType: 'knowledge_publishing_batch',
        onProgress: (processed, total) => {
          logger.debug('[KnowledgePublisher] Processing lessons', { processed, total, tenantId });
        },
      }
    );

    // Aggregate batch results
    for (const batchStat of batchResults as Record<string, unknown>[]) {
      (articlesCreated as any) += batchStat.articlesCreated;
      (expertPacksUpdated as any) += batchStat.expertPacksUpdated;
      (nextBestActionsUpdated as any) += batchStat.nextBestActionsUpdated;
      (digestGuidanceUpdated as any) += batchStat.digestGuidanceUpdated;
    }

    logger.info('[KnowledgePublisher] Published approved lessons', {
      tenantId,
      articlesCreated,
      expertPacksUpdated,
      nextBestActionsUpdated,
      digestGuidanceUpdated,
    });

    // Record metrics
    const durationMs = Date.now() - startTime;
    recordKnowledgePublishing(tenantId, durationMs, true, articlesCreated, undefined, undefined);

    return {
      articlesCreated,
      expertPacksUpdated,
      nextBestActionsUpdated,
      digestGuidanceUpdated,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    recordKnowledgePublishing(tenantId, durationMs, false, 0, err, undefined);
    logger.error('[KnowledgePublisher] Failed to publish approved lessons', {
      tenantId,
      error: (err as Error).message,
    });
    throw err;
  }
}

/**
 * Publish lesson to a knowledge store
 */
export async function publishLessonToKnowledge(
  tenantId: string,
  lesson: LessonRecord,
  store: KnowledgeStore
): Promise<string | null> {
  const schema = tenantSchema(tenantId);

  try {
    const articleCode = `kb-${store}-${lesson.lessonCode}-${Date.now().toString(36)}`;

    const result = await safeQuery(
      `
      INSERT INTO "${schema}".os_knowledge_articles
        (tenant_id, article_code, knowledge_store, title_en, content_en, tags, scope, source_lesson_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING article_id
      `,
      [
        tenantId,
        articleCode,
        store,
        lesson.titleEn || `Lesson: ${lesson.situationEn?.substring(0, 100)}`,
        buildKnowledgeContent(lesson, store),
        JSON.stringify(extractTags((lesson as any))),
        JSON.stringify(lesson.scope),
        lesson.lessonId,
      ]
    );

    // Create knowledge link
    await safeQuery(
      `
      INSERT INTO "${schema}".os_knowledge_links
        (tenant_id, source_type, source_id, target_type, target_id, link_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        tenantId,
        'approved_lesson',
        lesson.lessonId,
        'knowledge_article',
        result.rows[0].article_id,
        'published_from',
      ]
    );

    return result.rows[0]?.article_id || null;
  } catch (err) {
    logger.error('[KnowledgePublisher] Failed to publish lesson to knowledge', {
      tenantId,
      lessonId: lesson.lessonId,
      store,
      error: (err as Error).message,
    });
    return null;
  }
}

/**
 * Build knowledge content from lesson
 */
function buildKnowledgeContent(lesson: LessonRecord, store: KnowledgeStore): string {
  switch (store) {
    case 'case_base':
      return `Situation: ${lesson.situationEn}\n\nWhat Happened: ${lesson.whatHappenedEn}\n\nRoot Cause: ${lesson.rootCauseEn}\n\nBest Action: ${lesson.bestActionEn}`;
    
    case 'playbook_base':
      return `When ${lesson.situationEn}, follow this approach: ${lesson.bestActionEn}`;
    
    case 'domain_base':
      return `Domain guidance: ${lesson.situationEn}. Pattern: ${lesson.rootCauseEn}. Recommended: ${lesson.bestActionEn}`;
    
    case 'executive_base':
      return `Executive summary: ${lesson.situationEn}. Action: ${lesson.bestActionEn}`;
    
    default:
      return lesson.bestActionEn || '';
  }
}

/**
 * Extract tags from lesson
 */
function extractTags(lesson: Record<string, unknown>): string[] {
  const tags: string[] = [];

  if (lesson.scope.module) tags.push(`module:${lesson.scope.module}`);

  if (lesson.scope.initiativeCode) tags.push(`initiative:${lesson.scope.initiativeCode}`);

  if (lesson.scope.entityType) tags.push(`entity:${lesson.scope.entityType}`);
  
  // Extract keywords from situation

  const keywords = lesson.situationEn?.toLowerCase().match(/\b\w{4,}\b/g) || [];
  tags.push(...keywords.slice(0, 5));
  
  return [...new Set(tags)];
}

/**
 * Update expert pack hints
 */
async function updateExpertPackHints(tenantId: string, lesson: LessonRecord): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  try {
    // Get expert pack for module
    const packResult = await safeQuery(
      `
      SELECT pack_id, hints
      FROM "${schema}".expert_packs
      WHERE tenant_id = $1
        AND module_code = $2
      LIMIT 1
      `,
      [tenantId, lesson.scope.module]
    );

    if (packResult.rows.length === 0) {
      return false; // No expert pack for this module
    }

    const pack = packResult.rows[0];
    const hints = typeof pack.hints === 'string' ? JSON.parse(pack.hints) : (pack.hints || []);

    // Add lesson as hint
    const newHint = {
      type: 'learned_lesson',
      lessonId: lesson.lessonId,
      situation: lesson.situationEn,
      action: lesson.bestActionEn,
      confidence: lesson.confidence || 0.7,
      addedAt: new Date().toISOString(),
    };

    hints.push(newHint);

    // Update expert pack
    await safeQuery(
      `
      UPDATE "${schema}".expert_packs
      SET hints = $1, updated_at = NOW()
      WHERE pack_id = $2
      `,
      [JSON.stringify(hints), pack.pack_id]
    );

    return true;
  } catch (err) {
    logger.error('[KnowledgePublisher] Failed to update expert pack hints', {
      tenantId,
      error: (err as Error).message,
    });
    return false;
  }
}

/**
 * Update next-best-action templates
 */
async function updateNextBestActionTemplates(tenantId: string, lesson: LessonRecord): Promise<boolean> {
  // Store in governance-os-config as next_best_action_templates
  const configKey = 'playbook.next_best_action_templates';
  
  try {
    const currentValue = await getConfigValue(tenantId, configKey);
    const templates = currentValue ? (typeof currentValue === 'string' ? JSON.parse(currentValue) : currentValue) : [];

    // Add template from lesson
    const template = {
      situation: lesson.situationEn,
      action: lesson.bestActionEn,
      sourceLessonId: lesson.lessonId,
      confidence: lesson.confidence || 0.7,
      addedAt: new Date().toISOString(),
    };

    templates.push(template);

    await setConfigValue(tenantId, configKey, JSON.stringify(templates));

    return true;
  } catch (err) {
    logger.error('[KnowledgePublisher] Failed to update next-best-action templates', {
      tenantId,
      error: (err as Error).message,
    });
    return false;
  }
}

/**
 * Update digest guidance
 */
async function updateDigestGuidance(tenantId: string, lesson: LessonRecord): Promise<boolean> {
  const configKey = 'playbook.digest_emphasis';
  
  try {
    const currentValue = await getConfigValue(tenantId, configKey);
    const guidance = currentValue ? (typeof currentValue === 'string' ? JSON.parse(currentValue) : currentValue) : {};

    // Add guidance entry
    if (!guidance.learnedLessons) {
      guidance.learnedLessons = [];
    }

    guidance.learnedLessons.push({
      lessonId: lesson.lessonId,
      situation: lesson.situationEn,
      emphasis: 'high', // If low effectiveness, emphasize in digest
      addedAt: new Date().toISOString(),
    });

    await setConfigValue(tenantId, configKey, JSON.stringify(guidance));

    return true;
  } catch (err) {
    logger.error('[KnowledgePublisher] Failed to update digest guidance', {
      tenantId,
      error: (err as Error).message,
    });
    return false;
  }
}

/**
 * Update module guidance
 */
async function updateModuleGuidance(tenantId: string, lesson: LessonRecord): Promise<void> {
  const _schema = tenantSchema(tenantId);
  
  try {
    // Publish to domain_base
    await publishLessonToKnowledge(tenantId, lesson, 'domain_base');
  } catch (err) {
    logger.error('[KnowledgePublisher] Failed to update module guidance', {
      tenantId,
      error: (err as Error).message,
    });
  }
}

/**
 * Update executive guidance
 */
async function updateExecutiveGuidance(tenantId: string, lesson: LessonRecord): Promise<void> {
  try {
    // Publish to executive_base
    await publishLessonToKnowledge(tenantId, lesson, 'executive_base');
  } catch (err) {
    logger.error('[KnowledgePublisher] Failed to update executive guidance', {
      tenantId,
      error: (err as Error).message,
    });
  }
}

/**
 * Get knowledge articles with filters
 */
export async function getKnowledgeArticles(
  tenantId: string,
  filters?: {
    knowledgeStore?: KnowledgeStore;
    tags?: string[];
    limit?: number;
  }
): Promise<KnowledgeArticle[]> {
  // Try cache for common queries (no tags filter, reasonable limit)
  if (!filters?.tags && (!filters?.limit || filters.limit <= 50)) {
    const cacheKey = `${filters?.knowledgeStore || 'all'}_${filters?.limit || 50}`;
    const cached = await getCachedKnowledgeArticles(tenantId, cacheKey);
    if (cached) {
      logger.debug('[KnowledgePublisher] Cache hit for getKnowledgeArticles', {
        tenantId,
        cacheKey,
      });
      return cached;
    }
  }

  const schema = tenantSchema(tenantId);
  try {
    let query = `
      SELECT 
        article_id as "articleId",
        tenant_id as "tenantId",
        article_code as "articleCode",
        knowledge_store as "knowledgeStore",
        title_en as "titleEn",
        title_ar as "titleAr",
        content_en as "contentEn",
        content_ar as "contentAr",
        tags,
        scope,
        source_lesson_id as "sourceLessonId",
        published_at as "publishedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM "${schema}".os_knowledge_articles
      WHERE tenant_id = $1
    `;
    const params: unknown[] = [tenantId];

    if (filters?.knowledgeStore) {
      query += ` AND knowledge_store = $${params.length + 1}`;
      params.push(filters.knowledgeStore);
    }

    if (filters?.tags && filters.tags.length > 0) {
      query += ` AND tags @> $${params.length + 1}::jsonb`;
      params.push(JSON.stringify(filters.tags));
    }

    query += ` ORDER BY published_at DESC`;

    if (filters?.limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(filters.limit);
    }

    const result = await safeQuery(query, params);

    const articles = result.rows.map((r: GenericRow) => ({
      articleId: r.articleId,
      tenantId: r.tenantId,
      articleCode: r.articleCode,
      knowledgeStore: r.knowledgeStore,
      titleEn: r.titleEn,
      titleAr: r.titleAr || undefined,
      contentEn: r.contentEn,
      contentAr: r.contentAr || undefined,
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags,
      scope: typeof r.scope === 'string' ? JSON.parse(r.scope) : r.scope,
      sourceLessonId: r.sourceLessonId || undefined,
      publishedAt: r.publishedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    // Cache the result for common queries (30 min TTL)
    if (!filters?.tags && (!filters?.limit || filters.limit <= 50)) {
      const cacheKey = `${filters?.knowledgeStore || 'all'}_${filters?.limit || 50}`;
      await setCachedKnowledgeArticles(tenantId, cacheKey, articles, undefined, 1800);
    }

    return articles;
  } catch (err) {
    logger.error('[KnowledgePublisher] Failed to get knowledge articles', {
      tenantId,
      error: (err as Error).message,
    });
    return [];
  }
}

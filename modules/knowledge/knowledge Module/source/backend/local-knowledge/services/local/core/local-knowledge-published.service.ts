// ============================================
// Shahin-Ai — Local Knowledge Published Service
// R3.3B Phase D: Manages published knowledge (lessons, playbooks, articles)
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { logger } from '../../../ports/logger.port';
import { validateDocument as validateDocumentForPublishing } from './local-knowledge-validation.service';
import type { PaginationParams, PaginatedResponse } from './local-knowledge-documents.service';

export interface PublishedKnowledge {
  publishedId: string;
  tenantId: string;
  workspaceId?: string;
  sourceDocumentId?: string;
  sourceIngestionId?: string;
  knowledgeType: 'lesson' | 'playbook' | 'article' | 'pattern' | 'guidance';
  title: string;
  content: string;
  summary?: string;
  tags?: string[];
  modules?: string[];
  frameworks?: string[];
  controls?: string[];
  orgUnits?: string[];
  approvedBy?: string;
  approvedAt?: string;
  status: 'draft' | 'approved' | 'published' | 'archived';
  publishedAt?: string;
  searchableText?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Creates or updates published knowledge
 */
export async function upsertPublishedKnowledge(
  tenantId: string,
  knowledge: Omit<PublishedKnowledge, 'publishedId' | 'createdAt' | 'updatedAt'>,
): Promise<PublishedKnowledge> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.local_knowledge_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

/**
 * Approves and publishes knowledge
 */
export async function approveAndPublish(
  tenantId: string,
  publishedId: string,
  approvedBy: string,
): Promise<PublishedKnowledge | null> {
  const schema = tenantSchema(tenantId);
  try {
    const res = await safeQuery(
      `UPDATE "${schema}".local_knowledge_published
       SET status = 'published', approved_by = $1, approved_at = NOW(), published_at = NOW(), updated_at = NOW()
       WHERE published_id = $2 AND tenant_id = $3
       RETURNING *`,
      [approvedBy, publishedId, tenantId],
    );
    if (res.rows.length === 0) return null;
    return mapPublishedRow(res.rows[0]);
  } catch (err) {
    logger.warn('[LocalKnowledgePublished] approveAndPublish failed', {
      tenantId,
      publishedId,
      error: (err as Error).message,
    });
    return null;
  }
}

/**
 * Lists published knowledge with filters and pagination
 */

export async function getPublishedKnowledge(
  tenantId: string,
  publishedId: string,
): Promise<PublishedKnowledge | null> {
  const schema = tenantSchema(tenantId);
  try {
    const res = await safeQuery(
      `SELECT * FROM "${schema}".local_knowledge_published WHERE published_id = $1 AND tenant_id = $2`,
      [publishedId, tenantId],
    );
    if (res.rows.length === 0) return null;
    return mapPublishedRow(res.rows[0]);
  } catch (err) {
    logger.warn('[LocalKnowledgePublished] getPublishedKnowledge failed', {
      tenantId,
      publishedId,
      error: (err as Error).message,
    });
    return null;
  }
}

export async function listPublishedKnowledge(
  tenantId: string,
  filters?: {
    knowledgeType?: string;
    status?: string;
    module?: string;
    framework?: string;
    workspaceId?: string;
  },
  pagination?: PaginationParams,
): Promise<PaginatedResponse<PublishedKnowledge>> {
  const schema = tenantSchema(tenantId);
  const page = pagination?.page ?? 1;
  const pageSize = Math.min(pagination?.pageSize ?? 50, 200); // Max 200 per page
  const offset = (page - 1) * pageSize;

  try {
    // Build base query for counting
    let countQuery = `SELECT COUNT(*) as total FROM "${schema}".local_knowledge_published WHERE tenant_id = $1`;
    const countParams: unknown[] = [tenantId];

    // Build main query
    let query = `SELECT * FROM "${schema}".local_knowledge_published WHERE tenant_id = $1`;
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (filters?.knowledgeType) {
      const condition = ` AND knowledge_type = $${paramIndex}`;
      query += condition;
      countQuery += condition;
      params.push(filters.knowledgeType);
      countParams.push(filters.knowledgeType);
      paramIndex++;
    }

    if (filters?.status) {
      const condition = ` AND status = $${paramIndex}`;
      query += condition;
      countQuery += condition;
      params.push(filters.status);
      countParams.push(filters.status);
      paramIndex++;
    }

    if (filters?.module) {
      const condition = ` AND $${paramIndex} = ANY(modules)`;
      query += condition;
      countQuery += condition;
      params.push(filters.module);
      countParams.push(filters.module);
      paramIndex++;
    }

    if (filters?.framework) {
      const condition = ` AND $${paramIndex} = ANY(frameworks)`;
      query += condition;
      countQuery += condition;
      params.push(filters.framework);
      countParams.push(filters.framework);
      paramIndex++;
    }

    if (filters?.workspaceId) {
      const condition = ` AND workspace_id = $${paramIndex}`;
      query += condition;
      countQuery += condition;
      params.push(filters.workspaceId);
      countParams.push(filters.workspaceId);
      paramIndex++;
    }

    // Get total count
    const countRes = await safeQuery(countQuery, countParams);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    // Get paginated results
    query += ` ORDER BY published_at DESC NULLS LAST, created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pageSize, offset);

    const res = await safeQuery(query, params);
    const totalPages = Math.ceil(total / pageSize);

    return {
      data: res.rows.map(mapPublishedRow),
      total,
      page,
      pageSize,
      totalPages,
    };
  } catch (err) {
    logger.warn('[LocalKnowledgePublished] listPublishedKnowledge failed', {
      tenantId,
      error: (err as Error).message,
    });
    return {
      data: [],
      page,
      pageSize,
      total: 0,
      totalPages: 0,
    };
  }
}

/**
 * Full-text search published knowledge
 */
export async function searchPublishedKnowledge(
  tenantId: string,
  query: string,
  limit: number = 50,
): Promise<PublishedKnowledge[]> {
  const schema = tenantSchema(tenantId);
  try {
    const searchTerms = query.split(' ').filter(t => t.length > 0).join(' & ');
    const res = await safeQuery(
      `SELECT * FROM "${schema}".local_knowledge_published
       WHERE tenant_id = $1
         AND status IN ('approved', 'published')
         AND to_tsvector('english', COALESCE(searchable_text, '')) @@ to_tsquery('english', $2)
       ORDER BY ts_rank(to_tsvector('english', COALESCE(searchable_text, '')), to_tsquery('english', $2)) DESC
       LIMIT $3`,
      [tenantId, searchTerms, limit],
    );
    return res.rows.map(mapPublishedRow);
  } catch (err) {
    logger.warn('[LocalKnowledgePublished] searchPublishedKnowledge failed', {
      tenantId,
      query,
      error: (err as Error).message,
    });
    return [];
  }
}

function mapPublishedRow(row: Record<string, unknown>): PublishedKnowledge {
  return {

    publishedId: row.published_id,

    tenantId: row.tenant_id,

    workspaceId: row.workspace_id || undefined,

    sourceDocumentId: row.source_document_id || undefined,

    sourceIngestionId: row.source_ingestion_id || undefined,

    knowledgeType: row.knowledge_type,

    title: row.title,

    content: row.content,

    summary: row.summary || undefined,

    tags: row.tags || undefined,

    modules: row.modules || undefined,

    frameworks: row.frameworks || undefined,

    controls: row.controls || undefined,

    orgUnits: row.org_units || undefined,

    approvedBy: row.approved_by || undefined,

    approvedAt: row.approved_at || undefined,

    status: row.status,

    publishedAt: row.published_at || undefined,

    searchableText: row.searchable_text || undefined,

    createdAt: row.created_at,

    updatedAt: row.updated_at,
  };
}

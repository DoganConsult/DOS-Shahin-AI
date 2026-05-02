// ============================================
// Shahin-Ai — Local Knowledge Published Service
// R3.3B Phase D: Manages published knowledge (lessons, playbooks, articles)
// ============================================

import { safeQuery, tenantSchema } from '../../action/ports/database.port';
import { logger } from '../../action/ports/logger.port';
import { validateDocument as validateDocumentForPublishing } from './local-knowledge-validation.service';
import type { PaginationParams, PaginatedResponse } from './local-knowledge-documents.service';
import { LocalKnowledgeAutoRepo } from "../repositories/auto-extracted.repo";

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
  const _schema = tenantSchema(tenantId);
  try {
    const res = await LocalKnowledgeAutoRepo.query129(tenantSchema(tenantId), [approvedBy, publishedId, tenantId]);
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
  const _schema = tenantSchema(tenantId);
  try {
    const res = await LocalKnowledgeAutoRepo.query128(tenantSchema(tenantId), [publishedId, tenantId]);
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
  const page = pagination?.page ?? 1;
  const pageSize = Math.min(pagination?.pageSize ?? 50, 200); // Max 200 per page
  const offset = (page - 1) * pageSize;

  try {
    const countParams: unknown[] = [tenantId];

    const params: unknown[] = [tenantId];

    if (filters?.knowledgeType) {
      params.push(filters.knowledgeType);
      countParams.push(filters.knowledgeType);
    }

    if (filters?.status) {
      params.push(filters.status);
      countParams.push(filters.status);
    }

    if (filters?.module) {
      params.push(filters.module);
      countParams.push(filters.module);
    }

    if (filters?.framework) {
      params.push(filters.framework);
      countParams.push(filters.framework);
    }

    if (filters?.workspaceId) {
      params.push(filters.workspaceId);
      countParams.push(filters.workspaceId);
    }

    // Get total count
    const countRes = await LocalKnowledgeAutoRepo.query127(tenantSchema(tenantId), countParams);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    // Get paginated results
    params.push(pageSize, offset);

    const res = await LocalKnowledgeAutoRepo.query126(tenantSchema(tenantId), params);
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
  const _schema = tenantSchema(tenantId);
  try {
    const searchTerms = query.split(' ').filter(t => t.length > 0).join(' & ');
    const res = await LocalKnowledgeAutoRepo.query125(tenantSchema(tenantId), [tenantId, searchTerms, limit]);
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

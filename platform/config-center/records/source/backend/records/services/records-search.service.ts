// ============================================
// Shahin-Ai — Records Search Service
// Full-text search, metadata search,
// classification filtering, cross-module
// discovery, saved searches
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow as _getFirstRow } from "@dos/db";

// === Types ===

export interface SearchFilters {
  query?: string;
  recordType?: string;
  classification?: string;
  status?: string;
  tags?: string[];
  createdAfter?: string;
  createdBefore?: string;
  legalHold?: boolean;
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  recordType: string;
  classification: string;
  status: string;
  tags: string[];
  relevanceScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface SavedSearch {
  savedSearchId: string;
  userId: string;
  name: string;
  filters: SearchFilters;
  createdAt: string;
  lastRunAt: string | null;
  resultCount: number | null;
}

export interface CrossModuleResult {
  source: string;
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

// === Pure Functions ===

export function buildTextSearchCondition(query: string, idx: number): { clause: string; value: string } {
  const cleaned = query.trim().replace(/[%_\\]/g, c => `\\${c}`);
  return {
    clause: `(to_tsvector('english', title || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', $${idx}) OR title ILIKE $${idx + 1})`,
    value: cleaned,
  };
}

export function buildFilterConditions(
  filters: SearchFilters,
  startIdx: number
): { conditions: string[]; params: unknown[]; nextIdx: number } {
  const conditions: string[] = ["deleted_at IS NULL"];
  const params: unknown[] = [];
  let idx = startIdx;

  if (filters.recordType) {
    conditions.push(`record_type = $${idx++}`);
    params.push(filters.recordType);
  }
  if (filters.classification) {
    conditions.push(`classification = $${idx++}`);
    params.push(filters.classification);
  }
  if (filters.status) {
    conditions.push(`status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.legalHold !== undefined) {
    conditions.push(`legal_hold = $${idx++}`);
    params.push(filters.legalHold);
  }
  if (filters.createdAfter) {
    conditions.push(`created_at >= $${idx++}`);
    params.push(filters.createdAfter);
  }
  if (filters.createdBefore) {
    conditions.push(`created_at <= $${idx++}`);
    params.push(filters.createdBefore);
  }
  if (filters.tags && filters.tags.length > 0) {
    conditions.push(`tags @> $${idx++}::jsonb`);
    params.push(JSON.stringify(filters.tags));
  }

  return { conditions, params, nextIdx: idx };
}

// === DB-backed Functions ===

function mapSearchResult(r: any, score = 1): SearchResult {
  return {
    id: r.id,
    title: r.title,
    description: r.description || "",
    recordType: r.record_type,
    classification: r.classification,
    status: r.status,
    tags: r.tags || [],
    relevanceScore: score,
    createdAt: r.created_at?.toISOString?.() || r.created_at,
    updatedAt: r.updated_at?.toISOString?.() || r.updated_at,
  };
}

export async function searchRecords(
  tenantId: string,
  filters: SearchFilters,
  limit = 50,
  offset = 0
): Promise<{ results: SearchResult[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const { conditions, params, nextIdx } = buildFilterConditions(filters, 1);
  let idx = nextIdx;

  let textClause = "";
  if (filters.query) {
    const { clause, value } = buildTextSearchCondition(filters.query, idx);
    textClause = clause;
    conditions.push(textClause);
    params.push(value);
    params.push(`%${value}%`);
    idx += 2;
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const countResult = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".records_records ${where}`,
    params
  );

  params.push(limit);
  params.push(offset);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".records_records ${where} ORDER BY updated_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    params
  );

  return {
    results: result.rows.map(r => mapSearchResult(r)),
    total: parseInt(countResult.rows[0]?.cnt, 10) || 0,
  };
}

export async function searchByMetadata(
  tenantId: string,
  metadataKey: string,
  metadataValue: unknown
): Promise<SearchResult[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".records_records
     WHERE metadata @> $1 AND deleted_at IS NULL
     ORDER BY updated_at DESC LIMIT 100`,
    [JSON.stringify({ [metadataKey]: metadataValue })]
  );
  return result.rows.map(r => mapSearchResult(r));
}

export async function crossModuleDiscovery(
  tenantId: string,
  query: string
): Promise<CrossModuleResult[]> {
  const schema = tenantSchema(tenantId);
  const results: CrossModuleResult[] = [];

  const sources = [
    { table: "records_records", idCol: "id", source: "records" },
    { table: "ucf_controls", idCol: "control_id", source: "controls" },
    { table: "policy_documents", idCol: "document_id", source: "policy" },
    { table: "evidence_items", idCol: "evidence_id", source: "evidence" },
  ];

  for (const s of sources) {
    try {
      const r = await safeQuery(
        `SELECT ${s.idCol} AS id, title, status, created_at
         FROM "${schema}".${s.table}
         WHERE title ILIKE $1 AND deleted_at IS NULL
         LIMIT 10`,
        [`%${query}%`]
      );
      for (const row of r.rows) {
        results.push({
          source: s.source,
          id: row.id,
          title: row.title,
          status: row.status || "unknown",
          createdAt: row.created_at?.toISOString?.() || row.created_at,
        });
      }
    } catch { /* table may not exist in this tenant */ }
  }

  return results;
}

export async function saveSearch(
  tenantId: string,
  userId: string,
  name: string,
  filters: SearchFilters
): Promise<SavedSearch> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".record_saved_searches (user_id, name, filters)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, name, JSON.stringify(filters)]
  );
  const r = result.rows[0];
  return {
    savedSearchId: r.saved_search_id, userId: r.user_id, name: r.name,
    filters: r.filters, createdAt: r.created_at?.toISOString?.() || r.created_at,
    lastRunAt: null, resultCount: null,
  };
}

export async function runSavedSearch(
  tenantId: string,
  savedSearchId: string,
  userId: string
): Promise<{ results: SearchResult[]; total: number }> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.records_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

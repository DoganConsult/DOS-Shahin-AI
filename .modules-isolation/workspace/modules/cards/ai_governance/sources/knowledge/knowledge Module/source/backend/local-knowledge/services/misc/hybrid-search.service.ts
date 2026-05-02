import { logger } from '../../ports/logger.port';
// ============================================================================
// AGRC-OS — Hybrid Semantic Search Service (F42-43)
//
// Combined keyword + vector search across GRC entities:
//   - Keyword search via OpenSearch (full-text, faceted)
//   - Optional vector/semantic search via Qdrant
//   - Result merging with reciprocal rank fusion (RRF)
//   - GRC-specific boosting (NCA, SAMA, PDPL prioritized)
//   - Autocomplete suggestions via OpenSearch suggest API
//   - Multi-language support (English + Arabic)
//
// Search options support filtering by framework, regulator,
// entity type, domain, and sensitivity classification.
// ============================================================================

import { safeQuery as _safeQuery, tenantSchema as _tenantSchema } from '../../ports/database.port';
import { eventBus as _eventBus } from '../../ports/events.port';
import {
  search as osSearch,
  indexDocument as _indexDocument,
} from "../../../../connectors/opensearch.connector";
import { searchPoints } from "../../../../connectors/qdrant.connector";
import { v4 as _uuid } from "uuid";
import type { GenericRow as _GenericRow } from '@dos/types';

// ── Types ──────────────────────────────────────────────────────────────────

/** Search filter options */
export interface SearchOptions {
  /** Filter by framework names or IDs */
  frameworks?: string[];
  /** Filter by regulator IDs */
  regulators?: string[];
  /** Filter by entity types */
  entityTypes?: Array<"regulation" | "evidence" | "control" | "policy">;
  /** Filter by GRC domains */
  domains?: string[];
  /** Filter by sensitivity classification */
  sensitivity?: string;
  /** Maximum results to return (default 20) */
  limit?: number;
  /** Pagination offset (default 0) */
  offset?: number;
  /** Enable vector/semantic search alongside keyword search */
  enableSemantic?: boolean;
  /** Pre-computed embedding vector for semantic search */
  queryVector?: number[];
  /** Language preference for boosting (en or ar) */
  language?: "en" | "ar";
  /** Sort order: relevance or date */
  sortBy?: "relevance" | "date";
}

/** A single search result combining keyword and vector matches */
export interface SearchResultItem {
  /** Entity ID */
  entityId: string;
  /** Entity type */
  entityType: string;
  /** Document title */
  title: string;
  /** Matched content snippet or highlight */
  snippet: string;
  /** Combined relevance score (0-1) */
  score: number;
  /** Source of the match: keyword, vector, or hybrid */
  source: "keyword" | "vector" | "hybrid";
  /** Framework name if applicable */
  framework?: string;
  /** Domain classification */
  domain?: string;
  /** Entity status */
  status?: string;
  /** Clause reference for regulation clauses */
  clauseRef?: string;
  /** Owner name */
  ownerName?: string;
  /** Highlighted matching fragments */
  highlights?: Record<string, string[]>;
  /** Creation date */
  createdAt?: string;
}

/** Search response with results, total count, and facets */
export interface SearchResponse {
  /** Matching results for the current page */
  results: SearchResultItem[];
  /** Total matching documents across all pages */
  total: number;
  /** Aggregated facets for filtering */
  facets: SearchFacets;
  /** Query execution time in milliseconds */
  took: number;
  /** Whether semantic search was used */
  semanticUsed: boolean;
}

/** Faceted aggregation counts for search refinement */
export interface SearchFacets {
  entityTypes: Record<string, number>;
  frameworks: Record<string, number>;
  domains: Record<string, number>;
  statuses: Record<string, number>;
}

/** Autocomplete suggestion */
export interface SearchSuggestion {
  text: string;
  score: number;
  entityType?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

/** Saudi-specific frameworks that receive boosted relevance scores */
const BOOSTED_FRAMEWORKS = [
  "NCA-ECC",
  "NCA-CSCC",
  "NCA-DCC",
  "SAMA-CSF",
  "SAMA-BCM",
  "PDPL",
  "NCA",
  "SAMA",
];

/** Boost multiplier applied to results from prioritized frameworks */
const FRAMEWORK_BOOST_FACTOR = 1.3;

/** Weight given to keyword results in reciprocal rank fusion */
const KEYWORD_WEIGHT = 0.6;

/** Weight given to vector results in reciprocal rank fusion */
const VECTOR_WEIGHT = 0.4;

/** Constant k for RRF formula: 1 / (k + rank) */
const RRF_K = 60;

// ── Index Naming ───────────────────────────────────────────────────────────

/**
 * Build the OpenSearch index name for a given tenant and entity type.
 */
function indexName(tenantId: string, entityType: string): string {
  const sanitized = tenantId.toLowerCase().replace(/[^a-z0-9]/g, "_");
  return `shahin_${sanitized}_${entityType}`;
}

/**
 * Build the Qdrant collection name for semantic vectors.
 */
function vectorCollection(tenantId: string): string {
  const sanitized = tenantId.toLowerCase().replace(/[^a-z0-9]/g, "_");
  return `shahin_${sanitized}_vectors`;
}

// ── OpenSearch Query Builder ───────────────────────────────────────────────

/**
 * Build an OpenSearch query DSL from the user query and filter options.
 * Supports multi-match across title, content, and Arabic fields,
 * with optional filters for framework, domain, status, etc.
 */
function buildOpenSearchQuery(query: string, options: SearchOptions): Record<string, unknown> {
  const must: unknown[] = [];
  const filter: unknown[] = [];

  // Multi-match across English and Arabic fields
  must.push({
    multi_match: {
      query,
      fields: [
        "title^3",
        "title.keyword^5",
        "titleAr^2",
        "content^1",
        "contentAr^1",
        "clauseRef^4",
        "ownerName^1",
        "tags^2",
      ],
      type: "best_fields",
      fuzziness: "AUTO",
    },
  });

  // Apply framework filter
  if (options.frameworks && options.frameworks.length > 0) {
    filter.push({
      terms: { framework: options.frameworks },
    });
  }

  // Apply regulator filter
  if (options.regulators && options.regulators.length > 0) {
    filter.push({
      terms: { regulatorId: options.regulators },
    });
  }

  // Apply entity type filter
  if (options.entityTypes && options.entityTypes.length > 0) {
    filter.push({
      terms: { entityType: options.entityTypes },
    });
  }

  // Apply domain filter
  if (options.domains && options.domains.length > 0) {
    filter.push({
      terms: { domain: options.domains },
    });
  }

  // Apply sensitivity filter
  if (options.sensitivity) {
    filter.push({
      term: { sensitivity: options.sensitivity },
    });
  }

  // Build the final bool query
  const boolQuery: any = { must };
  if (filter.length > 0) {
    boolQuery.filter = filter;
  }

  // Add function_score for GRC framework boosting
  return {
    function_score: {
      query: { bool: boolQuery },
      functions: [
        {
          filter: { terms: { framework: BOOSTED_FRAMEWORKS } },
          weight: FRAMEWORK_BOOST_FACTOR,
        },
      ],
      score_mode: "multiply",
      boost_mode: "multiply",
    },
  };
}

// ── Result Merging ─────────────────────────────────────────────────────────

/**
 * Merge keyword and vector search results using Reciprocal Rank Fusion (RRF).
 * This produces a unified ranking that balances both signals.
 */
function mergeResults(
  keywordResults: SearchResultItem[],
  vectorResults: SearchResultItem[],
): SearchResultItem[] {
  const scoreMap = new Map<string, { item: SearchResultItem; rrfScore: number }>();

  // Score keyword results by rank
  keywordResults.forEach((item, rank) => {
    const rrfScore = KEYWORD_WEIGHT * (1 / (RRF_K + rank + 1));
    scoreMap.set(item.entityId, { item, rrfScore });
  });

  // Score vector results by rank and merge
  vectorResults.forEach((item, rank) => {
    const vectorRrfScore = VECTOR_WEIGHT * (1 / (RRF_K + rank + 1));
    const existing = scoreMap.get(item.entityId);

    if (existing) {
      // Item appears in both results — combine scores and mark as hybrid
      existing.rrfScore += vectorRrfScore;
      existing.item.source = "hybrid";
      // Merge highlights if present
      if (item.highlights) {
        existing.item.highlights = {
          ...(existing.item.highlights || {}),
          ...item.highlights,
        };
      }
    } else {
      scoreMap.set(item.entityId, { item: { ...item, source: "vector" }, rrfScore: vectorRrfScore });
    }
  });

  // Sort by RRF score descending
  const merged = Array.from(scoreMap.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .map(({ item, rrfScore }) => ({
      ...item,
      score: Math.min(rrfScore * 100, 1), // Normalize score to 0-1
    }));

  return merged;
}

/**
 * Extract the best text snippet from highlights or content.
 */
function extractSnippet(source: any, highlights?: Record<string, string[]>): string {
  // Prefer highlighted fragments
  if (highlights) {
    for (const field of ["content", "title", "contentAr", "titleAr"]) {
      if (highlights[field] && highlights[field].length > 0) {
        return highlights[field][0];
      }
    }
  }

  // Fallback to truncated content
  const content = source.content || source.title || "";
  if (content.length > 200) {
    return content.slice(0, 200) + "...";
  }
  return content;
}

// ── Main Search Function ───────────────────────────────────────────────────

/**
 * Execute a hybrid search across GRC entities.
 *
 * Performs keyword search via OpenSearch, optionally combined with
 * vector/semantic search via Qdrant. Results are merged using
 * Reciprocal Rank Fusion (RRF) with GRC-specific boosting for
 * Saudi regulatory frameworks (NCA, SAMA, PDPL).
 *
 * @param tenantId - Tenant identifier for index scoping
 * @param query    - User search query text
 * @param options  - Optional filters, pagination, and search mode settings
 * @returns Search response with results, facets, and metadata
 */
export async function search(
  tenantId: string,
  query: string,
  options: SearchOptions = {},
): Promise<SearchResponse> {
  const startTime = Date.now();
  const limit = options.limit || 20;
  const offset = options.offset || 0;

  // Determine which indices to search
  const entityTypes = options.entityTypes || ["regulation", "evidence", "control", "policy"];
  const indices = entityTypes.map((et: any) => indexName(tenantId, et)).join(",");

  // Build and execute OpenSearch keyword query
  const osQuery = buildOpenSearchQuery(query, options);

  let keywordResults: SearchResultItem[] = [];
  let totalHits = 0;
  let facets: SearchFacets = {
    entityTypes: {},
    frameworks: {},
    domains: {},
    statuses: {},
  };

  try {
    const osResponse = await osSearch(indices, osQuery, limit + 10, offset);
    totalHits = osResponse.total;

    (keywordResults as any) = osResponse.hits.map((hit: any) => ({
      entityId: hit.source.entityId || hit.id,
      entityType: hit.source.entityType || "any",
      title: hit.source.title || hit.source.titleAr || "",
      snippet: extractSnippet(hit.source, hit.highlights),
      score: hit.score / (osResponse.hits[0]?.score || 1), // Normalize to 0-1
      source: "keyword" as const,
      framework: hit.source.framework,
      domain: hit.source.domain,
      status: hit.source.status,
      clauseRef: hit.source.clauseRef,
      ownerName: hit.source.ownerName,
      highlights: hit.highlights,
      createdAt: hit.source.createdAt,
    }));

    // Build facets from results (approximate; full facets require separate aggs query)
    for (const hit of osResponse.hits) {
      const src = hit.source;
      if (src.entityType) {
        facets.entityTypes[(src as any).entityType] = (facets.entityTypes[(src as any).entityType] || 0) + 1;
      }
      if (src.framework) {
        facets.frameworks[(src as any).framework] = (facets.frameworks[(src as any).framework] || 0) + 1;
      }
      if (src.domain) {
        facets.domains[(src as any).domain] = (facets.domains[(src as any).domain] || 0) + 1;
      }
      if (src.status) {
        facets.statuses[(src as any).status] = (facets.statuses[(src as any).status] || 0) + 1;
      }
    }
  } catch (err: unknown) {
    logger.warn(`[HybridSearch] OpenSearch keyword search failed: ${(err instanceof Error ? err.message : String(err))}`);
  }

  // Optionally execute vector/semantic search via Qdrant
  let vectorResults: SearchResultItem[] = [];
  const semanticUsed = !!(options.enableSemantic && options.queryVector && options.queryVector.length > 0);

  if (semanticUsed && options.queryVector) {
    try {
      const collection = vectorCollection(tenantId);

      // Build Qdrant filter from options
      const qdrantFilter: any = { must: [] };
      if (options.entityTypes && options.entityTypes.length > 0) {
        qdrantFilter.must.push({
          key: "entityType",
          match: { any: options.entityTypes },
        });
      }
      if (options.frameworks && options.frameworks.length > 0) {
        qdrantFilter.must.push({
          key: "framework",
          match: { any: options.frameworks },
        });
      }

      const filter = qdrantFilter.must.length > 0 ? qdrantFilter : undefined;
      const qdrantResults = await searchPoints(
        collection,
        options.queryVector,
        limit,
        filter,
      );

      (vectorResults as any) = qdrantResults.map((point: any) => ({
        entityId: point.payload.entityId || point.id,
        entityType: point.payload.entityType || "any",
        title: point.payload.title || "",

        snippet: (point.payload.content || "").slice(0, 200),
        score: point.score,
        source: "vector" as const,
        framework: point.payload.framework,
        domain: point.payload.domain,
        status: point.payload.status,
        clauseRef: point.payload.clauseRef,
        ownerName: point.payload.ownerName,
        createdAt: point.payload.createdAt,
      }));
    } catch (err: unknown) {
      logger.warn(`[HybridSearch] Qdrant vector search failed: ${(err instanceof Error ? err.message : String(err))}`);
    }
  }

  // Merge results using RRF if both sources returned data
  let finalResults: SearchResultItem[];

  if (keywordResults.length > 0 && vectorResults.length > 0) {
    finalResults = mergeResults(keywordResults, vectorResults);
  } else if (vectorResults.length > 0) {
    finalResults = vectorResults;
  } else {
    finalResults = keywordResults;
  }

  // Apply pagination to merged results
  const paginatedResults = finalResults.slice(0, limit);

  // Apply GRC framework boosting to final scores
  for (const result of paginatedResults) {
    if (result.framework && BOOSTED_FRAMEWORKS.some((bf) =>
      result.framework!.toUpperCase().includes(bf.toUpperCase()),
    )) {
      result.score = Math.min(result.score * FRAMEWORK_BOOST_FACTOR, 1);
    }
  }

  const took = Date.now() - startTime;

  return {
    results: paginatedResults,
    total: Math.max(totalHits, finalResults.length),
    facets,
    took,
    semanticUsed,
  };
}

// ── Autocomplete Suggestions ───────────────────────────────────────────────

/**
 * Get search autocomplete suggestions based on a partial query.
 * Uses OpenSearch prefix matching on title fields across all
 * entity types for the given tenant.
 *
 * @param tenantId     - Tenant identifier
 * @param partialQuery - Partial search text for autocompletion
 * @returns Array of suggestion strings with scores
 */
export async function getSearchSuggestions(
  tenantId: string,
  partialQuery: string,
): Promise<SearchSuggestion[]> {
  if (!partialQuery || partialQuery.length < 2) {
    return [];
  }

  const entityTypes = ["regulation", "evidence", "control", "policy"];
  const indices = entityTypes.map((et: any) => indexName(tenantId, et)).join(",");

  // Use prefix query on title fields for fast autocompletion
  const suggestQuery = {
    bool: {
      should: [
        { prefix: { "title.keyword": { value: partialQuery, boost: 3 } } },
        { match_phrase_prefix: { title: { query: partialQuery, boost: 2 } } },
        { match_phrase_prefix: { titleAr: { query: partialQuery, boost: 1.5 } } },
        { match_phrase_prefix: { clauseRef: { query: partialQuery, boost: 4 } } },
      ],
      minimum_should_match: 1,
    },
  };

  const suggestions: SearchSuggestion[] = [];

  try {
    const response = await osSearch(indices, suggestQuery, 10, 0);

    for (const hit of response.hits) {
      const title = hit.source.title || hit.source.titleAr || "";
      if (title && !suggestions.some((s) => s.text === title)) {
        suggestions.push({

          text: title,
          score: hit.score,

          entityType: hit.source.entityType,
        });
      }
    }
  } catch (err: unknown) {
    logger.warn(`[HybridSearch] Suggestions query failed: ${(err instanceof Error ? err.message : String(err))}`);
  }

  // Sort by score descending and limit to 10 suggestions
  suggestions.sort((a, b) => b.score - a.score);
  return suggestions.slice(0, 10);
}

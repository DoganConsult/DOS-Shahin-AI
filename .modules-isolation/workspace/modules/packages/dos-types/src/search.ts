/**
 * @dos/types — search types
 * Covers global search, GRC query engine, unified search
 */

// ── Search Request Types ──────────────────────────────────────────────────

export type SearchEntityType =
  | 'risk'
  | 'control'
  | 'finding'
  | 'evidence'
  | 'task'
  | 'incident'
  | 'policy'
  | 'vendor'
  | 'asset'
  | 'user'
  | 'document'
  | 'compliance_item'
  | 'workflow'
  | 'module'
  | 'any';

export type SearchSortField = 'relevance' | 'created_at' | 'updated_at' | 'name' | 'status' | 'priority';

export interface SearchQuery {
  query: string;
  entityTypes?: SearchEntityType[];
  tenantId: string;
  workspaceId?: string;
  userId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: SearchSortField;
  sortOrder?: 'asc' | 'desc';
  filters?: SearchFilters;
  highlight?: boolean;
  fuzzy?: boolean;
}

export interface SearchFilters {
  moduleCode?: string[];
  status?: string[];
  priority?: string[];
  framework?: string[];
  dateRange?: {
    field: string;
    from?: string;
    to?: string;
  };
  createdBy?: string[];
  assignedTo?: string[];
  tags?: string[];
  customFilters?: Record<string, unknown>;
}

export interface SearchResult<T = Record<string, unknown>> {
  entityId: string;
  entityType: SearchEntityType;
  tenantId: string;
  score: number;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  moduleCode?: string;
  status?: string;
  highlights?: Record<string, string[]>;
  metadata?: Record<string, unknown>;
  data?: T;
  createdAt?: string;
  updatedAt?: string;
}

export interface SearchResponse {
  query: string;
  total: number;
  results: SearchResult[];
  facets?: SearchFacets;
  suggestions?: string[];
  executionMs?: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SearchFacets {
  entityTypes?: FacetBucket[];
  status?: FacetBucket[];
  priority?: FacetBucket[];
  framework?: FacetBucket[];
  moduleCode?: FacetBucket[];
  [key: string]: FacetBucket[] | undefined;
}

export interface FacetBucket {
  value: string;
  count: number;
  label?: string;
}

// ── GRC Query Engine Types ────────────────────────────────────────────────

export type GRCQueryOperator =
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'in' | 'nin' | 'contains' | 'starts_with' | 'ends_with'
  | 'is_null' | 'is_not_null' | 'between' | 'regex';

export type GRCQueryLogical = 'AND' | 'OR' | 'NOT';

export interface GRCQueryCondition {
  field: string;
  operator: GRCQueryOperator;
  value?: unknown;
  values?: unknown[];
}

export interface GRCQueryGroup {
  logical: GRCQueryLogical;
  conditions?: GRCQueryCondition[];
  groups?: GRCQueryGroup[];
}

export interface GRCQuery {
  entityType: SearchEntityType;
  tenantId: string;
  workspaceId?: string;
  conditions?: GRCQueryCondition[];
  groups?: GRCQueryGroup[];
  select?: string[];
  orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  limit?: number;
  offset?: number;
  includeCounts?: boolean;
}

export interface GRCQueryResult<T = Record<string, unknown>> {
  entityType: SearchEntityType;
  total: number;
  data: T[];
  executionMs: number;
  queryId?: string;
}

// ── Saved Search Types ────────────────────────────────────────────────────

export interface SavedSearch {
  savedSearchId: string;
  tenantId: string;
  userId: string;
  name: string;
  nameAr?: string;
  query: SearchQuery;
  isShared: boolean;
  isDefault?: boolean;
  tags?: string[];
  executionCount?: number;
  lastExecutedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchSuggestion {
  text: string;
  entityType?: SearchEntityType;
  entityId?: string;
  score: number;
}

// ── Search Analytics Types ────────────────────────────────────────────────

export interface SearchAnalytics {
  period: string;
  totalSearches: number;
  uniqueUsers: number;
  averageResultCount: number;
  zerResultQueries: string[];
  topQueries: Array<{ query: string; count: number }>;
  averageExecutionMs: number;
  clickThroughRate: number;
}

export interface SearchIndexStatus {
  entityType: SearchEntityType;
  documentCount: number;
  lastIndexedAt?: string;
  indexSize?: string;
  isHealthy: boolean;
  pendingDocuments?: number;
}

// ── Knowledge Graph Search Types ──────────────────────────────────────────

export interface KnowledgeNode {
  nodeId: string;
  tenantId: string;
  type: string;
  label: string;
  labelAr?: string;
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface KnowledgeEdge {
  edgeId: string;
  tenantId: string;
  fromNodeId: string;
  toNodeId: string;
  relationship: string;
  weight?: number;
  properties?: Record<string, unknown>;
  createdAt: string;
}

export interface KnowledgeGraphQuery {
  startNodeId?: string;
  nodeTypes?: string[];
  relationships?: string[];
  maxDepth?: number;
  limit?: number;
  tenantId: string;
}

export interface KnowledgeGraphResult {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  paths?: Array<{ nodeIds: string[]; edgeIds: string[] }>;
  executionMs?: number;
}

// ── Ontology Types ────────────────────────────────────────────────────────

export interface OntologyTerm {
  termId: string;
  tenantId?: string;
  term: string;
  termAr?: string;
  definition: string;
  definitionAr?: string;
  category: string;
  synonyms?: string[];
  relatedTerms?: string[];
  parentTermId?: string;
  frameworkCode?: string;
  isStandard: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OntologyMapping {
  mappingId: string;
  sourceTerm: string;
  targetTerm: string;
  confidence: number;
  mappingType: 'exact' | 'narrow' | 'broad' | 'related';
  mappingSource: string;
  createdAt: string;
}

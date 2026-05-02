export interface SearchOptions {
  query: string;
  tenantId: string;
  userId?: string;
  types?: string[];
  status?: string[];
  owners?: string[];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchHit {
  id: string;
  type: string;
  title: string;
  description?: string;
  status?: string;
  url?: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface SearchResults {
  hits: SearchHit[];
  total: number;
  limit: number;
  offset: number;
}

export interface SavedSearchRecord {
  id: string;
  name: string;
  query: string;
  filters: Record<string, unknown>;
  createdAt: string;
  userId: string;
  tenantId: string;
}

export function computeRetryDelay(attempt: number, baseMs = 1000): number {
  return Math.min(baseMs * Math.pow(2, attempt), 30000);
}

export interface PlatformSearch {
  search(opts: SearchOptions): Promise<SearchResults>;
  recordSearch(tenantId: string, userId: string, query: string): Promise<void>;
  getRecentSearches(tenantId: string, userId: string, limit?: number): Promise<string[]>;
  saveSearch(tenantId: string, userId: string, name: string, opts: Omit<SearchOptions, 'tenantId' | 'userId'>): Promise<SavedSearchRecord>;
  getSavedSearches(tenantId: string, userId: string): Promise<SavedSearchRecord[]>;
  deleteSavedSearch(tenantId: string, userId: string, searchId: string): Promise<void>;
}

let _search: PlatformSearch | null = null;

export function setSearchProvider(impl: PlatformSearch): void {
  _search = impl;
}

function getSearch(): PlatformSearch {
  if (!_search) {
    throw new Error('PlatformSearch not initialized. Call setSearchProvider() first.');
  }
  return _search;
}

export function search(opts: SearchOptions): Promise<SearchResults> {
  return getSearch().search(opts);
}

export function recordSearch(tenantId: string, userId: string, query: string): Promise<void> {
  return getSearch().recordSearch(tenantId, userId, query);
}

export function getRecentSearches(tenantId: string, userId: string, limit?: number): Promise<string[]> {
  return getSearch().getRecentSearches(tenantId, userId, limit);
}

export function saveSearch(tenantId: string, userId: string, name: string, opts: Omit<SearchOptions, 'tenantId' | 'userId'>): Promise<SavedSearchRecord> {
  return getSearch().saveSearch(tenantId, userId, name, opts);
}

export function getSavedSearches(tenantId: string, userId: string): Promise<SavedSearchRecord[]> {
  return getSearch().getSavedSearches(tenantId, userId);
}

export function deleteSavedSearch(tenantId: string, userId: string, searchId: string): Promise<void> {
  return getSearch().deleteSavedSearch(tenantId, userId, searchId);
}

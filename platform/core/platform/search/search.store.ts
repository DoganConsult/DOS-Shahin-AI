import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { StorageService } from '@app/infrastructure';

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  titleAr?: string;
  description?: string;
  score: number;
  module: string;
  route: string;
}

export interface SearchState {
  query: string;
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  recentSearches: string[];
}

@Injectable({ providedIn: 'root' })
export class SearchStore {
  private http = inject(HttpClient);
  private _storage = inject(StorageService);

  private readonly _query = signal('');
  private readonly _results = signal<SearchResult[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _recentSearches = signal<string[]>(this.loadRecentSearches());

  readonly query = this._query.asReadonly();
  readonly results = this._results.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly recentSearches = this._recentSearches.asReadonly();
  readonly hasResults = computed(() => this._results().length > 0);
  readonly resultCount = computed(() => this._results().length);

  readonly resultsByModule = computed(() => {
    const grouped = new Map<string, SearchResult[]>();
    for (const r of this._results()) {
      const existing = grouped.get(r.module) || [];
      existing.push(r);
      grouped.set(r.module, existing);
    }
    return grouped;
  });

  search(query: string, modules?: string[]): void {
    if (!query || query.trim().length < 2) {
      this._results.set([]);
      return;
    }

    this._query.set(query);
    this._loading.set(true);
    this._error.set(null);

    const params: Record<string, string> = { q: query };
    if (modules?.length) params['modules'] = modules.join(',');

    this.http.get<{ results: SearchResult[] }>(
      `${environment.apiUrl}/api/unified-search`,
      { params },
    ).subscribe({
      next: (res) => {
        this._results.set(res.results || []);
        this._loading.set(false);
        this.addToRecent(query);
      },
      error: (err) => {
        this._error.set(err.message || 'Search failed');
        this._loading.set(false);
      },
    });
  }

  clear(): void {
    this._query.set('');
    this._results.set([]);
    this._error.set(null);
  }

  private recentSearchesKey(): string {
    const tenantId = this._storage.get('grc_tenantId') || 'default';
    return `shahin_recent_searches_${tenantId}`;
  }

  private loadRecentSearches(): string[] {
    try {
      const raw = this._storage.get(this.recentSearchesKey());
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private addToRecent(query: string): void {
    const recent = this._recentSearches().filter(q => q !== query);
    recent.unshift(query);
    const trimmed = recent.slice(0, 10);
    this._recentSearches.set(trimmed);
    this._storage.set(this.recentSearchesKey(), JSON.stringify(trimmed));
  }

  clearRecentSearches(): void {
    this._recentSearches.set([]);
    this._storage.remove(this.recentSearchesKey());
  }
}

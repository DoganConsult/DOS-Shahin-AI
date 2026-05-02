import { Injectable, signal, computed } from '@angular/core';
import type { KnowledgeArticleContract, KnowledgeArticleStatus } from '../contracts/local-knowledge.contracts';

@Injectable({ providedIn: 'root' })
export class LocalKnowledgeState {
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _articles = signal<KnowledgeArticleContract[]>([]);
  private readonly _selectedId = signal<string | null>(null);
  private readonly _filterCategory = signal<string | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly articles = this._articles.asReadonly();
  readonly selectedId = this._selectedId.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._articles().length === 0);
  readonly totalCount = computed(() => this._articles().length);
  readonly selected = computed(() => this._articles().find(a => a.articleId === this._selectedId()) ?? null);
  readonly publishedCount = computed(() => this._articles().filter(a => a.status === 'published').length);
  readonly outdatedCount = computed(() => this._articles().filter(a => a.status === 'outdated').length);

  setLoading(v: boolean): void { this._loading.set(v); }
  setError(v: string | null): void { this._error.set(v); }
  setArticles(v: KnowledgeArticleContract[]): void { this._articles.set(v); }
  selectItem(id: string | null): void { this._selectedId.set(id); }
  setFilterCategory(v: string | null): void { this._filterCategory.set(v); }

  reset(): void {
    this._loading.set(false);
    this._error.set(null);
    this._articles.set([]);
    this._selectedId.set(null);
    this._filterCategory.set(null);
  }
}

import { Injectable } from '@angular/core';
import Fuse, { IFuseOptions } from 'fuse.js';

export interface FuzzyResult<T> {
  item: T;
  score: number;
}

@Injectable({ providedIn: 'root' })
export class FuzzySearchService {
  search<T extends Record<string, unknown>>(
    items: T[],
    keys: string[],
    query: string,
    limit = 20,
    options?: Partial<IFuseOptions<T>>,
  ): FuzzyResult<T>[] {
    if (!query || query.trim().length < 2) return items.slice(0, limit).map(item => ({ item, score: 0 }));

    const fuse = new Fuse(items, {
      keys,
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 2,
      ...options,
    });

    return fuse.search(query, { limit }).map(r => ({
      item: r.item,
      score: r.score ?? 0,
    }));
  }

  createIndex<T extends Record<string, unknown>>(
    items: T[],
    keys: string[],
    options?: Partial<IFuseOptions<T>>,
  ): Fuse<T> {
    return new Fuse(items, {
      keys,
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 2,
      ...options,
    });
  }
}

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../config-center/environments/environment';

export interface KnowledgeArticleDto {
  id: string;
  title: string;
  bodyMd: string;
  tags: string[];
  summary?: string;
  slug?: string;
  publishedAt?: string;
}

export interface KnowledgeSearchResultDto {
  articles: KnowledgeArticleDto[];
}

interface RawKnowledgeArticle {
  id?: string | number;
  articleId?: string | number;
  article_id?: string | number;
  title?: string;
  bodyMd?: string;
  body_md?: string;
  body?: string;
  summary?: string;
  slug?: string;
  publishedAt?: string;
  published_at?: string;
  tags?: string[] | string | null;
}

interface RawKnowledgeSearchResult {
  articles?: RawKnowledgeArticle[];
}

@Injectable({ providedIn: 'root' })
export class KnowledgeApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl || '/api';

  search(query?: string): Observable<KnowledgeSearchResultDto> {
    let params = new HttpParams();

    if (query?.trim()) {
      params = params.set('q', query.trim());
    }

    return this.http
      .get<RawKnowledgeSearchResult>(`${this.apiUrl}/knowledge/search`, { params })
      .pipe(map(result => ({ articles: (result.articles ?? []).map(article => this.mapArticle(article)) })));
  }

  private mapArticle(article: RawKnowledgeArticle): KnowledgeArticleDto {
    return {
      id: String(article.id ?? article.articleId ?? article.article_id ?? ''),
      title: article.title ?? 'Untitled article',
      bodyMd: article.bodyMd ?? article.body_md ?? article.body ?? '',
      tags: this.normalizeTags(article.tags),
      summary: article.summary,
      slug: article.slug,
      publishedAt: article.publishedAt ?? article.published_at,
    };
  }

  private normalizeTags(tags: RawKnowledgeArticle['tags']): string[] {
    if (Array.isArray(tags)) {
      return tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0);
    }

    if (typeof tags !== 'string' || tags.trim().length === 0) {
      return [];
    }

    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) {
        return parsed.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0);
      }
    } catch {
      // Fall back to comma-separated tags if the backend stored plain text.
    }

    return tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }
}
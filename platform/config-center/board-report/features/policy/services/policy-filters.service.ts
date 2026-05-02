import { Injectable, signal, computed } from '@angular/core';

/**
 * Manages reactive filter state for the Policy Module.
 * Shared across policy pages so filter selections persist during navigation.
 */
@Injectable({ providedIn: 'root' })
export class PolicyFiltersService {
  /** Policy lifecycle status filter (e.g. 'draft', 'published', 'retired'). */
  readonly statusFilter = signal<string>('');

  /** Policy category filter. */
  readonly categoryFilter = signal<string>('');

  /** Policy owner (user ID or name) filter. */
  readonly ownerFilter = signal<string>('');

  /** Review-due horizon: 'overdue', 'this_week', 'this_month', 'this_quarter'. */
  readonly reviewDueFilter = signal<string>('');

  /** Target audience filter. */
  readonly audienceFilter = signal<string>('');

  /** Business domain filter. */
  readonly businessDomainFilter = signal<string>('');

  /** Regulatory framework filter. */
  readonly frameworkFilter = signal<string>('');

  /** Show only stale (review-overdue) policies. */
  readonly staleFilter = signal<boolean>(false);

  /** Show only policies with active exceptions. */
  readonly exceptionFilter = signal<boolean>(false);

  /** Free-text search query. */
  readonly searchQuery = signal<string>('');

  /** Number of currently active (non-default) filters. */
  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.statusFilter()) count++;
    if (this.categoryFilter()) count++;
    if (this.ownerFilter()) count++;
    if (this.reviewDueFilter()) count++;
    if (this.audienceFilter()) count++;
    if (this.businessDomainFilter()) count++;
    if (this.frameworkFilter()) count++;
    if (this.staleFilter()) count++;
    if (this.exceptionFilter()) count++;
    if (this.searchQuery()) count++;
    return count;
  });

  /** Reset all filters to their default (empty) values. */
  resetAll(): void {
    this.statusFilter.set('');
    this.categoryFilter.set('');
    this.ownerFilter.set('');
    this.reviewDueFilter.set('');
    this.audienceFilter.set('');
    this.businessDomainFilter.set('');
    this.frameworkFilter.set('');
    this.staleFilter.set(false);
    this.exceptionFilter.set(false);
    this.searchQuery.set('');
  }

  /** Serialize active filters to a flat query-param map (empty values omitted). */
  toQueryParams(): Record<string, string> {
    const params: Record<string, string> = {};
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.categoryFilter()) params['category'] = this.categoryFilter();
    if (this.ownerFilter()) params['owner'] = this.ownerFilter();
    if (this.reviewDueFilter()) params['reviewDue'] = this.reviewDueFilter();
    if (this.audienceFilter()) params['audience'] = this.audienceFilter();
    if (this.businessDomainFilter()) params['businessDomain'] = this.businessDomainFilter();
    if (this.frameworkFilter()) params['framework'] = this.frameworkFilter();
    if (this.staleFilter()) params['stale'] = 'true';
    if (this.exceptionFilter()) params['exception'] = 'true';
    if (this.searchQuery()) params['search'] = this.searchQuery();
    return params;
  }

  /** Hydrate filter state from a query-param map (e.g. on route activation). */
  fromQueryParams(params: Record<string, string>): void {
    if (params['status']) this.statusFilter.set(params['status']);
    if (params['category']) this.categoryFilter.set(params['category']);
    if (params['owner']) this.ownerFilter.set(params['owner']);
    if (params['reviewDue']) this.reviewDueFilter.set(params['reviewDue']);
    if (params['audience']) this.audienceFilter.set(params['audience']);
    if (params['businessDomain']) this.businessDomainFilter.set(params['businessDomain']);
    if (params['framework']) this.frameworkFilter.set(params['framework']);
    if (params['stale'] === 'true') this.staleFilter.set(true);
    if (params['exception'] === 'true') this.exceptionFilter.set(true);
    if (params['search']) this.searchQuery.set(params['search']);
  }
}

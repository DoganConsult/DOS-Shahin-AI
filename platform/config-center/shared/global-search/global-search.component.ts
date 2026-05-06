/**
 * Global Search Component
 * 
 * Search input with instant results, filter dropdowns, and keyboard navigation.
 * Requirements: 3.1, 3.2, 3.4, 3.5, 3.6, 3.7
 */
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { SessionService } from '@app/dauth/session/session.service';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { devError } from '../../../core/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';

interface SearchResult {
  id: string;
  type: string;
  title: string;
  description?: string;
  status?: string;
  score: number;
  owner?: string;
  dueDate?: string;
  framework?: string;
  quickActions?: Array<{ label: string; action: string }>;
}

interface SearchFilters {
  types: string[];
  status: string;
  owner: string;
  dateFrom: string;
  dateTo: string;
}

const SEARCH_ROUTE_MAP: Record<string, string> = {
  risk:           '/risk/register',
  control:        '/controls',
  policy:         '/policies',
  framework:      '/frameworks',
  vendor:         '/vendors',
  incident:       '/incidents',
  audit:          '/audit',
  assessment:     '/assessments',
  finding:        '/findings',
  exception:      '/exceptions',
  asset:          '/assets',
  evidence:       '/evidence',
  workflow:       '/workflows',
  regulation:     '/frameworks',
  regulatory_feed:'/regulatory-feeds',
  action_item:    '/action-items',
  user:           '/team',
  task:           '/my-tasks',
  report:         '/reports-hub',
  evidence_task:  '/evidence-tasks',
  vulnerability:  '/vulnerabilities',
  process:        '/processes',
  procedure:      '/procedures',
  taxonomy:       '/taxonomy',
};

// DB-driven search routes only. Unknown type → null = caller must
// render empty/no-op (NO FRONTEND INVENTION per AGENTS.md).
function resolveSearchRoute(type: string): string | null {
  return SEARCH_ROUTE_MAP[type] ?? SEARCH_ROUTE_MAP[type.replace(/_/g, '-')] ?? null;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-global-search',
    imports: [CommonModule, FormsModule],
    template: `
    <div class="global-search">
      <div class="search-bar">
        <i class="pi pi-search"></i>
        <input #searchInput type="text" [(ngModel)]="query" (ngModelChange)="onQueryChange($event)"
               (keydown)="onKeyDown($event)" (focus)="onFocus()"
               [placeholder]="i18n.translate('globalSearch.placeholder')"
               role="searchbox" aria-label="Global search" />
      </div>

      <div class="filter-row">
        <select [(ngModel)]="filters.status" (change)="search()" aria-label="Filter by status">
          <option value="">{{ i18n.translate('globalSearch.allStatuses') }}</option>
          <option value="active">{{ i18n.translate('globalSearch.active') }}</option>
          <option value="draft">{{ i18n.translate('globalSearch.draft') }}</option>
          <option value="closed">{{ i18n.translate('globalSearch.closed') }}</option>
        </select>
      </div>

      <div class="results-panel" *ngIf="showResults">
        <div *ngIf="recentSearches.length > 0 && !query" class="section">
          <div class="section-label">{{ i18n.translate('globalSearch.recentSearches') }}</div>
          <div tabindex="0" role="button" (keyup.enter)="applyRecent(rs)" *ngFor="let rs of recentSearches" class="recent-item" (click)="applyRecent(rs)">
            <i class="pi pi-history"></i> {{ rs }}
          </div>
        </div>

        <div tabindex="0" role="button" (keyup.enter)="openResult(result)" *ngFor="let result of results; let i = index" class="result-card"
             [class.selected]="i === selectedIndex" (click)="openResult(result)"
             role="option" [attr.aria-selected]="i === selectedIndex">
          <div class="rc-header">
            <span class="result-type-badge" [attr.data-type]="result.type">{{ result.type }}</span>
            <span *ngIf="result.status" class="rc-status" [attr.data-status]="result.status">{{ result.status }}</span>
            <span *ngIf="result.score != null" class="rc-score">{{ result.score }}</span>
          </div>
          <div class="result-title">{{ result.title }}</div>
          <div class="result-desc" *ngIf="result.description">{{ result.description }}</div>
          <div class="rc-meta">
            <span *ngIf="result.owner" class="rc-owner"><i class="pi pi-user"></i> {{ result.owner }}</span>
            <span *ngIf="result.dueDate" class="rc-date"><i class="pi pi-calendar"></i> {{ result.dueDate | date:'dd MMM' }}</span>
            <span *ngIf="result.framework" class="rc-fw"><i class="pi pi-tag"></i> {{ result.framework }}</span>
          </div>
          <div class="result-actions" *ngIf="result.quickActions">
            <button *ngFor="let action of result.quickActions" (click)="executeAction(action, result, $event)">
              {{ action.label }}
            </button>
          </div>
        </div>

        <div *ngIf="results.length === 0 && query" class="no-results">
          {{ i18n.translate('globalSearch.noResults') }}
        </div>
      </div>
    </div>
  `,
    styles: [`
    .global-search { position: relative; width: 100%; max-width: 600px; }
    /* Wave 1B refinement — 32px row, soft pill, focus ring on focus only */
    .search-bar {
      display: flex; align-items: center; gap: 8px;
      height: 32px; padding: 0 12px;
      border: 1px solid rgba(15,23,42,0.10);
      border-radius: 999px;
      background: rgba(15,23,42,0.03);
      transition: background 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
    }
    .search-bar:hover { background: rgba(15,23,42,0.05); }
    .search-bar:focus-within {
      background: #fff;
      border-color: rgba(37,99,235,0.50);
      box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
    }
    .search-bar i { color: var(--text-color-secondary, #64748b); font-size: 13px; }
    .search-bar input {
      flex: 1; border: none; outline: none;
      font-size: 13px; background: transparent;
      color: var(--shell-text-primary, #0f172a);
    }
    .search-bar input::placeholder { color: rgba(15,23,42,0.45); }
    .filter-row { display: flex; gap: 8px; margin-top: 8px; }
    .filter-row select {
      height: 28px; padding: 0 10px;
      border: 1px solid rgba(15,23,42,0.10);
      border-radius: 999px;
      font-size: 12px;
      background: rgba(15,23,42,0.03);
      color: var(--shell-text-primary, #0f172a);
      cursor: pointer;
    }
    .results-panel { position: absolute; top: 100%; left: 0; right: 0; z-index: var(--z-dropdown); background: var(--surface-card, #fff); border: 1px solid var(--surface-border, #ddd); border-radius: var(--radius); margin-top: 4px; max-height: 400px; overflow-y: auto; box-shadow: var(--shadow-lg); }
    .section-label { padding: 8px 12px; font-size: var(--font-size-sm); text-transform: uppercase; color: var(--text-color-secondary, #888); font-weight: 600; }
    .recent-item { padding: 8px 12px; cursor: pointer; font-size: var(--font-size-tag); display: flex; align-items: center; gap: 8px; }
    .recent-item:hover { background: var(--highlight-bg, #f0f4ff); }
    .result-card { padding: 12px; border-bottom: 1px solid var(--surface-border, #f0f0f0); cursor: pointer; }
    .result-card:hover, .result-card.selected { background: var(--highlight-bg, #f0f4ff); }
    .rc-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; flex-wrap: wrap; }
    .result-type-badge { display: inline-block; font-size: 0.68rem; padding: 2px 7px; border-radius: var(--radius-xs); background: #e0f2fe; color: #0369a1; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
    .rc-status { font-size: 0.68rem; padding: 2px 7px; border-radius: var(--radius-xs); font-weight: 600; text-transform: capitalize; }
    .rc-status[data-status="open"], .rc-status[data-status="active"] { background: #dcfce7; color: #166534; }
    .rc-status[data-status="closed"], .rc-status[data-status="archived"] { background: #f1f5f9; color: #64748b; }
    .rc-status[data-status="draft"] { background: var(--status-warning-bg, #fcf4d6); color: #92400e; }
    .rc-status[data-status="in_progress"] { background: #dbeafe; color: #1e40af; }
    .rc-score { font-size: var(--font-size-sm); font-weight: 700; color: #7c3aed; margin-inline-start: auto; }
    .result-title { font-weight: 500; font-size: var(--font-size-body-sm); }
    .result-desc { font-size: var(--font-size-caption); color: var(--text-color-secondary, #888); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
    .rc-meta { display: flex; gap: 10px; margin-top: 5px; flex-wrap: wrap; }
    .rc-meta span { font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 3px; }
    .rc-meta i { font-size: 0.68rem; }
    .result-actions { display: flex; gap: 8px; margin-top: 6px; }
    .result-actions button { font-size: var(--font-size-sm); padding: 2px 8px; border: 1px solid var(--primary-color, #4f46e5); border-radius: var(--radius-xs); background: transparent; color: var(--primary-color, #4f46e5); cursor: pointer; }
    .no-results { padding: 20px; text-align: center; color: var(--text-color-secondary, #888); }
  `]
})
export class GlobalSearchComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef;
  query = '';
  results: SearchResult[] = [];
  recentSearches: string[] = [];
  filters: SearchFilters = { types: [], status: '', owner: '', dateFrom: '', dateTo: '' };
  selectedIndex = 0;
  showResults = false;
  /** @deprecated
 * @removal-date Phase 6 (Frontend consumption)
 * @owner DOS
 * @replacement DAuth frontend services (core/dauth/) use i18n.translate() instead */
  isArabic = false;
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  readonly i18n = inject(I18nService);
  private authService = inject(SessionService);

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.isArabic = this.i18n.currentLang() === 'ar';
    this.searchSubject.pipe(debounceTime(200), takeUntil(this.destroy$)).subscribe((_q: string) => this.search());
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  onQueryChange(q: string): void { this.selectedIndex = 0; this.searchSubject.next(q); }

  onFocus(): void {
    this.showResults = true;
    if (this.recentSearches.length === 0 && this.authService.isLoggedIn()) {
      this.http.get<{ data: string[] }>('/api/search/recent').subscribe({
        next: (res) => { this.recentSearches = res.data || []; },
        error: (e) => devError("[API]", e)
      });
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown': event.preventDefault(); this.selectedIndex = Math.min(this.selectedIndex + 1, this.results.length - 1); break;
      case 'ArrowUp': event.preventDefault(); this.selectedIndex = Math.max(this.selectedIndex - 1, 0); break;
      case 'Enter': event.preventDefault(); if (this.results[this.selectedIndex]) this.openResult(this.results[this.selectedIndex]); break;
      case 'Escape': this.showResults = false; break;
    }
  }

  search(): void {
    if (!this.query.trim()) { this.results = []; return; }
    const params: Record<string, string> = { q: this.query };
    if (this.filters.status) params.status = this.filters.status;
    this.http.get<{ data: SearchResult[] }>('/api/search', { params }).subscribe({
      next: (res) => { this.results = res.data || []; this.showResults = true; },
      error: () => { this.results = []; }
    });
  }

  openResult(result: SearchResult): void {
    const route = resolveSearchRoute(result.type);
    if (route) this.router.navigate([route], { queryParams: { id: result.id } });
    this.showResults = false;
    this.addToRecent(this.query);
  }

  applyRecent(q: string): void { this.query = q; this.search(); }

  executeAction(action: GrcRecord, result: SearchResult, event: Event): void {
    event.stopPropagation();
    const route = resolveSearchRoute(result.type);
    if (route) this.router.navigate([route], { queryParams: { id: result.id, action: action.action } });
    this.showResults = false;
  }

  private addToRecent(q: string): void {
    if (!q.trim()) return;
    this.recentSearches = [q, ...this.recentSearches.filter(r => r !== q)].slice(0, 5);
  }

}

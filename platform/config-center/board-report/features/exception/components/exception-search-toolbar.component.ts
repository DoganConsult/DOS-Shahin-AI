import { Component, ChangeDetectionStrategy, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/infrastructure';
import type { ExceptionSearchParams } from '../services/exception-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exception-search-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .search-toolbar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .search-input { padding: 8px 14px; border: 1px solid var(--surface-border); border-radius: var(--radius); font-size: var(--font-size-base); min-width: 220px; flex: 1; }
    .filter-select { padding: 8px 12px; border-radius: var(--radius); border: 1px solid var(--surface-border); font-size: var(--font-size-xs-plus); }
    .sort-group { display: flex; gap: 4px; align-items: center; }
    .sort-label { font-size: var(--font-size-2xs); color: var(--text-color-secondary); white-space: nowrap; }
    .btn-clear { padding: 6px 12px; border: 1px solid var(--surface-border); border-radius: var(--radius); font-size: var(--font-size-xs-plus); cursor: pointer; background: transparent; color: var(--text-color-secondary); }
  `],
  template: `
    <div class="search-toolbar">
      <input class="search-input" [placeholder]="isAr ? 'بحث عن استثناء...' : 'Search exceptions...'" [(ngModel)]="params.q" (ngModelChange)="emitSearch()" />
      <select class="filter-select" [(ngModel)]="params.status" (ngModelChange)="emitSearch()">
        <option value="">{{ isAr ? 'كل الحالات' : 'All Statuses' }}</option>
        <option value="draft">Draft</option>
        <option value="submitted">Submitted</option>
        <option value="under_review">Under Review</option>
        <option value="approved">Approved</option>
        <option value="expired">Expired</option>
        <option value="revoked">Revoked</option>
        <option value="closed">Closed</option>
      </select>
      <select class="filter-select" [(ngModel)]="params.exceptionType" (ngModelChange)="emitSearch()">
        <option value="">{{ isAr ? 'كل الأنواع' : 'All Types' }}</option>
        <option value="policy">Policy</option>
        <option value="control">Control</option>
        <option value="compliance">Compliance</option>
        <option value="risk_acceptance">Risk Acceptance</option>
        <option value="process">Process</option>
      </select>
      <select class="filter-select" [(ngModel)]="params.riskLevel" (ngModelChange)="emitSearch()">
        <option value="">{{ isAr ? 'كل المستويات' : 'All Risk Levels' }}</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <div class="sort-group">
        <span class="sort-label">{{ isAr ? 'ترتيب' : 'Sort' }}:</span>
        <select class="filter-select" [(ngModel)]="params.sortBy" (ngModelChange)="emitSearch()">
          <option value="">Default</option>
          <option value="created_at">Created</option>
          <option value="updated_at">Updated</option>
          <option value="expiry_date">Expiry</option>
          <option value="risk_level">Risk</option>
        </select>
        <select class="filter-select" [(ngModel)]="params.sortDir" (ngModelChange)="emitSearch()">
          <option value="DESC">Desc</option>
          <option value="ASC">Asc</option>
        </select>
      </div>
      @if (hasFilters()) {
        <button class="btn-clear" (click)="clearAll()">{{ isAr ? 'مسح الكل' : 'Clear All' }}</button>
      }
    </div>
  `,
})
export class ExceptionSearchToolbarComponent {
  private i18n = inject(I18nService);

  searchChange = output<ExceptionSearchParams>();

  params: ExceptionSearchParams = { q: '', status: '', exceptionType: '', riskLevel: '', sortBy: '', sortDir: 'DESC', page: 1, pageSize: 20 };

  get isAr(): boolean { return this.i18n.direction() === 'rtl'; }

  hasFilters = signal(false);

  emitSearch(): void {
    this.hasFilters.set(!!(this.params.q || this.params.status || this.params.exceptionType || this.params.riskLevel || this.params.sortBy));
    this.params.page = 1;
    this.searchChange.emit({ ...this.params });
  }

  clearAll(): void {
    this.params = { q: '', status: '', exceptionType: '', riskLevel: '', sortBy: '', sortDir: 'DESC', page: 1, pageSize: 20 };
    this.hasFilters.set(false);
    this.searchChange.emit({ ...this.params });
  }
}

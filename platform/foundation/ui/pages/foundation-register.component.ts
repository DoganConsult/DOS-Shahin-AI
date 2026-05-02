/**
 * Foundation Module — Page 2: Register (List of Records)
 *
 * Phase-1 enrollment. Read-only. Carbon DataTable + Pagination + Search.
 * Layout: Breadcrumb → TableToolbar (Search + filter) → DataTable → Pagination.
 * Permission gate: foundation.read.
 */
import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import {
  BreadcrumbModule, TagModule, GridModule, SkeletonModule,
  NotificationModule, IconModule, ButtonModule, SearchModule,
  TooltipModule,
} from 'carbon-components-angular';
import { FoundationApiService } from '../services/foundation-api.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';

interface RegisterRow {
  id: string; email: string; name: string; role: string;
  department: string; status: string; updated: string;
}

@Component({
  selector: 'app-foundation-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, RouterLink,
    BreadcrumbModule, TagModule, GridModule, SkeletonModule,
    NotificationModule, IconModule, ButtonModule, SearchModule,
    TooltipModule,
  ],
  template: `
    <!-- Breadcrumb -->
    <cds-breadcrumb>
      <cds-breadcrumb-item [href]="'/workspace-home'">{{ i18n.tr('breadcrumb.workspace', 'Workspace') }}</cds-breadcrumb-item>
      <cds-breadcrumb-item [href]="'/foundation'">{{ i18n.tr('foundation.name', 'Foundation') }}</cds-breadcrumb-item>
      <cds-breadcrumb-item>{{ i18n.tr('foundation.register.title', 'Register') }}</cds-breadcrumb-item>
    </cds-breadcrumb>

    <!-- Toolbar: Search + Filter + Batch actions stub -->
    <div class="fr-toolbar">
      <cds-search
        [placeholder]="i18n.tr('foundation.register.search', 'Search users...')"
        size="sm"
        (valueChange)="onSearch($event)">
      </cds-search>
      <div class="fr-toolbar-actions">
        <div class="cds--select cds--select--sm cds--select--inline">
          <select class="cds--select-input" (change)="onStatusFilter($any($event.target).value)">
            <option value="">{{ i18n.tr('foundation.register.allStatuses', 'All statuses') }}</option>
            <option value="active">{{ i18n.tr('foundation.register.active', 'Active') }}</option>
            <option value="inactive">{{ i18n.tr('foundation.register.inactive', 'Inactive') }}</option>
          </select>
        </div>
        <cds-tooltip [description]="i18n.tr('foundation.register.batchDisabled', 'Available in Phase 3')">
          <button cdsButton="ghost" size="sm" [disabled]="true">
            {{ i18n.tr('foundation.register.batchActions', 'Batch Actions') }}
          </button>
        </cds-tooltip>
      </div>
    </div>

    <!-- Selected filters as Tags -->
    @if (searchTerm || statusFilter) {
      <div class="fr-active-filters">
        @if (searchTerm) {
          <cds-tag type="blue" size="sm" [filter]="true" (close)="searchTerm = ''; load()">
            {{ i18n.tr('foundation.register.search', 'Search') }}: {{ searchTerm }}
          </cds-tag>
        }
        @if (statusFilter) {
          <cds-tag type="blue" size="sm" [filter]="true" (close)="statusFilter = ''; load()">
            {{ i18n.tr('foundation.register.status', 'Status') }}: {{ statusFilter }}
          </cds-tag>
        }
      </div>
    }

    <!-- DataTable -->
    @if (loading()) {
      <cds-skeleton-text [lines]="8"></cds-skeleton-text>
    } @else if (rows().length === 0) {
      <cds-tile>
        <cds-notification
          [notificationObj]="{ type: 'info', title: i18n.tr('foundation.register.empty', 'No records yet'), message: '' }"
          [showClose]="false">
        </cds-notification>
        <cds-tooltip [description]="i18n.tr('foundation.register.createDisabled', 'Available in Phase 3')">
          <button cdsButton="primary" size="sm" [disabled]="true">
            {{ i18n.tr('foundation.register.create', 'Create User') }}
          </button>
        </cds-tooltip>
      </cds-tile>
    } @else {
      <table class="cds--data-table cds--data-table--sort">
        <thead>
          <tr>
            <th class="cds--table-header-label">{{ i18n.tr('foundation.register.col.id', 'ID') }}</th>
            <th class="cds--table-header-label">{{ i18n.tr('foundation.register.col.email', 'Email') }}</th>
            <th class="cds--table-header-label">{{ i18n.tr('foundation.register.col.name', 'Name') }}</th>
            <th class="cds--table-header-label">{{ i18n.tr('foundation.register.col.role', 'Role') }}</th>
            <th class="cds--table-header-label">{{ i18n.tr('foundation.register.col.department', 'Department') }}</th>
            <th class="cds--table-header-label">{{ i18n.tr('foundation.register.col.status', 'Status') }}</th>
            <th class="cds--table-header-label">{{ i18n.tr('foundation.register.col.updated', 'Updated') }}</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.id) {
            <tr class="cds--data-table--clickable" [routerLink]="['/foundation/users']" [queryParams]="{ id: row.id }">
              <td>{{ row.id | slice:0:8 }}</td>
              <td>{{ row.email }}</td>
              <td>{{ row.name }}</td>
              <td>{{ row.role }}</td>
              <td>{{ row.department }}</td>
              <td><cds-tag [type]="row.status === 'active' ? 'green' : 'cool-gray'" size="sm">{{ row.status }}</cds-tag></td>
              <td>{{ row.updated }}</td>
            </tr>
          }
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="fr-pagination">
        <span>{{ i18n.tr('foundation.register.showing', 'Showing') }} {{ rows().length }} {{ i18n.tr('foundation.register.of', 'of') }} {{ total() }}</span>
        <div class="fr-pagination-controls">
          <div class="cds--select cds--select--sm cds--select--inline">
            <select class="cds--select-input" [(ngModel)]="pageSize" (change)="load()">
              <option [value]="10">10</option>
              <option [value]="25">25</option>
              <option [value]="50">50</option>
            </select>
          </div>
          <button cdsButton="ghost" size="sm" [disabled]="page <= 1" (click)="page = page - 1; load()">
            <svg cdsIcon="chevron--left" size="16"></svg>
          </button>
          <span>{{ page }} / {{ totalPages() }}</span>
          <button cdsButton="ghost" size="sm" [disabled]="page >= totalPages()" (click)="page = page + 1; load()">
            <svg cdsIcon="chevron--right" size="16"></svg>
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; padding: var(--cds-spacing-06); background: var(--cds-background); }
    .fr-toolbar { display: flex; align-items: center; gap: var(--cds-spacing-04); margin: var(--cds-spacing-05) 0; flex-wrap: wrap; }
    .fr-toolbar cds-search { flex: 1; min-width: 200px; }
    .fr-toolbar-actions { display: flex; gap: var(--cds-spacing-03); align-items: center; }
    .fr-active-filters { display: flex; gap: var(--cds-spacing-02); margin-block-end: var(--cds-spacing-04); flex-wrap: wrap; }
    .cds--data-table { width: 100%; margin-block-end: var(--cds-spacing-04); }
    .cds--data-table--clickable { cursor: pointer; }
    .cds--data-table--clickable:hover { background: var(--cds-layer-hover-01); }
    .fr-pagination { display: flex; align-items: center; justify-content: space-between; padding: var(--cds-spacing-03) 0; font-size: var(--cds-body-compact-01-font-size); color: var(--cds-text-secondary); }
    .fr-pagination-controls { display: flex; align-items: center; gap: var(--cds-spacing-03); }
  `],
})
export class FoundationRegisterComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(FoundationApiService);
  i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();

  loading = signal(true);
  rows = signal<RegisterRow[]>([]);
  total = signal(0);
  totalPages = signal(1);
  page = 1;
  pageSize = 25;
  searchTerm = '';
  statusFilter = '';

  ngOnInit(): void { this.load(); }

  onSearch(term: string): void { this.searchTerm = term; this.page = 1; this.load(); }
  onStatusFilter(status: string): void { this.statusFilter = status; this.page = 1; this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getUsers({ page: this.page, limit: this.pageSize, search: this.searchTerm || undefined, status: this.statusFilter || undefined }).pipe(
      catchError(() => of({ users: [], total: 0, totalPages: 1 })),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(res => {
      const users = (res.users ?? []) as any[];
      this.rows.set(users.map(u => ({
        id: u.id ?? u.user_id ?? '',
        email: u.email ?? '',
        name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || '—',
        role: u.role ?? '—',
        department: u.department_name ?? '—',
        status: u.status ?? 'active',
        updated: u.updated_at ?? '—',
      })));
      this.total.set(res.total ?? 0);
      this.totalPages.set(res.totalPages ?? (Math.ceil(this.total() / this.pageSize) || 1));
      this.loading.set(false);
    });
  }
}

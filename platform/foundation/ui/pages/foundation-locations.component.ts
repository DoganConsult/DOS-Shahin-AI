import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, DestroyRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FoundationApiService,
  FoundationLocation,
  FoundationLocationsResponse,
} from '../services/foundation-api.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
import { FOUNDATION_ACCESS_STORE, DenyAllFoundationAccessStore, type FoundationAccessStore } from '../ports/access.port';

import { FoundationPageShellComponent } from '../components/foundation-page-shell.component';
interface LocationFormState {
  name_en: string;
  name_ar?: string;
  code?: string;
  location_type?: string;
  country?: string;
  city?: string;
  status?: 'active' | 'inactive' | 'archived';
}

const PAGE_SIZE = 25;

@Component({
  selector: 'app-foundation-locations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, FoundationPageShellComponent],
  styles: [`
    .page { padding: 24px 28px; min-height: 100vh; background: var(--surface-ground); }
    @media (max-width: 768px) { .page { padding: 16px 12px; } }
    .page-header { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
    .page-title-block { min-width: 0; flex: 1 1 auto; }
    .page-title { font-size: var(--font-size-xl); font-weight: 600; margin: 0 0 4px; }
    .page-sub { font-size: var(--font-size-sm); color: var(--text-color-secondary); margin: 0; max-width: 60ch; }
    .filter-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 16px; }
    .filter-bar input, .filter-bar select { padding: 8px 12px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); background: var(--surface-card); color: var(--text-color); font-size: var(--font-size-sm); min-height: 40px; }
    .filter-bar input { flex: 1 1 220px; min-width: 0; }
    .filter-bar select { flex: 0 1 180px; }
    .btn-primary { background: var(--primary-color); color: #fff; border: none; border-radius: var(--radius-sm); padding: 8px 16px; cursor: pointer; font-size: var(--font-size-sm); min-height: 40px; }
    .btn-primary[disabled] { opacity: 0.6; cursor: not-allowed; }
    .btn-secondary { background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); padding: 8px 16px; cursor: pointer; font-size: var(--font-size-sm); min-height: 40px; color: var(--text-color); }
    .btn-icon { background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); padding: 4px 10px; cursor: pointer; font-size: var(--font-size-xs); margin-inline-start: 4px; min-height: 32px; min-width: 32px; }
    .btn-icon.danger { color: var(--red-500); border-color: var(--red-200); }
    .table-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-md); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { background: var(--surface-section); padding: 10px 14px; text-align: start; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary); border-bottom: 1px solid var(--surface-border); }
    td { padding: 10px 14px; font-size: var(--font-size-sm); border-bottom: 1px solid var(--surface-border); vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: var(--font-size-2xs); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
    .badge.active { background: var(--green-100); color: var(--green-700); }
    .badge.inactive { background: var(--surface-200); color: var(--text-color-secondary); }
    .badge.archived { background: var(--orange-100); color: var(--orange-700); }
    .empty-state { text-align: center; padding: 40px 16px; color: var(--text-color-secondary); }
    .skeleton-row { display: flex; gap: 12px; padding: 12px 14px; border-bottom: 1px solid var(--surface-border); }
    .skel { background: linear-gradient(90deg, var(--surface-200), var(--surface-100), var(--surface-200)); background-size: 200% 100%; animation: skel 1.2s ease-in-out infinite; border-radius: var(--radius-sm); height: 14px; }
    @keyframes skel { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    .skel-name { flex: 2; } .skel-meta { flex: 1; }
    .error-card { background: var(--red-50, #fef2f2); border: 1px solid var(--red-200); color: var(--red-700); padding: 14px 16px; border-radius: var(--radius-md); margin-bottom: 16px; }
    .error-card .req-id { display: block; font-family: var(--font-family-mono, monospace); font-size: var(--font-size-xs); color: var(--text-color-secondary); margin-top: 4px; }
    .error-card .actions { margin-top: 8px; }
    .read-only-banner { background: var(--surface-section); border: 1px solid var(--surface-border); padding: 8px 14px; border-radius: var(--radius-sm); font-size: var(--font-size-xs); color: var(--text-color-secondary); margin-bottom: 12px; }
    .pagination { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 14px; border-top: 1px solid var(--surface-border); flex-wrap: wrap; }
    .pagination-info { font-size: var(--font-size-xs); color: var(--text-color-secondary); }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
    .modal { background: var(--surface-overlay); border-radius: var(--radius-lg); padding: 24px; min-width: 0; max-width: 540px; width: 100%; box-shadow: 0 8px 32px rgba(0,0,0,.18); max-height: 90vh; overflow-y: auto; }
    .modal-title { font-size: var(--font-size-lg); font-weight: 600; margin: 0 0 8px; }
    .modal-body { font-size: var(--font-size-sm); color: var(--text-color-secondary); margin: 0 0 20px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 480px) { .form-row { grid-template-columns: 1fr; } }
    .form-group { margin-bottom: 14px; }
    .form-group label { display: block; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary); margin-bottom: 4px; }
    .form-group input, .form-group select { width: 100%; padding: 8px 12px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); background: var(--surface-card); color: var(--text-color); font-size: var(--font-size-sm); box-sizing: border-box; min-height: 40px; }
    .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; flex-wrap: wrap; }
    .danger-btn { background: var(--red-500, #ef4444); color: #fff; border: none; border-radius: var(--radius-sm); padding: 8px 16px; cursor: pointer; font-size: var(--font-size-sm); min-height: 40px; }
    .danger-btn[disabled] { opacity: 0.6; cursor: not-allowed; }
    .field-error { color: var(--red-500); font-size: var(--font-size-xs); margin-top: 4px; }
  `],
  template: `
    <foundation-page-shell [route]="'/foundation/locations'" [titleKey]="'foundation.nav.locations'">
    <div class="page" [dir]="i18n.direction()">
      <header class="page-header">
        <div class="page-title-block">
          <h2 class="page-title">{{ i18n.t('locations.title') }}</h2>
          <p class="page-sub">{{ i18n.t('locations.subtitle') }}</p>
        </div>
        @if (canManage()) {
          <button type="button" class="btn-primary" (click)="openCreate()">{{ i18n.t('locations.add') }}</button>
        }
      </header>

      @if (!canManage()) {
        <div class="read-only-banner" role="note">{{ i18n.t('locations.viewOnly') }}</div>
      }

      <div class="filter-bar" role="search">
        <label class="sr-only" for="loc-search">{{ i18n.t('locations.search') }}</label>
        <input id="loc-search" type="search" [placeholder]="i18n.t('locations.search')"
          [ngModel]="searchInput()" (ngModelChange)="onSearchInput($event)" />
        <label class="sr-only" for="loc-type">{{ i18n.t('locations.type') }}</label>
        <select id="loc-type" [ngModel]="typeFilter()" (ngModelChange)="onTypeFilter($event)">
          <option value="">{{ i18n.t('locations.filterType') }}</option>
          @for (t of typeOptions(); track t) { <option [value]="t">{{ t }}</option> }
        </select>
        <label class="sr-only" for="loc-country">{{ i18n.t('locations.country') }}</label>
        <select id="loc-country" [ngModel]="countryFilter()" (ngModelChange)="onCountryFilter($event)">
          <option value="">{{ i18n.t('locations.filterCountry') }}</option>
          @for (c of countryOptions(); track c) { <option [value]="c">{{ c }}</option> }
        </select>
      </div>

      @if (error()) {
        <div class="error-card" role="alert" aria-live="assertive">
          <strong>{{ i18n.t('locations.loadFailed') }}</strong>
          <div>{{ error() }}</div>
          @if (errorRequestId()) {
            <span class="req-id">{{ i18n.t('locations.requestId') }}: {{ errorRequestId() }}</span>
          }
          <div class="actions">
            <button type="button" class="btn-secondary" (click)="load()">{{ i18n.t('locations.retry') }}</button>
          </div>
        </div>
      }

      <div class="table-card">
        @if (loading()) {
          @for (_ of skeletonRows; track $index) {
            <div class="skeleton-row" aria-hidden="true">
              <div class="skel skel-name"></div><div class="skel skel-meta"></div><div class="skel skel-meta"></div><div class="skel skel-meta"></div>
            </div>
          }
        } @else if (items().length === 0 && !error()) {
          <div class="empty-state">{{ i18n.t('locations.noData') }}</div>
        } @else if (items().length > 0) {
          <table class="responsive-stack" role="table">
            <thead>
              <tr>
                <th scope="col">{{ i18n.t('locations.name') }}</th>
                <th scope="col">{{ i18n.t('locations.code') }}</th>
                <th scope="col">{{ i18n.t('locations.type') }}</th>
                <th scope="col">{{ i18n.t('locations.city') }}</th>
                <th scope="col">{{ i18n.t('locations.country') }}</th>
                <th scope="col">{{ i18n.t('locations.status') }}</th>
                @if (canManage()) { <th scope="col">{{ i18n.t('locations.actions') }}</th> }
              </tr>
            </thead>
            <tbody>
              @for (loc of items(); track loc.location_id) {
                <tr>
                  <td [attr.data-label]="i18n.t('locations.name')">{{ displayName(loc) }}</td>
                  <td [attr.data-label]="i18n.t('locations.code')">{{ loc.code || '—' }}</td>
                  <td [attr.data-label]="i18n.t('locations.type')">{{ loc.location_type || '—' }}</td>
                  <td [attr.data-label]="i18n.t('locations.city')">{{ loc.city || '—' }}</td>
                  <td [attr.data-label]="i18n.t('locations.country')">{{ loc.country || '—' }}</td>
                  <td [attr.data-label]="i18n.t('locations.status')">
                    <span class="badge" [class.active]="loc.status === 'active'" [class.inactive]="loc.status === 'inactive'" [class.archived]="loc.status === 'archived'">
                      {{ statusLabel(loc.status) }}
                    </span>
                  </td>
                  @if (canManage()) {
                    <td [attr.data-label]="i18n.t('locations.actions')">
                      <button type="button" class="btn-icon" (click)="openEdit(loc)" [attr.aria-label]="i18n.t('locations.edit') + ': ' + displayName(loc)">{{ i18n.t('locations.edit') }}</button>
                      <button type="button" class="btn-icon danger" (click)="askDelete(loc)" [attr.aria-label]="i18n.t('locations.delete') + ': ' + displayName(loc)">{{ i18n.t('locations.delete') }}</button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
          <div class="pagination">
            <span class="pagination-info">{{ i18n.t('locations.totalCount', { count: i18n.formatNumber(total()) }) }}</span>
            @if (totalPages() > 1) {
              <span class="pagination-info">{{ i18n.t('locations.page', { page: i18n.formatNumber(page()), total: i18n.formatNumber(totalPages()) }) }}</span>
              <span>
                <button type="button" class="btn-secondary" (click)="prevPage()" [disabled]="page() <= 1">{{ i18n.t('locations.prev') }}</button>
                <button type="button" class="btn-secondary" (click)="nextPage()" [disabled]="page() >= totalPages()">{{ i18n.t('locations.next') }}</button>
              </span>
            }
          </div>
        }
      </div>

      @if (showDialog()) {
        <div class="modal-overlay" role="dialog" aria-modal="true" [attr.aria-labelledby]="'loc-dialog-title'" (click)="closeDialog()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3 id="loc-dialog-title" class="modal-title">{{ editing() ? i18n.t('locations.editLocation') : i18n.t('locations.addNewLocation') }}</h3>
            <div class="form-row">
              <div class="form-group">
                <label for="f-name-en">{{ i18n.t('locations.nameEn') }} *</label>
                <input id="f-name-en" type="text" [(ngModel)]="form.name_en" [placeholder]="i18n.t('locations.namePlaceholder')" required />
                @if (formError() === 'nameRequired') { <div class="field-error">{{ i18n.t('locations.nameRequired') }}</div> }
              </div>
              <div class="form-group">
                <label for="f-name-ar">{{ i18n.t('locations.nameAr') }}</label>
                <input id="f-name-ar" type="text" [(ngModel)]="form.name_ar" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="f-code">{{ i18n.t('locations.code') }}</label>
                <input id="f-code" type="text" [(ngModel)]="form.code" [placeholder]="i18n.t('locations.codePlaceholder')" />
              </div>
              <div class="form-group">
                <label for="f-type">{{ i18n.t('locations.type') }}</label>
                <input id="f-type" type="text" [(ngModel)]="form.location_type" [placeholder]="i18n.t('locations.typePlaceholder')" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="f-city">{{ i18n.t('locations.city') }}</label>
                <input id="f-city" type="text" [(ngModel)]="form.city" [placeholder]="i18n.t('locations.cityPlaceholder')" />
              </div>
              <div class="form-group">
                <label for="f-country">{{ i18n.t('locations.country') }}</label>
                <input id="f-country" type="text" maxlength="2" [(ngModel)]="form.country" [placeholder]="i18n.t('locations.countryPlaceholder')" />
              </div>
            </div>
            <div class="form-group">
              <label for="f-status">{{ i18n.t('locations.status') }}</label>
              <select id="f-status" [(ngModel)]="form.status">
                <option value="active">{{ i18n.t('locations.statusActive') }}</option>
                <option value="inactive">{{ i18n.t('locations.statusInactive') }}</option>
                <option value="archived">{{ i18n.t('locations.statusArchived') }}</option>
              </select>
            </div>
            @if (saveError()) { <div class="field-error" role="alert">{{ saveError() }}</div> }
            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="closeDialog()">{{ i18n.t('locations.cancel') }}</button>
              <button type="button" class="btn-primary" (click)="save()" [disabled]="saving()">{{ saving() ? i18n.t('locations.saving') : i18n.t('locations.save') }}</button>
            </div>
          </div>
        </div>
      }

      @if (pendingDelete(); as pending) {
        <div class="modal-overlay" role="alertdialog" aria-modal="true" aria-labelledby="loc-confirm-title" aria-describedby="loc-confirm-msg" (click)="cancelDelete()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3 id="loc-confirm-title" class="modal-title">{{ i18n.t('locations.confirmDelete') }}</h3>
            <p id="loc-confirm-msg" class="modal-body">{{ i18n.t('locations.confirmDeleteMsg', { name: displayName(pending) }) }}</p>
            @if (deleteError()) { <div class="field-error" role="alert">{{ deleteError() }}</div> }
            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="cancelDelete()">{{ i18n.t('locations.cancel') }}</button>
              <button type="button" class="danger-btn" (click)="confirmDelete()" [disabled]="deleting()">{{ deleting() ? i18n.t('locations.saving') : i18n.t('locations.confirm') }}</button>
            </div>
          </div>
        </div>
      }
    </div>
  
    </foundation-page-shell>
  `,
})
export class FoundationLocationsComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(FoundationApiService);
  // Phase I-2: inject the FE access port (host binds AccessStore via providers).
  // Falls back to DenyAllFoundationAccessStore in environments where the host
  // hasn't wired the real store — same fail-closed posture as the BE.
  private access: FoundationAccessStore =
    inject(FOUNDATION_ACCESS_STORE, { optional: true }) ?? new DenyAllFoundationAccessStore();
  i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();

  loading = signal(true);
  saving = signal(false);
  deleting = signal(false);
  error = signal<string | null>(null);
  errorRequestId = signal<string | null>(null);
  saveError = signal<string | null>(null);
  deleteError = signal<string | null>(null);
  formError = signal<string | null>(null);

  items = signal<FoundationLocation[]>([]);
  total = signal(0);
  page = signal(1);
  pageSize = signal(PAGE_SIZE);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  searchInput = signal('');
  search = signal('');
  typeFilter = signal('');
  countryFilter = signal('');

  showDialog = signal(false);
  editing = signal<FoundationLocation | null>(null);
  pendingDelete = signal<FoundationLocation | null>(null);

  form: LocationFormState = { name_en: '' };
  skeletonRows = Array.from({ length: 6 });

  /** Re-pull permission on every render — AccessStore is signal-backed. */
  canManage = computed(() => this.access.hasPermission('foundation.org.write'));

  /** Distinct facet values from the current page (helper for filter dropdowns). */
  typeOptions = computed(() => {
    const s = new Set<string>();
    for (const l of this.items()) { if (l.location_type) s.add(l.location_type); }
    return Array.from(s).sort();
  });
  countryOptions = computed(() => {
    const s = new Set<string>();
    for (const l of this.items()) { if (l.country) s.add(l.country); }
    return Array.from(s).sort();
  });

  private searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => {
        this.search.set(value);
        this.page.set(1);
        this.load();
      });

    // Reload when filters change (effect runs after first read).
    let firstRun = true;
    effect(() => {
      this.typeFilter();
      this.countryFilter();
      if (firstRun) { firstRun = false; return; }
      this.page.set(1);
      this.load();
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.errorRequestId.set(null);
    this.api.getLocations({
      page: this.page(),
      pageSize: this.pageSize(),
      search: this.search() || undefined,
      location_type: this.typeFilter() || undefined,
      country: this.countryFilter() || undefined,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: FoundationLocationsResponse) => {
          this.items.set(Array.isArray(res?.data) ? res.data : []);
          this.total.set(typeof res?.total === 'number' ? res.total : (res?.data?.length ?? 0));
          if (typeof res?.page === 'number') this.page.set(res.page);
          if (typeof res?.pageSize === 'number') this.pageSize.set(res.pageSize);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(FoundationApiService.formatLoadError(err));
          this.errorRequestId.set(this.extractRequestId(err));
          this.items.set([]);
          this.total.set(0);
          this.loading.set(false);
        },
      });
  }

  onSearchInput(value: string): void { this.searchInput.set(value); this.searchSubject.next(value); }
  onTypeFilter(value: string): void { this.typeFilter.set(value); }
  onCountryFilter(value: string): void { this.countryFilter.set(value); }

  prevPage(): void { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage(): void { if (this.page() < this.totalPages()) { this.page.update(p => p + 1); this.load(); } }

  displayName(loc: FoundationLocation): string {
    return this.i18n.pbt(loc as unknown as Record<string, unknown>, 'name') || loc.name_en || loc.code || '—';
  }
  statusLabel(status: FoundationLocation['status'] | undefined): string {
    switch (status) {
      case 'inactive': return this.i18n.t('locations.statusInactive');
      case 'archived': return this.i18n.t('locations.statusArchived');
      case 'active':
      default: return this.i18n.t('locations.statusActive');
    }
  }

  openCreate(): void {
    if (!this.canManage()) return;
    this.editing.set(null);
    this.form = { name_en: '', status: 'active' };
    this.formError.set(null); this.saveError.set(null);
    this.showDialog.set(true);
  }
  openEdit(loc: FoundationLocation): void {
    if (!this.canManage()) return;
    this.editing.set(loc);
    this.form = {
      name_en: loc.name_en || '',
      name_ar: loc.name_ar || undefined,
      code: loc.code || undefined,
      location_type: loc.location_type || undefined,
      country: loc.country || undefined,
      city: loc.city || undefined,
      status: loc.status || 'active',
    };
    this.formError.set(null); this.saveError.set(null);
    this.showDialog.set(true);
  }
  closeDialog(): void { this.showDialog.set(false); this.editing.set(null); }

  save(): void {
    if (!this.canManage()) return;
    if (!this.form.name_en?.trim()) { this.formError.set('nameRequired'); return; }
    this.formError.set(null); this.saveError.set(null);
    this.saving.set(true);
    const editing = this.editing();
    const body: Partial<FoundationLocation> = { ...this.form };
    const obs$ = editing?.location_id
      ? this.api.updateLocation(editing.location_id, body)
      : this.api.createLocation(body);
    obs$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.saving.set(false); this.closeDialog(); this.load(); },
      error: (err: unknown) => { this.saveError.set(FoundationApiService.formatLoadError(err)); this.saving.set(false); },
    });
  }

  askDelete(loc: FoundationLocation): void {
    if (!this.canManage()) return;
    this.deleteError.set(null);
    this.pendingDelete.set(loc);
  }
  cancelDelete(): void { this.pendingDelete.set(null); this.deleteError.set(null); }
  confirmDelete(): void {
    const loc = this.pendingDelete();
    if (!loc?.location_id || !this.canManage()) return;
    this.deleting.set(true);
    this.api.deleteLocation(loc.location_id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.deleting.set(false); this.pendingDelete.set(null); this.load(); },
      error: (err: unknown) => { this.deleteError.set(FoundationApiService.formatLoadError(err)); this.deleting.set(false); },
    });
  }

  private extractRequestId(err: unknown): string | null {
    if (err instanceof HttpErrorResponse) {
      const headerId = err.headers?.get('x-request-id') || err.headers?.get('X-Request-Id');
      if (headerId) return headerId;
      const body = err.error as Record<string, unknown> | undefined;
      const fromBody = body?.['requestId'] || body?.['request_id'] || body?.['correlationId'];
      if (typeof fromBody === 'string') return fromBody;
    }
    return null;
  }
}

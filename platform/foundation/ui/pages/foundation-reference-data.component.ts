import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FoundationApiService, FoundationLookups } from '../services/foundation-api.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
import { RefItem, normalizeReferenceItems } from './foundation-reference-data.adapters';

import { FoundationPageShellComponent } from '../components/foundation-page-shell.component';
// Re-exports so existing spec files / consumers keep their import site stable.
export { normalizeReferenceItems };
export type { RefItem };

/**
 * Reference-data group contract, as declared in FoundationLookups.referenceDataGroups.
 * Groups are authored server-side; if the backend does not deliver any, we show an
 * empty state — we do NOT inject hardcoded client-side fallbacks (that masked
 * contract drift previously).
 */
interface RefGroup {
  key: string;
  endpoint: string;
  labelEn: string;
  labelAr: string;
  supportsWrite: boolean;
}

@Component({
  selector: 'app-foundation-reference-data',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, FoundationPageShellComponent],
  styles: [`
    .page { padding: 24px 28px; min-height: 100vh; background: var(--surface-ground); }
    @media (max-width: 768px) { .page { padding: 16px 12px; } }
    .page-header { margin-bottom: 16px; }
    .page-title { font-size: var(--font-size-xl); font-weight: 600; margin: 0 0 4px; }
    .page-sub { font-size: var(--font-size-sm); color: var(--text-color-secondary); margin: 0; max-width: 60ch; }
    .groups { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
    .group-btn { padding: 6px 14px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); background: var(--surface-card); cursor: pointer; font-size: var(--font-size-sm); min-height: 40px; }
    .group-btn.active { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }
    .btn-primary { background: var(--primary-color); color: #fff; border: none; border-radius: var(--radius-sm); padding: 8px 16px; cursor: pointer; font-size: var(--font-size-sm); min-height: 40px; }
    .btn-primary[disabled] { opacity: 0.6; cursor: not-allowed; }
    .btn-secondary { background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); padding: 8px 16px; cursor: pointer; font-size: var(--font-size-sm); min-height: 40px; color: var(--text-color); }
    .table-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-md); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { background: var(--surface-section); padding: 10px 14px; text-align: start; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary); border-bottom: 1px solid var(--surface-border); }
    td { padding: 10px 14px; font-size: var(--font-size-sm); border-bottom: 1px solid var(--surface-border); }
    tr:last-child td { border-bottom: none; }
    .empty-state { text-align: center; padding: 40px 16px; color: var(--text-color-secondary); }
    .error-card { background: var(--red-50, #fef2f2); border: 1px solid var(--red-200); color: var(--red-700); padding: 14px 16px; border-radius: var(--radius-md); margin-bottom: 16px; }
    .error-card .req-id { display: block; font-family: var(--font-family-mono, monospace); font-size: var(--font-size-xs); color: var(--text-color-secondary); margin-top: 4px; }
    .error-card .actions { margin-top: 8px; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
    .modal { background: var(--surface-overlay); border-radius: var(--radius-lg); padding: 24px; min-width: 0; max-width: 540px; width: 100%; box-shadow: 0 8px 32px rgba(0,0,0,.18); max-height: 90vh; overflow-y: auto; }
    .modal-title { font-size: var(--font-size-lg); font-weight: 600; margin: 0 0 20px; }
    .form-group { margin-bottom: 14px; }
    .form-group label { display: block; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary); margin-bottom: 4px; }
    .form-group input { width: 100%; padding: 8px 12px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); background: var(--surface-card); color: var(--text-color); font-size: var(--font-size-sm); box-sizing: border-box; min-height: 40px; }
    .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; flex-wrap: wrap; }
    .header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; gap: 12px; flex-wrap: wrap; }
    .field-error { color: var(--red-500); font-size: var(--font-size-xs); margin-top: 4px; }
  `],
  template: `
    <foundation-page-shell [route]="'/foundation/reference-data'" [titleKey]="'foundation.nav.referenceData'">
    <div class="page" [dir]="i18n.direction()">
      <header class="page-header">
        <h2 class="page-title">{{ i18n.t('referenceData.title') }}</h2>
        <p class="page-sub">{{ i18n.t('referenceData.subtitle') }}</p>
      </header>

      @if (groupsError()) {
        <div class="error-card" role="alert" aria-live="assertive">
          <strong>{{ i18n.t('referenceData.loadFailed') }}</strong>
          <div>{{ groupsError() }}</div>
          <div class="actions">
            <button type="button" class="btn-secondary" (click)="loadGroups()">{{ i18n.t('referenceData.retry') }}</button>
          </div>
        </div>
      } @else if (loadingGroups()) {
        <div class="empty-state">{{ i18n.t('referenceData.loadingGroups') }}</div>
      } @else if (groups().length === 0) {
        <div class="empty-state">{{ i18n.t('referenceData.noGroups') }}</div>
      } @else {
        <div class="groups" role="tablist">
          @for (g of groups(); track g.key) {
            <button type="button" class="group-btn" role="tab"
              [attr.aria-selected]="selectedGroup()?.key === g.key"
              [class.active]="selectedGroup()?.key === g.key"
              (click)="selectGroup(g)">
              {{ i18n.isArabic() ? g.labelAr : g.labelEn }}
            </button>
          }
        </div>

        @if (selectedGroup(); as g) {
          <div class="header-row">
            <span style="font-weight:600">{{ i18n.isArabic() ? g.labelAr : g.labelEn }}</span>
            @if (g.supportsWrite) {
              <button type="button" class="btn-primary" (click)="openCreate()">{{ i18n.t('referenceData.add') }}</button>
            }
          </div>

          @if (itemsError()) {
            <div class="error-card" role="alert" aria-live="assertive">
              <strong>{{ i18n.t('referenceData.itemsLoadFailed') }}</strong>
              <div>{{ itemsError() }}</div>
              @if (itemsErrorRequestId()) {
                <span class="req-id">{{ i18n.t('referenceData.requestId') }}: {{ itemsErrorRequestId() }}</span>
              }
              <div class="actions">
                <button type="button" class="btn-secondary" (click)="selectGroup(g)">{{ i18n.t('referenceData.retry') }}</button>
              </div>
            </div>
          } @else {
            <div class="table-card">
              @if (loadingItems()) {
                <div class="empty-state">{{ i18n.t('referenceData.loadingItems') }}</div>
              } @else if (items().length === 0) {
                <div class="empty-state">{{ i18n.t('referenceData.noItems') }}</div>
              } @else {
                <table class="responsive-stack">
                  <thead>
                    <tr>
                      <th scope="col">{{ i18n.t('referenceData.headerCode') }}</th>
                      <th scope="col">{{ i18n.t('referenceData.headerNameEn') }}</th>
                      <th scope="col">{{ i18n.t('referenceData.headerNameAr') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of items(); track item.id ?? item.code) {
                      <tr>
                        <td [attr.data-label]="i18n.t('referenceData.headerCode')" style="font-family:monospace;font-size:var(--font-size-xs)">{{ item.code || '—' }}</td>
                        <td [attr.data-label]="i18n.t('referenceData.headerNameEn')">{{ item.name_en || item['nameEn'] || item['name'] || '—' }}</td>
                        <td [attr.data-label]="i18n.t('referenceData.headerNameAr')" dir="rtl">{{ item.name_ar || item['nameAr'] || '—' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>
          }
        }
      }

      @if (showDialog()) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="refd-dialog-title" (click)="closeDialog()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3 id="refd-dialog-title" class="modal-title">{{ i18n.t('referenceData.newItem') }}</h3>
            <div class="form-group">
              <label for="refd-code">{{ i18n.t('referenceData.fieldCode') }} *</label>
              <input id="refd-code" type="text" [(ngModel)]="form.code" />
            </div>
            <div class="form-group">
              <label for="refd-name-en">{{ i18n.t('referenceData.fieldNameEn') }} *</label>
              <input id="refd-name-en" type="text" [(ngModel)]="form.name_en" />
            </div>
            <div class="form-group">
              <label for="refd-name-ar">{{ i18n.t('referenceData.fieldNameAr') }}</label>
              <input id="refd-name-ar" type="text" [(ngModel)]="form.name_ar" dir="rtl" />
            </div>
            @if (saveError()) { <div class="field-error" role="alert">{{ saveError() }}</div> }
            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="closeDialog()">{{ i18n.t('referenceData.cancel') }}</button>
              <button type="button" class="btn-primary" (click)="save()" [disabled]="saving()">{{ saving() ? i18n.t('referenceData.saving') : i18n.t('referenceData.save') }}</button>
            </div>
          </div>
        </div>
      }
    </div>
  
    </foundation-page-shell>
  `,
})
export class FoundationReferenceDataComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(FoundationApiService);
  i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();

  loadingGroups = signal(true);
  loadingItems = signal(false);
  saving = signal(false);
  groupsError = signal<string | null>(null);
  itemsError = signal<string | null>(null);
  itemsErrorRequestId = signal<string | null>(null);
  saveError = signal<string | null>(null);
  showDialog = signal(false);

  groups = signal<RefGroup[]>([]);
  selectedGroup = signal<RefGroup | null>(null);
  items = signal<RefItem[]>([]);
  form: Partial<RefItem> = {};

  ngOnInit(): void { this.loadGroups(); }

  /**
   * Load reference-data group catalog. `getLookups()` already has a built-in
   * catchError (see FoundationApiService) that emits `{ lookupsLoadError }`
   * on HTTP failure — that sentinel is the documented contract. We check for
   * it explicitly and surface the error state. No hardcoded client fallbacks.
   */
  loadGroups(): void {
    this.loadingGroups.set(true);
    this.groupsError.set(null);
    this.groups.set([]);
    this.selectedGroup.set(null);
    this.items.set([]);
    this.itemsError.set(null);

    this.api.getLookups().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (lookups: FoundationLookups) => {
        if (lookups.lookupsLoadError) {
          // Explicit failure sentinel from FoundationApiService — surface it.
          this.groupsError.set(lookups.lookupsLoadError);
          this.loadingGroups.set(false);
          return;
        }
        const fromBackend = lookups.referenceDataGroups;
        // Treat `undefined` (contract missing), `null`, or empty array as empty
        // — we no longer synthesize default groups to paper over contract drift.
        this.groups.set(Array.isArray(fromBackend) ? fromBackend : []);
        this.loadingGroups.set(false);
      },
      // getLookups() already swallows errors into lookupsLoadError, but keep
      // this branch for defense-in-depth — any uncaught error still surfaces.
      error: (err: unknown) => {
        this.groupsError.set(FoundationApiService.formatLoadError(err));
        this.loadingGroups.set(false);
      },
    });
  }

  selectGroup(g: RefGroup): void {
    this.selectedGroup.set(g);
    this.loadingItems.set(true);
    this.itemsError.set(null);
    this.itemsErrorRequestId.set(null);
    this.items.set([]);
    this.api.getReferenceData(g.endpoint).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: unknown) => {
        this.items.set(normalizeReferenceItems(res));
        this.loadingItems.set(false);
      },
      error: (err: unknown) => {
        this.itemsError.set(FoundationApiService.formatLoadError(err));
        this.itemsErrorRequestId.set(this.extractRequestId(err));
        this.items.set([]);
        this.loadingItems.set(false);
      },
    });
  }

  openCreate(): void {
    this.form = {};
    this.saveError.set(null);
    this.showDialog.set(true);
  }
  closeDialog(): void { this.showDialog.set(false); }

  save(): void {
    if (!this.form.code?.trim() || !this.form.name_en?.trim()) {
      this.saveError.set(this.i18n.t('referenceData.requiredFields'));
      return;
    }
    this.saveError.set(null);
    this.saving.set(true);
    const g = this.selectedGroup();
    if (!g) { this.saving.set(false); return; }
    this.api.createReferenceItem(g.endpoint, this.form).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.saving.set(false); this.closeDialog(); this.selectGroup(g); },
      error: (err: unknown) => {
        this.saveError.set(FoundationApiService.formatLoadError(err));
        this.saving.set(false);
      },
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

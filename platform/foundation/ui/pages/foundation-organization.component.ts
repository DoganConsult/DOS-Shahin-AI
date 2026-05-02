import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { FOUNDATION_TOAST, type FoundationToast, NoopFoundationToast } from '../ports/toast.port';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FoundationApiService } from '../services/foundation-api.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
// ToastService migrated — use Angular's built-in notification or @dos/ui-system status-banner

import { FoundationPageShellComponent } from '../components/foundation-page-shell.component';
interface Org {
  id?: string;
  name_en?: string;
  name_ar?: string;
  code?: string;
  status?: string;
  type?: string;
  parent_id?: string;
  [key: string]: unknown;
}

@Component({
  selector: 'app-foundation-organization',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, FoundationPageShellComponent],
  styles: [`
    .org-page { padding: 24px 28px; min-height: 100vh; background: var(--surface-ground); }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .page-title { font-size: var(--font-size-xl); font-weight: 600; margin: 0; }
    .btn-primary { background: var(--primary-color); color: #fff; border: none; border-radius: var(--radius-sm); padding: 8px 16px; cursor: pointer; font-size: var(--font-size-sm); min-height: 40px; }
    .btn-primary[disabled] { opacity: 0.6; cursor: not-allowed; }
    .btn-primary:hover:not([disabled]) { opacity: .88; }
    .btn-secondary { background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); padding: 8px 16px; cursor: pointer; font-size: var(--font-size-sm); min-height: 40px; color: var(--text-color); }
    .btn-icon { background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); padding: 4px 10px; cursor: pointer; font-size: var(--font-size-xs); margin-inline-start: 4px; min-height: 32px; min-width: 32px; }
    .btn-icon[disabled] { opacity: 0.6; cursor: not-allowed; }
    .btn-icon.danger { color: var(--red-500); border-color: var(--red-200); }
    .table-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-md); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { background: var(--surface-section); padding: 10px 14px; text-align: start; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary); border-bottom: 1px solid var(--surface-border); }
    td { padding: 10px 14px; font-size: var(--font-size-sm); border-bottom: 1px solid var(--surface-border); }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: var(--font-size-2xs); font-weight: 600; }
    .badge.active { background: var(--green-100); color: var(--green-700); }
    .empty-state { text-align: center; padding: 40px; color: var(--text-color-secondary); }
    .error-msg { color: var(--red-500); font-size: var(--font-size-sm); margin-bottom: 12px; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
    .modal { background: var(--surface-overlay); border-radius: var(--radius-lg); padding: 24px; min-width: 0; max-width: 540px; width: 100%; box-shadow: 0 8px 32px rgba(0,0,0,.18); max-height: 90vh; overflow-y: auto; }
    .modal-title { font-size: var(--font-size-lg); font-weight: 600; margin: 0 0 8px; }
    .modal-body { font-size: var(--font-size-sm); color: var(--text-color-secondary); margin: 0 0 20px; }
    .form-group { margin-bottom: 14px; }
    .form-group label { display: block; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary); margin-bottom: 4px; }
    .form-group input, .form-group select { width: 100%; padding: 8px 12px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); background: var(--surface-card); color: var(--text-color); font-size: var(--font-size-sm); box-sizing: border-box; min-height: 40px; }
    .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; flex-wrap: wrap; }
    .danger-btn { background: var(--red-500, #ef4444); color: #fff; border: none; border-radius: var(--radius-sm); padding: 8px 16px; cursor: pointer; font-size: var(--font-size-sm); min-height: 40px; }
    .danger-btn[disabled] { opacity: 0.6; cursor: not-allowed; }
    .field-error { color: var(--red-500); font-size: var(--font-size-xs); margin-top: 4px; }
  `],
  template: `
    <foundation-page-shell [route]="'/foundation/organization'" [titleKey]="'foundation.nav.organization'">
    <div class="org-page" [dir]="i18n.direction()">
      <div class="page-header">
        <h2 class="page-title">{{ i18n.t('foundationOrganization.title') }}</h2>
        <button type="button" class="btn-primary" (click)="openCreate()">{{ i18n.t('foundationOrganization.add') }}</button>
      </div>
      @if (error()) { <div class="error-msg" role="alert">{{ error() }}</div> }
      <div class="table-card">
        @if (loading()) {
          <div class="empty-state">{{ i18n.t('foundationOrganization.loading') }}</div>
        } @else if (items().length === 0) {
          <div class="empty-state">{{ i18n.t('foundationOrganization.noData') }}</div>
        } @else {
          <table class="responsive-stack">
            <thead>
              <tr>
                <th scope="col">{{ i18n.t('foundationOrganization.headerNameEn') }}</th>
                <th scope="col">{{ i18n.t('foundationOrganization.headerNameAr') }}</th>
                <th scope="col">{{ i18n.t('foundationOrganization.headerCode') }}</th>
                <th scope="col">{{ i18n.t('foundationOrganization.headerType') }}</th>
                <th scope="col">{{ i18n.t('foundationOrganization.headerStatus') }}</th>
                <th scope="col">{{ i18n.t('foundationOrganization.headerActions') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (org of items(); track org.id) {
                <tr>
                  <td [attr.data-label]="i18n.t('foundationOrganization.headerNameEn')">{{ org.name_en || '—' }}</td>
                  <td [attr.data-label]="i18n.t('foundationOrganization.headerNameAr')" dir="rtl">{{ org.name_ar || '—' }}</td>
                  <td [attr.data-label]="i18n.t('foundationOrganization.headerCode')" class="font-mono text-xs">{{ org.code || '—' }}</td>
                  <td [attr.data-label]="i18n.t('foundationOrganization.headerType')">{{ org.type || '—' }}</td>
                  <td [attr.data-label]="i18n.t('foundationOrganization.headerStatus')">
                    <span class="badge" [class.active]="org.status === 'active'">{{ org.status || 'active' }}</span>
                  </td>
                  <td [attr.data-label]="i18n.t('foundationOrganization.headerActions')">
                    <button type="button" class="btn-icon" (click)="openEdit(org)"
                      [attr.aria-label]="i18n.t('foundationOrganization.edit') + ': ' + (org.name_en || org.code || '')">
                      {{ i18n.t('foundationOrganization.edit') }}
                    </button>
                    <button type="button" class="btn-icon danger" (click)="askDelete(org)"
                      [disabled]="isDeleting(org)"
                      [attr.aria-label]="i18n.t('foundationOrganization.delete') + ': ' + (org.name_en || org.code || '')">
                      {{ isDeleting(org) ? i18n.t('foundationOrganization.deleting') : i18n.t('foundationOrganization.delete') }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      @if (showDialog()) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="org-dialog-title" (click)="closeDialog()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3 id="org-dialog-title" class="modal-title">{{ editing() ? i18n.t('foundationOrganization.editOrganization') : i18n.t('foundationOrganization.newOrganization') }}</h3>
            <div class="form-group">
              <label for="f-org-name-en">{{ i18n.t('foundationOrganization.fieldNameEn') }} *</label>
              <input id="f-org-name-en" type="text" [(ngModel)]="form.name_en" required />
              @if (formError() === 'nameEnRequired') { <div class="field-error">{{ i18n.t('foundationOrganization.nameEnRequired') }}</div> }
            </div>
            <div class="form-group">
              <label for="f-org-name-ar">{{ i18n.t('foundationOrganization.fieldNameAr') }}</label>
              <input id="f-org-name-ar" type="text" [(ngModel)]="form.name_ar" dir="rtl" />
            </div>
            <div class="form-group">
              <label for="f-org-code">{{ i18n.t('foundationOrganization.fieldCode') }}</label>
              <input id="f-org-code" type="text" [(ngModel)]="form.code" />
            </div>
            <div class="form-group">
              <label for="f-org-type">{{ i18n.t('foundationOrganization.fieldType') }}</label>
              <input id="f-org-type" type="text" [(ngModel)]="form.type" [placeholder]="i18n.t('foundationOrganization.typePlaceholder')" />
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="closeDialog()">{{ i18n.t('foundationOrganization.cancel') }}</button>
              <button type="button" class="btn-primary" (click)="save()" [disabled]="saving()">{{ saving() ? i18n.t('foundationOrganization.saving') : i18n.t('foundationOrganization.save') }}</button>
            </div>
          </div>
        </div>
      }

      @if (pendingDelete(); as pending) {
        <div class="modal-overlay" role="alertdialog" aria-modal="true" aria-labelledby="org-confirm-title" aria-describedby="org-confirm-msg" (click)="cancelDelete()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3 id="org-confirm-title" class="modal-title">{{ i18n.t('foundationOrganization.confirmDelete') }}</h3>
            <p id="org-confirm-msg" class="modal-body">
              {{ i18n.t('foundationOrganization.confirmDeleteMsg', { name: pending.name_en || pending.code || '' }) }}
            </p>
            @if (deleteError()) { <div class="field-error" role="alert">{{ deleteError() }}</div> }
            <div class="modal-actions">
              <button type="button" class="btn-secondary" (click)="cancelDelete()" [disabled]="isDeleting(pending)">{{ i18n.t('foundationOrganization.cancel') }}</button>
              <button type="button" class="danger-btn" (click)="confirmDelete()" [disabled]="isDeleting(pending)">
                {{ isDeleting(pending) ? i18n.t('foundationOrganization.deleting') : i18n.t('foundationOrganization.confirm') }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  
    </foundation-page-shell>
  `,
})
export class FoundationOrganizationComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(FoundationApiService);
  private toast: FoundationToast = inject(FOUNDATION_TOAST, { optional: true }) ?? new NoopFoundationToast();
  i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();

  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  showDialog = signal(false);
  editing = signal<Org | null>(null);
  items = signal<Org[]>([]);
  form: Partial<Org> = {};
  formError = signal<string | null>(null);

  /** Per-org in-flight DELETE guard so re-clicks during the request are no-ops. */
  private deletingIds = signal<Set<string>>(new Set());
  pendingDelete = signal<Org | null>(null);
  deleteError = signal<string | null>(null);

  ngOnInit(): void { this.load(); }

  isDeleting(org: Org): boolean {
    return !!org.id && this.deletingIds().has(org.id);
  }

  private load(): void {
    this.loading.set(true);
    this.api.getOrganizations().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => { this.items.set((res.organizations ?? []) as Org[]); this.loading.set(false); },
      error: (err) => { this.error.set(FoundationApiService.formatLoadError(err)); this.loading.set(false); },
    });
  }

  openCreate(): void { this.editing.set(null); this.form = {}; this.formError.set(null); this.showDialog.set(true); }
  openEdit(org: Org): void { this.editing.set(org); this.form = { name_en: org.name_en, name_ar: org.name_ar, code: org.code, type: org.type }; this.formError.set(null); this.showDialog.set(true); }
  closeDialog(): void { this.showDialog.set(false); this.editing.set(null); }

  save(): void {
    if (!this.form.name_en?.trim()) {
      this.formError.set('nameEnRequired');
      return;
    }
    this.formError.set(null);
    this.saving.set(true);
    const target = this.editing();
    const isUpdate = !!target?.id;
    const obs$ = isUpdate ? this.api.updateOrganization(target!.id!, this.form) : this.api.createOrganization(this.form);
    obs$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeDialog();
        this.toast.success(this.i18n.t(isUpdate ? 'foundationOrganization.saveSuccess' : 'foundationOrganization.createSuccess'));
        this.load();
      },
      error: (err) => {
        const msg = FoundationApiService.formatLoadError(err);
        this.error.set(msg);
        this.saving.set(false);
        this.toast.error(this.i18n.t('foundationOrganization.saveFailed'), msg);
      },
    });
  }

  askDelete(org: Org): void {
    if (!org.id || this.isDeleting(org)) return;
    this.deleteError.set(null);
    this.pendingDelete.set(org);
  }
  cancelDelete(): void {
    if (this.pendingDelete() && this.isDeleting(this.pendingDelete()!)) return;
    this.pendingDelete.set(null);
    this.deleteError.set(null);
  }
  confirmDelete(): void {
    const target = this.pendingDelete();
    if (!target?.id) return;
    if (this.isDeleting(target)) return;
    const id = target.id;
    const name = target.name_en || target.code || '';
    this.deletingIds.update((s) => { const n = new Set(s); n.add(id); return n; });
    this.deleteError.set(null);
    this.api.deleteOrganization(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.deletingIds.update((s) => { const n = new Set(s); n.delete(id); return n; });
        this.pendingDelete.set(null);
        this.toast.success(
          this.i18n.t('foundationOrganization.deleteSuccess'),
          this.i18n.t('foundationOrganization.deleteSuccessDetail', { name }),
        );
        this.load();
      },
      error: (err) => {
        this.deletingIds.update((s) => { const n = new Set(s); n.delete(id); return n; });
        const msg = FoundationApiService.formatLoadError(err);
        this.deleteError.set(msg);
        this.error.set(msg);
        this.toast.error(this.i18n.t('foundationOrganization.deleteFailed'), msg);
      },
    });
  }
}

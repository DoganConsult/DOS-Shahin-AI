import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FoundationApiService } from '../services/foundation-api.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';

import { FoundationPageShellComponent } from '../components/foundation-page-shell.component';
interface Position {
  position_id?: string;
  id?: string;
  title_en: string;
  title_ar?: string;
  grade?: string;
  dept_id?: string;
  department_name?: string;
  reports_to_position_id?: string;
  status: 'active' | 'inactive' | 'vacant';
}

@Component({
  selector: 'app-foundation-positions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, FoundationPageShellComponent],
  styles: [`
    .positions-page { padding: 24px 28px; min-height: 100vh; background: var(--surface-ground); }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .page-title { font-size: var(--font-size-xl); font-weight: 600; margin: 0; }
    .btn-primary { background: var(--primary-color); color: #fff; border: none; border-radius: var(--radius-sm); padding: 8px 16px; cursor: pointer; font-size: var(--font-size-sm); }
    .btn-primary:hover { opacity: .88; }
    .btn-icon { background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); padding: 4px 10px; cursor: pointer; font-size: var(--font-size-xs); margin-inline-start: 4px; }
    .btn-icon.danger { color: var(--red-500); border-color: var(--red-200); }
    .btn-icon.danger:hover { background: var(--red-50); }
    .search-bar { display: flex; gap: 8px; margin-bottom: 16px; }
    .search-bar input { flex: 1; padding: 8px 12px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); background: var(--surface-card); color: var(--text-color); font-size: var(--font-size-sm); }
    .table-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-md); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { background: var(--surface-section); padding: 10px 14px; text-align: start; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary); border-bottom: 1px solid var(--surface-border); }
    td { padding: 10px 14px; font-size: var(--font-size-sm); border-bottom: 1px solid var(--surface-border); vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: var(--font-size-2xs); font-weight: 600; }
    .badge.active { background: var(--green-100); color: var(--green-700); }
    .badge.inactive { background: var(--surface-section); color: var(--text-color-secondary); }
    .badge.vacant { background: var(--yellow-100); color: var(--yellow-700); }
    .empty-state { text-align: center; padding: 40px; color: var(--text-color-secondary); }
    .error-msg { color: var(--red-500); font-size: var(--font-size-sm); margin-bottom: 12px; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: var(--surface-overlay); border-radius: var(--radius-lg); padding: 24px; min-width: 400px; max-width: 540px; width: 100%; box-shadow: 0 8px 32px rgba(0,0,0,.18); }
    .modal-title { font-size: var(--font-size-lg); font-weight: 600; margin: 0 0 20px; }
    .form-group { margin-bottom: 14px; }
    .form-group label { display: block; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary); margin-bottom: 4px; }
    .form-group input, .form-group select { width: 100%; padding: 8px 12px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); background: var(--surface-card); color: var(--text-color); font-size: var(--font-size-sm); box-sizing: border-box; }
    .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
    .btn-cancel { background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); padding: 8px 16px; cursor: pointer; font-size: var(--font-size-sm); }
  `],
  template: `
    <foundation-page-shell [route]="'/foundation/positions'" [titleKey]="'foundation.nav.positions'">
    <div class="positions-page" [dir]="i18n.direction()">
      <div class="page-header">
        <h2 class="page-title">{{ i18n.translate('foundation.nav.positions') }}</h2>
        <button class="btn-primary" (click)="openCreate()">+ {{ i18n.translate('foundation.positions.add') }}</button>
      </div>

      @if (error()) {
        <div class="error-msg">{{ error() }}</div>
      }

      <div class="search-bar">
        <input type="text" [(ngModel)]="searchTerm" [placeholder]="i18n.translate('foundation.positions.searchPlaceholder')" (input)="onSearch()" />
      </div>

      <div class="table-card">
        @if (loading()) {
          <div class="empty-state">{{ i18n.translate('foundation.module.loading') }}</div>
        } @else if (filtered().length === 0) {
          <div class="empty-state">{{ i18n.translate('foundation.positions.empty') }}</div>
        } @else {
          <table class="responsive-stack">
            <thead>
              <tr>
                <th>{{ i18n.translate('foundation.positions.titleEn') }}</th>
                <th>{{ i18n.translate('foundation.positions.titleAr') }}</th>
                <th>{{ i18n.translate('foundation.positions.grade') }}</th>
                <th>{{ i18n.translate('foundation.positions.department') }}</th>
                <th>{{ i18n.translate('foundation.fields.status') }}</th>
                <th>{{ i18n.translate('foundation.positions.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (pos of filtered(); track pos.position_id ?? pos.id) {
                <tr>
                  <td [attr.data-label]="i18n.translate('foundation.positions.titleEn')">{{ pos.title_en }}</td>
                  <td [attr.data-label]="i18n.translate('foundation.positions.titleAr')">{{ pos.title_ar || '—' }}</td>
                  <td [attr.data-label]="i18n.translate('foundation.positions.grade')">{{ pos.grade || '—' }}</td>
                  <td [attr.data-label]="i18n.translate('foundation.positions.department')">{{ pos.department_name || '—' }}</td>
                  <td [attr.data-label]="i18n.translate('foundation.fields.status')"><span class="badge" [class]="pos.status">{{ i18n.translate('foundation.status.' + pos.status) }}</span></td>
                  <td [attr.data-label]="i18n.translate('foundation.positions.actions')">
                    <button class="btn-icon" (click)="openEdit(pos)">{{ i18n.translate('foundation.actions.edit') }}</button>
                    <button class="btn-icon danger" (click)="confirmDelete(pos)">{{ i18n.translate('foundation.actions.delete') }}</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      @if (showDialog()) {
        <div class="modal-overlay" (click)="closeDialog()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3 class="modal-title">{{ i18n.translate(editing() ? 'foundation.positions.edit' : 'foundation.positions.new') }}</h3>
            <div class="form-group">
              <label>{{ i18n.translate('foundation.positions.titleEn') }} *</label>
              <input type="text" [(ngModel)]="form.title_en" />
            </div>
            <div class="form-group">
              <label>{{ i18n.translate('foundation.positions.titleAr') }}</label>
              <input type="text" [(ngModel)]="form.title_ar" dir="rtl" />
            </div>
            <div class="form-group">
              <label>{{ i18n.translate('foundation.positions.grade') }}</label>
              <input type="text" [(ngModel)]="form.grade" />
            </div>
            <div class="form-group">
              <label>{{ i18n.translate('foundation.fields.status') }}</label>
              <select [(ngModel)]="form.status">
                <option value="active">{{ i18n.translate('foundation.status.active') }}</option>
                <option value="inactive">{{ i18n.translate('foundation.status.inactive') }}</option>
                <option value="vacant">{{ i18n.translate('foundation.status.vacant') }}</option>
              </select>
            </div>
            <div class="modal-actions">
              <button class="btn-cancel" (click)="closeDialog()">{{ i18n.translate('foundation.actions.cancel') }}</button>
              <button class="btn-primary" (click)="save()" [disabled]="saving()">
                {{ i18n.translate(saving() ? 'foundation.positions.saving' : 'foundation.actions.save') }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  
    </foundation-page-shell>
  `,
})
export class FoundationPositionsComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(FoundationApiService);
  i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();

  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  showDialog = signal(false);
  editing = signal<Position | null>(null);

  positions = signal<Position[]>([]);
  filtered = signal<Position[]>([]);
  searchTerm = '';

  form: Partial<Position> = { status: 'active' };

  ngOnInit(): void {
    this.loadPositions();
  }

  private loadPositions(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getPositions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const items = (res.positions ?? []) as Position[];
          this.positions.set(items);
          this.applyFilter();
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(FoundationApiService.formatLoadError(err));
          this.loading.set(false);
        },
      });
  }

  onSearch(): void {
    this.applyFilter();
  }

  private applyFilter(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.filtered.set(this.positions());
      return;
    }
    this.filtered.set(
      this.positions().filter(p =>
        p.title_en.toLowerCase().includes(term) ||
        (p.title_ar ?? '').toLowerCase().includes(term) ||
        (p.grade ?? '').toLowerCase().includes(term) ||
        (p.department_name ?? '').toLowerCase().includes(term),
      ),
    );
  }

  openCreate(): void {
    this.editing.set(null);
    this.form = { status: 'active' };
    this.showDialog.set(true);
  }

  openEdit(pos: Position): void {
    this.editing.set(pos);
    this.form = { title_en: pos.title_en, title_ar: pos.title_ar, grade: pos.grade, status: pos.status };
    this.showDialog.set(true);
  }

  closeDialog(): void {
    this.showDialog.set(false);
    this.editing.set(null);
  }

  save(): void {
    if (!this.form.title_en?.trim()) {
      this.error.set('Title (English) is required.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const editTarget = this.editing();
    const id = editTarget?.position_id ?? editTarget?.id;
    const obs$ = id
      ? this.api.updatePosition(id, this.form)
      : this.api.createPosition(this.form);

    obs$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeDialog();
        this.loadPositions();
      },
      error: (err) => {
        this.error.set(FoundationApiService.formatLoadError(err));
        this.saving.set(false);
      },
    });
  }

  confirmDelete(pos: Position): void {
    const id = pos.position_id ?? pos.id;
    if (!id || !confirm(`Delete position "${pos.title_en}"?`)) return;
    this.api.deletePosition(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadPositions(),
        error: (err) => this.error.set(FoundationApiService.formatLoadError(err)),
      });
  }
}

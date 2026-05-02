import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FoundationApiService } from '../services/foundation-api.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';

import { FoundationPageShellComponent } from '../components/foundation-page-shell.component';
interface Department {
  id?: string;
  name_en?: string;
  name_ar?: string;
  code?: string;
  status?: string;
  head_name?: string;
  parent_name?: string;
  user_count?: number;
  [key: string]: unknown;
}

@Component({
  selector: 'app-foundation-departments',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, FoundationPageShellComponent],
  styles: [`
    .dept-page { padding: 24px 28px; min-height: 100vh; background: var(--surface-ground); }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .page-title { font-size: var(--font-size-xl); font-weight: 600; margin: 0; }
    .btn-primary { background: var(--primary-color); color: #fff; border: none; border-radius: var(--radius-sm); padding: 8px 16px; cursor: pointer; font-size: var(--font-size-sm); }
    .btn-icon { background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); padding: 4px 10px; cursor: pointer; font-size: var(--font-size-xs); margin-inline-start: 4px; }
    .btn-icon.danger { color: var(--red-500); border-color: var(--red-200); }
    .search-bar { margin-bottom: 16px; }
    .search-bar input { width: 100%; max-width: 320px; padding: 8px 12px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); background: var(--surface-card); color: var(--text-color); font-size: var(--font-size-sm); }
    .table-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-md); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { background: var(--surface-section); padding: 10px 14px; text-align: start; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary); border-bottom: 1px solid var(--surface-border); }
    td { padding: 10px 14px; font-size: var(--font-size-sm); border-bottom: 1px solid var(--surface-border); }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: var(--font-size-2xs); font-weight: 600; }
    .badge.active { background: var(--green-100); color: var(--green-700); }
    .empty-state { text-align: center; padding: 40px; color: var(--text-color-secondary); }
    .error-msg { color: var(--red-500); font-size: var(--font-size-sm); margin-bottom: 12px; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: var(--surface-overlay); border-radius: var(--radius-lg); padding: 24px; min-width: 400px; max-width: 540px; width: 100%; box-shadow: 0 8px 32px rgba(0,0,0,.18); }
    .modal-title { font-size: var(--font-size-lg); font-weight: 600; margin: 0 0 20px; }
    .form-group { margin-bottom: 14px; }
    .form-group label { display: block; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary); margin-bottom: 4px; }
    .form-group input { width: 100%; padding: 8px 12px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); background: var(--surface-card); color: var(--text-color); font-size: var(--font-size-sm); box-sizing: border-box; }
    .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
    .btn-cancel { background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); padding: 8px 16px; cursor: pointer; font-size: var(--font-size-sm); }
  `],
  template: `
    <foundation-page-shell [route]="'/foundation/departments'" [titleKey]="'foundation.nav.departments'">
    <div class="dept-page" [dir]="i18n.direction()">
      <div class="page-header">
        <h2 class="page-title">{{ i18n.tr('nav.foundationDepts', 'Departments') }}</h2>
        <button class="btn-primary" (click)="openCreate()">+ Add Department</button>
      </div>
      @if (error()) { <div class="error-msg">{{ error() }}</div> }
      <div class="search-bar">
        <input type="text" [(ngModel)]="searchTerm" placeholder="Search departments…" (input)="applyFilter()" />
      </div>
      <div class="table-card">
        @if (loading()) {
          <div class="empty-state">Loading…</div>
        } @else if (filtered().length === 0) {
          <div class="empty-state">No departments found.</div>
        } @else {
          <table class="responsive-stack">
            <thead><tr><th>Name (EN)</th><th>Name (AR)</th><th>Code</th><th>Head</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              @for (dept of filtered(); track dept.id) {
                <tr>
                  <td data-label="Name (EN)">{{ dept.name_en || '—' }}</td>
                  <td data-label="Name (AR)" dir="rtl">{{ dept.name_ar || '—' }}</td>
                  <td data-label="Code" class="font-mono text-xs">{{ dept.code || '—' }}</td>
                  <td data-label="Head">{{ dept.head_name || '—' }}</td>
                  <td data-label="Status"><span class="badge" [class.active]="dept.status === 'active'">{{ dept.status || 'active' }}</span></td>
                  <td data-label="Actions">
                    <button class="btn-icon" (click)="openEdit(dept)">Edit</button>
                    <button class="btn-icon danger" (click)="confirmDelete(dept)">Delete</button>
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
            <h3 class="modal-title">{{ editing() ? 'Edit Department' : 'New Department' }}</h3>
            <div class="form-group"><label>Name (English) *</label><input [(ngModel)]="form.name_en" /></div>
            <div class="form-group"><label>Name (Arabic)</label><input [(ngModel)]="form.name_ar" dir="rtl" /></div>
            <div class="form-group"><label>Code</label><input [(ngModel)]="form.code" /></div>
            <div class="modal-actions">
              <button class="btn-cancel" (click)="closeDialog()">Cancel</button>
              <button class="btn-primary" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
            </div>
          </div>
        </div>
      }
    </div>
  
    </foundation-page-shell>
  `,
})
export class FoundationDepartmentsComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(FoundationApiService);
  i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();

  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  showDialog = signal(false);
  editing = signal<Department | null>(null);
  items = signal<Department[]>([]);
  filtered = signal<Department[]>([]);
  searchTerm = '';
  form: Partial<Department> = {};

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.api.getDepartments().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        const list = (res.departments ?? res.rows ?? []) as Department[];
        this.items.set(list);
        this.applyFilter();
        this.loading.set(false);
      },
      error: (err) => { this.error.set(FoundationApiService.formatLoadError(err)); this.loading.set(false); },
    });
  }

  applyFilter(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) { this.filtered.set(this.items()); return; }
    this.filtered.set(this.items().filter(d =>
      (d.name_en ?? '').toLowerCase().includes(term) || (d.code ?? '').toLowerCase().includes(term),
    ));
  }

  openCreate(): void { this.editing.set(null); this.form = {}; this.showDialog.set(true); }
  openEdit(d: Department): void { this.editing.set(d); this.form = { name_en: d.name_en, name_ar: d.name_ar, code: d.code }; this.showDialog.set(true); }
  closeDialog(): void { this.showDialog.set(false); this.editing.set(null); }

  save(): void {
    if (!this.form.name_en?.trim()) { this.error.set('Name is required.'); return; }
    this.saving.set(true);
    const target = this.editing();
    const obs$ = target?.id ? this.api.updateDepartment(target.id, this.form) : this.api.createDepartment(this.form);
    obs$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.saving.set(false); this.closeDialog(); this.load(); },
      error: (err) => { this.error.set(FoundationApiService.formatLoadError(err)); this.saving.set(false); },
    });
  }

  confirmDelete(d: Department): void {
    if (!d.id || !confirm(`Delete "${d.name_en}"?`)) return;
    this.api.deleteDepartment(d.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(FoundationApiService.formatLoadError(err)),
    });
  }
}

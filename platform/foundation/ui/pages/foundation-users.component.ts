import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FoundationApiService } from '../services/foundation-api.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';

import { FoundationPageShellComponent } from '../components/foundation-page-shell.component';
interface User { id?: string; email?: string; first_name?: string; last_name?: string; role?: string; status?: string; department_name?: string; [k: string]: unknown; }

@Component({
  selector: 'app-foundation-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, FoundationPageShellComponent],
  styles: [`
    .users-page { padding: 24px 28px; min-height: 100vh; background: var(--surface-ground); }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .page-title { font-size: var(--font-size-xl); font-weight: 600; margin: 0; }
    .btn-primary { background: var(--primary-color); color: #fff; border: none; border-radius: var(--radius-sm); padding: 8px 16px; cursor: pointer; font-size: var(--font-size-sm); }
    .btn-icon { background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); padding: 4px 10px; cursor: pointer; font-size: var(--font-size-xs); margin-inline-start: 4px; }
    .btn-icon.danger { color: var(--red-500); border-color: var(--red-200); }
    .filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .filters input, .filters select { padding: 8px 12px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); background: var(--surface-card); color: var(--text-color); font-size: var(--font-size-sm); }
    .filters input { flex: 1; min-width: 200px; }
    .table-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-md); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { background: var(--surface-section); padding: 10px 14px; text-align: start; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary); border-bottom: 1px solid var(--surface-border); }
    td { padding: 10px 14px; font-size: var(--font-size-sm); border-bottom: 1px solid var(--surface-border); }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: var(--font-size-2xs); font-weight: 600; }
    .badge.active { background: var(--green-100); color: var(--green-700); }
    .badge.inactive { background: var(--surface-section); color: var(--text-color-secondary); }
    .empty-state { text-align: center; padding: 40px; color: var(--text-color-secondary); }
    .error-msg { color: var(--red-500); font-size: var(--font-size-sm); margin-bottom: 12px; }
    .pagination { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; font-size: var(--font-size-xs); color: var(--text-color-secondary); }
    .pagination button { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-sm); padding: 4px 12px; cursor: pointer; font-size: var(--font-size-xs); }
    .pagination button:disabled { opacity: .4; cursor: default; }
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
    <foundation-page-shell [route]="'/foundation/users'" [titleKey]="'foundation.nav.users'" [showRail]="true">
    <div class="users-page" [dir]="i18n.direction()">
      <div class="page-header">
        <h2 class="page-title">{{ i18n.tr('nav.foundationUsers', 'Users') }}</h2>
        <button class="btn-primary" (click)="openCreate()">+ Add User</button>
      </div>
      @if (error()) { <div class="error-msg">{{ error() }}</div> }
      <div class="filters">
        <input type="text" [(ngModel)]="search" placeholder="Search by name or email…" (keyup.enter)="load()" />
        <select [(ngModel)]="statusFilter" (change)="load()">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>
      <div class="table-card">
        @if (loading()) {
          <div class="empty-state">Loading…</div>
        } @else if (items().length === 0) {
          <div class="empty-state">No users found.</div>
        } @else {
          <table class="responsive-stack">
            <thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              @for (u of items(); track u.id) {
                <tr>
                  <td data-label="Email">{{ u.email }}</td>
                  <td data-label="Name">{{ (u.first_name || '') + ' ' + (u.last_name || '') }}</td>
                  <td data-label="Role">{{ u.role || '—' }}</td>
                  <td data-label="Department">{{ u.department_name || '—' }}</td>
                  <td data-label="Status"><span class="badge" [class.active]="u.status === 'active'" [class.inactive]="u.status !== 'active'">{{ u.status || 'active' }}</span></td>
                  <td data-label="Actions">
                    <button class="btn-icon" (click)="openEdit(u)">Edit</button>
                    <button class="btn-icon danger" (click)="confirmDelete(u)">Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <div class="pagination">
            <span>Page {{ page }} of {{ totalPages() }}</span>
            <div>
              <button (click)="prevPage()" [disabled]="page <= 1">Prev</button>
              <button (click)="nextPage()" [disabled]="page >= totalPages()">Next</button>
            </div>
          </div>
        }
      </div>
      @if (showDialog()) {
        <div class="modal-overlay" (click)="closeDialog()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3 class="modal-title">{{ editing() ? 'Edit User' : 'New User' }}</h3>
            <div class="form-group"><label>Email *</label><input [(ngModel)]="form.email" type="email" /></div>
            <div class="form-group"><label>First Name</label><input [(ngModel)]="form.first_name" /></div>
            <div class="form-group"><label>Last Name</label><input [(ngModel)]="form.last_name" /></div>
            <div class="form-group"><label>Role</label>
              <select [(ngModel)]="form.role">
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="user">User</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
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
export class FoundationUsersComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(FoundationApiService);
  i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();

  loading = signal(true); saving = signal(false); error = signal<string | null>(null);
  showDialog = signal(false); editing = signal<User | null>(null);
  items = signal<User[]>([]); total = signal(0); totalPages = signal(1);
  page = 1; limit = 25; search = ''; statusFilter = '';
  form: Partial<User & { password?: string }> = { role: 'user' };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getUsers({ page: this.page, limit: this.limit, search: this.search || undefined, status: this.statusFilter || undefined })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res) => {
          this.items.set((res.users ?? []) as User[]);
          this.total.set(res.total ?? res.count ?? 0);
          this.totalPages.set(res.totalPages ?? (Math.ceil(this.total() / this.limit) || 1));
          this.loading.set(false);
        },
        error: (err) => { this.error.set(FoundationApiService.formatLoadError(err)); this.loading.set(false); },
      });
  }

  prevPage(): void { if (this.page > 1) { this.page--; this.load(); } }
  nextPage(): void { if (this.page < this.totalPages()) { this.page++; this.load(); } }

  openCreate(): void { this.editing.set(null); this.form = { role: 'user' }; this.showDialog.set(true); }
  openEdit(u: User): void { this.editing.set(u); this.form = { email: u.email, first_name: u.first_name, last_name: u.last_name, role: u.role }; this.showDialog.set(true); }
  closeDialog(): void { this.showDialog.set(false); this.editing.set(null); }

  save(): void {
    if (!this.form.email?.trim()) { this.error.set('Email is required.'); return; }
    this.saving.set(true);
    const t = this.editing();
    const obs$ = t?.id ? this.api.updateUser(t.id, this.form as any) : this.api.createUser(this.form as any);
    obs$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.saving.set(false); this.closeDialog(); this.load(); },
      error: (err) => { this.error.set(FoundationApiService.formatLoadError(err)); this.saving.set(false); },
    });
  }

  confirmDelete(u: User): void {
    if (!u.id || !confirm(`Delete "${u.email}"?`)) return;
    this.api.deleteUser(u.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.load(), error: (err) => this.error.set(FoundationApiService.formatLoadError(err)),
    });
  }
}

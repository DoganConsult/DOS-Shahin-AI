import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  DosAdaptiveCommandBarComponent,
  DosEmptyStateComponent,
  DosLoadingStateComponent,
  DosPageHeaderComponent,
  DosStatusBannerComponent,
} from '@dos/ui-system';
import type { ActionContract } from '@dos/ui-contracts';
import { FoundationApiService } from '../services/foundation-api.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';

interface User { id?: string; email?: string; first_name?: string; last_name?: string; role?: string; status?: string; department_name?: string; [k: string]: unknown; }

@Component({
  selector: 'app-foundation-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    DosAdaptiveCommandBarComponent,
    DosEmptyStateComponent,
    DosLoadingStateComponent,
    DosPageHeaderComponent,
    DosStatusBannerComponent,
  ],
  styles: [`
    :host {
      display: block;
    }
    .foundation-users {
      display: flex;
      flex-direction: column;
      gap: var(--cds-spacing-06);
      padding: var(--cds-spacing-06);
      background: var(--cds-background);
      min-height: 100%;
    }
    .foundation-users__eyebrow {
      color: var(--cds-text-secondary);
      font-size: var(--cds-body-compact-01-font-size);
      text-transform: uppercase;
      letter-spacing: .08em;
    }
    .foundation-users__meta {
      display: flex;
      align-items: center;
      gap: var(--cds-spacing-03);
      flex-wrap: wrap;
      color: var(--cds-text-secondary);
      font-size: var(--cds-label-01-font-size);
    }
    .foundation-users__panel {
      padding: var(--cds-spacing-05);
      border: 1px solid var(--cds-border-subtle-01);
      background: var(--cds-layer-01);
    }
    .foundation-users__filters {
      display: grid;
      grid-template-columns: minmax(15rem, 1fr) minmax(12rem, 16rem);
      gap: var(--cds-spacing-04);
      margin-bottom: var(--cds-spacing-05);
    }
    .foundation-users__field {
      display: flex;
      flex-direction: column;
      gap: var(--cds-spacing-02);
    }
    .foundation-users__field label {
      font-size: var(--cds-label-01-font-size);
      font-weight: 600;
      color: var(--cds-text-secondary);
    }
    .foundation-users__field input,
    .foundation-users__field select {
      width: 100%;
      padding: .875rem 1rem;
      border: 1px solid var(--cds-border-subtle-01);
      background: var(--cds-background);
      color: var(--cds-text-primary);
      box-sizing: border-box;
    }
    .foundation-users__table-shell {
      overflow-x: auto;
      border: 1px solid var(--cds-border-subtle-01);
      background: var(--cds-background);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 52rem;
    }
    th {
      background: var(--cds-layer-accent-01, var(--cds-layer-02));
      padding: .875rem 1rem;
      text-align: start;
      font-size: var(--cds-label-01-font-size);
      font-weight: 600;
      color: var(--cds-text-secondary);
      border-bottom: 1px solid var(--cds-border-subtle-01);
    }
    td {
      padding: .875rem 1rem;
      font-size: var(--cds-body-compact-01-font-size);
      border-bottom: 1px solid var(--cds-border-subtle-01);
      color: var(--cds-text-primary);
      vertical-align: top;
    }
    tr:last-child td {
      border-bottom: 0;
    }
    .foundation-users__badge {
      display: inline-flex;
      align-items: center;
      padding: .2rem .55rem;
      font-size: .75rem;
      font-weight: 600;
      background: var(--cds-layer-02);
      color: var(--cds-text-secondary);
      border: 1px solid var(--cds-border-subtle-01);
    }
    .foundation-users__badge--active {
      background: var(--cds-support-success-inverse, #198038);
      border-color: var(--cds-support-success-inverse, #198038);
      color: var(--cds-text-on-color, #fff);
    }
    .foundation-users__actions {
      display: flex;
      align-items: center;
      gap: var(--cds-spacing-02);
      flex-wrap: wrap;
    }
    .foundation-users__action-btn,
    .foundation-users__cancel-btn,
    .foundation-users__save-btn {
      padding: .55rem .9rem;
      border: 1px solid var(--cds-border-subtle-01);
      background: var(--cds-background);
      color: var(--cds-text-primary);
      cursor: pointer;
    }
    .foundation-users__action-btn--danger {
      color: var(--cds-support-error, #da1e28);
      border-color: var(--cds-support-error, #da1e28);
    }
    .foundation-users__pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--cds-spacing-04);
      padding-top: var(--cds-spacing-04);
      color: var(--cds-text-secondary);
      font-size: var(--cds-label-01-font-size);
    }
    .foundation-users__pagination-actions {
      display: flex;
      gap: var(--cds-spacing-02);
    }
    .foundation-users__pagination-actions button {
      padding: .45rem .8rem;
      border: 1px solid var(--cds-border-subtle-01);
      background: var(--cds-background);
      cursor: pointer;
    }
    .foundation-users__pagination-actions button:disabled {
      opacity: .5;
      cursor: default;
    }
    .foundation-users__modal-overlay {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--cds-spacing-05);
      background: var(--shell-overlay, rgba(0, 0, 0, 0.45));
      z-index: 1000;
    }
    .foundation-users__modal {
      width: min(100%, 34rem);
      padding: var(--cds-spacing-06);
      border: 1px solid var(--cds-border-subtle-01);
      background: var(--cds-layer-02);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
    }
    .foundation-users__modal-title {
      margin: 0 0 var(--cds-spacing-05);
      font-size: var(--cds-heading-03-font-size);
    }
    .foundation-users__form-group {
      display: flex;
      flex-direction: column;
      gap: var(--cds-spacing-02);
      margin-bottom: var(--cds-spacing-04);
    }
    .foundation-users__form-group label {
      font-size: var(--cds-label-01-font-size);
      font-weight: 600;
      color: var(--cds-text-secondary);
    }
    .foundation-users__form-group input,
    .foundation-users__form-group select {
      width: 100%;
      padding: .875rem 1rem;
      border: 1px solid var(--cds-border-subtle-01);
      background: var(--cds-background);
      color: var(--cds-text-primary);
      box-sizing: border-box;
    }
    .foundation-users__modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--cds-spacing-03);
      margin-top: var(--cds-spacing-05);
    }
    .foundation-users__save-btn {
      background: var(--cds-button-primary, #0f62fe);
      border-color: var(--cds-button-primary, #0f62fe);
      color: var(--cds-text-on-color, #fff);
    }
    @media (max-width: 960px) {
      .foundation-users__filters {
        grid-template-columns: 1fr;
      }
      .foundation-users__pagination {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `],
  template: `
    <section class="foundation-users" [dir]="i18n.direction()">
      <dos-page-header
        [title]="i18n.tr('nav.foundationUsers', 'Users')"
        [description]="'Foundation directory operations rendered directly under the workspace shell outlet, without the legacy nested page chrome.'">
        <div pageHeaderBreadcrumb class="foundation-users__eyebrow">Platform DNA / Foundation</div>
        <div pageHeaderMeta class="foundation-users__meta">
          <span>{{ total() }} total users</span>
          <span>•</span>
          <span>Page {{ page }} of {{ totalPages() }}</span>
        </div>
        <div pageHeaderActions>
          <dos-adaptive-command-bar [actions]="pageActions" (invoke)="handleAction($event)"></dos-adaptive-command-bar>
        </div>
      </dos-page-header>

      <dos-status-banner [kind]="bannerKind()" [title]="bannerTitle()">
        {{ bannerMessage() }}
      </dos-status-banner>

      <section class="foundation-users__panel">
        <div class="foundation-users__filters">
          <div class="foundation-users__field">
            <label for="foundation-users-search">Search</label>
            <input
              id="foundation-users-search"
              type="text"
              [(ngModel)]="search"
              placeholder="Search by name or email"
              (keyup.enter)="load()" />
          </div>
          <div class="foundation-users__field">
            <label for="foundation-users-status">Status</label>
            <select id="foundation-users-status" [(ngModel)]="statusFilter" (change)="load()">
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        @if (loading()) {
          <dos-loading-state label="Loading users from Foundation services..."></dos-loading-state>
        } @else if (items().length === 0) {
          <dos-empty-state
            title="No users found"
            description="Adjust the search or status filters, or create a new user directly from this page."
            primaryAction="Add user"
            secondaryAction="Clear filters"
            (primary)="openCreate()"
            (secondary)="resetFilters()">
          </dos-empty-state>
        } @else {
          <div class="foundation-users__table-shell">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (u of items(); track u.id) {
                  <tr>
                    <td>{{ u.email }}</td>
                    <td>{{ (u.first_name || '') + ' ' + (u.last_name || '') }}</td>
                    <td>{{ u.role || '—' }}</td>
                    <td>{{ u.department_name || '—' }}</td>
                    <td>
                      <span
                        class="foundation-users__badge"
                        [class.foundation-users__badge--active]="u.status === 'active'">
                        {{ u.status || 'active' }}
                      </span>
                    </td>
                    <td>
                      <div class="foundation-users__actions">
                        <button type="button" class="foundation-users__action-btn" (click)="openEdit(u)">Edit</button>
                        <button type="button" class="foundation-users__action-btn foundation-users__action-btn--danger" (click)="confirmDelete(u)">Delete</button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="foundation-users__pagination">
            <span>Displaying {{ items().length }} users on page {{ page }} of {{ totalPages() }}</span>
            <div class="foundation-users__pagination-actions">
              <button type="button" (click)="prevPage()" [disabled]="page <= 1">Prev</button>
              <button type="button" (click)="nextPage()" [disabled]="page >= totalPages()">Next</button>
            </div>
          </div>
        }
      </section>

      @if (showDialog()) {
        <div class="foundation-users__modal-overlay" (click)="closeDialog()">
          <div class="foundation-users__modal" (click)="$event.stopPropagation()">
            <h3 class="foundation-users__modal-title">{{ editing() ? 'Edit user' : 'New user' }}</h3>

            <div class="foundation-users__form-group">
              <label>Email *</label>
              <input [(ngModel)]="form.email" type="email" />
            </div>
            <div class="foundation-users__form-group">
              <label>First name</label>
              <input [(ngModel)]="form.first_name" />
            </div>
            <div class="foundation-users__form-group">
              <label>Last name</label>
              <input [(ngModel)]="form.last_name" />
            </div>
            <div class="foundation-users__form-group">
              <label>Role</label>
              <select [(ngModel)]="form.role">
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="user">User</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            <div class="foundation-users__modal-actions">
              <button type="button" class="foundation-users__cancel-btn" (click)="closeDialog()">Cancel</button>
              <button type="button" class="foundation-users__save-btn" (click)="save()" [disabled]="saving()">
                {{ saving() ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class FoundationUsersComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(FoundationApiService);
  i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();

  readonly pageActions: ActionContract[] = [
    { id: 'add', labelKey: 'Add user', priority: 'primary', mobile: 'visible' },
    { id: 'refresh', labelKey: 'Refresh', priority: 'secondary', mobile: 'visible' },
    { id: 'clear', labelKey: 'Clear filters', priority: 'overflow', mobile: 'overflow' },
  ];

  loading = signal(true); saving = signal(false); error = signal<string | null>(null);
  showDialog = signal(false); editing = signal<User | null>(null);
  items = signal<User[]>([]); total = signal(0); totalPages = signal(1);
  page = 1; limit = 25; search = ''; statusFilter = '';
  form: Partial<User & { password?: string }> = { role: 'user' };

  ngOnInit(): void { this.load(); }

  bannerKind(): 'info' | 'warning' {
    return this.error() ? 'warning' : 'info';
  }

  bannerTitle(): string {
    return this.error() ? 'Users directory is partial' : 'Users directory';
  }

  bannerMessage(): string {
    if (this.error()) return this.error() || '';
    if (this.loading()) return 'Loading Foundation user records from the live API.';
    return `${this.total()} total users available across ${this.totalPages()} pages. Apply filters or open the create flow from the command bar.`;
  }

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

  handleAction(action: ActionContract): void {
    switch (action.id) {
      case 'add':
        this.openCreate();
        break;
      case 'refresh':
        this.load();
        break;
      case 'clear':
        this.resetFilters();
        break;
      default:
        break;
    }
  }

  openCreate(): void { this.editing.set(null); this.form = { role: 'user' }; this.showDialog.set(true); }
  openEdit(u: User): void { this.editing.set(u); this.form = { email: u.email, first_name: u.first_name, last_name: u.last_name, role: u.role }; this.showDialog.set(true); }
  closeDialog(): void { this.showDialog.set(false); this.editing.set(null); }

  resetFilters(): void {
    this.search = '';
    this.statusFilter = '';
    this.page = 1;
    this.load();
  }

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

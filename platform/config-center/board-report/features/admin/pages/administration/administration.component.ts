import { asArray } from '@app/runtime/utils/safe-data';
import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { catchError, of } from 'rxjs';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiClientService } from "@app/core/services/api-client.service";

interface UserRow {
  id: string; email: string; first_name: string; last_name: string;
  role: string; status: string; last_login: string | null; created_at: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-administration',
    imports: [CommonModule, AppDatePipe, FormsModule, TableModule, TagModule, ButtonModule, DialogModule, InputTextModule, DropdownModule, TooltipModule, ConfirmDialogModule],
    providers: [ConfirmationService],
    template: `
    <section class="admin-shell" [dir]="i18n.direction()">
      <!-- ── Quick Stats ── -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon" style="background:#eff6ff"><i class="pi pi-users" style="color:#3b82f6"></i></div>
          <div class="stat-body">
            <div class="stat-value">{{ users().length }}</div>
            <div class="stat-label">{{ i18n.translate('admin.totalUsers') }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--status-success-bg, #defbe6)"><i class="pi pi-check-circle" style="color:#22c55e"></i></div>
          <div class="stat-body">
            <div class="stat-value">{{ activeCount() }}</div>
            <div class="stat-label">{{ i18n.translate('admin.active') }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--status-danger-bg, #fff1f1)"><i class="pi pi-ban" style="color:#ef4444"></i></div>
          <div class="stat-body">
            <div class="stat-value">{{ inactiveCount() }}</div>
            <div class="stat-label">{{ i18n.translate('admin.inactive') }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#faf5ff"><i class="pi pi-shield" style="color:var(--carbon-purple-60, #8a3ffc)"></i></div>
          <div class="stat-body">
            <div class="stat-value">{{ adminCount() }}</div>
            <div class="stat-label">{{ i18n.translate('admin.admins') }}</div>
          </div>
        </div>
      </div>

      <!-- ── Toolbar ── -->
      <div class="toolbar">
        <div class="toolbar-left">
          <span class="p-input-icon-left">
            <i class="pi pi-search"></i>
            <input pInputText [(ngModel)]="searchTerm" (ngModelChange)="filterUsers()" [placeholder]="i18n.translate('admin.searchPlaceholder')" [attr.aria-label]="i18n.translate('admin.searchPlaceholder')" class="search-input" />
          </span>
        </div>
        <div class="toolbar-right">
          <button pButton [label]="i18n.translate('admin.addUser')" icon="pi pi-plus" (click)="openAddDialog()" class="p-button-sm"></button>
          <button pButton icon="pi pi-refresh" (click)="loadUsers()" class="p-button-sm p-button-outlined" [pTooltip]="i18n.translate('admin.refresh')"></button>
        </div>
      </div>

      <!-- ── Users Table ── -->
      @if (loading()) {
        <div class="loading-state" aria-live="polite">
          <i class="pi pi-spin pi-spinner" style="font-size: var(--font-size-2xl);color:#3b82f6"></i>
          <span>{{ i18n.translate('admin.loadingUsers') }}</span>
        </div>
      } @else {
        <div class="table-wrap">
          <p-table [attr.aria-label]="i18n.translate('admin.ariaUsersTable')" [value]="filteredUsers()" [paginator]="true" [rows]="10" [rowsPerPageOptions]="[10,25,50]"
            styleClass="p-datatable-sm p-datatable-striped" [scrollable]="true" scrollHeight="500px"
            [globalFilterFields]="['email','first_name','last_name','role']">
            <ng-template pTemplate="header">
              <tr>
                <th style="width:50px">#</th>
                <th>{{ i18n.translate('admin.name') }}</th>
                <th>{{ i18n.translate('admin.email') }}</th>
                <th>{{ i18n.translate('admin.role') }}</th>
                <th>{{ i18n.translate('common.status') }}</th>
                <th>{{ i18n.translate('admin.lastLogin') }}</th>
                <th>{{ i18n.translate('admin.created') }}</th>
                <th style="width:120px">{{ i18n.translate('common.actions') }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-user let-i="rowIndex">
              <tr>
                <td><span class="row-num">{{ i + 1 }}</span></td>
                <td>
                  <div class="user-cell">
                    <div class="user-avatar" [style.background]="avatarColor(user)">{{ avatarInitials(user) }}</div>
                    <span class="user-name">{{ user.first_name }} {{ user.last_name }}</span>
                  </div>
                </td>
                <td><span class="email-text">{{ user.email }}</span></td>
                <td><p-tag [value]="roleLabel(user.role)" [severity]="roleSeverity(user.role)" /></td>
                <td><p-tag [value]="user.status || 'active'" [severity]="user.status === 'inactive' ? 'danger' : 'success'" /></td>
                <td><span class="date-text">{{ user.last_login ? (user.last_login | appDate:'short') : '—' }}</span></td>
                <td><span class="date-text">{{ user.created_at | appDate:'medium' }}</span></td>
                <td>
                  <div class="action-btns">
                    <button pButton icon="pi pi-pencil" [text]="true" severity="info" (click)="editUser(user)" [pTooltip]="i18n.translate('common.edit')" class="p-button-sm"></button>
                    <button pButton icon="pi pi-key" [text]="true" severity="warning" (click)="resetPassword(user)" [pTooltip]="i18n.translate('admin.resetPassword')" class="p-button-sm"></button>
                    <button pButton icon="pi pi-trash" [text]="true" severity="danger" (click)="confirmDelete(user)" [pTooltip]="i18n.translate('common.delete')" class="p-button-sm"></button>
                  </div>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="8" class="empty-state">
                <i class="pi pi-users" style="font-size: var(--font-size-3xl);color:#94a3b8;display:block;margin-bottom:8px"></i>
                <span style="color:#64748b">{{ i18n.translate('admin.noUsers') }}</span>
              </td></tr>
            </ng-template>
          </p-table>
        </div>
      }

      <!-- ── Add/Edit Dialog ── -->
      <p-dialog [(visible)]="dialogVisible" [header]="editingUser ? i18n.translate('admin.editUser') : i18n.translate('admin.addNewUser')" [modal]="true" [style]="{width:'500px'}" [draggable]="false">
        <div class="dialog-form">
          <div class="form-row">
            <label>{{ i18n.translate('admin.firstName') }} *</label>
            <input pInputText [(ngModel)]="form.first_name" [placeholder]="i18n.translate('admin.enterFirstName')" [attr.aria-label]="i18n.translate('admin.enterFirstName')" />
          </div>
          <div class="form-row">
            <label>{{ i18n.translate('admin.lastName') }} *</label>
            <input pInputText [(ngModel)]="form.last_name" [placeholder]="i18n.translate('admin.enterLastName')" [attr.aria-label]="i18n.translate('admin.enterLastName')" />
          </div>
          <div class="form-row">
            <label>{{ i18n.translate('admin.email') }} *</label>
            <input pInputText [(ngModel)]="form.email" type="email" placeholder="user@example.com" aria-label="user@example.com" />
          </div>
          <div class="form-row">
            <label>{{ i18n.translate('admin.role') }} *</label>
            <p-dropdown [options]="roleOptions" [(ngModel)]="form.role" optionLabel="label" optionValue="value" [placeholder]="i18n.translate('admin.selectRole')" [style]="{width:'100%'}" />
          </div>
          @if (!editingUser) {
            <div class="form-row">
              <label>{{ i18n.translate('admin.password') }} *</label>
              <input pInputText [(ngModel)]="form.password" type="password" [placeholder]="i18n.translate('admin.strongPassword')" [attr.aria-label]="i18n.translate('admin.strongPassword')" />
            </div>
          }
        </div>
        <ng-template pTemplate="footer">
          <button pButton [label]="i18n.translate('common.cancel')" icon="pi pi-times" class="p-button-text" (click)="dialogVisible = false"></button>
          <button pButton [label]="i18n.translate('common.save')" icon="pi pi-check" (click)="saveUser()" [loading]="saving()"></button>
        </ng-template>
      </p-dialog>

      <p-confirmDialog />
    </section>
  `,
    styles: [`
    .admin-shell{padding:20px 28px;max-width:1400px;margin:0 auto}

    .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
    .stat-card{display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--surface-card,#fff);border:1px solid var(--surface-border,var(--border-subtle));border-radius:var(--radius-md)}
    .stat-icon{width:40px;height:40px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .stat-icon i{font-size: var(--font-size-lg)}
    .stat-body{flex:1}
    .stat-value{font-size: var(--font-size-xl);font-weight:800;color:var(--text-heading,var(--text-heading));line-height:1.2}
    .stat-label{font-size: var(--font-size-sm);color:var(--text-secondary,var(--text-muted));font-weight:600;margin-top:2px}

    .toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap}
    .toolbar-left{display:flex;align-items:center;gap:8px}
    .toolbar-right{display:flex;align-items:center;gap:8px}
    .search-input{width:300px;font-size: var(--font-size-sm)}

    .table-wrap{background:var(--surface-card,#fff);border:1px solid var(--surface-border,var(--border-subtle));border-radius:var(--radius-md);overflow:hidden}

    .loading-state{display:flex;align-items:center;justify-content:center;gap:12px;padding:60px;color:var(--text-muted);font-size: var(--font-size-base)}

    .row-num{width:24px;height:24px;border-radius:var(--radius-pill);background:var(--surface-ground,var(--surface-ice));display:inline-flex;align-items:center;justify-content:center;font-size: var(--font-size-xs);font-weight:700;color:var(--text-muted)}

    .user-cell{display:flex;align-items:center;gap:10px}
    .user-avatar{width:32px;height:32px;border-radius:var(--radius-pill);display:flex;align-items:center;justify-content:center;font-size: var(--font-size-xs);font-weight:700;color:#fff;flex-shrink:0}
    .user-name{font-weight:600;font-size: var(--font-size-sm);color:var(--text-heading,var(--text-heading))}
    .email-text{font-size: var(--font-size-sm);color:var(--text-muted)}
    .date-text{font-size: var(--font-size-sm);color:var(--text-muted)}
    .action-btns{display:flex;gap:2px}
    .empty-state{text-align:center;padding:40px}

    .dialog-form{display:flex;flex-direction:column;gap:16px;padding-top:8px}
    .form-row{display:flex;flex-direction:column;gap:4px}
    .form-row label{font-size: var(--font-size-sm);font-weight:600;color:var(--text-heading,var(--text-heading))}

    @media(max-width:768px){
      .stats-row{grid-template-columns:repeat(2,1fr)}
      .toolbar{flex-direction:column;align-items:stretch}
      .search-input{width:100%}
    }
  `]
})
export class AdministrationComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);
  private confirmSvc = inject(ConfirmationService);

  loading = signal(true);
  saving = signal(false);
  users = signal<UserRow[]>([]);
  filteredUsers = signal<UserRow[]>([]);
  searchTerm = '';
  dialogVisible = false;
  editingUser: UserRow | null = null;
  form: Record<string, any> = {};

  activeCount = computed(() => this.users().filter(u => u.status !== 'inactive').length);
  inactiveCount = computed(() => this.users().filter(u => u.status === 'inactive').length);
  adminCount = computed(() => this.users().filter(u => ['admin', 'owner'].includes(u.role)).length);

  /** Role options with i18n-reactive labels */
  get roleOptions() {
    return [
      { label: this.i18n.translate('admin.roleOwner'), value: 'owner' },
      { label: this.i18n.translate('admin.roleAdmin'), value: 'admin' },
      { label: this.i18n.translate('admin.roleComplianceOfficer'), value: 'compliance_officer' },
      { label: this.i18n.translate('admin.roleRiskManager'), value: 'risk_manager' },
      { label: this.i18n.translate('admin.roleAuditor'), value: 'auditor' },
      { label: this.i18n.translate('admin.roleViewer'), value: 'viewer' },
    ];
  }

  private readonly AVATAR_COLORS = ['#4f46e5','#0891b2','#059669','#b45309','var(--error)','#7c3aed','#0369a1','#15803d'];

  ngOnInit(): void { this.loadUsers(); }

  loadUsers(): void {
    this.loading.set(true);
    this.apiclientSvc.get('/users').pipe(catchError(() => of({ users: [] })), takeUntilDestroyed(this.destroyRef)).subscribe((d: Record<string, any>) => {
        const list = asArray(d, 'users');
        this.users.set(list);
        this.filteredUsers.set(list);
        this.loading.set(false);
      });
  }

  filterUsers(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) { this.filteredUsers.set(this.users()); return; }
    this.filteredUsers.set(this.users().filter(u =>
      (u.first_name + ' ' + u.last_name + ' ' + u.email).toLowerCase().includes(term)
    ));
  }

  avatarInitials(u: UserRow): string {
    return ((u.first_name?.[0] || '') + (u.last_name?.[0] || '')).toUpperCase() || '?';
  }
  avatarColor(u: UserRow): string {
    const idx = (u.email || '').charCodeAt(0) % this.AVATAR_COLORS.length;
    return this.AVATAR_COLORS[idx];
  }

  roleLabel(role: string): string {
    const keyMap: Record<string, string> = {
      owner: 'admin.roleOwner', admin: 'admin.roleAdmin',
      compliance_officer: 'admin.roleComplianceOfficer', risk_manager: 'admin.roleRiskManager',
      auditor: 'admin.roleAuditor', viewer: 'admin.roleViewer',
    };
    return keyMap[role] ? this.i18n.translate(keyMap[role]) : role;
  }
  roleSeverity(role: string): 'success' | 'info' | 'warning' | 'danger' | undefined {
    const map: Record<string, any> = { owner: 'danger', admin: 'warning', compliance_officer: 'info', risk_manager: 'warning', auditor: 'success', viewer: undefined };
    return map[role];
  }

  openAddDialog(): void { this.editingUser = null; this.form = { role: 'viewer' }; this.dialogVisible = true; }
  editUser(u: UserRow): void { this.editingUser = u; this.form = { ...u }; this.dialogVisible = true; }

  saveUser(): void {
    this.saving.set(true);
    const obs = this.editingUser
      ? this.apiclientSvc.put(`/users/${this.editingUser.id}`, this.form)
      : this.apiclientSvc.post('/users', this.form);
    obs.pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.saving.set(false);
      this.dialogVisible = false;
      this.loadUsers();
    });
  }

  resetPassword(u: UserRow): void {
    this.apiclientSvc.post(`/users/${u.id}/reset-password`, {}).pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  confirmDelete(u: UserRow): void {
    this.confirmSvc.confirm({
      message: `${this.i18n.translate('admin.deleteUserConfirm')} ${u.email}?`,
      header: this.i18n.translate('admin.confirmDelete'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.apiclientSvc.del(`/users/${u.id}`).pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadUsers());
      }
    });
  }
}

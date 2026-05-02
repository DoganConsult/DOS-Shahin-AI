import {
  Component, ChangeDetectionStrategy, input, output, computed,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
import { inject } from '@angular/core';
import { FoundationPaginationBarComponent as ListPaginationBarComponent } from '../shared/foundation-shared-components';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { GrcRecord } from '../shared/foundation-types';

/**
 * Users table section: health strip, toolbar with search/filters,
 * bulk action bar, empty state, pagination, and the data table.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-foundation-users-table',
  standalone: true,
  imports: [
    CommonModule, AppDatePipe, FormsModule, ListPaginationBarComponent,
    TableModule, TagModule, ButtonModule, InputTextModule, DropdownModule,
    ToolbarModule, TooltipModule,
  ],
  template: `
    <!-- Health strip cards -->
    <div class="fu-health-strip">
      <div class="fh-card" [class.fh-alert]="healthCounts().active > 0" (click)="filterChange.emit('active')">
        <span class="fh-val">{{ healthCounts().active }}</span>
        <span class="fh-lbl">{{ i18n.translate('foundation.common.active') }}</span>
      </div>
      <div class="fh-card" [class.fh-warn]="healthCounts().invited > 0" (click)="filterChange.emit('invited')">
        <span class="fh-val">{{ healthCounts().invited }}</span>
        <span class="fh-lbl">{{ i18n.translate('foundation.users.invitedPending') }}</span>
      </div>
      <div tabindex="0" role="button" (keyup.enter)="filterChange.emit('disabled')" class="fh-card" (click)="filterChange.emit('disabled')">
        <span class="fh-val">{{ healthCounts().disabled }}</span>
        <span class="fh-lbl">{{ i18n.translate('foundation.users.disabled') }}</span>
      </div>
      <div class="fh-card" [class.fh-danger]="healthCounts().withoutRoles > 0" (click)="filterChange.emit('withoutRoles')">
        <span class="fh-val">{{ healthCounts().withoutRoles }}</span>
        <span class="fh-lbl">{{ i18n.translate('foundation.users.withoutRoles') }}</span>
      </div>
      <div class="fh-card">
        <span class="fh-val">{{ totalCount() }}</span>
        <span class="fh-lbl">{{ i18n.translate('foundation.common.total') }}</span>
      </div>
    </div>

    <!-- Toolbar: invite, add, search, status filter, dept filter -->
    <p-toolbar styleClass="mb-3">
      <ng-template pTemplate="start">
        <p-button [label]="isAr() ? 'دعوة مستخدم' : 'Invite User'" icon="pi pi-user-plus" (onClick)="inviteClick.emit()" />
        <p-button [label]="isAr() ? 'إضافة مستخدم' : 'Add User'" icon="pi pi-plus" (onClick)="createClick.emit()" severity="secondary" styleClass="ms-2" />
        <span class="p-input-icon-left ms-3">
          <i class="pi pi-search"></i>
          <input type="text" pInputText [value]="searchTerm()" (input)="searchInput.emit($any($event.target).value)"
            [placeholder]="isAr() ? 'بحث بالاسم أو البريد...' : 'Search name or email...'" [attr.aria-label]="isAr() ? 'بحث بالاسم أو البريد...' : 'Search name or email...'" style="width:240px" />
        </span>
      </ng-template>
      <ng-template pTemplate="end">
        <p-dropdown [options]="statusFilterOptions" [ngModel]="statusFilter()" (ngModelChange)="statusFilterChange.emit($event)"
          [placeholder]="isAr() ? 'كل الحالات' : 'All Statuses'" [showClear]="true" styleClass="me-2" />
        @if (deptFilterOptions().length > 0) {
          <p-dropdown [options]="deptFilterOptions()" [ngModel]="deptFilter()" (ngModelChange)="deptFilterChange.emit($event)"
            [placeholder]="isAr() ? 'كل الأقسام' : 'All Departments'" [showClear]="true" styleClass="me-2" />
        }
        <span class="text-sm text-color-secondary">{{ totalCount() }} {{ isAr() ? 'سجل' : 'records' }}</span>
      </ng-template>
    </p-toolbar>

    <!-- Bulk action bar -->
    @if (selectedUsers().length > 0) {
      <div class="fu-bulk-bar">
        <span class="fb-count">{{ selectedUsers().length }} {{ isAr() ? 'محدد' : 'selected' }}</span>
        <p-button [label]="isAr() ? 'تعيين دور' : 'Bulk Assign Role'" icon="pi pi-id-card" severity="info" size="small" (onClick)="bulkRoleClick.emit()" />
        <p-button [label]="isAr() ? 'تعيين قسم' : 'Bulk Assign Dept'" icon="pi pi-building" severity="info" size="small" (onClick)="bulkDeptClick.emit()" />
        <p-button [label]="isAr() ? 'تعطيل' : 'Bulk Deactivate'" icon="pi pi-ban" severity="warning" size="small" (onClick)="bulkDeactivateClick.emit()" />
        <p-button [label]="isAr() ? 'إلغاء' : 'Clear'" icon="pi pi-times" severity="secondary" [text]="true" size="small" (onClick)="clearSelection.emit()" />
      </div>
    }

    <!-- Empty state -->
    @if (totalCount() === 0) {
      <div class="fu-empty">
        <i class="pi pi-users" style="font-size:48px;color:#94a3b8"></i>
        <h3>{{ isAr() ? 'لا يوجد مستخدمون' : 'No Users Found' }}</h3>
        <p>{{ isAr() ? 'ابدأ بدعوة مستخدمين للمنصة' : 'Start by inviting users to the platform' }}</p>
        <button class="fu-cta-primary" (click)="inviteClick.emit()">
          <i class="pi pi-user-plus"></i> {{ isAr() ? 'دعوة مستخدم' : 'Invite User' }}
        </button>
      </div>
    } @else {
      @if (totalCount() > 0) {
        <app-list-pagination-bar
          [totalCount]="totalCount()"
          [page]="page()"
          [pageSize]="pageSize()"
          [totalPages]="totalPages()"
          [pageStart]="pageStart()"
          [pageEnd]="pageEnd()"
          (pageChange)="pageChange.emit($event)"
          (pageSizeChange)="pageSizeChange.emit($event)"
        />
      }
      <p-table aria-label="Data table" [value]="filtered()" styleClass="p-datatable-sm p-datatable-striped" [rowHover]="true"
        [(selection)]="internalSelection" (selectionChange)="selectionChange.emit($event)" dataKey="id">
        <ng-template pTemplate="header">
          <tr>
            <th style="width:3rem"><p-tableHeaderCheckbox /></th>
            <th>{{ isAr() ? 'الاسم' : 'Name' }}</th>
            <th>{{ isAr() ? 'البريد' : 'Email' }}</th>
            <th>{{ isAr() ? 'الحالة' : 'Status' }}</th>
            <th>{{ isAr() ? 'الدور' : 'Role' }}</th>
            <th>{{ isAr() ? 'القسم' : 'Department' }}</th>
            <th>{{ isAr() ? 'الفريق' : 'Team' }}</th>
            <th>{{ isAr() ? 'آخر دخول' : 'Last Login' }}</th>
            <th>{{ isAr() ? 'تاريخ الإنشاء' : 'Created' }}</th>
            <th>{{ isAr() ? 'الإجراءات' : 'Actions' }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td><p-tableCheckbox [value]="row" /></td>
            <td tabindex="0" role="button" (keyup.enter)="rowSelect.emit(row)" class="name-cell" (click)="rowSelect.emit(row)" style="cursor:pointer">{{ row.first_name || '' }} {{ row.last_name || '' }}</td>
            <td>{{ row.email }}</td>
            <td><p-tag [value]="row.status" [severity]="statusSeverity(row.status)" /></td>
            <td>{{ row.role || '\u2014' }}</td>
            <td>{{ resolveDept(row.department_id || row.dept_id) }}</td>
            <td class="ts-cell">{{ row.team_name || '\u2014' }}</td>
            <td class="ts-cell">{{ row.last_login ? (row.last_login | appDate:'short') : '\u2014' }}</td>
            <td class="ts-cell">{{ row.created_at | appDate:'medium' }}</td>
            <td class="actions-cell">
              @if (row.status === 'invited' || row.status === 'pending') {
                <p-button icon="pi pi-refresh" [rounded]="true" [text]="true" severity="warning" (onClick)="resendInvite.emit(row)" [pTooltip]="isAr() ? 'إعادة الإرسال' : 'Resend Invitation'" />
                <p-button icon="pi pi-times" [rounded]="true" [text]="true" severity="danger" (onClick)="revokeInvite.emit(row)" [pTooltip]="isAr() ? 'إلغاء الدعوة' : 'Revoke Invitation'" />
                <p-button icon="pi pi-id-card" [rounded]="true" [text]="true" severity="info" (onClick)="roleAssign.emit(row)" [pTooltip]="isAr() ? 'تعيين دور' : 'Assign Role'" />
              } @else {
                <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" (onClick)="editClick.emit(row)" pTooltip="Edit" />
                @if (row.status === 'active') {
                  <p-button icon="pi pi-ban" [rounded]="true" [text]="true" severity="warning" (onClick)="toggleStatus.emit({row, status: 'disabled'})" pTooltip="Disable" />
                } @else if (row.status === 'disabled' || row.status === 'inactive') {
                  <p-button icon="pi pi-check-circle" [rounded]="true" [text]="true" severity="success" (onClick)="toggleStatus.emit({row, status: 'active'})" pTooltip="Enable" />
                }
                <p-button icon="pi pi-key" [rounded]="true" [text]="true" (onClick)="resetPassword.emit(row)" pTooltip="Reset Password" />
                <p-button icon="pi pi-id-card" [rounded]="true" [text]="true" severity="info" (onClick)="roleAssign.emit(row)" pTooltip="Assign Role" />
                <p-button icon="pi pi-history" [rounded]="true" [text]="true" (onClick)="auditClick.emit(row)" pTooltip="Audit Log" />
              }
            </td>
          </tr>
        </ng-template>
      </p-table>
    }
  `,
  styles: [`
    .fu-health-strip{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:16px}
    .fh-card{background:var(--surface-card);border:1px solid var(--surface-border);border-radius:var(--radius-md);padding:12px 16px;cursor:pointer;transition:all .15s;display:flex;flex-direction:column;gap:2px}
    .fh-card:hover{box-shadow: var(--shadow-sm);transform:translateY(-1px)}
    .fh-alert{border-color:#86efac;background:var(--status-success-bg, #defbe6)}
    .fh-warn{border-color:#fcd34d;background:#fffbeb}
    .fh-danger{border-color:#fca5a5;background:var(--status-danger-bg, #fff1f1)}
    .fh-val{font-size: var(--font-size-2xl);font-weight:800;color:var(--text-heading)}
    .fh-lbl{font-size: var(--font-size-xs);font-weight:600;color:var(--text-muted)}
    .fu-empty{text-align:center;padding:48px;color:var(--text-muted)}
    .fu-empty h3{margin:12px 0 6px;font-size: var(--font-size-md);color:var(--text-heading)}
    .fu-empty p{margin:0 0 16px;font-size: var(--font-size-sm)}
    .name-cell{font-weight:600;color:var(--text-heading)}
    .ts-cell{font-size: var(--font-size-sm);white-space:nowrap;color:var(--text-muted)}
    .actions-cell{white-space:nowrap}
    .fu-cta-primary{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border:none;border-radius:var(--radius);background:var(--primary-600,#2563eb);color:#fff;font-size: var(--font-size-sm);font-weight:600;cursor:pointer}
    .fu-cta-primary:hover{background:var(--primary-700,#1d4ed8)}
    .fu-bulk-bar{display:flex;align-items:center;gap:10px;padding:10px 16px;margin-bottom:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:var(--radius)}
    .fb-count{font-size: var(--font-size-sm);font-weight:700;color:#1d4ed8}
    .ms-2{margin-inline-start:8px}
    .ms-3{margin-inline-start:12px}
    .me-2{margin-inline-end:8px}
    @media(max-width:768px){.fu-health-strip{grid-template-columns:repeat(2,1fr)}}
  `],
})
export class FoundationUsersTableComponent {
  readonly i18n = inject(I18nService);
  isAr = computed(() => this.i18n.currentLang() === 'ar');

  /* Inputs from parent */
  filtered = input.required<any[]>();
  totalCount = input.required<number>();
  page = input.required<number>();
  pageSize = input.required<number>();
  totalPages = input.required<number>();
  pageStart = input.required<number>();
  pageEnd = input.required<number>();
  searchTerm = input.required<string>();
  statusFilter = input.required<string | null>();
  deptFilter = input.required<string | null>();
  healthCounts = input.required<{ active: number; invited: number; disabled: number; withoutRoles: number }>();
  departments = input.required<any[]>();
  selectedUsers = input.required<any[]>();

  /** Options for the status filter dropdown */
  get statusFilterOptions() {
    return [
      { label: this.i18n.translate('foundation.active'), value: 'active' },
      { label: this.i18n.translate('foundation.invitedPending'), value: 'invited' },
      { label: this.i18n.translate('foundation.disabled'), value: 'disabled' },
    ];
  }

  deptFilterOptions = computed(() => this.departments().map((d) => ({ label: d.name_en, value: d.dept_id })));

  /* Outputs */
  filterChange = output<string>();
  searchInput = output<string>();
  statusFilterChange = output<string | null>();
  deptFilterChange = output<string | null>();
  pageChange = output<number>();
  pageSizeChange = output<number>();
  rowSelect = output<unknown>();
  editClick = output<unknown>();
  inviteClick = output<void>();
  createClick = output<void>();
  resendInvite = output<unknown>();
  revokeInvite = output<unknown>();
  roleAssign = output<unknown>();
  toggleStatus = output<{ row: GrcRecord; status: string }>();
  resetPassword = output<unknown>();
  auditClick = output<unknown>();
  bulkRoleClick = output<void>();
  bulkDeptClick = output<void>();
  bulkDeactivateClick = output<void>();
  clearSelection = output<void>();
  selectionChange = output<any[]>();

  /** Internal two-way binding proxy for p-table selection */
  internalSelection: GrcRecord[] = [];

  /** Resolve department name from id */
  resolveDept(deptId: string | null): string {
    if (!deptId) return '\u2014';
    const d = this.departments().find((x) => x.dept_id === deptId);
    return d ? d.name_en : '\u2014';
  }

  /** Map status to PrimeNG tag severity */
  statusSeverity(status: string): 'success' | 'warning' | 'danger' | 'info' | 'secondary' {
    if (status === 'active') return 'success';
    if (status === 'invited' || status === 'pending') return 'warning';
    if (status === 'disabled' || status === 'inactive') return 'danger';
    if (status === 'deleted') return 'danger';
    return 'secondary';
  }
}

import { Component, ChangeDetectionStrategy, input, output, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToolbarModule } from 'primeng/toolbar';
import { DropdownModule } from 'primeng/select';
import { GrcRecord } from '../shared/foundation-types';

/**
 * Tab 5: Org Members Directory -- searchable/filterable table of all members.
 */
@Component({
  selector: 'app-members-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    TableModule, TagModule, ButtonModule, InputTextModule, ToolbarModule, DropdownModule,
  ],
  template: `
    <!-- Members Search & Filter Toolbar -->
    <p-toolbar styleClass="mb-3">
      <div class="p-toolbar-group-start">
        <span class="p-input-icon-left">
          <i class="pi pi-search"></i>
          <input pInputText type="text" class="search-input"
            [placeholder]="i18n.translate('teamManagement.searchMembers')" [attr.aria-label]="i18n.translate('teamManagement.searchMembers')"
            [ngModel]="memberSearch()" (ngModelChange)="memberSearch.set($event)" />
        </span>
      </div>
      <div class="p-toolbar-group-end">
        <p-dropdown [options]="roleFilterOptions()" [(ngModel)]="memberRoleFilterValue"
          (ngModelChange)="memberRoleFilter.set($event)"
          optionLabel="label" optionValue="value"
          [placeholder]="i18n.translate('teamManagement.role')"
          [style]="{minWidth:'160px'}" />
        <p-button icon="pi pi-download" [pTooltip]="i18n.translate('teamManagement.exportCsv')"
          size="small" [outlined]="true" severity="secondary" (onClick)="exportCsv.emit()" />
      </div>
    </p-toolbar>

    <p-table aria-label="Data table" [value]="filteredMembers()" [paginator]="true" [rows]="15"
      styleClass="p-datatable-sm p-datatable-striped p-datatable-gridlines" [rowHover]="true"
      [sortMode]="'multiple'" [showCurrentPageReport]="true"
      [currentPageReportTemplate]="i18n.translate('teamManagement.showingFirstToLastOfTotalrecords')">
      <ng-template pTemplate="header">
        <tr>
          <th style="width:40px"></th>
          <th pSortableColumn="name">{{ i18n.translate('teamManagement.name') }} <p-sortIcon field="name" /></th>
          <th pSortableColumn="email">{{ i18n.translate('teamManagement.email') }} <p-sortIcon field="email" /></th>
          <th pSortableColumn="role">{{ i18n.translate('teamManagement.role') }} <p-sortIcon field="role" /></th>
          <th>{{ i18n.translate('teamManagement.teams') }}</th>
          <th pSortableColumn="task_count">{{ i18n.translate('teamManagement.tasks') }} <p-sortIcon field="task_count" /></th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-m>
        <tr tabindex="0" role="button" (keyup.enter)="openDrawer.emit(m)" class="cursor-pointer" (click)="openDrawer.emit(m)">
          <td><span class="mc-avatar-sm" [style.background]="memberColor(m)">{{ memberInitial(m) }}</span></td>
          <td class="font-semibold">{{ m.name || '—' }}</td>
          <td class="mono text-sm">{{ m.email || '—' }}</td>
          <td><p-tag [value]="m.role || 'member'" [severity]="roleSeverity(m.role)" /></td>
          <td>
            @for (t of memberTeams(m); track t) {
              <p-tag [value]="t" severity="info" styleClass="mr-1 mb-1" />
            }
            @if (!memberTeams(m).length) { <span class="text-color-secondary text-sm">—</span> }
          </td>
          <td class="text-center">{{ m.task_count || 0 }}</td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr><td colspan="6" class="text-center text-color-secondary p-4">
          {{ i18n.translate('teamManagement.noMembersMatchYourFilter') }}
        </td></tr>
      </ng-template>
    </p-table>
  `,
  styles: [`
    .search-input { min-width: 220px; }
    .cursor-pointer { cursor: pointer; }
    .mc-avatar-sm {
      width: 28px; height: 28px; border-radius: var(--radius-pill); color: white;
      display: flex; align-items: center; justify-content: center;
      font-size: var(--font-size-xs); font-weight: 700; flex-shrink: 0;
    }
    .mono { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.82rem; }
    .text-sm { font-size: 0.82rem; }
    .mr-1 { margin-inline-end: 4px; }
  `]
})
export class MembersTabComponent {
  readonly i18n = inject(I18nService);

  // -- Inputs --
  allMembers = input.required<any[]>();

  // -- Outputs --
  openDrawer = output<unknown>();
  exportCsv = output<void>();

  // -- Local state --
  memberSearch = signal('');
  memberRoleFilter = signal('all');
  memberRoleFilterValue = 'all';

  roleFilterOptions = computed(() => {
    const all = this.i18n.translate('teamManagement.allRoles');
    return [
      { label: all, value: 'all' },
      { label: 'Lead', value: 'lead' },
      { label: 'Member', value: 'member' },
      { label: 'Reviewer', value: 'reviewer' },
      { label: 'Approver', value: 'approver' },
      { label: 'Observer', value: 'observer' },
    ];
  });

  filteredMembers = computed(() => {
    let members = this.allMembers();
    const q = this.memberSearch().toLowerCase().trim();
    const role = this.memberRoleFilter();

    if (q) {
      members = members.filter((m) =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q)
      );
    }
    if (role !== 'all') {
      members = members.filter((m) => (m.role || 'member') === role);
    }
    return members;
  });

  // -- Helpers --
  memberInitial(m: GrcRecord): string {
    return (m.name || m.email || '?')[0].toUpperCase();
  }

  memberColor(m: GrcRecord): string {
    const id = m.user_id || m.email || m.name || '?';
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  roleSeverity(role: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'secondary'> = {
      lead: 'info', admin: 'danger', owner: 'info', manager: 'warning',
      auditor: 'warning', member: 'secondary', reviewer: 'success', approver: 'info',
    };
    return map[role?.toLowerCase()] || 'secondary';
  }

  memberTeams(m: GrcRecord): string[] { return m._teams || []; }
}

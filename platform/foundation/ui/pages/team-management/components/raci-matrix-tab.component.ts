import { Component, ChangeDetectionStrategy, input, output, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { DropdownModule } from 'primeng/select';
import { Team, RACI_ROLES } from '../models/team.models';
import { GrcRecord } from '../shared/foundation-types';

/**
 * Tab 2: RACI Pivot Matrix -- shows a pivot table of RACI assignments (rows = scopes, cols = teams).
 */
@Component({
  selector: 'app-raci-matrix-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    TableModule, TagModule, ButtonModule, DialogModule, InputTextModule, ToolbarModule, TooltipModule, DropdownModule,
  ],
  template: `
    <div class="raci-matrix-section">
      <div class="raci-legend">
        @for (r of raciRoles; track r) {
          <span class="raci-legend-item">
            <span class="raci-dot-lg" [class]="'rd-' + r">{{ raciLetter(r) }}</span>
            <span>{{ raciFullLabel(r) }}</span>
          </span>
        }
      </div>

      <p-toolbar styleClass="mb-3">
        <div class="p-toolbar-group-start">
          <span class="p-input-icon-left">
            <i class="pi pi-search"></i>
            <input pInputText type="text" class="search-input"
              [placeholder]="i18n.translate('teamManagement.searchRaci')" [attr.aria-label]="i18n.translate('teamManagement.searchRaci')"
              [ngModel]="raciSearch()" (ngModelChange)="raciSearch.set($event)" />
          </span>
        </div>
        <div class="p-toolbar-group-end filter-group">
          <p-dropdown [options]="scopeFilterOptions()" [(ngModel)]="raciScopeFilterValue"
            (ngModelChange)="raciScopeFilter.set($event)"
            optionLabel="label" optionValue="value"
            [placeholder]="i18n.translate('teamManagement.scopeType')"
            [style]="{minWidth:'160px'}" />
          <p-button [label]="i18n.translate('teamManagement.assignRaci')" icon="pi pi-plus"
            severity="primary" size="small" (onClick)="assignRaci.emit()" />
          <p-button [label]="i18n.translate('teamManagement.suggestRaci')" icon="pi pi-lightbulb"
            severity="warning" size="small" [outlined]="true" [loading]="loadingSuggestions()"
            (onClick)="loadSuggestions.emit()" />
          <p-button icon="pi pi-download" [pTooltip]="i18n.translate('teamManagement.exportCsv')"
            size="small" [outlined]="true" severity="secondary" (onClick)="exportCsv.emit()" />
        </div>
      </p-toolbar>

      <!-- Pivot Table: Rows = Scopes, Columns = Teams -->
      <div class="pivot-wrapper" *ngIf="raciPivotRows().length > 0">
        <p-table aria-label="Data table" [value]="raciPivotRows()" [paginator]="raciPivotRows().length > 20" [rows]="20"
          styleClass="p-datatable-sm p-datatable-striped p-datatable-gridlines raci-pivot" [rowHover]="true"
          [scrollable]="true" scrollDirection="horizontal">
          <ng-template pTemplate="header">
            <tr>
              <th class="pivot-scope-col" style="min-width:100px">{{ i18n.translate('teamManagement.scopeType') }}</th>
              <th class="pivot-scope-col" style="min-width:140px">{{ i18n.translate('teamManagement.scopeId') }}</th>
              @for (team of teams(); track team.team_id) {
                <th class="pivot-team-col" style="min-width:140px">
                  <div class="pivot-team-header">
                    <span class="tc-avatar-mini" [style.background]="teamColor(team.team_id)">{{ teamInitials(team) }}</span>
                    {{ i18n.localize(team.name_en || team.name, team.name_ar || team.name_en || team.name) }}
                  </div>
                </th>
              }
              <th style="width:60px"></th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr>
              <td><p-tag [value]="row.scopeType" [severity]="scopeSeverity(row.scopeType)" /></td>
              <td class="mono">{{ row.scopeId }}</td>
              @for (team of teams(); track team.team_id) {
                <td tabindex="0" role="button" (keyup.enter)="canManage() ? pivotCellEdit.emit({ row, team }) : null" class="pivot-cell" (click)="canManage() ? pivotCellEdit.emit({ row, team }) : null">
                  @if (getPivotRole(row, team.team_id); as role) {
                    <span class="raci-dot-lg pivot-dot" [class]="'rd-' + role">{{ raciLetter(role) }}</span>
                  } @else {
                    <span class="pivot-empty" *ngIf="canManage()"><i class="pi pi-plus"></i></span>
                  }
                </td>
              }
              <td>
                @if (canManage()) {
                  <p-button icon="pi pi-trash" severity="danger" size="small"
                    [rounded]="true" [text]="true" pTooltip="Delete row"
                    (onClick)="deletePivotRow.emit(row)" />
                }
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td [attr.colspan]="teams().length + 3" class="text-center text-color-secondary p-4">
              {{ i18n.translate('teamManagement.noRaciAssignmentsYet') }}
            </td></tr>
          </ng-template>
        </p-table>
      </div>

      <!-- Flat list fallback when no teams -->
      <div *ngIf="raciPivotRows().length === 0 && allRaciEntries().length > 0" class="text-center p-4 text-color-secondary">
        {{ i18n.translate('teamManagement.noMatchingDataForCurrentFilter') }}
      </div>
      <div *ngIf="allRaciEntries().length === 0 && !loading()" class="empty-state">
        <div class="empty-icon"><i class="pi pi-sitemap"></i></div>
        <h3>{{ i18n.translate('teamManagement.noRaciAssignments') }}</h3>
        <p>{{ i18n.translate('teamManagement.startByAssigningRaciRolesToDistributeRes') }}</p>
      </div>
    </div>
  `,
  styles: [`
    .search-input { min-width: 220px; }
    .filter-group { display: flex; gap: 8px; flex-wrap: wrap; }
    .raci-matrix-section { margin-top: 8px; }
    .raci-legend { display: flex; gap: 20px; margin-bottom: 16px; flex-wrap: wrap; }
    .raci-legend-item { display: flex; align-items: center; gap: 8px; font-size: var(--font-size-tag); }
    .raci-dot-lg {
      width: 30px; height: 30px; border-radius: var(--radius-sm);
      display: inline-flex; align-items: center; justify-content: center;
      font-size: var(--font-size-tag); font-weight: 800; color: white;
    }
    .rd-responsible { background: var(--success); }
    .rd-accountable { background: #2563eb; }
    .rd-consulted { background: var(--warning); }
    .rd-informed { background: var(--text-muted); }
    .mono { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.82rem; }
    .pivot-wrapper { overflow-x: auto; }
    .pivot-scope-col { position: sticky; left: 0; background: var(--surface-card); z-index: var(--z-base); }
    .pivot-team-col { text-align: center; }
    .pivot-team-header { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: var(--font-size-caption); }
    .tc-avatar-mini { width: 28px; height: 28px; border-radius: var(--radius-pill); color: white; display: flex; align-items: center; justify-content: center; font-size: var(--font-size-2xs); font-weight: 700; flex-shrink: 0; }
    .pivot-cell { text-align: center; cursor: pointer; min-width: 60px; transition: background 0.15s; }
    .pivot-cell:hover { background: var(--primary-50, #eff6ff); }
    .pivot-dot { cursor: pointer; }
    .pivot-empty { color: var(--text-color-secondary); font-size: var(--font-size-tag); opacity: 0.4; }
    .pivot-empty:hover { opacity: 1; }
    .empty-state {
      text-align: center; padding: 60px 20px;
      background: var(--surface-50); border-radius: var(--radius-xl); border: 2px dashed var(--surface-border);
    }
    .empty-icon { font-size: var(--font-size-6xl); color: var(--primary-color); margin-bottom: 12px; }
    .empty-state h3 { margin: 0 0 8px; }
    .empty-state p { color: var(--text-color-secondary); margin-bottom: 20px; }
  `]
})
export class RaciMatrixTabComponent {
  readonly i18n = inject(I18nService);

  // -- Inputs --
  teams = input.required<Team[]>();
  allRaciEntries = input.required<any[]>();
  loading = input<boolean>(false);
  loadingSuggestions = input<boolean>(false);
  canManage = input<boolean>(false);

  // -- Outputs --
  assignRaci = output<void>();
  loadSuggestions = output<void>();
  exportCsv = output<void>();
  pivotCellEdit = output<{ row: GrcRecord; team: Team }>();
  deletePivotRow = output<unknown>();

  // -- Local state --
  raciSearch = signal('');
  raciScopeFilter = signal('all');
  raciScopeFilterValue = 'all';
  readonly raciRoles = [...RACI_ROLES];

  scopeFilterOptions = computed(() => {
    const all = this.i18n.translate('teamManagement.allScopes');
    return [
      { label: all, value: 'all' },
      { label: 'Policy', value: 'policy' },
      { label: 'Workflow', value: 'workflow' },
      { label: 'Process', value: 'process' },
      { label: 'Control Group', value: 'control_group' },
    ];
  });

  filteredRaciEntries = computed(() => {
    let entries = this.allRaciEntries();
    const q = this.raciSearch().toLowerCase().trim();
    const scope = this.raciScopeFilter();

    if (q) {
      entries = entries.filter((e) =>
        (e.teamName || '').toLowerCase().includes(q) ||
        (e.scopeId || '').toLowerCase().includes(q) ||
        (e.scopeType || '').toLowerCase().includes(q)
      );
    }
    if (scope !== 'all') {
      entries = entries.filter((e) => e.scopeType === scope);
    }
    return entries;
  });

  raciPivotRows = computed(() => {
    const entries = this.filteredRaciEntries();
    const scopeMap = new Map<string, { scopeType: string; scopeId: string; assignments: Map<string, { role: string; raciId: string }> }>();
    for (const e of entries) {
      const key = `${e.scopeType || e.scope_type}::${e.scopeId || e.scope_id}`;
      if (!scopeMap.has(key)) {
        scopeMap.set(key, { scopeType: e.scopeType || e.scope_type, scopeId: e.scopeId || e.scope_id, assignments: new Map() });
      }
      const tid = e.teamId || e.team_id;
      if (tid) {
        scopeMap.get(key)!.assignments.set(tid, { role: e.raciRole || e.raci_role, raciId: e.raciId || e.raci_id || e.assignment_id });
      }
    }
    return [...scopeMap.values()];
  });

  // -- Helpers --
  teamInitials(team: Team): string {
    const name = team.name_en || team.name || '';
    const parts = name.split(/\s+/);
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  }

  teamColor(id: string): string {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];
    let hash = 0;
    for (let i = 0; i < (id || '').length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  raciLetter(role: string): string { return role.charAt(0).toUpperCase(); }

  raciFullLabel(role: string): string {
    if (this.i18n.currentLang() === 'ar') {
      const map: Record<string, string> = { responsible: '\u0645\u0633\u0624\u0648\u0644', accountable: '\u0645\u062D\u0627\u0633\u0628', consulted: '\u0645\u0633\u062A\u0634\u0627\u0631', informed: '\u0645\u064F\u0628\u0644\u064E\u063A' };
      return map[role] || role;
    }
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  getPivotRole(row: GrcRecord, teamId: string): string {
    return row.assignments?.get(teamId)?.role || '';
  }

  scopeSeverity(scope: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, 'success' | 'info' | 'warning' | 'secondary'> = {
      policy: 'info', workflow: 'success', process: 'warning', control_group: 'secondary',
    };
    return map[scope] || 'secondary';
  }
}

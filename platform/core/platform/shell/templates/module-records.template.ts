/**
 * Template 2 — Module Records / List Page
 * Story role: "Here's what exists — filtered, ranked, actionable."
 *
 * Role-adaptive:
 *   full      → search + filter + table + bulk actions + add button + row edit
 *   read-only → search + filter + table (no bulk, no add, no edit)
 *   limited   → table filtered to user's own rows only, no bulk actions
 *
 * IBM Carbon (active): table · search · dropdown · content-switcher ·
 *   tag · ai-label · progress-bar · pagination · combo-button · skeleton ·
 *   notification · button · tiles
 */
import {
  Component, Input, Output, EventEmitter, computed,
  ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  TilesModule, TagModule, NotificationModule, SkeletonModule,
  ButtonModule, ComboButtonModule, DropdownModule,
  ContentSwitcherModule, PaginationModule, ProgressBarModule,
  TableModule, GridModule, BreadcrumbModule, LinkModule, IconModule
} from 'carbon-components-angular';
import { DosCarbonSearchComponent } from '@dos/ui-system';
import {
  ModuleColumn, ModuleRecord, ModuleKpi, ModuleNotification,
  ModuleInsightPillars, ModuleRole, ModuleAction, resolveViewMode, RoleViewMode
} from './module-template.types';
import { DosInsightBarComponent } from './dos-insight-bar.component';


@Component({
  selector: 'dos-intelligent-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule, RouterModule,
    TilesModule, TagModule, NotificationModule, SkeletonModule,
    ButtonModule, ComboButtonModule, DropdownModule,
    ContentSwitcherModule, PaginationModule, ProgressBarModule,
    TableModule, GridModule, BreadcrumbModule, LinkModule, IconModule,
    DosCarbonSearchComponent,
  ],
  template: `
    <!-- Notification -->
    @if (notification) {
      <cds-notification [notificationType]="notification.type"
        [title]="notification.title" [subtitle]="notification.subtitle ?? ''"
        [showClose]="true" lowContrast>
      </cds-notification>
    }

    <!-- Masthead -->
    <cds-tile class="dmt-masthead">
      <cds-breadcrumb [noTrailingSlash]="true" class="dmt-eyebrow-breadcrumb">
        <cds-breadcrumb-item>{{ eyebrow }}</cds-breadcrumb-item>
      </cds-breadcrumb>
      <div class="dmt-masthead-content">
        <div class="dmt-masthead-left">
          @if (aiHeadline) {
            <cds-ai-label kind="inline" size="sm" class="dmt-ai-headline">{{ aiHeadline }}</cds-ai-label>
          }
          <h1 class="dmt-title">{{ title }}</h1>
          @if (subtitle) { <p class="dmt-subtitle">{{ subtitle }}</p> }
          <div class="dmt-tags-row">
            @for (tag of statusTags; track tag.label) {
              <cds-tag [type]="tagType(tag.severity)">{{ tag.label }}</cds-tag>
            }
          </div>
        </div>
        <!-- Add button: full role only -->
        @if (viewMode() === 'full' && addAction) {
          <div class="dmt-masthead-actions">
            <button cdsButton="primary" size="sm" (click)="triggerAction(addAction)">
              + {{ addAction.label }}
            </button>
          </div>
        }
      </div>
    </cds-tile>


      <!-- ── 5-Pillar Insight Bar ─────────────────────────────────────────── -->
      <dos-insight-bar
        [pillars]="pillars"
        archetype="intelligent-register"
        (actionClick)="pillars?.nextAction?.action?.()">
      </dos-insight-bar>

    <!-- Toolbar -->
    <div class="dmt-toolbar">
      <dos-carbon-search
        ariaLabelKey="shell.module-records.search.ariaLabel"
        [placeholder]="searchPlaceholder"
        (valueChange)="onSearch($event)"
        size="md"
        class="dmt-search">
      </dos-carbon-search>

      @if (filterOptions.length) {
        <cds-dropdown
          [placeholder]="filterLabel"
          [items]="filterOptions"
          (selected)="onFilter($event)"
          class="dmt-filter">
        </cds-dropdown>
      }

      @if (viewSwitcher.length) {
        <cds-content-switcher (selected)="onViewSwitch($event)">
          @for (v of viewSwitcher; track v.id) {
            <button cdsContentSwitcherOption [name]="v.id">{{ v.label }}</button>
          }
        </cds-content-switcher>
      }
    </div>

    <!-- Loading skeleton -->
    @if (loading) {
      <cds-tile class="dmt-table-tile">
        @for (n of [1,2,3,4,5]; track n) {
          <div cdsSkeletonText [lines]="1" style="margin-bottom:1rem"></div>
        }
      </cds-tile>
    }

    <!-- Table -->
    @if (!loading) {
      <cds-tile class="dmt-table-tile">
        <!-- Bulk actions (full role only) -->
        @if (viewMode() === 'full' && selectedIds.length > 0 && batchActions.length) {
          <div class="dmt-bulk-bar">
            <span>{{ selectedIds.length }} selected</span>
            @for (a of batchActions; track a.actionKey || a.commandKey || a.route || a.label) {
              <button cdsButton="tertiary" size="sm" (click)="triggerAction(a, { selectedIds })">
                {{ a.label }}
              </button>
            }
          </div>
        }

        <table cdsTable [sortable]="true" class="dmt-data-table">
          <thead cdsTableHead>
            <tr cdsTableRow>
              @if (viewMode() === 'full') {
                <th cdsTableHead><input type="checkbox" (change)="selectAll($event)"></th>
              }
              @for (col of columns; track col.key) {
                <th cdsTableHead [sortable]="col.sortable ?? false">{{ col.label }}</th>
              }
              <th cdsTableHead class="dmt-actions-col">Actions</th>
            </tr>
          </thead>
          <tbody cdsTableBody>
            @for (row of visibleRows(); track row.id) {
              <tr cdsTableRow [attr.data-id]="row.id">
                @if (viewMode() === 'full') {
                  <td cdsTableData>
                    <input type="checkbox" [checked]="selectedIds.includes(row.id)"
                      (change)="toggleSelect(row.id)">
                  </td>
                }
                @for (col of columns; track col.key) {
                  <td cdsTableData [attr.data-col-label]="col.label">
                    @switch (col.type) {
                      @case ('tag') {
                        <cds-tag [type]="tagType(row._severity)">{{ row[col.key] }}</cds-tag>
                      }
                      @case ('progress') {
                        <cds-progress-bar
                          [value]="row._progress ?? 0"
                          [max]="100"
                          size="sm"
                          [label]="row[col.key] + ''">
                        </cds-progress-bar>
                      }
                      @case ('ai-score') {
                        <cds-ai-label kind="inline" size="sm">{{ row[col.key] }}</cds-ai-label>
                      }
                      @case ('link') {
                        <a cdsLink (click)="onRowClick(row)">{{ row[col.key] }}</a>
                      }
                      @default {
                        {{ row[col.key] }}
                      }
                    }
                  </td>
                }
                <td cdsTableData class="dmt-row-actions">
                  <button cdsButton="ghost" size="sm" (click)="onRowClick(row)">View</button>
                  @if (viewMode() === 'full') {
                    <button cdsButton="ghost" size="sm" (click)="onRowEdit(row)">Edit</button>
                  }
                  @for (a of rowActions; track a.actionKey || a.commandKey || a.route || a.label) {
                    <button cdsButton="ghost" size="sm" (click)="triggerAction(a, { rowId: row.id, row })">
                      {{ a.label }}
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td [attr.colspan]="columns.length + 2" class="dmt-empty-row">
                  <cds-tile class="dmt-empty-tile">
                    @if (aiHeadline) {
                      <cds-ai-label kind="inline" size="sm">{{ aiHeadline }}</cds-ai-label>
                    }
                    @if (emptyStateTitle) { <h3>{{ emptyStateTitle }}</h3> }
                    @if (emptyStateDescription) { <p>{{ emptyStateDescription }}</p> }
                    @if (viewMode() === 'full' && addAction) {
                      <button cdsButton="primary" size="sm" (click)="triggerAction(addAction)">
                        {{ addAction.label }}
                      </button>
                    }
                  </cds-tile>
                </td>
              </tr>
            }
          </tbody>
        </table>

        <!-- Pagination -->
        @if (totalItems > pageSize) {
          <cds-pagination
            [totalDataLength]="totalItems"
            [pageSize]="pageSize"
            (selectPage)="onPageChange($event)"
            (pageSize)="onPageSizeChange($event)">
          </cds-pagination>
        }
      </cds-tile>
    }

    <!-- Side panel slot (for record detail) -->
    <ng-content select="[dosPanel]"></ng-content>
  `,
  styles: [`
    :host { display: block; }
    .dmt-masthead { margin-bottom: 0; padding: 1.5rem 2rem; }
    .dmt-masthead-content { display: flex; justify-content: space-between; align-items: flex-start; }
    .dmt-masthead-left { flex: 1; }
    .dmt-eyebrow-breadcrumb { margin-bottom: 0.5rem; }
    .dmt-title { font-size: 1.75rem; font-weight: 400; margin: 0.25rem 0; }
    .dmt-subtitle { font-size: 0.875rem; color: var(--cds-text-secondary); margin: 0.25rem 0 0.75rem; }
    .dmt-tags-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .dmt-masthead-actions { padding-top: 0.25rem; }
    .dmt-ai-headline { margin-bottom: 0.5rem; }

    .dmt-toolbar { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; background: var(--cds-layer); border-bottom: 1px solid var(--cds-border-subtle); }
    .dmt-search { flex: 1; max-width: 480px; }
    .dmt-filter { min-width: 180px; }

    .dmt-table-tile { padding: 0; }
    .dmt-bulk-bar { display: flex; align-items: center; gap: 1rem; padding: 0.5rem 1rem; background: var(--cds-layer-selected); }
    .dmt-data-table { width: 100%; }
    .dmt-actions-col { width: 120px; }
    .dmt-row-actions { display: flex; gap: 0.25rem; }
    .dmt-empty-row { padding: 0; }
    .dmt-empty-tile { text-align: center; padding: 3rem; }

    @media (max-width: 768px) {
      .dmt-toolbar { flex-wrap: wrap; }
      .dmt-masthead-actions { display: none; }
    }
    /* Mobile-first card/list fallback for the records table.
       Below the workspace breakpoint, the cdsTable collapses to a
       stacked card layout so each row is readable without horizontal
       scroll. Headers are hidden — column meaning is preserved by
       prefixing each cell value with its data-col-label attribute
       (set in the @for loop above so we don't hardcode labels). */
    @media (max-width: 672px) {
      .dmt-data-table,
      .dmt-data-table thead,
      .dmt-data-table tbody,
      .dmt-data-table tr,
      .dmt-data-table td,
      .dmt-data-table th { display: block; width: 100%; }
      .dmt-data-table thead {
        position: absolute; left: -9999px; top: -9999px;
        height: 1px; width: 1px; overflow: hidden;
      }
      .dmt-data-table tr {
        border: 1px solid var(--cds-border-subtle);
        margin-block-end: var(--cds-spacing-04);
        padding: var(--cds-spacing-04);
        background: var(--cds-layer);
        border-radius: 2px;
      }
      .dmt-data-table td {
        padding: var(--cds-spacing-02) 0;
        border: 0;
      }
      .dmt-data-table td[data-col-label]::before {
        content: attr(data-col-label) ': ';
        color: var(--cds-text-secondary);
        font-size: .75rem;
        text-transform: uppercase;
        letter-spacing: .04em;
        display: inline-block;
        margin-inline-end: .375rem;
      }
      .dmt-row-actions { flex-wrap: wrap; gap: var(--cds-spacing-02); }
      .dmt-actions-col { width: auto; }
      .dmt-table-tile { padding: var(--cds-spacing-04); }
    }
  `]
})
export class ModuleRecordsTemplateComponent {
  @Input() eyebrow = '';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() aiHeadline = '';
  @Input() loading = false;
  @Input() notification: ModuleNotification | null = null;
  @Input() statusTags: Array<{ label: string; severity?: string }> = [];
  @Input() columns: ModuleColumn[] = [];
  @Input() rows: ModuleRecord[] = [];
  @Input() totalItems = 0;
  @Input() pageSize = 25;
  @Input() searchPlaceholder = '';
  @Input() filterLabel = 'Filter';
  @Input() filterOptions: Array<{ content: string; value: string }> = [];
  @Input() viewSwitcher: Array<{ id: string; label: string }> = [];
  // Deprecated callback-shaped action props are intentionally removed.
  // Runtime actions must be serializable and routed through actionKey/commandKey/route.
  @Input() toolbarActions: ModuleAction[] = [];
  @Input() rowActions: ModuleAction[] = [];
  @Input() batchActions: ModuleAction[] = [];
  @Input() addAction: ModuleAction | null = null;
  @Input() emptyStateTitle = '';
  @Input() emptyStateDescription = '';
  @Input() pillars: ModuleInsightPillars | null = null;
  @Input() currentRole: ModuleRole = 'standard_user';
  @Input() writeRoles: ModuleRole[] = [];
  @Input() ownerId?: string; // for 'limited' role — show only own rows

  @Output() rowClick = new EventEmitter<ModuleRecord>();
  @Output() rowEdit = new EventEmitter<ModuleRecord>();
  @Output() search = new EventEmitter<string>();
  @Output() filter = new EventEmitter<string>();
  @Output() viewSwitch = new EventEmitter<string>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();
  @Output() selectionChange = new EventEmitter<string[]>();
  @Output() actionTriggered = new EventEmitter<{ key: string; payload?: Record<string, unknown> }>();

  selectedIds: string[] = [];

  viewMode = computed<RoleViewMode>(() => resolveViewMode(this.currentRole, this.writeRoles));

  visibleRows = computed(() => {
    if (this.viewMode() === 'limited' && this.ownerId) {
      return this.rows.filter(r => r['ownerId'] === this.ownerId || r['assigneeId'] === this.ownerId);
    }
    return this.rows;
  });

  tagType(severity?: string): string {
    const map: Record<string, string> = {
      critical: 'red', high: 'orange', medium: 'yellow',
      low: 'teal', info: 'blue', success: 'green', warning: 'warm-gray'
    };
    return map[severity ?? 'info'] ?? 'gray';
  }

  onSearch(val: string) { this.search.emit(val); }
  onFilter(val: unknown) { this.filter.emit((val as { value: string }).value); }
  onViewSwitch(val: unknown) { this.viewSwitch.emit(String(val)); }
  onPageChange(p: number) { this.pageChange.emit(p); }
  onPageSizeChange(s: number) { this.pageSizeChange.emit(s); }
  onRowClick(row: ModuleRecord) { this.rowClick.emit(row); }
  onRowEdit(row: ModuleRecord) { this.rowEdit.emit(row); }
  triggerAction(action: ModuleAction | null, payload?: Record<string, unknown>) {
    if (!action) return;
    if (action.actionKey) {
      this.actionTriggered.emit({ key: action.actionKey, payload });
      return;
    }
    if (action.commandKey) {
      this.actionTriggered.emit({ key: action.commandKey, payload });
      return;
    }
    if (action.route) {
      this.actionTriggered.emit({
        key: 'navigate',
        payload: { path: action.route, ...(payload ?? {}) },
      });
    }
  }
  selectAll(e: Event) {
    this.selectedIds = (e.target as HTMLInputElement).checked ? this.rows.map(r => r.id) : [];
    this.selectionChange.emit(this.selectedIds);
  }
  toggleSelect(id: string) {
    this.selectedIds = this.selectedIds.includes(id)
      ? this.selectedIds.filter(i => i !== id)
      : [...this.selectedIds, id];
    this.selectionChange.emit(this.selectedIds);
  }
}

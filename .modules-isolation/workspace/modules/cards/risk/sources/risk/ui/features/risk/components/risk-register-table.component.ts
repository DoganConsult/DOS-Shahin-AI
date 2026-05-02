import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { HasPermissionDirective } from '@app/dauth/directives/has-permission.directive';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { MultiSelectModule } from 'primeng/multiselect';
import { RiskRegisterItemDto } from '../pages/risk-workspace/risk-workspace.models';
import { GrcRecord } from '@app/core/models/shared.types';

/** Events emitted from the table for parent to handle */
export interface RiskTableAction {
  type: 'edit' | 'detail' | 'escalate' | 'delete';
  risk: RiskRegisterItemDto;
}

/**
 * Presentational component: renders the risk register toolbar (create, export,
 * column toggle, filters, search) plus the data table with row-level actions,
 * bulk selection bar, and empty state.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-risk-register-table',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    StatusBadgeComponent, ExportButtonComponent, HasPermissionDirective,
    TableModule, InputTextModule, ButtonModule, TagModule,
    DropdownModule, TooltipModule, MultiSelectModule, AppDatePipe,
  ],
  template: `
    <!-- ── Toolbar ── -->
    <div class="page-toolbar mb-3">
      <div class="toolbar-primary">
        <p-button *appHasPermission="'risk:write'" [label]="labels.createRisk" icon="pi pi-plus" (onClick)="create.emit()" styleClass="me-2" />
        <app-export-button module="risk-register" [label]="labels.exportRegister" [data]="risks" />
        <p-multiSelect [options]="columnOptions" [(ngModel)]="visibleColumnValues" optionLabel="label" optionValue="value"
                       [placeholder]="labels.columns" [style]="{minWidth:'180px'}" styleClass="ms-2" [maxSelectedLabels]="3"
                       [selectedItemsLabel]="'{0} ' + labels.columns" (onChange)="columnsChanged.emit(visibleColumnValues)" appendTo="body" />
      </div>
      <div class="toolbar-secondary">
        <p-dropdown [options]="statusFilterOptions" [(ngModel)]="statusFilterValue" optionLabel="label" optionValue="value"
                    [placeholder]="labels.filterByStatus" (onChange)="statusFilterChange.emit(statusFilterValue)" [style]="{minWidth:'160px'}" styleClass="me-2" />
        <p-dropdown [options]="categoryFilterOptions" [(ngModel)]="categoryFilterValue" optionLabel="label" optionValue="value"
                    [placeholder]="labels.filterByCategory" (onChange)="categoryFilterChange.emit(categoryFilterValue)" [style]="{minWidth:'160px'}" styleClass="me-2" />
        <span class="search-wrap">
          <i class="pi pi-search search-icon"></i>
          <input type="text" pInputText [(ngModel)]="searchTermValue" [placeholder]="labels.search" [attr.aria-label]="labels.search" (input)="onSearchInput()" class="search-input" />
        </span>
      </div>
    </div>

    <!-- ── Floating bulk toolbar ── -->
    <div class="bulk-toolbar" *ngIf="selectedIds.length > 0">
      <span class="bulk-count">{{ selectedIds.length }} {{ labels.selected }}</span>
      <div class="bulk-actions">
        <p-dropdown [options]="riskStatusOptions" [(ngModel)]="bulkStatusValue" optionLabel="label" optionValue="value"
                    [placeholder]="labels.bulkStatus" [style]="{minWidth:'160px'}" styleClass="me-2" appendTo="body" />
        <input pInputText [(ngModel)]="bulkOwnerValue" [placeholder]="labels.bulkOwner" class="bulk-owner-input me-2" />
        <p-button [label]="labels.applyBulk" icon="pi pi-check" (onClick)="applyBulk.emit({ status: bulkStatusValue, owner: bulkOwnerValue })" [disabled]="!bulkStatusValue && !bulkOwnerValue" severity="warning" styleClass="me-2" />
        <p-button [label]="labels.bulkExport" icon="pi pi-download" (onClick)="bulkExport.emit()" severity="info" [outlined]="true" styleClass="me-2" />
        <p-button [label]="labels.clearSelection" icon="pi pi-times" (onClick)="clearSelection.emit()" severity="secondary" [text]="true" />
      </div>
    </div>

    <!-- ── Table ── -->
    <div class="table-shell">
      <p-table aria-label="Risk register table" [value]="risks" [rows]="20" [paginator]="true" [rowsPerPageOptions]="[10,20,50]"
               [lazy]="true" [totalRecords]="totalRecords" (onLazyLoad)="onLazyLoad($event)"
               [globalFilterFields]="['title','category','owner']"
               styleClass="p-datatable-sm p-datatable-gridlines" *ngIf="risks.length > 0 || totalRecords > 0">
        <ng-template pTemplate="header">
          <tr>
            <th scope="col" style="width:40px"><input type="checkbox" [checked]="selectAllChecked" (change)="onToggleSelectAll($event)" aria-label="Select all" /></th>
            <th scope="col" pSortableColumn="riskId" style="width:80px" *ngIf="isColVisible('riskId')">ID <p-sortIcon field="riskId" /></th>
            <th scope="col" pSortableColumn="title" *ngIf="isColVisible('title')">{{ labels.title }} <p-sortIcon field="title" /></th>
            <th scope="col" pSortableColumn="category" *ngIf="isColVisible('category')">{{ labels.category }} <p-sortIcon field="category" /></th>
            <th scope="col" *ngIf="isColVisible('owner')">{{ labels.owner }}</th>
            <th scope="col" pSortableColumn="status" *ngIf="isColVisible('status')">{{ labels.status }} <p-sortIcon field="status" /></th>
            <th scope="col" pSortableColumn="inherentScore" style="width:90px" *ngIf="isColVisible('inherentScore')">{{ labels.inherent }} <p-sortIcon field="inherentScore" /></th>
            <th scope="col" pSortableColumn="residualScore" style="width:90px" *ngIf="isColVisible('residualScore')">{{ labels.residual }} <p-sortIcon field="residualScore" /></th>
            <th scope="col" *ngIf="isColVisible('treatment')">{{ labels.treatment }}</th>
            <th scope="col" *ngIf="isColVisible('createdAt')">{{ labels.createdAt }}</th>
            <th scope="col" *ngIf="isColVisible('controlEffectiveness')">{{ labels.controlEff }}</th>
            <th scope="col" *ngIf="isColVisible('nextReviewDate')">{{ labels.nextReviewDate }}</th>
            <th scope="col" *ngIf="isColVisible('ownerTeamName')">{{ labels.ownerTeam }}</th>
            <th scope="col" style="width:120px" *ngIf="isColVisible('actions')">{{ labels.actions }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-risk>
          <tr>
            <td><input type="checkbox" [checked]="isRiskSelected(risk.riskId)" (change)="onToggleRiskSelection(risk.riskId)" [attr.aria-label]="'Select ' + risk.title" /></td>
            <td class="font-mono text-xs" *ngIf="isColVisible('riskId')">{{ risk.riskId }}</td>
            <td tabindex="0" role="button" (keyup.enter)="rowAction.emit({ type: 'detail', risk: risk })" class="font-semibold clickable" (click)="rowAction.emit({ type: 'detail', risk: risk })" *ngIf="isColVisible('title')">{{ risk.title }}</td>
            <td *ngIf="isColVisible('category')"><p-tag [value]="risk.category" [rounded]="true" /></td>
            <td *ngIf="isColVisible('owner')">{{ risk.owner || '\u2014' }}</td>
            <td *ngIf="isColVisible('status')"><app-status-badge [status]="risk.status" /></td>
            <td class="text-center" *ngIf="isColVisible('inherentScore')"><span class="score-pill" [class]="scoreClass(risk.inherentScore)">{{ risk.inherentScore }}</span></td>
            <td class="text-center" *ngIf="isColVisible('residualScore')"><span class="score-pill" [class]="scoreClass(risk.residualScore)">{{ risk.residualScore }}</span></td>
            <td *ngIf="isColVisible('treatment')"><app-status-badge [status]="risk.treatmentStatus || 'untreated'" /></td>
            <td *ngIf="isColVisible('createdAt')"><span class="text-xs">{{ risk.createdAt | appDate:'short' }}</span></td>
            <td *ngIf="isColVisible('controlEffectiveness')"><span class="text-xs">{{ risk.controlEffectiveness != null ? risk.controlEffectiveness + '%' : '\u2014' }}</span></td>
            <td *ngIf="isColVisible('nextReviewDate')"><span class="text-xs">{{ risk.nextReviewDate ? (risk.nextReviewDate | appDate:'short') : '\u2014' }}</span></td>
            <td *ngIf="isColVisible('ownerTeamName')">{{ risk.ownerTeamName || '\u2014' }}</td>
            <td *ngIf="isColVisible('actions')">
              <div class="row-actions">
                <button *appHasPermission="'risk:write'" aria-label="Edit" class="icon-btn" (click)="rowAction.emit({ type: 'edit', risk: risk })" pTooltip="Edit"><i class="pi pi-pencil"></i></button>
                <button aria-label="Detail" class="icon-btn" (click)="rowAction.emit({ type: 'detail', risk: risk })" pTooltip="Detail"><i class="pi pi-eye"></i></button>
                <button *appHasPermission="'risk:write'" aria-label="Escalate" class="icon-btn" (click)="rowAction.emit({ type: 'escalate', risk: risk })" pTooltip="Escalate"><i class="pi pi-arrow-up-right"></i></button>
                <button *appHasPermission="'risk:delete'" aria-label="Delete" class="icon-btn danger" (click)="rowAction.emit({ type: 'delete', risk: risk })" pTooltip="Delete"><i class="pi pi-trash"></i></button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td [attr.colspan]="visibleColCount + 1" class="text-center text-muted py-lg">{{ labels.noData }}</td></tr>
        </ng-template>
      </p-table>

      <div *ngIf="risks.length === 0" class="empty-section">
        <i class="pi pi-inbox"></i>
        <p>{{ labels.emptyRegister }}</p>
        <p-button *appHasPermission="'risk:write'" [label]="labels.createRisk" icon="pi pi-plus" (onClick)="create.emit()" />
      </div>
    </div>
  `,
  styles: [`
    .page-toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-sm, 8px); padding: 10px 0; }
    .toolbar-primary { display: flex; align-items: center; gap: var(--space-sm, 8px); flex-wrap: wrap; }
    .toolbar-secondary { display: flex; align-items: center; gap: var(--space-sm, 8px); flex-wrap: wrap; }
    .table-shell { direction: ltr; }
    .search-wrap { position: relative; display: inline-flex; align-items: center; }
    .search-icon { position: absolute; inset-inline-start: 12px; color: var(--text-muted); z-index: var(--z-base); pointer-events: none; }
    .search-input { min-width: 220px; padding-inline-start: 36px; }
    .font-mono { font-family: monospace; }
    .font-semibold { font-weight: 600; }
    .text-xs { font-size: var(--font-size-sm); }
    .text-center { text-align: center; }
    .text-muted { color: var(--text-muted); }
    .clickable { cursor: pointer; }
    .clickable:hover { color: var(--primary); }
    .py-lg { padding: var(--space-xl, 24px) 0; }
    .me-2 { margin-inline-end: var(--space-sm, 8px); }
    .mb-3 { margin-bottom: var(--space-md, 12px); }
    .ms-2 { margin-inline-start: var(--space-sm, 8px); }
    .score-pill { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; height: 28px; padding: 0 8px; border-radius: var(--radius-lg); font-size: var(--font-size-sm); font-weight: 700; }
    .score-pill.score-danger { background: rgba(239,68,68,.12); color: var(--error); }
    .score-pill.score-warning { background: rgba(245,158,11,.12); color: var(--warning); }
    .score-pill.score-success { background: rgba(34,197,94,.12); color: var(--success); }
    .row-actions { display: flex; gap: var(--space-xs, 4px); }
    .icon-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px 6px; border-radius: var(--radius-sm, 4px); transition: all 150ms; font-size: var(--font-size-base); }
    .icon-btn:hover { background: var(--surface-ice, rgba(0,0,0,.05)); color: var(--primary); }
    .icon-btn.danger:hover { background: rgba(239,68,68,.08); color: var(--error); }
    .empty-section { text-align: center; padding: var(--space-2xl, 32px); }
    .empty-section i { font-size: 2.5rem; color: var(--text-muted); margin-bottom: var(--space-md, 12px); display: block; }
    .empty-section p { color: var(--text-muted); margin-bottom: var(--space-md, 12px); }

    /* ── Bulk toolbar (floating) ── */
    .bulk-toolbar {
      display: flex; align-items: center; gap: 10px; padding: 12px 16px; margin-bottom: 12px;
      background: var(--primary-50, #eff6ff); border: 1px solid var(--primary-200, #bfdbfe);
      border-radius: var(--radius-md); flex-wrap: wrap;
      position: sticky; bottom: 16px; z-index: 10;
      box-shadow: 0 -2px 12px rgba(0,0,0,.10);
    }
    .bulk-count { font-weight: 600; font-size: var(--font-size-sm); color: var(--primary-700, #1d4ed8); min-width: 80px; }
    .bulk-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; flex: 1; }
    .bulk-owner-input { min-width: 160px; font-size: var(--font-size-sm); }
  `]
})
export class RiskRegisterTableComponent implements OnChanges {
  // ── Data ──
  @Input() risks: RiskRegisterItemDto[] = [];
  @Input() totalRecords = 0;

  // ── Filter / search state (two-way via outputs) ──
  @Input() statusFilterValue = '';
  @Input() categoryFilterValue = '';
  @Input() searchTermValue = '';
  @Input() statusFilterOptions: { label: string; value: string }[] = [];
  @Input() categoryFilterOptions: { label: string; value: string }[] = [];
  @Input() riskStatusOptions: { label: string; value: string }[] = [];

  // ── Column visibility ──
  @Input() columnOptions: { label: string; value: string }[] = [];
  @Input() visibleColumnValues: string[] = [];
  @Input() visibleColCount = 0;

  // ── Bulk selection ──
  @Input() selectedIds: string[] = [];
  @Input() selectAllChecked = false;

  // ── Localized labels ──
  @Input() labels: GrcRecord = {};

  // ── Outputs ──
  @Output() create = new EventEmitter<void>();
  @Output() rowAction = new EventEmitter<RiskTableAction>();
  @Output() statusFilterChange = new EventEmitter<string>();
  @Output() categoryFilterChange = new EventEmitter<string>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() columnsChanged = new EventEmitter<string[]>();
  @Output() toggleSelectAll = new EventEmitter<boolean>();
  @Output() toggleRiskSelection = new EventEmitter<string>();
  @Output() applyBulk = new EventEmitter<{ status: string; owner: string }>();
  @Output() bulkExport = new EventEmitter<void>();
  @Output() clearSelection = new EventEmitter<void>();
  @Output() lazyLoad = new EventEmitter<TableLazyLoadEvent>();

  /** Internal bulk state */
  bulkStatusValue = '';
  bulkOwnerValue = '';

  private searchTimeout: ReturnType<typeof setTimeout> | null;
  private visibleColSet = new Set<string>();

  ngOnChanges(_changes: SimpleChanges): void {
    this.visibleColSet = new Set(this.visibleColumnValues);
  }

  isColVisible(col: string): boolean { return this.visibleColSet.has(col); }

  isRiskSelected(riskId: string): boolean { return this.selectedIds.includes(riskId); }

  scoreClass(score: number): string {
    if (score >= 20) return 'score-danger';
    if (score >= 12) return 'score-warning';
    return 'score-success';
  }

  onToggleSelectAll(event: Event): void {
    this.toggleSelectAll.emit((event.target as HTMLInputElement).checked);
  }

  onToggleRiskSelection(riskId: string): void {
    this.toggleRiskSelection.emit(riskId);
  }

  onSearchInput(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.searchChange.emit(this.searchTermValue), 300);
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.lazyLoad.emit(event);
  }
}

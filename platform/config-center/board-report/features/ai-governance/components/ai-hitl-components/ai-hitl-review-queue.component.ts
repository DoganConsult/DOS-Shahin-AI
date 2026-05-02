import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface HitlItem {
  state_id: string;
  entity_type: string;
  entity_id: string;
  hitl_state: string;
  confidence: number;
  review_required: boolean;
  review_decision?: string;
  updated_at: string;
  sla_status?: 'ok' | 'warn' | 'breach';
}

export interface HitlDashboard {
  totalAiDrafts: number;
  totalPendingReview: number;
  totalApproved: number;
  totalRejected: number;
  totalEscalated: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
    selector: 'app-ai-hitl-review-queue',
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        TagModule,
        ButtonModule,
        DropdownModule,
        ToolbarModule,
        TooltipModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <!-- KPI Strip -->
    <div class="kpi-strip">
      <div class="kpi-card">
        <span class="kpi-val">{{ dashboard.totalAiDrafts }}</span>
        <span class="kpi-lbl">{{ i18n.translate('ai.hitl.aiDrafts') }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-val">{{ dashboard.totalPendingReview }}</span>
        <span class="kpi-lbl">{{ i18n.translate('ai.hitl.pendingReview') }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-val">{{ dashboard.totalApproved }}</span>
        <span class="kpi-lbl">{{ i18n.translate('ai.hitl.approved') }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-val">{{ dashboard.totalRejected }}</span>
        <span class="kpi-lbl">{{ i18n.translate('ai.hitl.rejected') }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-val">{{ dashboard.totalEscalated }}</span>
        <span class="kpi-lbl">{{ i18n.translate('ai.hitl.escalated') }}</span>
      </div>
    </div>

    <!-- Toolbar: Filters + Bulk Actions -->
    <p-toolbar styleClass="mb-3">
      <div class="p-toolbar-group-start" style="display:flex; gap:10px; flex-wrap:wrap;">
        <p-dropdown
          [options]="stateFilterOptions"
          [(ngModel)]="stateFilter"
          optionLabel="label"
          optionValue="value"
          [placeholder]="i18n.translate('ai.hitl.filterState')"
          [showClear]="true"
          (onChange)="filterChanged.emit()"
          styleClass="filter-dropdown">
        </p-dropdown>
        <p-dropdown
          [options]="entityTypeOptions"
          [(ngModel)]="entityTypeFilter"
          optionLabel="label"
          optionValue="value"
          [placeholder]="i18n.translate('ai.hitl.filterEntityType')"
          [showClear]="true"
          (onChange)="filterChanged.emit()"
          styleClass="filter-dropdown">
        </p-dropdown>
      </div>
      <div class="p-toolbar-group-end" style="display:flex; gap:8px;">
        <button
          pButton
          [label]="i18n.translate('ai.hitl.bulkApprove')"
          icon="pi pi-check-circle"
          class="p-button-sm p-button-success p-button-outlined"
          [disabled]="selectedItems.length === 0"
          [loading]="bulkLoading"
          (click)="bulkAction.emit('approved')">
        </button>
        <button
          pButton
          [label]="i18n.translate('ai.hitl.bulkReject')"
          icon="pi pi-times-circle"
          class="p-button-sm p-button-danger p-button-outlined"
          [disabled]="selectedItems.length === 0"
          [loading]="bulkLoading"
          (click)="bulkAction.emit('rejected')">
        </button>
      </div>
    </p-toolbar>

    <!-- Queue Table -->
    <p-table
      [value]="filteredQueue"
      [paginator]="true"
      [rows]="15"
      [rowsPerPageOptions]="[10, 15, 25, 50]"
      [loading]="queueLoading"
      [(selection)]="selectedItems"
      (selectionChange)="selectionChanged.emit(selectedItems)"
      dataKey="state_id"
      selectionMode="multiple"
      styleClass="p-datatable-sm p-datatable-striped"
      responsiveLayout="scroll">

      <ng-template pTemplate="header">
        <tr>
          <th style="width:3rem"><p-tableHeaderCheckbox /></th>
          <th pSortableColumn="entity_type">{{ i18n.translate('ai.hitl.entityType') }} <p-sortIcon field="entity_type" /></th>
          <th>{{ i18n.translate('ai.hitl.entityId') }}</th>
          <th pSortableColumn="hitl_state">{{ i18n.translate('ai.hitl.state') }} <p-sortIcon field="hitl_state" /></th>
          <th pSortableColumn="confidence">{{ i18n.translate('ai.hitl.confidence') }} <p-sortIcon field="confidence" /></th>
          <th>{{ i18n.translate('ai.hitl.reviewDecision') }}</th>
          <th pSortableColumn="updated_at">{{ i18n.translate('ai.hitl.updatedAt') }} <p-sortIcon field="updated_at" /></th>
          <th>{{ i18n.translate('ai.hitl.slaStatus') }}</th>
          <th>{{ i18n.translate('common.actions') }}</th>
        </tr>
      </ng-template>

      <ng-template pTemplate="body" let-item let-rowIndex="rowIndex">
        <tr [pSelectableRow]="item" [pSelectableRowIndex]="rowIndex">
          <td><p-tableCheckbox [value]="item" /></td>
          <td>{{ item.entity_type }}</td>
          <td class="mono">{{ item.entity_id | slice:0:12 }}</td>
          <td><p-tag [value]="item.hitl_state" [severity]="stateSeverity(item.hitl_state)" /></td>
          <td>{{ item.confidence | number:'1.0-1' }}%</td>
          <td>{{ item.review_decision ?? '--' }}</td>
          <td>{{ item.updated_at | date:'short' }}</td>
          <td>
            @switch (item.sla_status) {
              @case ('ok') { <span class="sla-ok">{{ i18n.translate('ai.hitl.slaOk') }}</span> }
              @case ('warn') { <span class="sla-warn">{{ i18n.translate('ai.hitl.slaWarning') }}</span> }
              @case ('breach') { <span class="sla-breach">{{ i18n.translate('ai.hitl.slaBreach') }}</span> }
              @default { <span class="sla-ok">--</span> }
            }
          </td>
          <td>
            @if (item.hitl_state === 'pending_review' || item.hitl_state === 'ai_draft') {
              <button pButton icon="pi pi-check"
                class="p-button-sm p-button-text p-button-success"
                [pTooltip]="i18n.translate('ai.hitl.approve')"
                (click)="reviewAction.emit({ item: item, decision: 'approved' })">
              </button>
              <button pButton icon="pi pi-times"
                class="p-button-sm p-button-text p-button-danger"
                [pTooltip]="i18n.translate('ai.hitl.reject')"
                (click)="reviewAction.emit({ item: item, decision: 'rejected' })">
              </button>
              <button pButton icon="pi pi-arrow-up"
                class="p-button-sm p-button-text p-button-warning"
                [pTooltip]="i18n.translate('ai.hitl.escalate')"
                (click)="reviewAction.emit({ item: item, decision: 'escalated' })">
              </button>
            }
            <button pButton icon="pi pi-eye"
              class="p-button-sm p-button-text p-button-secondary"
              [pTooltip]="i18n.translate('ai.hitl.viewDetail')"
              (click)="viewDetail.emit(item)">
            </button>
          </td>
        </tr>
      </ng-template>

      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="9" class="empty-state-cell">
            <i class="pi pi-inbox"></i>
            {{ i18n.translate('ai.hitl.emptyQueue') }}
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
    styles: [`
    .kpi-strip { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:10px; margin-bottom:8px; }
    .kpi-card { background:var(--surface-card); border:1px solid var(--surface-border); border-radius:var(--radius-md); padding:14px 18px; display:flex; flex-direction:column; gap:2px; }
    .kpi-val { font-size:var(--font-size-2xl); font-weight:800; color:var(--text-heading); }
    .kpi-lbl { font-size:var(--font-size-xs); font-weight:600; color:var(--text-muted); }
    .mb-3 { margin-bottom:16px; }
    .filter-dropdown { min-width:180px; }
    .mono { font-family:monospace; font-size:0.85rem; }
    .sla-ok { color:#16a34a; }
    .sla-warn { color:#d97706; }
    .sla-breach { color:#dc2626; font-weight:700; }
    .empty-state-cell { text-align:center; padding:2rem !important; color:var(--text-muted); }
    .empty-state-cell i { margin-right:0.5rem; }
    @media(max-width:768px) {
      .kpi-strip { grid-template-columns:repeat(2,1fr); }
      .filter-dropdown { min-width:100%; }
    }
  `]
})
export class AiHitlReviewQueueComponent {
  readonly i18n = inject(I18nService);

  /** Dashboard KPI data. */
  @Input() dashboard: HitlDashboard = { totalAiDrafts: 0, totalPendingReview: 0, totalApproved: 0, totalRejected: 0, totalEscalated: 0 };

  /** Filtered queue items to display. */
  @Input() filteredQueue: HitlItem[] = [];

  /** Whether the queue is loading. */
  @Input() queueLoading = false;

  /** Whether a bulk action is in progress. */
  @Input() bulkLoading = false;

  /** State filter dropdown options. */
  @Input() stateFilterOptions: { label: string; value: string }[] = [];

  /** Entity type filter dropdown options. */
  @Input() entityTypeOptions: { label: string; value: string }[] = [];

  /** Currently selected items (for bulk actions). */
  selectedItems: HitlItem[] = [];

  /** Filter state (managed locally for two-way binding). */
  stateFilter: string | null = null;
  entityTypeFilter: string | null = null;

  /** Emitted when a filter changes. */
  @Output() filterChanged = new EventEmitter<void>();

  /** Emitted when selection changes. */
  @Output() selectionChanged = new EventEmitter<HitlItem[]>();

  /** Emitted when a bulk action button is clicked. */
  @Output() bulkAction = new EventEmitter<string>();

  /** Emitted when a row action (approve/reject/escalate) is clicked. */
  @Output() reviewAction = new EventEmitter<{ item: HitlItem; decision: string }>();

  /** Emitted when the detail view button is clicked. */
  @Output() viewDetail = new EventEmitter<HitlItem>();

  /** Map HITL state to PrimeNG tag severity. */
  stateSeverity(state: string): 'success' | 'warning' | 'danger' | 'info' | 'secondary' {
    switch (state) {
      case 'approved': return 'success';
      case 'rejected': return 'danger';
      case 'pending_review': return 'warning';
      case 'ai_draft': return 'info';
      case 'escalated': return 'warning';
      default: return 'secondary';
    }
  }
}

import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { GrcRecord } from '@app/core/models/shared.types';

/**
 * Presentational component: policy data table with checkbox selection,
 * sortable columns, and per-row action buttons.
 */
@Component({
    selector: 'app-policy-table',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TableModule, ButtonModule, TooltipModule, StatusBadgeComponent],
    template: `
    <div class="table-shell" *ngIf="policies.length > 0">
      <p-table aria-label="Filtered Policies table" [value]="policies"
        [paginator]="policies.length > 10" [rows]="10"
        styleClass="p-datatable-striped p-datatable-sm"
        [(selection)]="selectedPolicies" (selectionChange)="selectionChange.emit($event)"
        dataKey="policy_id">
        <ng-template pTemplate="header">
          <tr>
            <th class="col-check"><p-tableHeaderCheckbox /></th>
            <th class="col-title" pSortableColumn="title">{{ i18n.translate('policies.policy') }} <p-sortIcon field="title" /></th>
            <th class="col-cat">{{ i18n.translate('policies.category') }}</th>
            <th class="col-status">{{ i18n.translate('common.status') }}</th>
            <th class="col-ver" pSortableColumn="version">{{ i18n.translate('policies.version') }}</th>
            <th class="col-owner">{{ i18n.translate('policies.owner') }}</th>
            <th class="col-date">{{ i18n.translate('policies.reviewDate') }}</th>
            <th class="col-actions">{{ i18n.translate('common.actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-p>
          <tr [class.row-selected]="isSelected(p)">
            <td tabindex="0" role="button" (keyup.enter)="$event.stopPropagation()" class="col-check" (click)="$event.stopPropagation()"><p-tableCheckbox [value]="p" /></td>
            <td tabindex="0" role="button" (keyup.enter)="openDetail.emit(p)" class="col-title policy-title-cell" (click)="openDetail.emit(p)">
              <strong class="policy-name">{{ p.title }}</strong>
              <span *ngIf="p.owner" class="policy-owner-hint">{{ p.owner }}</span>
            </td>
            <td class="col-cat">{{ p.category || '\u2014' }}</td>
            <td class="col-status"><app-status-badge [status]="p.status" /></td>
            <td class="col-ver">v{{ p.version }}</td>
            <td class="col-owner">{{ p.owner || '\u2014' }}</td>
            <td class="col-date">
              <span *ngIf="p.next_review_date">{{ p.next_review_date | date:'dd MMM yyyy' }}</span>
              <span *ngIf="!p.next_review_date" class="text-muted">\u2014</span>
              <span *ngIf="isReviewOverdue(p)" class="badge-overdue">{{ i18n.translate('policies.overdue') }}</span>
              <span *ngIf="isReviewDueSoon(p) && !isReviewOverdue(p)" class="badge-due">{{ i18n.translate('policies.dueSoon') }}</span>
            </td>
            <td tabindex="0" role="button" (keyup.enter)="$event.stopPropagation()" class="col-actions" (click)="$event.stopPropagation()">
              <div class="action-btns">
                <button aria-label="Code" class="icon-btn rules" (click)="openRules.emit(p)"
                  [pTooltip]="i18n.translate('policies.policyRules')" tooltipPosition="top"><i class="pi pi-code"></i></button>
                <button aria-label="Edit" class="icon-btn" (click)="edit.emit(p)"
                  [pTooltip]="i18n.translate('common.edit')" tooltipPosition="top"><i class="pi pi-pencil"></i></button>
                <button aria-label="Confirm" class="icon-btn approve" (click)="approve.emit(p)"
                  [pTooltip]="i18n.translate('policies.approve')" tooltipPosition="top"
                  *ngIf="p.status === 'draft'"><i class="pi pi-check-circle"></i></button>
                <button aria-label="Delete" class="icon-btn danger" (click)="confirmDelete.emit(p)"
                  [pTooltip]="i18n.translate('common.delete')" tooltipPosition="top"><i class="pi pi-trash"></i></button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="8" class="empty-msg">{{ i18n.translate('policies.noPolicies') }}</td></tr>
        </ng-template>
      </p-table>
    </div>
  `,
    styles: [`
    .table-shell { background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); overflow: hidden; direction: ltr; }
    .col-check { width: 40px; text-align: center; }
    .col-title { min-width: 200px; }
    .col-cat { width: 130px; }
    .col-status { width: 110px; }
    .col-ver { width: 70px; }
    .col-owner { width: 140px; font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); }
    .col-date { width: 150px; }
    .col-actions { width: 130px; }
    .policy-title-cell { cursor: pointer; }
    .policy-title-cell:hover .policy-name { color: var(--primary-600, #2563eb); }
    .policy-name { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-heading, var(--text-heading)); display: block; }
    .policy-owner-hint { font-size: var(--font-size-xs); color: var(--text-muted, #9ca3af); display: none; }
    .badge-overdue { display: inline-block; font-size: var(--font-size-xs); font-weight: 600; color: var(--error); background: #fee2e2; padding: 1px 6px; border-radius: var(--radius-xs); margin-inline-start: 6px; }
    .badge-due { display: inline-block; font-size: var(--font-size-xs); font-weight: 600; color: #7c3aed; background: #ede9fe; padding: 1px 6px; border-radius: var(--radius-xs); margin-inline-start: 6px; }
    .text-muted { color: var(--text-muted, #9ca3af); font-size: var(--font-size-sm); }
    .action-btns { display: flex; gap: 4px; align-items: center; }
    .icon-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; min-height: 32px; background: none; border: 1px solid transparent; cursor: pointer; color: var(--text-muted, var(--text-muted)); border-radius: var(--radius-sm); transition: all 150ms; font-size: var(--font-size-base); }
    .icon-btn:hover { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
    .icon-btn.approve { color: var(--success); }
    .icon-btn.approve:hover { background: #ecfdf5; border-color: #6ee7b7; }
    .icon-btn.danger:hover { background: var(--status-danger-bg, #fff1f1); color: var(--error); border-color: #fca5a5; }
    .icon-btn.rules:hover { background: var(--purple-50, #f5f3ff); color: #7c3aed; border-color: #ddd6fe; }
    .row-selected { background: var(--primary-50, #eff6ff); }
    .empty-msg { text-align: center; color: var(--text-muted, var(--text-muted)); padding: 32px; }
  `]
})
export class PolicyTableComponent {
  @Input() policies: GrcRecord[] = [];
  @Input() selectedPolicies: GrcRecord[] = [];

  @Output() selectionChange = new EventEmitter<GrcRecord[]>();
  @Output() openDetail = new EventEmitter<GrcRecord>();
  @Output() edit = new EventEmitter<GrcRecord>();
  @Output() approve = new EventEmitter<GrcRecord>();
  @Output() confirmDelete = new EventEmitter<GrcRecord>();
  @Output() openRules = new EventEmitter<GrcRecord>();

  constructor(public i18n: I18nService) {}

  isSelected(p: GrcRecord): boolean {
    return this.selectedPolicies.includes(p);
  }

  isReviewOverdue(p: GrcRecord): boolean {
    return p.next_review_date && new Date(p.next_review_date) < new Date();
  }

  isReviewDueSoon(p: GrcRecord): boolean {
    const d = new Date();
    return p.next_review_date && new Date(p.next_review_date) <= new Date(d.getTime() + 30 * 86400000);
  }
}

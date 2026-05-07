/**
 * SoD Conflicts Table — Dumb sub-component
 * Renders the PrimeNG data table of SoD conflicts with checkbox selection.
 * Emits row-level actions (view, suggest, resolve, history) to the parent.
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';

/** Minimal conflict shape required by this table */
export interface SodConflictRow {
  conflictId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  conflictType: string;
  scopeType: string;
  scopeId: string;
  scopeName?: string;
  riskScore?: number;
  severity: 'high' | 'medium' | 'low';
  detectedAt: string;
  status: 'open' | 'mitigated' | 'accepted' | 'resolved';
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-sod-conflicts-table',
    imports: [CommonModule, TableModule, TagModule, TooltipModule, StatusBadgeComponent, DecimalPipe, DatePipe],
    template: `
    <div class="table-shell" *ngIf="conflicts.length > 0">
      <p-table
        [value]="conflicts"
        [paginator]="conflicts.length > 10"
        [rows]="10"
        [selectionMode]="'checkbox'"
        [(selection)]="selection"
        (selectionChange)="selectionChange.emit(selection)"
        styleClass="p-datatable-striped p-datatable-sm"
        [loading]="loading">
        <ng-template pTemplate="header">
          <tr>
            <th style="width: 3rem"><p-tableHeaderCheckbox /></th>
            <th>{{ i18n.translate('User') }}</th>
            <th>{{ i18n.translate('Conflict Type') }}</th>
            <th>{{ i18n.translate('Scope') }}</th>
            <th>{{ i18n.translate('Severity') }}</th>
            <th>{{ i18n.translate('Risk Score') }}</th>
            <th>{{ i18n.translate('Status') }}</th>
            <th>{{ i18n.translate('Detected At') }}</th>
            <th style="width: 180px">{{ i18n.translate('Actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-conflict>
          <tr>
            <td><p-tableCheckbox [value]="conflict" /></td>
            <td>
              <div class="user-cell">
                <strong>{{ conflict.userName || conflict.userEmail || conflict.userId }}</strong>
                <small *ngIf="conflict.userEmail">{{ conflict.userEmail }}</small>
              </div>
            </td>
            <td>
              <p-tag [value]="conflict.conflictType" severity="warning" styleClass="conflict-type-tag" />
            </td>
            <td>
              <div class="scope-cell">
                <span class="scope-type">{{ conflict.scopeType }}</span>
                <small *ngIf="conflict.scopeName">{{ conflict.scopeName }}</small>
                <small *ngIf="!conflict.scopeName">{{ conflict.scopeId }}</small>
              </div>
            </td>
            <td>
              <p-tag
                [value]="conflict.severity"
                [severity]="conflict.severity === 'high' ? 'danger' : conflict.severity === 'medium' ? 'warning' : 'info'" />
            </td>
            <td>
              <span *ngIf="conflict.riskScore !== undefined" class="risk-score">{{ conflict.riskScore | number:'1.0-0' }}</span>
              <span *ngIf="conflict.riskScore === undefined">&mdash;</span>
            </td>
            <td><app-status-badge [status]="conflict.status" /></td>
            <td><span class="date-cell">{{ conflict.detectedAt | date:'short' }}</span></td>
            <td>
              <div class="action-btns">
                <button class="icon-btn" pTooltip="View Details" (click)="viewDetails.emit(conflict)"><i class="pi pi-eye"></i></button>
                <button class="icon-btn" pTooltip="Get Remediation Suggestions" (click)="loadSuggestions.emit(conflict)" *ngIf="conflict.status === 'open'"><i class="pi pi-lightbulb"></i></button>
                <button class="icon-btn" pTooltip="Resolve" (click)="openResolve.emit(conflict)" *ngIf="conflict.status === 'open'"><i class="pi pi-check"></i></button>
                <button class="icon-btn" pTooltip="View History" (click)="viewHistory.emit(conflict)"><i class="pi pi-history"></i></button>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
    <div class="empty-state" *ngIf="!loading && conflicts.length === 0">
      <i class="pi pi-inbox empty-icon"></i>
      <p>{{ i18n.translate('No SoD conflicts found') }}</p>
    </div>
  `,
    styles: [`
    .table-shell { background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); overflow: hidden; }
    .user-cell { display: flex; flex-direction: column; gap: 2px; }
    .user-cell small { font-size: var(--font-size-xs); color: var(--text-muted); }
    .scope-cell { display: flex; flex-direction: column; gap: 2px; }
    .scope-type { font-weight: 600; color: var(--primary); }
    .scope-cell small { font-size: var(--font-size-xs); color: var(--text-muted); }
    .risk-score { font-weight: 600; color: var(--error); }
    .date-cell { font-size: var(--font-size-sm); color: var(--text-muted); }
    .action-btns { display: flex; gap: 4px; }
    .icon-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; min-height: 32px; background: none; border: 1px solid transparent; cursor: pointer; color: var(--text-muted); border-radius: var(--radius-sm); transition: all 150ms; }
    .icon-btn:hover { background: var(--surface-100, #e0f2fe); color: var(--primary); }
    .empty-state { text-align: center; padding: 48px 16px; color: var(--text-muted); }
    .empty-icon { font-size: var(--font-size-6xl); margin-bottom: 12px; display: block; }
  `]
})
export class SodConflictsTableComponent {
  readonly i18n = inject(I18nService);

  @Input() conflicts: SodConflictRow[] = [];
  @Input() loading = false;
  @Input() selection: SodConflictRow[] = [];

  @Output() selectionChange = new EventEmitter<SodConflictRow[]>();
  @Output() viewDetails = new EventEmitter<SodConflictRow>();
  @Output() loadSuggestions = new EventEmitter<SodConflictRow>();
  @Output() openResolve = new EventEmitter<SodConflictRow>();
  @Output() viewHistory = new EventEmitter<SodConflictRow>();
}

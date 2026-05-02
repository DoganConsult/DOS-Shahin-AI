/**
 * ScoringRulesTableComponent — Dumb presentational component
 * Renders the scoring policies table with name, status, weights, dates, and actions.
 * Parent: ScoringPolicyComponent
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { TableModule, TagModule, TooltipModule } from 'carbon-components-angular';

/** Scoring policy data structure */
export interface ScoringPolicy {
  policy_id: string;
  name: string;
  weights: Record<string, number>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-scoring-rules-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DecimalPipe, AppDatePipe, TableModule, TagModule, TooltipModule],
  template: `
    <table cdsTable
      [value]="policies"
      [paginator]="policies.length > 10"
      [rows]="10"
      styleClass="p-datatable-striped p-datatable-gridlines"
      [attr.aria-label]="i18n.translate('scoringPolicy.tableLabel')"
    >
      <ng-template pTemplate="header">
        <tr>
          <th>Name</th>
          <th>Status</th>
          <th>Weight Domains</th>
          <th>Weight Total</th>
          <th>Created</th>
          <th>Updated</th>
          <th style="width: 160px">Actions</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-policy>
        <tr>
          <td><strong>{{ policy.name }}</strong></td>
          <td>
            <cds-tag *ngIf="policy.is_default" value="Default" severity="success" [rounded]="true" />
            <span *ngIf="!policy.is_default" class="text-muted">--</span>
          </td>
          <td>{{ getWeightCount(policy) }} domains</td>
          <td>
            <span [class.weight-valid]="isWeightSumValid(policy)" [class.weight-invalid]="!isWeightSumValid(policy)">
              {{ getWeightSum(policy) | number:'1.2-2' }}
            </span>
          </td>
          <td>{{ policy.created_at | appDate:'short' }}</td>
          <td>{{ policy.updated_at | appDate:'short' }}</td>
          <td>
            <div class="action-btns">
              <button class="icon-btn edit-btn" (click)="editRequested.emit(policy)" [cdsTooltip]="Edit" aria-label="Edit policy">
                <i class=""></i>
              </button>
              <button class="icon-btn apply-btn" (click)="applyRequested.emit(policy)" [cdsTooltip]="Apply to Assessment" aria-label="Apply to assessment">
                <i class=""></i>
              </button>
              <button class="icon-btn delete-btn" (click)="deleteRequested.emit(policy)" [cdsTooltip]="Delete" aria-label="Delete policy">
                <i class=""></i>
              </button>
            </div>
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr><td colspan="7" class="empty-msg">No scoring policies found.</td></tr>
      </ng-template>
    </table>
  `,
  styles: [`
    .text-muted { color: var(--text-muted, #94a3b8); }
    .weight-valid { color: #16a34a; font-weight: 600; }
    .weight-invalid { color: #dc2626; font-weight: 600; }
    .empty-msg { text-align: center; color: var(--text-muted, #94a3b8); padding: var(--space-xl, 32px); }
    .action-btns { display: flex; gap: 4px; }
    .icon-btn {
      background: none; border: none; cursor: pointer; color: var(--text-muted, #94a3b8);
      padding: 6px; border-radius: var(--radius-sm, 4px); transition: all 150ms; font-size: var(--font-size-base, 1rem);
    }
    .icon-btn:hover { background: #e0f2fe; color: #0369a1; }
    .icon-btn.edit-btn:hover { background: #e0f2fe; color: #0369a1; }
    .icon-btn.apply-btn:hover { background: #dcfce7; color: #16a34a; }
    .icon-btn.delete-btn:hover { background: #fee2e2; color: #dc2626; }
  `],
})
export class ScoringRulesTableComponent {
  i18n = inject(I18nService);

  @Input() policies: ScoringPolicy[] = [];

  @Output() editRequested = new EventEmitter<ScoringPolicy>();
  @Output() applyRequested = new EventEmitter<ScoringPolicy>();
  @Output() deleteRequested = new EventEmitter<ScoringPolicy>();

  getWeightCount(policy: ScoringPolicy): number {
    return Object.keys(policy.weights ?? {}).length;
  }

  getWeightSum(policy: ScoringPolicy): number {
    return Object.values(policy.weights ?? {}).reduce((s, v) => s + v, 0);
  }

  isWeightSumValid(policy: ScoringPolicy): boolean {
    return Math.abs(this.getWeightSum(policy) - 1.0) < 0.005;
  }
}

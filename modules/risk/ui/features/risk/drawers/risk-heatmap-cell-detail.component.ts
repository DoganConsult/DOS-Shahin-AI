import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';

/**
 * Presentational component: Cell detail dialog for the heatmap.
 * Shows a table of risks within a specific likelihood x impact cell,
 * with score badges, treatment status, and navigation actions.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-heatmap-cell-detail',
    imports: [CommonModule, DialogModule, TableModule, TagModule, TooltipModule, ButtonModule, StatusBadgeComponent],
    template: `
    <p-dialog
      [header]="dialogHeader"
      [(visible)]="visible"
      [modal]="true"
      [style]="{width:'850px', maxWidth:'95vw'}"
      [draggable]="true"
      [resizable]="false"
      (onHide)="closed.emit()">

      <div class="cell-detail-header" *ngIf="cellMeta">
        <span class="cell-score-badge" [style.background]="cellColor(cellMeta.impact, cellMeta.likelihood)">
          {{ labels.score }}: {{ cellMeta.impact * cellMeta.likelihood }}
        </span>
        <span class="cell-coord">{{ labels.likelihood }}: {{ cellMeta.likelihood }} | {{ labels.impact }}: {{ cellMeta.impact }}</span>
        <span class="cell-risk-count">{{ risks.length }} {{ labels.risksInCell }}</span>
      </div>

      <p-table
        [paginator]="risks.length > 10"
        [rows]="10"
        [rowsPerPageOptions]="[10,20,50]"
        aria-label="Cell Detail Risks table"
        [value]="risks"
        styleClass="p-datatable-sm p-datatable-striped"
        *ngIf="risks.length > 0">
        <ng-template pTemplate="header">
          <tr>
            <th style="min-width:200px">{{ labels.title }}</th>
            <th>{{ labels.score }}</th>
            <th>{{ labels.owner }}</th>
            <th>{{ labels.category }}</th>
            <th>{{ labels.treatmentStatus }}</th>
            <th>{{ labels.status }}</th>
            <th style="width:48px"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr class="cell-detail-row" (click)="riskClick.emit(r.riskId)">
            <td class="font-semibold risk-title-cell">
              <span class="risk-title-text">{{ r.title }}</span>
            </td>
            <td>
              <span class="score-chip" [class]="scoreClass(r.residualScore ?? r.inherentScore)">
                {{ r.residualScore != null ? r.residualScore : (r.inherentScore != null ? r.inherentScore : '\u2014') }}
              </span>
            </td>
            <td>{{ r.owner || '\u2014' }}</td>
            <td>
              <p-tag *ngIf="r.category" [value]="r.category" [rounded]="true" severity="info" />
              <span *ngIf="!r.category">\u2014</span>
            </td>
            <td>
              <span *ngIf="r.treatmentStatus" class="treatment-chip" [class]="treatmentClass(r.treatmentStatus)">
                {{ r.treatmentStatus }}
              </span>
              <span *ngIf="!r.treatmentStatus">\u2014</span>
            </td>
            <td><app-status-badge [status]="r.status" /></td>
            <td>
              <p-button
                icon="pi pi-external-link"
                [rounded]="true"
                [text]="true"
                severity="info"
                [pTooltip]="labels.viewInRegister"
                (onClick)="riskClick.emit(r.riskId); $event.stopPropagation()" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td [attr.colspan]="7" class="text-center text-muted py-md">{{ labels.noData }}</td></tr>
        </ng-template>
      </p-table>

      <div *ngIf="risks.length === 0" class="text-center text-muted py-md">{{ labels.noData }}</div>

      <ng-template pTemplate="footer">
        <div class="cell-dialog-footer">
          <p-button
            [label]="labels.viewAllInRegister"
            icon="pi pi-external-link"
            severity="info"
            size="small"
            (onClick)="viewAllInRegister.emit()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
    styles: [`
    .cell-detail-header { display: flex; align-items: center; gap: var(--space-md, 12px); flex-wrap: wrap; margin-bottom: var(--space-md, 12px); padding-bottom: var(--space-sm, 8px); border-bottom: 1px solid var(--surface-border); }
    .cell-score-badge { display: inline-flex; align-items: center; justify-content: center; padding: 4px 12px; border-radius: var(--radius-md, 6px); font-weight: 700; font-size: var(--font-size-sm); color: rgba(var(--color-black-rgb), .75); }
    .cell-coord { font-size: var(--font-size-sm); color: var(--text-secondary); }
    .cell-risk-count { font-size: var(--font-size-sm); color: var(--text-muted); margin-inline-start: auto; }
    .cell-detail-row { cursor: pointer; transition: background 150ms; }
    .cell-detail-row:hover { background: var(--surface-hover); }
    .risk-title-cell { max-width: 250px; }
    .risk-title-text { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; }
    .font-semibold { font-weight: 600; }
    .score-chip { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; padding: 2px 8px; border-radius: var(--radius-lg); font-weight: 600; font-size: var(--font-size-sm); }
    .score-chip.score-critical { background: rgba(var(--module-accent-red-rgb), .15); color: var(--error, #dc2626); }
    .score-chip.score-high { background: rgba(var(--module-accent-amber-rgb), .15); color: var(--warning, #d97706); }
    .score-chip.score-medium { background: rgba(var(--module-accent-yellow-rgb), .15); color: #a16207; }
    .score-chip.score-low { background: rgba(var(--module-accent-green-rgb), .15); color: var(--success, #16a34a); }
    .treatment-chip { display: inline-flex; padding: 2px 8px; border-radius: var(--radius-lg); font-size: var(--font-size-xs); font-weight: 500; }
    .treatment-chip.treatment-open { background: rgba(var(--module-accent-amber-rgb), .12); color: var(--warning, #d97706); }
    .treatment-chip.treatment-in_progress { background: rgba(var(--module-accent-blue-rgb), .12); color: #2563eb; }
    .treatment-chip.treatment-completed { background: rgba(var(--module-accent-green-rgb), .12); color: var(--success, #16a34a); }
    .treatment-chip.treatment-not_required { background: rgba(var(--color-gray-400-rgb), .12); color: #6b7280; }
    .cell-dialog-footer { display: flex; justify-content: flex-end; }
    .text-center { text-align: center; }
    .text-muted { color: var(--text-muted); }
    .py-md { padding: var(--space-md, 12px) 0; }
  `]
})
export class RiskHeatmapCellDetailComponent {
  public i18n = inject(I18nService);

  /** Dialog visibility */
  @Input() visible = false;

  /** Dialog header text */
  @Input() dialogHeader = '';

  /** Cell metadata (likelihood, impact) */
  @Input() cellMeta: { likelihood: number; impact: number } | null = null;

  /** Risks in the selected cell */
  @Input() risks: Array<Record<string, any>> = [];

  /** Localized labels bag */
  @Input() labels: Record<string, string> = {};

  /** Emitted when dialog is closed */
  @Output() closed = new EventEmitter<void>();

  /** Emitted when a risk row is clicked */
  @Output() riskClick = new EventEmitter<string>();

  /** Emitted when "View All in Register" is clicked */
  @Output() viewAllInRegister = new EventEmitter<void>();

  /** Color for a heatmap cell (used in badge) */
  cellColor(impact: number, likelihood: number): string {
    const score = impact * likelihood;
    if (score >= 20) return 'rgba(var(--module-accent-red-rgb), .28)';
    if (score >= 15) return 'rgba(var(--module-accent-amber-rgb), .28)';
    if (score >= 10) return 'rgba(var(--module-accent-yellow-rgb), .22)';
    if (score >= 5) return 'rgba(var(--module-accent-green-rgb), .18)';
    return 'rgba(var(--module-accent-green-rgb), .08)';
  }

  /** Score CSS class for the drill-down table */
  scoreClass(score: number | null | undefined): string {
    if (score == null) return 'score-chip';
    if (score >= 20) return 'score-chip score-critical';
    if (score >= 15) return 'score-chip score-high';
    if (score >= 10) return 'score-chip score-medium';
    return 'score-chip score-low';
  }

  /** Treatment status CSS class */
  treatmentClass(status: string): string {
    const normalized = (status || '').toLowerCase().replace(/\s+/g, '_');
    return `treatment-chip treatment-${normalized}`;
  }
}

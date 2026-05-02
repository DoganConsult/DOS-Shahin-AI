import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';

/** Score history entry model */
export interface ScoreHistoryEntry {
  date: string;
  likelihood: number;
  impact: number;
  inherentScore: number;
  residualScore: number;
  scorer?: string;
}

/**
 * Presentational component: Score history dialog showing a table of
 * historical risk assessments with likelihood, impact, and scores.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-score-history',
    imports: [CommonModule, DialogModule, TableModule],
    template: `
    <p-dialog [header]="labels.scoreHistory" [(visible)]="visible" [modal]="true" [style]="{width:'700px'}" (onHide)="closed.emit()">
      <p-table [value]="rows" styleClass="p-datatable-sm p-datatable-striped" *ngIf="rows.length > 0">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ labels.date }}</th>
            <th>{{ labels.likelihood }}</th>
            <th>{{ labels.impact }}</th>
            <th>{{ labels.inherentScore }}</th>
            <th>{{ labels.residualScore }}</th>
            <th>{{ labels.scorer }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-h>
          <tr>
            <td>{{ h.date }}</td>
            <td><span class="score-badge" [class]="likelihoodClass(h.likelihood)">{{ h.likelihood }}</span></td>
            <td><span class="score-badge" [class]="impactClass(h.impact)">{{ h.impact }}</span></td>
            <td><span class="score-badge" [class]="scoreClass(h.inherentScore)">{{ h.inherentScore }}</span></td>
            <td><span class="score-badge" [class]="scoreClass(h.residualScore)">{{ h.residualScore }}</span></td>
            <td>{{ h.scorer || '\u2014' }}</td>
          </tr>
        </ng-template>
      </p-table>
      <div *ngIf="rows.length === 0" class="empty-section">
        <i class="pi pi-history"></i>
        <p>{{ labels.noHistory }}</p>
      </div>
    </p-dialog>
  `,
    styles: [`
    .score-badge { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: var(--radius-pill); font-size: var(--font-size-sm); font-weight: 700; }
    .score-badge.score-high { background: rgba(var(--color-red-600-rgb), .12); color: var(--error); }
    .score-badge.score-medium { background: rgba(var(--color-amber-600-rgb), .12); color: var(--warning); }
    .score-badge.score-low { background: rgba(var(--color-green-600-rgb), .12); color: var(--success); }
    .empty-section { text-align: center; padding: 24px 0; }
    .empty-section i { font-size: var(--font-size-5xl); color: var(--text-muted); margin-bottom: var(--space-md, 12px); display: block; }
    .empty-section p { color: var(--text-muted); }
  `]
})
export class RiskScoreHistoryComponent {
  public i18n = inject(I18nService);

  /** Dialog visibility */
  @Input() visible = false;

  /** History rows to display */
  @Input() rows: ScoreHistoryEntry[] = [];

  /** Localized labels bag */
  @Input() labels: Record<string, string> = {};

  /** Emitted when dialog is closed */
  @Output() closed = new EventEmitter<void>();

  /** Score CSS class helpers */
  scoreClass(score: number): string { return score >= 20 ? 'score-high' : score >= 12 ? 'score-medium' : 'score-low'; }
  likelihoodClass(v: number): string { return v >= 4 ? 'score-high' : v >= 2 ? 'score-medium' : 'score-low'; }
  impactClass(v: number): string { return v >= 4 ? 'score-high' : v >= 2 ? 'score-medium' : 'score-low'; }
}

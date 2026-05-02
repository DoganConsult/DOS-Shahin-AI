import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

/** Workflow stage type for assessment rows */
export type WorkflowStage = 'unscored' | 'agent_reviewed' | 'human_pending' | 'finalized';

/** Row model for the assessment table */
export interface AssessmentRow {
  riskId: string;
  title: string;
  category: string;
  owner: string;
  likelihood: number;
  impact: number;
  inherentScore: number;
  residualScore: number;
  controlEffectiveness: number;
  status: string;
  lastAssessed: string;
  workflowStage: WorkflowStage;
  peerReviewId?: string;
}

/** Workflow stage EN/AR labels */
const WORKFLOW_LABELS_EN: Record<WorkflowStage, string> = {
  unscored: 'Unscored', agent_reviewed: 'Agent Reviewed', human_pending: 'Human Pending', finalized: 'Finalized',
};
const WORKFLOW_LABELS_AR: Record<WorkflowStage, string> = {
  unscored: '\u063A\u064A\u0631 \u0645\u0642\u064A\u0651\u0645', agent_reviewed: '\u0631\u0627\u062C\u0639\u0647 \u0627\u0644\u0648\u0643\u064A\u0644',
  human_pending: '\u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0644\u0645\u0631\u0627\u062C\u0639', finalized: '\u0645\u0639\u062A\u0645\u062F',
};

/**
 * Presentational component: renders the risk assessment data table with
 * score badges, effectiveness bars, workflow stage pills, and delta column.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-assessment-table',
    imports: [CommonModule, TableModule, ButtonModule, TooltipModule, StatusBadgeComponent],
    template: `
    <p-table aria-label="Data table"
      [value]="rows"
      [rows]="20"
      [paginator]="true"
      [globalFilterFields]="['title','category','owner','status','workflowStage']"
      styleClass="p-datatable-sm p-datatable-striped"
      *ngIf="rows.length > 0">
      <ng-template pTemplate="header">
        <tr>
          <th pSortableColumn="riskId">ID <p-sortIcon field="riskId" /></th>
          <th pSortableColumn="title">{{ labels.risk }} <p-sortIcon field="title" /></th>
          <th pSortableColumn="category">{{ labels.category }} <p-sortIcon field="category" /></th>
          <th pSortableColumn="owner">{{ labels.owner }} <p-sortIcon field="owner" /></th>
          <th pSortableColumn="likelihood">{{ labels.likelihood }} <p-sortIcon field="likelihood" /></th>
          <th pSortableColumn="impact">{{ labels.impact }} <p-sortIcon field="impact" /></th>
          <th pSortableColumn="inherentScore">{{ labels.inherentScore }} <p-sortIcon field="inherentScore" /></th>
          <th pSortableColumn="residualScore">{{ labels.residualScore }} <p-sortIcon field="residualScore" /></th>
          <th pSortableColumn="controlEffectiveness">{{ labels.controlEff }} <p-sortIcon field="controlEffectiveness" /></th>
          <th pSortableColumn="workflowStage">{{ labels.workflow }} <p-sortIcon field="workflowStage" /></th>
          <th pSortableColumn="status">{{ labels.status }} <p-sortIcon field="status" /></th>
          <th *ngIf="showDelta">{{ labels.delta }}</th>
          <th>{{ labels.actions }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-row>
        <tr>
          <td class="font-mono text-xs">{{ row.riskId }}</td>
          <td class="font-semibold">{{ row.title || '\u2014' }}</td>
          <td>{{ row.category || '\u2014' }}</td>
          <td>{{ row.owner || '\u2014' }}</td>
          <td><span class="score-badge" [class]="likelihoodClass(row.likelihood)">{{ row.likelihood }}</span></td>
          <td><span class="score-badge" [class]="impactClass(row.impact)">{{ row.impact }}</span></td>
          <td><span class="score-badge" [class]="scoreClass(row.inherentScore)">{{ row.inherentScore }}</span></td>
          <td><span class="score-badge" [class]="scoreClass(row.residualScore)">{{ row.residualScore }}</span></td>
          <td>
            <div class="eff-bar">
              <div class="eff-fill" [style.width.%]="row.controlEffectiveness" [class]="effClass(row.controlEffectiveness)"></div>
            </div>
            <span class="eff-pct">{{ row.controlEffectiveness }}%</span>
          </td>
          <td>
            <span class="workflow-badge" [class]="'wf-' + row.workflowStage">{{ workflowLabel(row.workflowStage) }}</span>
          </td>
          <td><app-status-badge [status]="row.status" /></td>
          <td *ngIf="showDelta">
            <span *ngIf="deltaMap[row.riskId] as d" class="delta-cell" [class.delta-up]="d.delta > 0" [class.delta-down]="d.delta < 0" [class.delta-zero]="d.delta === 0">
              <i class="pi" [ngClass]="{'pi-arrow-up': d.delta > 0, 'pi-arrow-down': d.delta < 0, 'pi-minus': d.delta === 0}"></i>
              {{ d.delta > 0 ? '+' : '' }}{{ d.delta }}
              <span class="delta-sub">{{ d.prevInherent }} &rarr; {{ d.currentInherent }}</span>
            </span>
            <span *ngIf="!deltaMap[row.riskId]" class="text-muted">&mdash;</span>
          </td>
          <td>
            <div class="row-actions">
              <button aria-label="Score risk" class="icon-btn" (click)="peerReview.emit(row)" [pTooltip]="labels.assess"><i class="pi pi-chart-line"></i></button>
              <button aria-label="View history" class="icon-btn" (click)="viewHistory.emit(row)" [pTooltip]="labels.viewHistory" *ngIf="showDelta"><i class="pi pi-history"></i></button>
            </div>
          </td>
        </tr>
      </ng-template>
    </p-table>

    <div *ngIf="rows.length === 0" class="empty-section">
      <i class="pi pi-clipboard"></i>
      <p>{{ labels.emptyMsg }}</p>
      <p-button [label]="labels.addAssessment" icon="pi pi-plus" (onClick)="addAssessment.emit()" />
    </div>
  `,
    styles: [`
    .font-mono { font-family: monospace; }
    .font-semibold { font-weight: 600; }
    .text-xs { font-size: var(--font-size-sm); }
    .text-muted { color: var(--text-muted); }
    .score-badge { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: var(--radius-pill); font-size: var(--font-size-sm); font-weight: 700; }
    .score-badge.score-high { background: rgba(var(--color-red-600-rgb), .12); color: var(--error); }
    .score-badge.score-medium { background: rgba(var(--color-amber-600-rgb), .12); color: var(--warning); }
    .score-badge.score-low { background: rgba(var(--color-green-600-rgb), .12); color: var(--success); }
    .eff-bar { width: 80px; height: 6px; background: var(--surface-border, var(--border-subtle)); border-radius: var(--radius-xs); overflow: hidden; display: inline-block; vertical-align: middle; margin-inline-end: 6px; }
    .eff-fill { height: 100%; border-radius: var(--radius-xs); transition: width .3s; }
    .eff-fill.eff-high { background: var(--success); }
    .eff-fill.eff-medium { background: var(--warning); }
    .eff-fill.eff-low { background: var(--error); }
    .eff-pct { font-size: var(--font-size-sm); color: var(--text-muted); vertical-align: middle; }
    .workflow-badge { display: inline-block; padding: 3px 10px; border-radius: var(--radius-pill); font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; letter-spacing: .3px; white-space: nowrap; }
    .wf-unscored { background: var(--surface-200, #e5e7eb); color: var(--text-muted, #6b7280); }
    .wf-agent_reviewed { background: rgba(var(--module-accent-indigo-rgb), .12); color: #6366f1; }
    .wf-human_pending { background: rgba(var(--module-accent-amber-rgb), .12); color: var(--warning, #d97706); }
    .wf-finalized { background: rgba(var(--color-green-600-rgb), .12); color: var(--success, #16a34a); }
    .delta-cell { display: inline-flex; align-items: center; gap: 4px; font-weight: 600; font-size: var(--font-size-sm); }
    .delta-cell.delta-up { color: var(--error); }
    .delta-cell.delta-down { color: var(--success); }
    .delta-cell.delta-zero { color: var(--text-muted); }
    .delta-sub { font-weight: 400; font-size: var(--font-size-xs); color: var(--text-muted); margin-inline-start: 4px; }
    .row-actions { display: flex; gap: var(--space-xs, 4px); }
    .icon-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px 6px; border-radius: var(--radius-sm, 4px); transition: all 150ms; font-size: var(--font-size-base); }
    .icon-btn:hover { background: var(--surface-ice, rgba(var(--color-black-rgb), .05)); color: var(--primary); }
    .empty-section { text-align: center; padding: var(--space-2xl, 32px); }
    .empty-section i { font-size: var(--font-size-5xl); color: var(--text-muted); margin-bottom: var(--space-md, 12px); display: block; }
    .empty-section p { color: var(--text-muted); margin-bottom: var(--space-md, 12px); }
  `]
})
export class RiskAssessmentTableComponent {
  private i18n = inject(I18nService);

  /** Assessment rows to render */
  @Input() rows: AssessmentRow[] = [];

  /** Whether to show the delta column */
  @Input() showDelta = false;

  /** Delta data keyed by riskId */
  @Input() deltaMap: Record<string, { prevInherent: number; currentInherent: number; delta: number }> = {};

  /** Localized labels bag */
  @Input() labels: Record<string, string> = {};

  /** Emitted when peer review / score action is clicked */
  @Output() peerReview = new EventEmitter<AssessmentRow>();

  /** Emitted when view history action is clicked */
  @Output() viewHistory = new EventEmitter<AssessmentRow>();

  /** Emitted when add assessment is clicked from empty state */
  @Output() addAssessment = new EventEmitter<void>();

  /** Score CSS class helpers */
  scoreClass(score: number): string { return score >= 20 ? 'score-high' : score >= 12 ? 'score-medium' : 'score-low'; }
  likelihoodClass(v: number): string { return v >= 4 ? 'score-high' : v >= 2 ? 'score-medium' : 'score-low'; }
  impactClass(v: number): string { return v >= 4 ? 'score-high' : v >= 2 ? 'score-medium' : 'score-low'; }
  effClass(pct: number): string { return pct >= 70 ? 'eff-high' : pct >= 40 ? 'eff-medium' : 'eff-low'; }

  /** Workflow stage label (EN/AR) */
  workflowLabel(stage: WorkflowStage): string {
    const labels = this.i18n.isAr() ? WORKFLOW_LABELS_AR : WORKFLOW_LABELS_EN;
    return labels[stage] || stage;
  }
}

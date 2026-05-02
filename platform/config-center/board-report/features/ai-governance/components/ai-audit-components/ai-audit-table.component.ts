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
import { TooltipModule } from 'primeng/tooltip';
import { TabViewModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface AiRun {
  run_id: string;
  started_at: string;
  completed_at?: string;
  status: string;
  summary?: string;
}

export interface AiSignal {
  id: string;
  signal_type: string;
  severity: string;
  status: string;
  source_module: string;
  detected_at: string;
}

export interface AiIssue {
  id: string;
  issue_type: string;
  severity: string;
  status: string;
  description?: string;
  created_at: string;
}

export interface AiRecommendation {
  id: string;
  recommendation_text: string;
  status: string;
  priority: string;
  created_at: string;
}

export interface ScoreExplanation {
  score?: number;
  explanation?: string;
  breakdown?: Record<string, unknown>;
  [key: string]: unknown;
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
    selector: 'app-ai-audit-table',
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        TagModule,
        ButtonModule,
        DropdownModule,
        TooltipModule,
        TabViewModule,
        CardModule,
        ProgressSpinnerModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <p-tabView>

      <!-- 1. Run History -->
      <p-tabPanel [header]="i18n.translate('ai.audit.runHistory')">
        <p-table
          [value]="runs"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 25, 50]"
          styleClass="p-datatable-sm p-datatable-striped"
          responsiveLayout="scroll">
          <ng-template pTemplate="header">
            <tr>
              <th>{{ i18n.translate('ai.audit.runId') }}</th>
              <th>{{ i18n.translate('ai.audit.startedAt') }}</th>
              <th>{{ i18n.translate('ai.audit.completedAt') }}</th>
              <th>{{ i18n.translate('ai.audit.status') }}</th>
              <th>{{ i18n.translate('ai.audit.summary') }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-run>
            <tr>
              <td class="mono">{{ run.run_id }}</td>
              <td>{{ run.started_at | date:'medium' }}</td>
              <td>{{ run.completed_at ? (run.completed_at | date:'medium') : '--' }}</td>
              <td><p-tag [value]="run.status" [severity]="getRunStatusSeverity(run.status)" /></td>
              <td>{{ run.summary || '--' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="5" class="text-center text-muted">{{ i18n.translate('ai.audit.noRuns') }}</td></tr>
          </ng-template>
        </p-table>
      </p-tabPanel>

      <!-- 2. Signals -->
      <p-tabPanel [header]="i18n.translate('ai.audit.signals')">
        <div class="filter-row">
          <p-dropdown
            [options]="signalStatusOptions"
            [(ngModel)]="signalStatusFilter"
            (onChange)="signalFilterChanged.emit()"
            [placeholder]="i18n.translate('ai.audit.filterByStatus')"
            [showClear]="true"
            styleClass="filter-dropdown" />
          <p-dropdown
            [options]="signalSeverityOptions"
            [(ngModel)]="signalSeverityFilter"
            (onChange)="signalFilterChanged.emit()"
            [placeholder]="i18n.translate('ai.audit.filterBySeverity')"
            [showClear]="true"
            styleClass="filter-dropdown" />
        </div>
        <p-table
          [value]="filteredSignals"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 25, 50]"
          styleClass="p-datatable-sm p-datatable-striped"
          responsiveLayout="scroll"
          selectionMode="single"
          (onRowSelect)="signalSelect.emit($event)">
          <ng-template pTemplate="header">
            <tr>
              <th>{{ i18n.translate('ai.audit.signalType') }}</th>
              <th>{{ i18n.translate('ai.audit.severity') }}</th>
              <th>{{ i18n.translate('ai.audit.status') }}</th>
              <th>{{ i18n.translate('ai.audit.sourceModule') }}</th>
              <th>{{ i18n.translate('ai.audit.detectedAt') }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-sig>
            <tr [pSelectableRow]="sig" class="cursor-pointer">
              <td>{{ sig.signal_type }}</td>
              <td><p-tag [value]="sig.severity" [severity]="getSeverityTag(sig.severity)" /></td>
              <td><p-tag [value]="sig.status" [severity]="getStatusTag(sig.status)" /></td>
              <td>{{ sig.source_module }}</td>
              <td>{{ sig.detected_at | date:'medium' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="5" class="text-center text-muted">{{ i18n.translate('ai.audit.noSignals') }}</td></tr>
          </ng-template>
        </p-table>
      </p-tabPanel>

      <!-- 3. Issues -->
      <p-tabPanel [header]="i18n.translate('ai.audit.issues')">
        <p-table
          [value]="issues"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 25, 50]"
          styleClass="p-datatable-sm p-datatable-striped"
          responsiveLayout="scroll">
          <ng-template pTemplate="header">
            <tr>
              <th>{{ i18n.translate('ai.audit.issueType') }}</th>
              <th>{{ i18n.translate('ai.audit.severity') }}</th>
              <th>{{ i18n.translate('ai.audit.status') }}</th>
              <th>{{ i18n.translate('ai.audit.description') }}</th>
              <th>{{ i18n.translate('ai.audit.createdAt') }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-issue>
            <tr>
              <td>{{ issue.issue_type }}</td>
              <td><p-tag [value]="issue.severity" [severity]="getSeverityTag(issue.severity)" /></td>
              <td><p-tag [value]="issue.status" [severity]="getStatusTag(issue.status)" /></td>
              <td>{{ issue.description || '--' }}</td>
              <td>{{ issue.created_at | date:'medium' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="5" class="text-center text-muted">{{ i18n.translate('ai.audit.noIssues') }}</td></tr>
          </ng-template>
        </p-table>
      </p-tabPanel>

      <!-- 4. Recommendations -->
      <p-tabPanel [header]="i18n.translate('ai.audit.recommendations')">
        <div class="filter-row">
          <p-dropdown
            [options]="recStatusOptions"
            [(ngModel)]="recStatusFilter"
            (onChange)="recFilterChanged.emit()"
            [placeholder]="i18n.translate('ai.audit.filterByStatus')"
            [showClear]="true"
            styleClass="filter-dropdown" />
        </div>
        <p-table
          [value]="filteredRecommendations"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 25, 50]"
          styleClass="p-datatable-sm p-datatable-striped"
          responsiveLayout="scroll">
          <ng-template pTemplate="header">
            <tr>
              <th>{{ i18n.translate('ai.audit.recommendationText') }}</th>
              <th>{{ i18n.translate('ai.audit.status') }}</th>
              <th>{{ i18n.translate('ai.audit.priority') }}</th>
              <th>{{ i18n.translate('ai.audit.createdAt') }}</th>
              <th>{{ i18n.translate('ai.audit.actions') }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-rec>
            <tr>
              <td class="rec-text">{{ rec.recommendation_text }}</td>
              <td><p-tag [value]="rec.status" [severity]="getStatusTag(rec.status)" /></td>
              <td><p-tag [value]="rec.priority" [severity]="getPrioritySeverity(rec.priority)" /></td>
              <td>{{ rec.created_at | date:'medium' }}</td>
              <td class="action-cell">
                <button
                  *ngIf="rec.status === 'pending' || rec.status === 'open'"
                  pButton
                  icon="pi pi-check"
                  class="p-button-sm p-button-success p-button-text"
                  [pTooltip]="i18n.translate('ai.audit.accept')"
                  [loading]="acceptingId === rec.id"
                  (click)="accept.emit(rec)">
                </button>
                <button
                  *ngIf="rec.status === 'pending' || rec.status === 'open'"
                  pButton
                  icon="pi pi-times"
                  class="p-button-sm p-button-danger p-button-text"
                  [pTooltip]="i18n.translate('ai.audit.reject')"
                  (click)="reject.emit(rec)">
                </button>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td colspan="5" class="text-center text-muted">{{ i18n.translate('ai.audit.noRecommendations') }}</td></tr>
          </ng-template>
        </p-table>
      </p-tabPanel>

      <!-- 5. Score & Full Cycle -->
      <p-tabPanel [header]="i18n.translate('ai.audit.scoreCycle')">
        <div class="score-section">
          <p-card [header]="i18n.translate('ai.audit.scoreExplanation')" styleClass="score-card">
            <div *ngIf="scoreLoading" class="dialog-spinner">
              <p-progressSpinner strokeWidth="3" />
            </div>
            <div *ngIf="!scoreLoading && scoreExplanation">
              <div *ngIf="scoreExplanation.score !== undefined" class="score-value">
                <span class="score-number">{{ scoreExplanation.score }}</span>
                <span class="score-label">/ 100</span>
              </div>
              <p *ngIf="scoreExplanation.explanation" class="score-explanation-text">
                {{ scoreExplanation.explanation }}
              </p>
              <div *ngIf="scoreExplanation.breakdown" class="breakdown-grid">
                <div *ngFor="let item of breakdownEntries" class="breakdown-item">
                  <span class="breakdown-label">{{ item[0] }}</span>
                  <span class="breakdown-value">{{ item[1] }}</span>
                </div>
              </div>
            </div>
            <div *ngIf="!scoreLoading && !scoreExplanation" class="text-muted">
              {{ i18n.translate('ai.audit.noScore') }}
            </div>
          </p-card>
          <div class="cycle-action" *ngIf="canRunCycle">
            <button
              pButton
              [label]="i18n.translate('ai.audit.runFullCycle')"
              icon="pi pi-play"
              class="p-button-lg"
              [loading]="cycleRunning"
              (click)="runCycle.emit()">
            </button>
            <p class="cycle-hint">{{ i18n.translate('ai.audit.cycleHint') }}</p>
          </div>
        </div>
      </p-tabPanel>

    </p-tabView>
  `,
    styles: [`
    .filter-row { display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
    :host .filter-dropdown { min-width: 200px; }
    .mono { font-family: 'Fira Code', 'Consolas', monospace; font-size: var(--font-size-tag); }
    .cursor-pointer { cursor: pointer; }
    .text-center { text-align: center; }
    .text-muted { color: var(--text-color-secondary, #6c757d); }
    .rec-text { max-width: 400px; white-space: normal; line-height: 1.4; }
    .action-cell { display: flex; gap: 0.25rem; }
    .dialog-spinner { display: flex; justify-content: center; padding: 2rem; }
    .score-section { display: flex; flex-direction: column; gap: 1.5rem; max-width: 700px; }
    :host .score-card .p-card-body { padding: 1.5rem; }
    .score-value { display: flex; align-items: baseline; gap: 0.25rem; margin-bottom: 1rem; }
    .score-number { font-size: var(--font-size-6xl); font-weight: 700; color: var(--primary-color); }
    .score-label { font-size: var(--font-size-xl); color: var(--text-color-secondary); }
    .score-explanation-text { line-height: 1.6; margin-bottom: 1rem; }
    .breakdown-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; }
    .breakdown-item {
      display: flex; justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: var(--surface-50, #f8f9fa);
      border-radius: var(--radius-sm);
    }
    .breakdown-label { font-weight: 500; }
    .breakdown-value { font-weight: 600; color: var(--primary-color); }
    .cycle-action { display: flex; flex-direction: column; align-items: flex-start; gap: 0.5rem; }
    .cycle-hint { font-size: var(--font-size-tag); color: var(--text-color-secondary); margin: 0; }
  `]
})
export class AiAuditTableComponent {
  readonly i18n = inject(I18nService);

  // ── Data Inputs ─────────────────────────────────────────────────────────────

  @Input() runs: AiRun[] = [];
  @Input() filteredSignals: AiSignal[] = [];
  @Input() issues: AiIssue[] = [];
  @Input() filteredRecommendations: AiRecommendation[] = [];
  @Input() scoreExplanation: ScoreExplanation | null = null;
  @Input() scoreLoading = false;
  @Input() breakdownEntries: [string, unknown][] = [];

  // ── Filter state (two-way via parent) ───────────────────────────────────────

  @Input() signalStatusOptions: { label: string; value: string }[] = [];
  @Input() signalSeverityOptions: { label: string; value: string }[] = [];
  @Input() recStatusOptions: { label: string; value: string }[] = [];

  signalStatusFilter: string | null = null;
  signalSeverityFilter: string | null = null;
  recStatusFilter: string | null = null;

  // ── Action state ────────────────────────────────────────────────────────────

  @Input() acceptingId: string | null = null;
  @Input() canRunCycle = false;
  @Input() cycleRunning = false;

  // ── Outputs ─────────────────────────────────────────────────────────────────

  @Output() signalSelect = new EventEmitter<any>();
  @Output() signalFilterChanged = new EventEmitter<void>();
  @Output() recFilterChanged = new EventEmitter<void>();
  @Output() accept = new EventEmitter<AiRecommendation>();
  @Output() reject = new EventEmitter<AiRecommendation>();
  @Output() runCycle = new EventEmitter<void>();

  // ── Severity helpers ────────────────────────────────────────────────────────

  getRunStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | undefined {
    switch (status) {
      case 'completed': return 'success';
      case 'running': case 'in_progress': return 'info';
      case 'failed': case 'error': return 'danger';
      case 'pending': case 'queued': return 'warning';
      default: return undefined;
    }
  }

  getSeverityTag(severity: string): 'success' | 'info' | 'warning' | 'danger' | undefined {
    switch (severity) {
      case 'critical': case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'info';
      case 'info': return 'success';
      default: return undefined;
    }
  }

  getStatusTag(status: string): 'success' | 'info' | 'warning' | 'danger' | undefined {
    switch (status) {
      case 'resolved': case 'accepted': return 'success';
      case 'open': case 'pending': return 'warning';
      case 'dismissed': case 'rejected': return 'danger';
      default: return 'info';
    }
  }

  getPrioritySeverity(priority: string): 'success' | 'info' | 'warning' | 'danger' | undefined {
    switch (priority) {
      case 'critical': case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return undefined;
    }
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { WorkflowApiService } from '@app/features/workflow/services/workflow-api.service';
import type { WorkflowDiagnosticsContract, ExecutionHistoryEntry } from '../contracts/workflow.contracts';

/** A compensation/rollback record from the workflow engine. */
interface CompensationRecord {
  executionId: string;
  status: 'completed' | 'partial' | 'failed';
  stepsReversed: number;
  totalSteps: number;
  triggeredAt: string;
  reason: string;
}

/** An approver with pending work in the approval queue. */
interface ApprovalBottleneck {
  approverId: string;
  approverName: string;
  pendingCount: number;
  oldestPendingSince: string;
  avgDecisionHours: number;
}

/** A failed workflow execution eligible for retry. */
interface FailedExecution {
  id: string;
  workflowId: string;
  failedStep: string;
  failedAt: string;
  errorMessage: string;
  retryCount: number;
}

/** A dead letter queue entry for unprocessable workflow events. */
interface DeadLetterEntry {
  id: string;
  eventType: string;
  sourceExecutionId: string;
  failedAt: string;
  errorMessage: string;
  retryAttempts: number;
}

/**
 * WorkflowDiagnostics - Diagnostic panel for workflow engine troubleshooting.
 *
 * Displays health checks, compensation/rollback history, approval bottlenecks,
 * failed executions with retry, execution trace timelines, and the dead letter queue.
 *
 * Part of the Workflow module (MP-02).
 */
@Component({
  selector: 'app-workflow-diagnostics',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule],
  template: `
    <div class="workflow-diagnostics">
      <h2>Workflow Diagnostics</h2>

      <!-- ═══ Diagnostic Checks ═══ -->
      <section class="diag-section">
        <h3>Diagnostic Checks</h3>
        <div *ngIf="loading()" class="loading-indicator">
          <i class="pi pi-spin pi-spinner"></i> Running diagnostics...
        </div>
        <div *ngIf="error()" class="diag-error" role="alert">
          <i class="pi pi-exclamation-triangle"></i> {{ error() }}
        </div>
        <div *ngIf="result()">
          <div class="diag-status-banner" [class.healthy]="result()!.healthy" [class.unhealthy]="!result()!.healthy">
            <i class="pi" [ngClass]="result()!.healthy ? 'pi-check-circle' : 'pi-times-circle'"></i>
            <span><strong>Status:</strong> {{ result()!.healthy ? 'Healthy' : 'Unhealthy' }}</span>
            <span class="diag-checked-at">Checked: {{ result()!.checkedAt | date:'medium' }}</span>
          </div>
          <table class="diag-table" *ngIf="result()!.checks.length">
            <thead>
              <tr><th>Check</th><th>Result</th><th>Detail</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let check of result()!.checks">
                <td>{{ check.name }}</td>
                <td><p-tag [value]="check.passed ? 'PASS' : 'FAIL'" [severity]="check.passed ? 'success' : 'danger'" /></td>
                <td>{{ check.detail || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ═══ Compensation / Rollback Viewer ═══ -->
      <section class="diag-section">
        <h3>Recent Compensations / Rollbacks</h3>
        <div class="empty-state" *ngIf="compensations().length === 0 && !loading()">
          <i class="pi pi-check-circle"></i>
          <p>No recent compensations or rollbacks.</p>
        </div>
        <table class="diag-table" *ngIf="compensations().length > 0">
          <thead>
            <tr>
              <th>Execution</th>
              <th>Status</th>
              <th>Steps Reversed</th>
              <th>Triggered At</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let comp of compensations()">
              <td><code>{{ comp.executionId | slice:0:12 }}...</code></td>
              <td>
                <p-tag
                  [value]="comp.status"
                  [severity]="comp.status === 'completed' ? 'success' : comp.status === 'partial' ? 'warning' : 'danger'"
                />
              </td>
              <td>{{ comp.stepsReversed }}/{{ comp.totalSteps }}</td>
              <td>{{ comp.triggeredAt | date:'short' }}</td>
              <td class="cell-truncate">{{ comp.reason }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- ═══ Approval Bottleneck Analysis ═══ -->
      <section class="diag-section">
        <h3>Approval Bottlenecks</h3>
        <div class="empty-state" *ngIf="bottlenecks().length === 0 && !loading()">
          <i class="pi pi-thumbs-up"></i>
          <p>No approval bottlenecks detected.</p>
        </div>
        <table class="diag-table" *ngIf="bottlenecks().length > 0">
          <thead>
            <tr>
              <th>Approver</th>
              <th>Pending</th>
              <th>Oldest Pending Since</th>
              <th>Avg Decision (hrs)</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let b of bottlenecks()">
              <td>{{ b.approverName }}</td>
              <td>
                <span class="bottleneck-count" [class.critical]="b.pendingCount >= 10">
                  {{ b.pendingCount }}
                </span>
              </td>
              <td>{{ b.oldestPendingSince | date:'short' }}</td>
              <td>{{ b.avgDecisionHours | number:'1.1-1' }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- ═══ Failed Executions ═══ -->
      <section class="diag-section">
        <h3>
          Failed Executions
          <span class="section-count" *ngIf="failedExecutions().length">{{ failedExecutions().length }}</span>
        </h3>
        <div class="empty-state" *ngIf="failedExecutions().length === 0 && !loading()">
          <i class="pi pi-check-circle"></i>
          <p>No failed executions.</p>
        </div>
        <table class="diag-table" *ngIf="failedExecutions().length > 0">
          <thead>
            <tr>
              <th>Execution</th>
              <th>Workflow</th>
              <th>Failed Step</th>
              <th>Error</th>
              <th>Retries</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let exec of failedExecutions()">
              <td><code>{{ exec.id | slice:0:12 }}...</code></td>
              <td>{{ exec.workflowId }}</td>
              <td>{{ exec.failedStep }}</td>
              <td class="cell-truncate">{{ exec.errorMessage }}</td>
              <td>{{ exec.retryCount }}</td>
              <td>
                <button pButton icon="pi pi-refresh" class="p-button-sm p-button-outlined p-button-warning"
                  label="Retry" (click)="onRetryFailed(exec)"
                  [loading]="retryingId() === exec.id"></button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- ═══ Execution Trace Viewer ═══ -->
      <section class="diag-section">
        <h3>Execution Trace</h3>
        <div class="trace-selector">
          <label class="trace-label">Execution ID:</label>
          <input type="text" class="trace-input" [value]="traceExecutionId()"
            (input)="onTraceIdInput($event)" placeholder="Enter execution ID..." />
          <button pButton icon="pi pi-search" class="p-button-sm" label="Load Trace"
            (click)="onLoadTrace()" [disabled]="!traceExecutionId()" [loading]="traceLoading()"></button>
        </div>
        <div class="empty-state" *ngIf="traceEntries().length === 0 && !traceLoading()">
          <i class="pi pi-sitemap"></i>
          <p>Enter an execution ID to view the step timeline.</p>
        </div>
        <div class="trace-timeline" *ngIf="traceEntries().length > 0">
          <div *ngFor="let entry of traceEntries(); let i = index" class="trace-entry">
            <div class="trace-connector">
              <div class="trace-dot" [class.trace-dot-transition]="entry.eventType === 'transition'"
                [class.trace-dot-error]="entry.eventType === 'error'"></div>
              <div class="trace-line" *ngIf="i < traceEntries().length - 1"></div>
            </div>
            <div class="trace-content">
              <div class="trace-header">
                <p-tag [value]="entry.eventType" [severity]="traceEventSeverity(entry.eventType)" />
                <span class="trace-time">{{ entry.occurredAt | date:'medium' }}</span>
              </div>
              <div class="trace-detail">
                <span *ngIf="entry.stepCode" class="trace-step">{{ entry.stepCode }}</span>
                <span *ngIf="entry.previousState && entry.newState" class="trace-transition">
                  {{ entry.previousState }} &rarr; {{ entry.newState }}
                </span>
                <span class="trace-actor">by {{ entry.triggeredBy }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══ Dead Letter Queue ═══ -->
      <section class="diag-section">
        <h3>
          Dead Letter Queue
          <span class="section-count" *ngIf="deadLetterQueue().length">{{ deadLetterQueue().length }}</span>
        </h3>
        <div class="empty-state" *ngIf="deadLetterQueue().length === 0 && !loading()">
          <i class="pi pi-inbox"></i>
          <p>Dead letter queue is empty.</p>
        </div>
        <table class="diag-table" *ngIf="deadLetterQueue().length > 0">
          <thead>
            <tr>
              <th>Event Type</th>
              <th>Source Execution</th>
              <th>Failed At</th>
              <th>Error</th>
              <th>Attempts</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let dle of deadLetterQueue()">
              <td><code>{{ dle.eventType }}</code></td>
              <td><code>{{ dle.sourceExecutionId | slice:0:12 }}...</code></td>
              <td>{{ dle.failedAt | date:'short' }}</td>
              <td class="cell-truncate">{{ dle.errorMessage }}</td>
              <td>{{ dle.retryAttempts }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  `,
  styles: [`
    .workflow-diagnostics {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      max-width: 1020px;
    }

    .workflow-diagnostics h2 {
      font-size: var(--font-size-xl, 1.25rem);
      font-weight: 700;
      color: var(--text-heading);
      margin: 0;
    }

    .diag-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem;
      border: 1px solid var(--border-subtle, #e5e7eb);
      border-radius: var(--radius, 6px);
      background: var(--surface-card, #fff);
    }

    .diag-section h3 {
      font-size: var(--font-size-body-md, 1rem);
      font-weight: 700;
      color: var(--text-heading);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .section-count {
      font-size: var(--font-size-xs, 0.75rem);
      font-weight: 600;
      background: var(--error, #c62828);
      color: #fff;
      padding: 0.1rem 0.4rem;
      border-radius: var(--radius-pill, 20px);
    }

    .loading-indicator {
      font-size: var(--font-size-body-sm, 0.875rem);
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .diag-error {
      background: rgba(239, 68, 68, 0.06);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: var(--radius, 6px);
      padding: 0.6rem 0.75rem;
      font-size: var(--font-size-body-sm, 0.875rem);
      color: var(--error, #c62828);
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    /* Status banner */
    .diag-status-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 0.75rem;
      border-radius: var(--radius, 6px);
      font-size: var(--font-size-body-sm, 0.875rem);
    }
    .diag-status-banner.healthy {
      background: rgba(36, 161, 72, 0.08);
      color: var(--success, #24a148);
    }
    .diag-status-banner.unhealthy {
      background: rgba(198, 40, 40, 0.08);
      color: var(--error, #c62828);
    }
    .diag-checked-at {
      margin-left: auto;
      font-size: var(--font-size-caption, 0.8rem);
      color: var(--text-muted);
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 1.5rem;
      color: var(--text-muted);
    }
    .empty-state i {
      font-size: 1.5rem;
      display: block;
      margin-bottom: 0.4rem;
    }
    .empty-state p {
      margin: 0;
      font-size: var(--font-size-body-sm, 0.875rem);
    }

    /* Tables */
    .diag-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--font-size-caption, 0.8rem);
    }
    .diag-table thead th {
      text-align: left;
      padding: 0.5rem 0.6rem;
      font-weight: 600;
      color: var(--text-heading);
      border-bottom: 2px solid var(--border-subtle, #e5e7eb);
      white-space: nowrap;
    }
    .diag-table tbody td {
      padding: 0.45rem 0.6rem;
      border-bottom: 1px solid var(--border-subtle, #e5e7eb);
      color: var(--text-body);
    }
    .diag-table tbody tr:last-child td {
      border-bottom: none;
    }
    .cell-truncate {
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Bottleneck count */
    .bottleneck-count {
      font-weight: 700;
      color: var(--text-heading);
    }
    .bottleneck-count.critical {
      color: var(--error, #c62828);
    }

    /* Trace viewer */
    .trace-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .trace-label {
      font-size: var(--font-size-caption, 0.8rem);
      font-weight: 600;
      color: var(--text-heading);
      white-space: nowrap;
    }
    .trace-input {
      flex: 1;
      padding: 0.4rem 0.6rem;
      border: 1px solid var(--border-subtle, #e5e7eb);
      border-radius: var(--radius-sm, 4px);
      font-size: var(--font-size-caption, 0.8rem);
      background: var(--surface-card, #fff);
      color: var(--text-body);
    }

    /* Timeline */
    .trace-timeline {
      display: flex;
      flex-direction: column;
      padding-left: 0.5rem;
    }
    .trace-entry {
      display: flex;
      gap: 0.75rem;
      min-height: 48px;
    }
    .trace-connector {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 16px;
      flex-shrink: 0;
    }
    .trace-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--primary, #0f62fe);
      flex-shrink: 0;
      margin-top: 4px;
    }
    .trace-dot-transition {
      background: var(--success, #24a148);
    }
    .trace-dot-error {
      background: var(--error, #c62828);
    }
    .trace-line {
      width: 2px;
      flex: 1;
      background: var(--border-subtle, #e5e7eb);
      margin: 2px 0;
    }
    .trace-content {
      flex: 1;
      padding-bottom: 0.75rem;
    }
    .trace-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .trace-time {
      font-size: var(--font-size-2xs, 0.7rem);
      color: var(--text-muted);
    }
    .trace-detail {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.2rem;
      font-size: var(--font-size-caption, 0.8rem);
      color: var(--text-secondary);
    }
    .trace-step {
      font-weight: 600;
      color: var(--text-heading);
    }
    .trace-transition {
      font-family: monospace;
      font-size: var(--font-size-2xs, 0.7rem);
      color: var(--primary, #0f62fe);
    }
    .trace-actor {
      font-size: var(--font-size-2xs, 0.7rem);
      color: var(--text-muted);
    }
  `],
})
export class WorkflowDiagnosticsComponent implements OnInit {
  private readonly api = inject(WorkflowApiService);

  /** Loading state for diagnostics. */
  loading = signal(false);

  /** Global error message. */
  error = signal<string | null>(null);

  /** Diagnostics result from the engine. */
  result = signal<WorkflowDiagnosticsContract | null>(null);

  /** Recent compensation/rollback records. */
  compensations = signal<CompensationRecord[]>([]);

  /** Approvers with pending approval backlogs. */
  bottlenecks = signal<ApprovalBottleneck[]>([]);

  /** Failed executions eligible for retry. */
  failedExecutions = signal<FailedExecution[]>([]);

  /** ID of the execution currently being retried. */
  retryingId = signal<string | null>(null);

  /** Execution ID entered for trace viewing. */
  traceExecutionId = signal('');

  /** Whether the trace is currently loading. */
  traceLoading = signal(false);

  /** Trace entries for the selected execution. */
  traceEntries = signal<ExecutionHistoryEntry[]>([]);

  /** Dead letter queue entries. */
  deadLetterQueue = signal<DeadLetterEntry[]>([]);

  ngOnInit(): void {
    this.loading.set(true);
    this.loadDiagnostics();
    this.loadFailedExecutions();
    this.loadPendingEscalationsAsBottlenecks();
  }

  /** Fetches diagnostic check results. */
  private loadDiagnostics(): void {
    this.api.getDiagnostics().subscribe({
      next: (data) => {
        this.result.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  /** Loads failed executions from the execution list. */
  private loadFailedExecutions(): void {
    this.api.getExecutions({ limit: 50 }).subscribe({
      next: (data) => {
        const failed = (data.executions || [])
          .filter(e => e.status === 'failed')
          .map(e => ({
            id: e.id,
            workflowId: e.workflowId,
            failedStep: 'unknown',
            failedAt: e.completedAt || e.startedAt,
            errorMessage: 'Execution failed',
            retryCount: 0,
          }));
        this.failedExecutions.set(failed);
      },
      error: () => { /* Non-critical; silently skip */ },
    });
  }

  /**
   * Uses pending escalations to approximate approval bottlenecks.
   * Groups by escalatedTo to identify approvers with the largest backlogs.
   */
  private loadPendingEscalationsAsBottlenecks(): void {
    this.api.getPendingEscalations().subscribe({
      next: (escalations) => {
        const byApprover = new Map<string, { count: number; oldest: string }>();
        for (const esc of escalations) {
          const existing = byApprover.get(esc.escalatedTo);
          if (existing) {
            existing.count++;
            if (esc.escalatedAt < existing.oldest) existing.oldest = esc.escalatedAt;
          } else {
            byApprover.set(esc.escalatedTo, { count: 1, oldest: esc.escalatedAt });
          }
        }
        const bottlenecks: ApprovalBottleneck[] = Array.from(byApprover.entries())
          .map(([approverId, data]) => ({
            approverId,
            approverName: approverId,
            pendingCount: data.count,
            oldestPendingSince: data.oldest,
            avgDecisionHours: 0,
          }))
          .sort((a, b) => b.pendingCount - a.pendingCount);
        this.bottlenecks.set(bottlenecks);
      },
      error: () => { /* Non-critical; silently skip */ },
    });
  }

  /** Retries a failed execution. */
  onRetryFailed(exec: FailedExecution): void {
    this.retryingId.set(exec.id);
    this.api.resumeWorkflow(exec.workflowId, exec.id).subscribe({
      next: () => {
        this.retryingId.set(null);
        this.loadFailedExecutions();
      },
      error: () => this.retryingId.set(null),
    });
  }

  /** Captures text input for the trace execution ID. */
  onTraceIdInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.traceExecutionId.set(input.value.trim());
  }

  /** Loads the execution trace for the entered execution ID. */
  onLoadTrace(): void {
    const id = this.traceExecutionId();
    if (!id) return;
    this.traceLoading.set(true);
    this.traceEntries.set([]);
    this.api.getExecutionHistory(id).subscribe({
      next: (data) => {
        this.traceEntries.set(data.entries || []);
        this.traceLoading.set(false);
      },
      error: () => {
        this.traceEntries.set([]);
        this.traceLoading.set(false);
      },
    });
  }

  /** Maps trace event types to PrimeNG tag severity. */
  traceEventSeverity(eventType: string): 'success' | 'info' | 'warning' | 'danger' {
    if (eventType === 'transition' || eventType === 'completed') return 'success';
    if (eventType === 'error' || eventType === 'failed') return 'danger';
    if (eventType === 'escalation' || eventType === 'warning') return 'warning';
    return 'info';
  }
}

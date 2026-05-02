import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { GrcRecord } from '../../models/onboarding.models';

/**
 * ActivationMilestones - Displays provisioning progress as user-facing milestones
 * with an optional collapsible technical step log underneath.
 *
 * Each milestone maps to one or more provisioning step_codes.
 * Status is derived from the underlying step statuses:
 *   - completed: all steps done
 *   - running: at least one step running or partially completed
 *   - queued: no steps started
 */
@Component({
    selector: 'app-activation-milestones',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, ButtonModule, ProgressBarModule, TagModule],
    template: `
    <div class="activation" [class.rtl]="lang === 'ar'">
      <!-- Live badge -->
      <div class="activation-live-badge" *ngIf="provJob?.job_status === 'running'">
        <span class="live-dot"></span>
        {{ lang === 'ar' ? 'جارٍ الآن' : 'LIVE' }}
      </div>

      <!-- Error banner -->
      <div class="activation-error" *ngIf="error" role="alert">
        <i class="pi pi-exclamation-triangle"></i>
        <span>{{ error }}</span>
        <span *ngIf="correlationId" class="activation-corr">ID: <code>{{ correlationId }}</code></span>
        <button pButton icon="pi pi-refresh" class="p-button-sm p-button-text" (click)="retryPoll.emit()"></button>
      </div>

      <!-- Job stats -->
      <div class="activation-stats" *ngIf="provJob">
        <div class="activation-stat">
          <i class="pi pi-clock"></i>
          <span>{{ lang === 'ar' ? 'الوقت' : 'Elapsed' }}: {{ elapsedTime }}</span>
        </div>
        <div class="activation-stat">
          <i class="pi pi-list"></i>
          <span>{{ completedSteps }}/{{ provSteps.length }} {{ lang === 'ar' ? 'خطوات' : 'steps' }}</span>
        </div>
        <p-tag [value]="provJob.job_status" [severity]="provJob.job_status === 'completed' ? 'success' : provJob.job_status === 'failed' ? 'danger' : 'info'" />
      </div>

      <!-- Milestones (primary layer) -->
      <div class="activation-milestones" *ngIf="milestones.length > 0">
        <div *ngFor="let ms of milestones; let i = index" class="milestone-row"
             [class.completed]="getMilestoneStatus(ms) === 'completed'"
             [class.running]="getMilestoneStatus(ms) === 'running'"
             [style.animation-delay]="(i * 100) + 'ms'">
          <span class="milestone-counter">{{ i + 1 }}/{{ milestones.length }}</span>
          <div class="milestone-icon">
            <i *ngIf="getMilestoneStatus(ms) === 'completed'" class="pi pi-check-circle"></i>
            <i *ngIf="getMilestoneStatus(ms) === 'running'" class="pi pi-spin pi-spinner"></i>
            <i *ngIf="getMilestoneStatus(ms) === 'queued'" class="pi pi-circle"></i>
          </div>
          <div class="milestone-info">
            <span class="milestone-label">
              <span *ngIf="getMilestoneStatus(ms) === 'running'" class="milestone-prefix">{{ lang === 'ar' ? 'شاهين يعمل على:' : 'Shahin is:' }} </span>
              {{ lang === 'ar' ? ms.milestone_label_ar : ms.milestone_label_en }}
            </span>
            <small class="milestone-progress">
              {{ getMilestoneCompletedSteps(ms) }}/{{ ms.step_codes?.length || 0 }}
              <span *ngIf="getMilestoneStatus(ms) === 'completed' && getMilestoneDuration(ms) > 0" class="milestone-dur"> &middot; {{ getMilestoneDuration(ms) | number:'1.1-1' }}s</span>
            </small>
            <small class="milestone-artifacts" *ngIf="getMilestoneStatus(ms) === 'completed' && ms.artifacts?.length">
              <span *ngFor="let art of ms.artifacts" class="artifact-badge">
                <span class="artifact-count" *ngIf="art.count">{{ art.count }}</span>
                {{ lang === 'ar' ? art.label_ar : art.label }}
              </span>
            </small>
          </div>
          <p-progressBar [value]="getMilestonePercent(ms)" [showValue]="false" [style]="{'height':'6px','width':'100px','border-radius':'3px'}" />
        </div>
      </div>

      <!-- Technical steps (collapsed by default) -->
      <div class="activation-tech">
        <button class="activation-tech-toggle" (click)="onToggleTechSteps()">
          <i class="pi" [ngClass]="showTechSteps() ? 'pi-chevron-up' : 'pi-chevron-down'"></i>
          {{ lang === 'ar' ? (showTechSteps() ? 'إخفاء سجل التهيئة' : 'عرض سجل التهيئة') : (showTechSteps() ? 'Hide provisioning log' : 'Show provisioning log') }}
          <span class="tech-hint">{{ lang === 'ar' ? '(للمستخدمين التقنيين)' : '(for technical users)' }}</span>
        </button>
        <!-- Temporal workflow status -->
        <div class="activation-temporal" *ngIf="showTechSteps() && temporalStatus">
          <i class="pi pi-server"></i>
          <span class="activation-temporal-label">{{ lang === 'ar' ? 'حالة سير العمل' : 'Workflow Status' }}:</span>
          <code>{{ temporalStatus.workflowId || temporalStatus.runId || '—' }}</code>
          <p-tag [value]="(temporalStatus.status || 'unknown') + ''" [severity]="temporalStatus.status === 'RUNNING' ? 'info' : temporalStatus.status === 'COMPLETED' ? 'success' : 'warning'" [style]="{fontSize:'0.65rem'}" />
        </div>
        <div class="activation-console" *ngIf="showTechSteps()">
          <div *ngFor="let step of provSteps" class="activation-step"
               [class.running]="step.status === 'running'"
               [class.completed]="step.status === 'completed'"
               [class.failed]="step.status === 'failed'">
            <div class="step-icon">
              <i *ngIf="step.status === 'queued'" class="pi pi-circle" style="color:var(--text-color-secondary)"></i>
              <i *ngIf="step.status === 'running'" class="pi pi-spin pi-spinner" style="color:var(--primary)"></i>
              <i *ngIf="step.status === 'completed'" class="pi pi-check-circle" style="color:var(--success)"></i>
              <i *ngIf="step.status === 'failed'" class="pi pi-times-circle" style="color:var(--error)"></i>
            </div>
            <div class="step-info">
              <span class="step-name">{{ step.step_name }}</span>
              <small *ngIf="step.duration_ms" class="step-dur">{{ step.duration_ms }}ms</small>
              <small *ngIf="step.error_message" class="step-err">{{ step.error_message }}</small>
            </div>
            <p-tag [value]="step.status" [severity]="stepSeverity(step.status)" />
            <button *ngIf="step.status === 'failed' && provJob?.job_status === 'failed'" pButton
              icon="pi pi-refresh" class="p-button-sm p-button-text p-button-warning"
              (click)="retryProvisioning.emit()"></button>
          </div>
        </div>
      </div>

      <!-- Event Log (shown in tech view when events available) -->
      <div class="activation-events" *ngIf="showTechSteps() && provisioningEvents.length > 0">
        <div class="activation-events-label">{{ lang === 'ar' ? 'سجل الأحداث' : 'Event Log' }}</div>
        <div *ngFor="let evt of provisioningEvents" class="activation-event-row">
          <span class="activation-event-time">{{ evt['created_at'] | date:'HH:mm:ss' }}</span>
          <span class="activation-event-type">{{ evt['event_type'] || evt['step_code'] || '—' }}</span>
          <span class="activation-event-msg">{{ evt['message'] || evt['detail'] || '' }}</span>
        </div>
      </div>

      <!-- Cancel button (shown while running) -->
      <div class="activation-cancel" *ngIf="provJob?.job_status === 'running'">
        <button pButton [text]="true" [label]="lang === 'ar' ? 'إلغاء التفعيل' : 'Cancel Activation'"
          icon="pi pi-times" severity="secondary" class="p-button-sm"
          (click)="cancelProvisioning.emit()"></button>
      </div>

      <!-- Failed state -->
      <div *ngIf="provJob?.job_status === 'failed'" class="activation-failed">
        <i class="pi pi-exclamation-circle"></i>
        <h3>{{ lang === 'ar' ? 'تم إيقاف التفعيل مؤقتاً — شاهين يحتاج انتباهك' : 'Activation paused \u2014 Shahin needs your attention' }}</h3>
        <button pButton [label]="lang === 'ar' ? 'إعادة المحاولة' : 'Retry'" icon="pi pi-refresh" severity="warning" (click)="retryProvisioning.emit()"></button>
      </div>
    </div>
  `,
    styles: [`
    .activation { padding: 0; }

    /* Live badge */
    .activation-live-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--success, #24a148);
      margin-bottom: 0.75rem;
    }

    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success, #24a148);
      animation: pulse-ring 1.5s ease-in-out infinite;
    }

    .activation-error {
      background: rgba(var(--module-accent-red-rgb), 0.06);
      border: 1px solid rgba(var(--module-accent-red-rgb), 0.2);
      border-radius: var(--radius);
      padding: 0.75rem 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
      font-size: var(--font-size-tag);
      color: var(--error);
    }

    .activation-corr { font-size: var(--font-size-sm); opacity: 0.7; }

    .activation-stats {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }

    .activation-stat {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: var(--font-size-tag);
      color: var(--text-body);
    }

    .activation-milestones {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-bottom: 1.5rem;
    }

    .milestone-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 0.75rem;
      border-radius: var(--radius);
      transition: background 200ms;
      animation: stagger-in 0.4s ease both;
    }

    .milestone-row.completed {
      background: rgba(var(--success-rgb), 0.04);
      animation: stagger-in 0.4s ease both, milestone-complete-flash 0.6s ease;
    }
    .milestone-row.running { background: rgba(var(--primary-rgb), 0.04); }

    .milestone-counter {
      font-size: 0.68rem; font-weight: 600; color: var(--text-muted, #6f6f6f);
      min-width: 28px; text-align: center; font-variant-numeric: tabular-nums;
    }
    .milestone-icon i { font-size: var(--font-size-body-md); }
    .milestone-row.completed .milestone-icon i { color: var(--onb-milestone-done, var(--success)); }
    .milestone-row.running .milestone-icon i { color: var(--onb-milestone-active, var(--primary)); }
    .milestone-row:not(.completed):not(.running) .milestone-icon i { color: var(--text-color-secondary); }

    .milestone-info { flex: 1; display: flex; flex-direction: column; }
    .milestone-label { font-size: 0.88rem; font-weight: 600; color: var(--text-heading); }
    .milestone-prefix { font-weight: 500; color: var(--primary, #0f62fe); font-size: var(--font-size-caption); }
    .milestone-progress { font-size: 0.72rem; color: var(--text-muted); }
    .milestone-dur { color: var(--status-success, #24a148); font-weight: 500; }
    .milestone-artifacts { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.2rem; }
    .artifact-badge {
      font-size: var(--font-size-2xs); font-weight: 600; color: var(--primary, #0f62fe);
      background: var(--onb-ai-pulse, rgba(var(--primary-rgb), 0.08));
      padding: 0.1rem 0.4rem; border-radius: var(--radius-pill, 20px);
    }
    .artifact-count { font-weight: 700; margin-inline-end: 0.15rem; }

    .activation-tech { margin-top: 0.5rem; }

    .activation-tech-toggle {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: var(--font-size-caption);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.35rem 0;
      font-weight: 500;
    }
    .activation-tech-toggle:hover { color: var(--text-heading); }

    .tech-hint {
      font-size: 0.68rem;
      font-weight: 400;
      color: var(--text-muted);
      opacity: 0.7;
      margin-inline-start: 0.25rem;
    }

    .activation-console {
      margin-top: 0.5rem;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
      overflow: hidden;
    }

    .activation-step {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.75rem;
      border-bottom: 1px solid var(--border-subtle);
      font-size: var(--font-size-caption);
    }
    .activation-step:last-child { border-bottom: none; }

    .step-info { flex: 1; }
    .step-name { color: var(--text-heading); font-weight: 500; }
    .step-dur { color: var(--text-muted); margin-left: 0.5rem; }
    .step-err { color: var(--error); display: block; }

    .activation-cancel { text-align: center; margin-top: 0.75rem; }
    .activation-temporal {
      display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.75rem;
      font-size: 0.72rem; color: var(--text-muted); margin-top: 0.35rem;
      background: var(--surface-ground); border-radius: var(--radius-sm, 4px);
    }
    .activation-temporal code { font-size: var(--font-size-2xs); font-family: monospace; color: var(--text-heading); }
    .activation-temporal-label { font-weight: 600; }
    .activation-failed { text-align: center; padding: 2rem 0; }
    .activation-failed i { font-size: var(--font-size-5xl); color: var(--error); margin-bottom: 0.5rem; }
    .activation-failed h3 { font-size: var(--font-size-md); color: var(--text-heading); margin: 0 0 1rem; }

    .rtl { direction: rtl; }

    @keyframes stagger-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes milestone-complete-flash {
      0%   { background: rgba(var(--success-rgb), 0.15); }
      100% { background: rgba(var(--success-rgb), 0.04); }
    }

    @keyframes pulse-ring {
      0%   { box-shadow: 0 0 0 0 rgba(var(--success-rgb), 0.5); }
      70%  { box-shadow: 0 0 0 6px rgba(var(--success-rgb), 0); }
      100% { box-shadow: 0 0 0 0 rgba(var(--success-rgb), 0); }
    }

    @media (prefers-reduced-motion: reduce) {
      .milestone-row {
        animation: none !important;
      }
      .live-dot {
        animation: none !important;
      }
    }
  `]
})
export class ActivationMilestonesComponent {
  /** Provisioning job object containing job_status */
  @Input() provJob: GrcRecord;

  /** Array of provisioning step objects with step_name, step_code, status, duration_ms, error_message */
  @Input() provSteps: GrcRecord[] = [];

  /** Array of milestone objects with milestone_label_en, milestone_label_ar, step_codes */
  @Input() milestones: GrcRecord[] = [];

  /** Elapsed provisioning time in seconds */
  @Input() elapsedSeconds: number = 0;

  /** Error message from polling or provisioning failure */
  @Input() error: string | null = null;

  /** Correlation ID for error diagnostics */
  @Input() correlationId: string | null = null;

  /** Active language for bilingual labels */
  @Input() lang: 'en' | 'ar' = 'en';

  /** Emitted when the user clicks to enter the workspace */
  @Output() enterWorkspace = new EventEmitter<void>();

  /** Emitted when the user requests a provisioning retry */
  @Output() retryProvisioning = new EventEmitter<void>();

  /** Emitted when the user requests a poll retry after a polling error */
  @Output() retryPoll = new EventEmitter<void>();

  /** Emitted when the user requests to cancel provisioning */
  @Output() cancelProvisioning = new EventEmitter<void>();

  /** Emitted when user expands the tech-log (to trigger temporal status fetch) */
  @Output() techLogExpanded = new EventEmitter<void>();

  /** Temporal workflow status data */
  @Input() temporalStatus: Record<string, any> | null = null;

  /** Provisioning event log entries */
  @Input() provisioningEvents: Record<string, unknown>[] = [];

  /** Whether the technical step log is visible */
  showTechSteps = signal(false);

  onToggleTechSteps(): void {
    this.showTechSteps.update(v => !v);
    if (this.showTechSteps()) this.techLogExpanded.emit();
  }

  /**
   * Derives aggregate milestone status from its constituent step statuses.
   * - completed: every mapped step is done
   * - running: at least one step is running or partially completed
   * - queued: no steps have started yet
   */
  getMilestoneStatus(ms: GrcRecord): 'completed' | 'running' | 'queued' {
    const codes: string[] = (ms.step_codes as string[]) || [];
    if (codes.length === 0) return 'queued';
    const steps = this.provSteps.filter(s => codes.includes(s.step_code as string));
    if (steps.length === 0) return 'queued';
    if (steps.every(s => s.status === 'completed')) return 'completed';
    if (steps.some(s => s.status === 'running')) return 'running';
    if (steps.some(s => s.status === 'completed')) return 'running';
    return 'queued';
  }

  /** Returns the completion percentage for a milestone (0-100) */
  getMilestonePercent(ms: GrcRecord): number {
    const codes: string[] = (ms.step_codes as string[]) || [];
    if (codes.length === 0) return 0;
    const steps = this.provSteps.filter(s => codes.includes(s.step_code as string));
    if (steps.length === 0) return 0;
    const done = steps.filter(s => s.status === 'completed').length;
    return Math.round((done / codes.length) * 100);
  }

  /** Returns the number of completed steps within a milestone */
  getMilestoneCompletedSteps(ms: GrcRecord): number {
    const codes: string[] = (ms.step_codes as string[]) || [];
    return this.provSteps.filter(s => codes.includes(s.step_code as string) && s.status === 'completed').length;
  }

  /** Returns total duration in seconds for completed steps in a milestone */
  getMilestoneDuration(ms: GrcRecord): number {
    const codes: string[] = (ms.step_codes as string[]) || [];
    const totalMs = this.provSteps
      .filter(s => codes.includes(s.step_code as string) && s.status === 'completed' && s.duration_ms)
      .reduce((sum: number, s: GrcRecord) => sum + ((s.duration_ms as number) || 0), 0);
    return totalMs / 1000;
  }

  /** Formatted elapsed time as M:SS */
  get elapsedTime(): string {
    const m = Math.floor(this.elapsedSeconds / 60);
    const s = this.elapsedSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /** Total number of completed provisioning steps */
  get completedSteps(): number {
    return this.provSteps.filter((s: GrcRecord) => s.status === 'completed').length;
  }

  /** Maps step status to PrimeNG tag severity */
  stepSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    if (status === 'completed') return 'success';
    if (status === 'running') return 'info';
    if (status === 'failed') return 'danger';
    return 'warning';
  }
}

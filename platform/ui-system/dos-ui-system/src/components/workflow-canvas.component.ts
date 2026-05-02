import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DosWhyChipComponent } from './why-chip.component';

/**
 * DosWorkflowCanvas — §26.9 / §14 Workflow Canvas.
 *
 * Renders a workflow instance as a horizontal step strip with state per
 * step, current step highlight, approvers, SLA timers, and evidence
 * requirement indicators. Used on every workflow-enabled page.
 *
 * §14.1 — minimum surfaced states:
 *   draft · pending_review · approved · rejected · expired ·
 *   blocked_sod · needs_owner · needs_evidence · ready_for_approval
 *
 * §14.2 action validity — actions become available only when valid for
 * (user permissions + workflow step + SoD rules + tenant scope). The
 * resolver decides; this component renders only.
 *
 * §15.1 — when a step is blocked, a why-chip surfaces the reason.
 */
export type WorkflowStepStatus =
  | 'draft'
  | 'pending_review'
  | 'in_progress'
  | 'ready_for_approval'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'blocked_sod'
  | 'needs_owner'
  | 'needs_evidence'
  | 'complete'
  | 'skipped';

export interface WorkflowStep {
  id:           string;
  label:        string;             // pre-resolved
  status:       WorkflowStepStatus;
  blockedReason?: string;           // for blocked_sod / needs_* states
  approvers?:   string[];           // pre-resolved names
  slaDueAt?:    string;             // ISO; render countdown
  evidenceRequired?: boolean;
  evidenceCount?: number;
}

@Component({
  selector: 'dos-workflow-canvas',
  standalone: true,
  imports: [CommonModule, DosWhyChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="dos-wfc"
      [attr.data-state-machine]="stateMachine"
      [attr.aria-label]="ariaLabel"
    >
      @if (title) {
        <header class="dos-wfc__head">
          <p class="dos-eyebrow">{{ eyebrowLabel }}</p>
          <h3 class="dos-wfc__title">{{ title }}</h3>
        </header>
      }

      <ol class="dos-wfc__steps" role="list">
        @for (step of steps; track step.id; let i = $index; let last = $last) {
          <li
            class="dos-wfc__step"
            [attr.data-status]="step.status"
            [class.dos-wfc__step--current]="step.id === currentStep"
            (click)="stepClick.emit(step.id)"
          >
            <div class="dos-wfc__node">
              <span class="dos-wfc__index">{{ i + 1 }}</span>
            </div>

            <div class="dos-wfc__body">
              <strong class="dos-wfc__label">{{ step.label }}</strong>
              <span class="dos-wfc__status" [attr.data-status]="step.status">
                {{ statusDisplay(step.status) }}
              </span>

              @if (step.approvers?.length) {
                <span class="dos-wfc__approvers" [title]="approversLabel + ': ' + (step.approvers!.join(', '))">
                  {{ approversLabel }}: {{ step.approvers!.length }}
                </span>
              }

              @if (step.slaDueAt) {
                <span class="dos-wfc__sla" [attr.data-overdue]="isOverdue(step.slaDueAt)">
                  ⏱ {{ slaCountdown(step.slaDueAt) }}
                </span>
              }

              @if (step.evidenceRequired) {
                <span class="dos-wfc__evidence">
                  📎 {{ step.evidenceCount || 0 }}/{{ evidenceRequiredLabel }}
                </span>
              }

              @if (step.blockedReason) {
                <dos-why-chip
                  [reason]="step.blockedReason"
                  [tone]="'warning'"
                  [size]="'sm'"
                  [label]="blockedLabel"
                  [showLabel]="true"
                ></dos-why-chip>
              }
            </div>

            @if (!last) {
              <span class="dos-wfc__connector" aria-hidden="true"></span>
            }
          </li>
        }
      </ol>
    </section>
  `,
  styles: [`
    .dos-wfc {
      display: flex;
      flex-direction: column;
      gap: var(--dos-space-3);
      padding: var(--dos-space-4);
      background: var(--dos-color-surface);
      border: 1px solid var(--dos-color-border-subtle);
      border-radius: var(--dos-radius-card);
      box-shadow: var(--dos-shadow-xs);
    }
    .dos-wfc__head { display: flex; flex-direction: column; gap: 2px; }
    .dos-wfc__title { margin: 0; font-size: var(--dos-font-size-md); font-weight: 500; }

    .dos-wfc__steps {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      gap: 0;
      align-items: flex-start;
      overflow-x: auto;
      scrollbar-width: thin;
    }

    .dos-wfc__step {
      position: relative;
      flex: 1 1 0;
      min-width: 220px;
      display: flex;
      gap: var(--dos-space-2);
      align-items: flex-start;
      padding: var(--dos-space-3) var(--dos-space-3) var(--dos-space-3) 0;
      cursor: pointer;
      transition: background var(--dos-duration-fast) var(--dos-ease-out);
    }
    [dir='rtl'] .dos-wfc__step { padding: var(--dos-space-3) 0 var(--dos-space-3) var(--dos-space-3); }
    .dos-wfc__step:hover { background: var(--dos-color-surface-muted); }
    .dos-wfc__step--current {
      background: var(--dos-color-primary-soft);
      border-radius: var(--dos-radius-md);
    }

    /* Node circle. */
    .dos-wfc__node {
      flex-shrink: 0;
      width: 32px; height: 32px;
      border-radius: 50%;
      background: var(--dos-color-surface-muted);
      border: 2px solid var(--dos-color-border-strong);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--dos-color-text-muted);
    }
    .dos-wfc__index {
      font: 700 var(--dos-caption-size)/1 ui-monospace, SFMono-Regular, Menlo, monospace;
      color: inherit;
    }

    /* Status-driven node colors (§14.1 vocabulary). */
    .dos-wfc__step[data-status='complete'] .dos-wfc__node,
    .dos-wfc__step[data-status='approved'] .dos-wfc__node {
      background: var(--dos-color-success); border-color: transparent; color: var(--dos-color-text-inverse);
    }
    .dos-wfc__step[data-status='in_progress'] .dos-wfc__node,
    .dos-wfc__step[data-status='ready_for_approval'] .dos-wfc__node {
      background: var(--dos-color-info); border-color: transparent; color: var(--dos-color-text-inverse);
    }
    .dos-wfc__step[data-status='pending_review'] .dos-wfc__node,
    .dos-wfc__step[data-status='needs_evidence'] .dos-wfc__node,
    .dos-wfc__step[data-status='needs_owner'] .dos-wfc__node {
      background: var(--dos-color-warning); border-color: transparent; color: var(--dos-color-text-inverse);
    }
    .dos-wfc__step[data-status='rejected'] .dos-wfc__node,
    .dos-wfc__step[data-status='blocked_sod'] .dos-wfc__node,
    .dos-wfc__step[data-status='expired'] .dos-wfc__node {
      background: var(--dos-color-danger); border-color: transparent; color: var(--dos-color-text-inverse);
    }
    .dos-wfc__step[data-status='skipped'] .dos-wfc__node {
      background: var(--dos-color-surface-sunken); border-color: var(--dos-color-border); color: var(--dos-color-text-disabled);
    }

    /* Body text rhythm. */
    .dos-wfc__body {
      display: flex; flex-direction: column; gap: 4px;
      flex: 1 1 auto; min-width: 0;
    }
    .dos-wfc__label {
      font-size: var(--dos-font-size-sm);
      color: var(--dos-color-text-strong);
    }
    .dos-wfc__status {
      font: 600 var(--dos-eyebrow-size)/1 inherit;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--dos-color-text-muted);
    }
    [dir='rtl'] .dos-wfc__status { letter-spacing: 0; text-transform: none; }
    .dos-wfc__step[data-status='complete']           .dos-wfc__status,
    .dos-wfc__step[data-status='approved']           .dos-wfc__status { color: var(--dos-color-success-text); }
    .dos-wfc__step[data-status='in_progress']        .dos-wfc__status,
    .dos-wfc__step[data-status='ready_for_approval'] .dos-wfc__status { color: var(--dos-color-info-text); }
    .dos-wfc__step[data-status='pending_review']     .dos-wfc__status,
    .dos-wfc__step[data-status='needs_evidence']     .dos-wfc__status,
    .dos-wfc__step[data-status='needs_owner']        .dos-wfc__status { color: var(--dos-color-warning-text); }
    .dos-wfc__step[data-status='rejected']           .dos-wfc__status,
    .dos-wfc__step[data-status='blocked_sod']        .dos-wfc__status,
    .dos-wfc__step[data-status='expired']            .dos-wfc__status { color: var(--dos-color-danger-text); }

    .dos-wfc__approvers,
    .dos-wfc__sla,
    .dos-wfc__evidence {
      font-size: var(--dos-caption-size);
      color: var(--dos-color-text-muted);
    }
    .dos-wfc__sla[data-overdue='true'] { color: var(--dos-color-danger-text); font-weight: 600; }

    /* Connector line between steps. */
    .dos-wfc__connector {
      position: absolute;
      inset-inline-end: 0;
      inset-block-start: calc(var(--dos-space-3) + 16px);
      inline-size: var(--dos-space-3);
      block-size: 2px;
      background: var(--dos-color-border-subtle);
    }
  `],
})
export class DosWorkflowCanvasComponent {
  @Input() title?: string;
  @Input() steps: WorkflowStep[] = [];
  @Input() currentStep?: string;
  @Input() stateMachine?: string;
  @Input() ariaLabel = 'Workflow';

  // Pre-resolved labels.
  @Input() eyebrowLabel        = 'workflow';
  @Input() approversLabel      = 'approvers';
  @Input() blockedLabel        = 'blocked';
  @Input() evidenceRequiredLabel = 'evidence';
  @Input() statusLabels: Partial<Record<WorkflowStepStatus, string>> = {};

  @Output() stepClick = new EventEmitter<string>();

  statusDisplay(status: WorkflowStepStatus): string {
    return this.statusLabels[status] || status.replace(/_/g, ' ');
  }

  isOverdue(iso: string): boolean {
    const t = Date.parse(iso);
    return !!t && t < Date.now();
  }

  slaCountdown(iso: string): string {
    const t = Date.parse(iso);
    if (!t) return iso;
    const diff = t - Date.now();
    const hours = Math.round(diff / 3_600_000);
    if (Math.abs(hours) < 24) return `${hours}h`;
    return `${Math.round(hours / 24)}d`;
  }
}

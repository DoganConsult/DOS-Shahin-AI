import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { inject } from '@angular/core';

export interface ActionTrail {
  grantId?: string;
  scope?: string;
  delegationActionId?: string;
  processTaskId?: string;
  assignedTeam?: string;
  assignedUser?: string;
  slaHours?: number;
  raciRole?: string;
  raci?: {
    responsible?: string[];
    accountable?: string[];
    consulted?: string[];
    informed?: string[];
  };
}

export interface ProposedAction {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  entityType?: string;
  entityId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'auto_completed' | 'failed' | 'escalated';
  autoExecuteAt?: string;
  autoExecuteEnabled?: boolean;
  countdownSeconds?: number;
  executionMethod?: string;
  trail?: ActionTrail;
  failureReason?: string;
}

const TIMER_TOTAL: Record<string, number> = { critical: 60, high: 120, medium: 300, low: 0 };

@Component({
    selector: 'app-copilot-action-card',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule],
    template: `
    <div class="action-card"
         [class]="'priority-' + action.priority"
         [class.approved]="action.status === 'approved' || action.status === 'completed'"
         [class.rejected]="action.status === 'rejected'"
         [class.executing]="action.status === 'executing'"
         [class.auto-completed]="action.status === 'auto_completed'"
         [class.failed]="action.status === 'failed'"
         [class.escalated]="action.status === 'escalated'">
      <div class="action-header">
        <span class="action-type-badge">{{ formatActionType(action.type) }}</span>
        <span class="action-priority-badge" [class]="'priority-badge-' + action.priority">{{ action.priority }}</span>
      </div>
      <p class="action-title">{{ action.title }}</p>
      <p class="action-desc">{{ action.description }}</p>

      <!-- Countdown bar -->
      <div *ngIf="action.status === 'pending' && action.autoExecuteEnabled && action.countdownSeconds != null && action.countdownSeconds > 0" class="countdown-bar">
        <div class="countdown-fill" [class.urgent]="action.countdownSeconds! < 15"
             [style.width.%]="(action.countdownSeconds! / getTimerTotal(action.priority)) * 100"></div>
        <span class="countdown-text">{{ t('copilot.autoExecuteIn').replace('{seconds}', '' + action.countdownSeconds) }}</span>
      </div>

      <!-- Pending action buttons -->
      <div class="action-buttons" *ngIf="action.status === 'pending'">
        <button class="approve-btn" (click)="approve.emit(action)">
          <i class="pi pi-check"></i> {{ t('copilot.approve') }}
        </button>
        <button class="reject-btn" (click)="reject.emit(action)">
          <i class="pi pi-times"></i> {{ t('copilot.reject') }}
        </button>
        <button *ngIf="action.autoExecuteEnabled" class="cancel-auto-btn" (click)="cancelAuto.emit(action)">
          <i class="pi pi-pause"></i> {{ t('copilot.cancelAuto') }}
        </button>
      </div>

      <!-- Status badges -->
      <div class="action-status-badge" *ngIf="action.status === 'executing'">
        <i class="pi pi-spin pi-spinner"></i> {{ t('copilot.executing') }}
      </div>
      <div class="action-status-badge approved-badge" *ngIf="action.status === 'approved' || action.status === 'completed'">
        <i class="pi pi-check-circle"></i> {{ t('copilot.actionApproved') }}
      </div>
      <div class="action-status-badge rejected-badge" *ngIf="action.status === 'rejected'">
        <i class="pi pi-ban"></i> {{ t('copilot.actionRejected') }}
      </div>
      <div class="action-status-badge auto-badge" *ngIf="action.status === 'auto_completed'">
        <i class="pi pi-bolt"></i> {{ t('copilot.actionAutoExecuted') }}
      </div>
      <div class="action-status-badge failed-badge" *ngIf="action.status === 'failed'">
        <i class="pi pi-exclamation-circle"></i> {{ action.failureReason || t('copilot.qualityGateFailed') }}
      </div>
      <div class="action-status-badge escalated-badge" *ngIf="action.status === 'escalated'">
        <i class="pi pi-arrow-up-right"></i> {{ t('copilot.actionEscalated') }}
      </div>

      <!-- Visual Action Trail -->
      <div *ngIf="(action.status === 'completed' || action.status === 'auto_completed' || action.status === 'approved') && action.trail" class="action-trail">
        <div class="trail-step"><i class="pi pi-microchip-ai"></i> {{ t('copilot.trailProposed') }} {{ agentLabel }}</div>
        <div class="trail-connector">&darr;</div>
        <div class="trail-step"><i class="pi pi-check-circle"></i> {{ action.executionMethod === 'auto_execute' ? t('copilot.trailAutoApproved') : t('copilot.trailApproved') }}</div>
        <div class="trail-connector">&darr;</div>
        <div *ngIf="action.trail.grantId" class="trail-step">
          <i class="pi pi-shield"></i> {{ t('copilot.trailGrant') }}: {{ action.trail.grantId!.slice(0,8) }}... ({{ action.trail.scope }})
        </div>
        <ng-container *ngIf="action.trail.assignedTeam">
          <div class="trail-connector">&darr;</div>
          <div class="trail-step"><i class="pi pi-users"></i> &rarr; {{ action.trail.assignedTeam }} ({{ action.trail.raciRole }})</div>
          <div class="trail-connector">&darr;</div>
          <div class="trail-step"><i class="pi pi-user"></i> {{ t('copilot.trailAssigned') }}: {{ action.trail.assignedUser }} &mdash; {{ t('copilot.trailSla') }}: {{ action.trail.slaHours }}h</div>
        </ng-container>
        <!-- RACI badges -->
        <div *ngIf="action.trail.raci" class="trail-raci">
          <span *ngIf="action.trail.raci!.responsible?.length" class="raci-badge raci-r">R: {{ action.trail.raci!.responsible!.join(', ') }}</span>
          <span *ngIf="action.trail.raci!.accountable?.length" class="raci-badge raci-a">A: {{ action.trail.raci!.accountable!.join(', ') }}</span>
          <span *ngIf="action.trail.raci!.consulted?.length" class="raci-badge raci-c">C: {{ action.trail.raci!.consulted!.join(', ') }}</span>
          <span *ngIf="action.trail.raci!.informed?.length" class="raci-badge raci-i">I: {{ action.trail.raci!.informed!.join(', ') }}</span>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .action-card {
      border: 1px solid var(--border-subtle, var(--border-subtle)); border-radius: var(--radius-md);
      padding: 10px 12px; border-inline-start: 3px solid var(--primary);
      background: var(--surface, #fff); transition: opacity 200ms;
    }
    .action-card.priority-critical { border-inline-start-color: var(--error); }
    .action-card.priority-high { border-inline-start-color: var(--risk-high); }
    .action-card.priority-medium { border-inline-start-color: var(--primary); }
    .action-card.priority-low { border-inline-start-color: var(--text-muted); }
    .action-card.approved { border-inline-start-color: #10b981; }
    .action-card.rejected { opacity: 0.5; border-inline-start-color: var(--text-muted); }
    .action-card.executing { animation: pulse 1.5s infinite; }
    .action-card.auto-completed { border-inline-start-color: var(--primary); }
    .action-card.failed { border-inline-start-color: var(--error); opacity: 0.85; }
    .action-card.escalated { border-inline-start-color: var(--warning); }
    @keyframes pulse { 0%,100%{ opacity: 1; } 50%{ opacity: 0.7; } }

    .action-header { display: flex; gap: 6px; align-items: center; margin-bottom: 4px; }
    .action-type-badge { font-size: var(--font-size-xs); padding: 1px 6px; border-radius: var(--radius-sm); background: #e0f2fe; color: #0369a1; font-weight: 600; text-transform: uppercase; }
    .action-priority-badge { font-size: var(--font-size-xs); padding: 1px 5px; border-radius: var(--radius-sm); font-weight: 600; text-transform: uppercase; }
    .priority-badge-critical { background: var(--status-danger-bg, #fff1f1); color: #991b1b; }
    .priority-badge-high { background: var(--status-warning-bg, #fcf4d6); color: #9a3412; }
    .priority-badge-medium { background: #eff6ff; color: #1e40af; }
    .priority-badge-low { background: var(--surface-ice); color: #475569; }
    .action-title { font-size: var(--font-size-sm); font-weight: 600; margin: 0 0 2px; color: var(--text, var(--text-heading)); }
    .action-desc { font-size: var(--font-size-xs); margin: 0 0 8px; color: var(--text-muted, var(--text-muted)); line-height: 1.4; }
    .action-buttons { display: flex; gap: 6px; }
    .approve-btn, .reject-btn {
      font-size: var(--font-size-xs); padding: 4px 10px; border-radius: var(--radius-sm); border: none; cursor: pointer;
      display: inline-flex; align-items: center; gap: 4px; font-weight: 600; transition: filter 150ms;
    }
    .approve-btn { background: #10b981; color: #fff; }
    .approve-btn:hover { filter: brightness(1.1); }
    .reject-btn { background: var(--border-subtle); color: #475569; }
    .reject-btn:hover { background: #cbd5e1; }

    .action-status-badge { font-size: var(--font-size-xs); display: flex; align-items: center; gap: 4px; font-weight: 500; margin-top: 4px; }
    .approved-badge { color: #10b981; }
    .rejected-badge { color: var(--text-muted); }
    .auto-badge { color: var(--primary); }
    .failed-badge { color: var(--error); }
    .escalated-badge { color: var(--warning); }

    .countdown-bar { position: relative; height: 20px; background: var(--surface-ice); border-radius: var(--radius-xs); margin: 6px 0; overflow: hidden; }
    .countdown-fill { height: 100%; background: linear-gradient(90deg, var(--primary), #60a5fa); transition: width 1s linear; }
    .countdown-fill.urgent { background: linear-gradient(90deg, var(--error), #f87171); }
    .countdown-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-heading); }
    .cancel-auto-btn { font-size: var(--font-size-xs); padding: 3px 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); background: transparent; color: var(--text-muted); cursor: pointer; display: inline-flex; align-items: center; gap: 3px; }
    .cancel-auto-btn:hover { background: var(--surface-ice); }

    .action-trail { margin-top: 8px; padding: 8px; background: var(--surface-sunken, var(--surface-ice)); border-radius: var(--radius); font-size: var(--font-size-xs); }
    .trail-step { display: flex; align-items: center; gap: 6px; color: #334155; padding: 2px 0; }
    .trail-step .pi { font-size: var(--font-size-xs); color: var(--text-muted); width: 14px; text-align: center; }
    .trail-connector { color: #cbd5e1; font-size: 8px; padding-inline-start: 4px; line-height: 1; }
    .trail-raci { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
    .raci-badge { font-size: var(--font-size-xs); padding: 1px 6px; border-radius: var(--radius-sm); font-weight: 600; }
    .raci-r { background: #dbeafe; color: #1e40af; }
    .raci-a { background: var(--status-warning-bg, #fcf4d6); color: #92400e; }
    .raci-c { background: #e0e7ff; color: #3730a3; }
    .raci-i { background: var(--surface-ice); color: #475569; }
  `]
})
export class CopilotActionCardComponent {
  private i18n = inject(I18nService);

  @Input({ required: true }) action!: ProposedAction;
  @Input() agentLabel = 'AI';

  @Output() approve = new EventEmitter<ProposedAction>();
  @Output() reject = new EventEmitter<ProposedAction>();
  @Output() cancelAuto = new EventEmitter<ProposedAction>();

  t(key: string): string { return this.i18n.translate(key); }

  formatActionType(type: string): string {
    return type.replace(/_/g, ' ');
  }

  getTimerTotal(priority: string): number {
    return TIMER_TOTAL[priority] || 300;
  }
}

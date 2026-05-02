import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy,
  computed, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBarModule } from 'primeng/progressbar';
import { SlaTimerPillComponent } from '../../status-indicators/sla-timer-pill.component';

export interface WorkflowRibbonConfig {
  currentState: string;
  availableTransitions: Array<{ to: string; label: string; labelAr?: string; requiresApproval?: boolean; icon?: string }>;
  slaHours: number | null;
  slaDueDate: string | null;
  slaStatus?: string;
  pendingApprovals: number;
  approverNames?: string[];
  lifecycleProgress: number;
  lang: 'en' | 'ar';
}

@Component({
    selector: 'app-module-workflow-ribbon',
    imports: [CommonModule, ButtonModule, TagModule, TooltipModule, ProgressBarModule, SlaTimerPillComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="mwr" [attr.dir]="config.lang === 'ar' ? 'rtl' : 'ltr'">
      <div class="mwr-state">
        <span class="mwr-state-label">{{ config.lang === 'ar' ? 'الحالة' : 'Status' }}</span>
        <p-tag [value]="config.currentState | titlecase" severity="info" [rounded]="true" />
      </div>

      <div class="mwr-progress">
        <p-progressBar [value]="config.lifecycleProgress" [showValue]="false" [style]="{height: '6px', width: '120px'}"
                        [pTooltip]="config.lifecycleProgress + '% complete'" tooltipPosition="bottom" />
      </div>

      <div class="mwr-sla" *ngIf="config.slaHours">
        <app-sla-timer-pill [dueDate]="config.slaDueDate" [slaHours]="config.slaHours" [status]="config.slaStatus || 'pending'" />
      </div>

      <div class="mwr-approvals" *ngIf="config.pendingApprovals > 0">
        <span class="mwr-approval-badge" [pTooltip]="approverTooltip">
          <i class="pi pi-user-edit"></i>
          {{ config.pendingApprovals }} {{ config.lang === 'ar' ? 'موافقات معلقة' : 'pending' }}
        </span>
      </div>

      <div class="mwr-transitions" *ngIf="config.availableTransitions.length > 0">
        <button *ngFor="let t of config.availableTransitions"
          pButton size="small"
          [severity]="t.requiresApproval ? 'warning' : 'secondary'"
          [icon]="t.icon ? 'pi pi-' + t.icon : (t.requiresApproval ? 'pi pi-check-circle' : 'pi pi-arrow-right')"
          [label]="config.lang === 'ar' && t.labelAr ? t.labelAr : t.label"
          [pTooltip]="t.requiresApproval ? (config.lang === 'ar' ? 'يتطلب موافقة' : 'Requires approval') : ''"
          tooltipPosition="bottom"
          (click)="transition.emit(t.to)"></button>
      </div>
    </div>
  `,
    styles: [`
    .mwr { display: flex; align-items: center; gap: 16px; padding: 6px 24px; background: var(--surface-50, #f8fafc); border-bottom: 1px solid var(--border-subtle, #e5e7eb); flex-wrap: wrap; min-height: 40px; }
    .mwr-state { display: flex; align-items: center; gap: 6px; }
    .mwr-state-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px; }
    .mwr-progress { display: flex; align-items: center; }
    .mwr-approvals { }
    .mwr-approval-badge { display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-size-sm); font-weight: 600; color: var(--warning, #f59e0b); padding: 2px 8px; border-radius: var(--radius-lg); background: rgba(var(--module-accent-amber-rgb), 0.1); cursor: default; }
    .mwr-transitions { display: flex; gap: 6px; margin-inline-start: auto; }
    @media (max-width: 768px) {
      .mwr { padding: 6px 12px; gap: 8px; }
      .mwr-transitions { width: 100%; overflow-x: auto; }
    }
  `]
})
export class ModuleWorkflowRibbonComponent {
  @Input() config!: WorkflowRibbonConfig;
  @Output() transition = new EventEmitter<string>();

  get approverTooltip(): string {
    if (!this.config.approverNames?.length) return '';
    return this.config.approverNames.join(', ');
  }
}

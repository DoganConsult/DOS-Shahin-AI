import {
  Component, Input, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';

export interface AgentInfo {
  id: string;
  name: string;
  nameAr?: string;
  icon: string;
  color: string;
  domain: string;
  domainAr?: string;
  autonomyLevel?: 'hybrid' | 'shadow_agent' | 'full';
  status?: 'active' | 'idle' | 'disabled';
}

@Component({
    selector: 'app-agent-status-badge',
    imports: [CommonModule, TooltipModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="asb" [class.asb--active]="agent.status === 'active'"
         [class.asb--idle]="agent.status === 'idle' || !agent.status"
         [class.asb--disabled]="agent.status === 'disabled'"
         [pTooltip]="tooltipText" tooltipPosition="bottom">
      <span class="asb-dot"></span>
      <i class="pi" [ngClass]="agent.icon" [style.color]="agent.color"></i>
      <span class="asb-id">{{ agent.id }}</span>
      <span class="asb-name">{{ isAr && agent.nameAr ? agent.nameAr : agent.name }}</span>
      <span class="asb-autonomy" *ngIf="agent.autonomyLevel"
            [attr.data-level]="agent.autonomyLevel">
        {{ autonomyLabel }}
      </span>
    </div>
  `,
    styles: [`
    .asb {
      display: inline-flex; align-items: center; gap: calc(var(--cds-spacing-02) + var(--cds-spacing-01));
      padding: var(--cds-spacing-02) calc(var(--cds-spacing-03) + var(--cds-spacing-01)); border-radius: var(--radius-pill);
      background: var(--cds-layer-01);
      border: var(--shell-border-width) solid var(--shell-card-border);
      font-size: var(--cds-caption-01-size);
      transition: background var(--cds-duration-moderate-01) var(--cds-easing-standard), border-color var(--cds-duration-moderate-01) var(--cds-easing-standard), opacity var(--cds-duration-moderate-01) var(--cds-easing-standard);
    }
    .asb--active { border-color: var(--cds-support-success); background: var(--shell-status-success-bg); }
    .asb--disabled { opacity: 0.5; }
    .asb-dot { width: var(--cds-spacing-03); height: var(--cds-spacing-03); border-radius: 50%; flex-shrink: 0; }
    .asb--active .asb-dot { background: var(--cds-support-success); animation: pulse-dot 2s infinite; }
    .asb--idle .asb-dot { background: var(--cds-text-placeholder); }
    .asb--disabled .asb-dot { background: var(--cds-border-subtle-01); }
    .asb-id { font-weight: 700; font-size: var(--cds-caption-01-size); color: var(--shell-text-secondary); }
    .asb-name { font-weight: 600; }
    .asb-autonomy {
      font-size: var(--cds-caption-01-size); font-weight: 600; padding: var(--cds-spacing-01) calc(var(--cds-spacing-02) + var(--cds-spacing-01));
      border-radius: var(--radius-xs); text-transform: uppercase;
    }
    .asb-autonomy[data-level="hybrid"] { background: var(--shell-status-info-bg); color: var(--cds-support-info); }
    .asb-autonomy[data-level="shadow_agent"] { background: var(--shell-tag-blue-bg); color: var(--cds-link-primary); }
    .asb-autonomy[data-level="full"] { background: var(--shell-status-success-bg); color: var(--cds-support-success); }
    @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    [dir="rtl"] .asb { flex-direction: row-reverse; }
  `]
})
export class AgentStatusBadgeComponent {
  @Input() agent: AgentInfo = { id: '', name: '', icon: '', color: '', domain: '' };
  @Input() isAr = false;

  get autonomyLabel(): string {
    const map: Record<string, string> = { hybrid: 'HITL', shadow_agent: 'Shadow', full: 'Auto' };
    return map[this.agent.autonomyLevel || ''] || '';
  }

  get tooltipText(): string {
    return `${this.agent.name} (${this.agent.id}) — ${this.agent.domain}`;
  }
}

import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-workflow-tier-indicator',
    standalone: true,
    imports: [CommonModule],
    template: `
      <div class="tier-indicator-wrap">
        <span class="tier-indicator" [ngClass]="'tier-' + tier">{{ label || ('Tier ' + tier) }}</span>
        <span class="automation-badge" *ngIf="automationLevel">{{ automationLevel }}</span>
        <span class="sla-badge" *ngIf="slaHours">SLA: {{ slaHours }}h</span>
      </div>
    `,
    styles: [`
      .tier-indicator-wrap { display: inline-flex; gap: 8px; align-items: center; }
      .tier-indicator, .automation-badge, .sla-badge { display: inline-flex; padding: 2px 8px; border-radius: 4px; font-size: var(--font-size-xs); font-weight: 600; }
      .tier-1 { background: var(--clr-danger-subtle, #fde8e8); color: var(--clr-danger, #c62828); }
      .tier-2 { background: var(--clr-warning-subtle, #fff8e1); color: var(--clr-warning, #f57f17); }
      .tier-3 { background: var(--clr-info-subtle, #e3f2fd); color: var(--clr-info, #1565c0); }
    `]
})
export class WorkflowTierIndicatorComponent {
    @Input() tier: number | string = 1;
    @Input() label: string = '';
    @Input() automationLevel?: string | null = null;
    @Input() slaHours?: number | null = null;
}

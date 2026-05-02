import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-sla-timer-pill',
    standalone: true,
    imports: [CommonModule],
    template: `
      <span class="sla-pill" [ngClass]="'sla-' + status">
        {{ displayText }}
      </span>
    `,
    styles: [`
      .sla-pill {
        display: inline-flex; padding: var(--cds-spacing-01) var(--cds-spacing-03); border-radius: var(--radius-pill);
        font-size: var(--cds-caption-01-size); font-weight: 600;
      }
      .sla-on-track { background: var(--shell-status-success-bg); color: var(--cds-support-success); }
      .sla-at-risk { background: var(--shell-status-warning-bg); color: var(--cds-support-warning); }
      .sla-breached { background: var(--shell-status-danger-bg); color: var(--cds-support-error); }
    `]
})
export class SlaTimerPillComponent {
    @Input() dueDate: Date | string | null = null;
    @Input() status: 'on-track' | 'at-risk' | 'breached' = 'on-track';
    @Input() label: string = '';

    get displayText(): string {
        return this.label || this.status;
    }
}

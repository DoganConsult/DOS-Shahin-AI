import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-status-badge',
    standalone: true,
    imports: [CommonModule],
    template: `
      <span class="status-badge" [ngClass]="'status-' + status" [class.status-sm]="size === 'sm'">
        {{ label || status }}
      </span>
    `,
    styles: [`
      .status-badge {
        display: inline-flex; align-items: center; gap: var(--cds-spacing-02);
        padding: var(--cds-spacing-01) calc(var(--cds-spacing-03) + var(--cds-spacing-01)); border-radius: var(--radius-pill);
        font-size: var(--cds-caption-01-size); font-weight: 600;
        text-transform: uppercase; letter-spacing: var(--letter-spacing-wide);
        background: var(--cds-layer-01); color: var(--shell-text-primary);
      }
      .status-sm { padding: var(--cds-spacing-01) calc(var(--cds-spacing-03) + var(--cds-spacing-02)); font-size: var(--cds-caption-01-size); }
      .status-active, .status-approved { background: var(--shell-status-success-bg); color: var(--cds-support-success); }
      .status-pending, .status-review { background: var(--shell-status-warning-bg); color: var(--cds-support-warning); }
      .status-draft { background: var(--shell-status-info-bg); color: var(--cds-support-info); }
      .status-rejected, .status-failed, .status-critical { background: var(--shell-status-danger-bg); color: var(--cds-support-error); }
      .status-closed, .status-archived { background: var(--cds-layer-01); color: var(--shell-text-secondary); }
    `]
})
export class StatusBadgeComponent {
    @Input() status: string = 'draft';
    @Input() label: string = '';
    @Input() size: 'sm' | 'md' = 'md';
    @Input() icon: string = '';
    @Input() tooltip: string = '';
}

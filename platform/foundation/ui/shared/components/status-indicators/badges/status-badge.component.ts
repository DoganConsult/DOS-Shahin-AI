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
        display: inline-flex; align-items: center; gap: 4px;
        padding: 2px 10px; border-radius: 12px;
        font-size: var(--font-size-xs, 0.75rem); font-weight: 600;
        text-transform: uppercase; letter-spacing: 0.03em;
        background: var(--surface-hover); color: var(--text-body);
      }
      .status-sm { padding: 1px 6px; font-size: 0.65rem; }
      .status-active, .status-approved { background: var(--clr-success-subtle, #e6f9e6); color: var(--clr-success, #2e7d32); }
      .status-pending, .status-review { background: var(--clr-warning-subtle, #fff8e1); color: var(--clr-warning, #f57f17); }
      .status-draft { background: var(--clr-info-subtle, #e3f2fd); color: var(--clr-info, #1565c0); }
      .status-rejected, .status-failed, .status-critical { background: var(--clr-danger-subtle, #fde8e8); color: var(--clr-danger, #c62828); }
      .status-closed, .status-archived { background: var(--surface-muted); color: var(--text-muted); }
    `]
})
export class StatusBadgeComponent {
    @Input() status: string = 'draft';
    @Input() label: string = '';
    @Input() size: 'sm' | 'md' = 'md';
    @Input() icon: string = '';
    @Input() tooltip: string = '';
}

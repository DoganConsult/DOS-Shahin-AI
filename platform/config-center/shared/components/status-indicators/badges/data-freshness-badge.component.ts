import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type FreshnessLevel = 'fresh' | 'stale' | 'expired';

export interface FreshnessState {
    level: FreshnessLevel;
    lastUpdated: Date | string;
    label?: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-data-freshness-badge',
    standalone: true,
    imports: [CommonModule],
    template: `<span class="freshness-badge" [ngClass]="'freshness-' + level">{{ label || level }}</span>`,
    styles: [`
      .freshness-badge { display: inline-flex; padding: 2px 8px; border-radius: 10px; font-size: var(--font-size-xs); font-weight: 600; }
      .freshness-fresh { background: var(--clr-success-subtle, #e6f9e6); color: var(--clr-success, #2e7d32); }
      .freshness-stale { background: var(--clr-warning-subtle, #fff8e1); color: var(--clr-warning, #f57f17); }
      .freshness-expired { background: var(--clr-danger-subtle, #fde8e8); color: var(--clr-danger, #c62828); }
    `]
})
export class DataFreshnessBadgeComponent {
    @Input() level: FreshnessLevel = 'fresh';
    @Input() label: string = '';
    @Input() lastUpdated: Date | string | null = null;
}

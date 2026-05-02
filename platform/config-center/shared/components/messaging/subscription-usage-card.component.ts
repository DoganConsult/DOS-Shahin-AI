import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-subscription-usage-card',
    standalone: true,
    imports: [CommonModule],
    template: `
      <div class="usage-card">
        <div class="usage-label">{{ label }}</div>
        <div class="usage-value">{{ used }} / {{ limit }}</div>
      </div>
    `,
    styles: [`
      .usage-card { padding: var(--space-md); border: 1px solid var(--surface-border); border-radius: 8px; }
      .usage-label { font-size: var(--font-size-sm); color: var(--text-muted); }
      .usage-value { font-size: 1.25rem; font-weight: 700; margin-top: 4px; }
    `]
})
export class SubscriptionUsageCardComponent {
    @Input() label: string = '';
    @Input() used: number = 0;
    @Input() limit: number = 0;
}

import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-grc-stat-widget',
    standalone: true,
    imports: [CommonModule],
    template: `
      <div class="grc-stat">
        <div class="stat-label">{{ label }}</div>
        <div class="stat-value">{{ value }}</div>
      </div>
    `,
    styles: [`
      .grc-stat { padding: var(--space-md); background: var(--surface-card); border-radius: 8px; }
      .stat-label { font-size: var(--font-size-sm); color: var(--text-muted); }
      .stat-value { font-size: 1.5rem; font-weight: 700; }
    `]
})
export class GrcStatWidgetComponent {
    @Input() label: string = '';
    @Input() value: string | number = '';
}

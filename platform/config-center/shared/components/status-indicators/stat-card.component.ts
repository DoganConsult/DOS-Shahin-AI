import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-stat-card',
    standalone: true,
    imports: [CommonModule],
    template: `
      <div class="stat-card" [style.border-inline-start]="'4px solid ' + (accentColor || color || 'var(--primary)')">
        <div class="stat-label">{{ label }}</div>
        <div class="stat-value">{{ value }}</div>
        <div class="stat-trend" *ngIf="trend">{{ trend }}</div>
      </div>
    `,
    styles: [`
      .stat-card { padding: var(--space-md); border-radius: 8px; background: var(--surface-card); }
      .stat-label { font-size: var(--font-size-sm); color: var(--text-muted); margin-bottom: 4px; }
      .stat-value { font-size: 1.5rem; font-weight: 700; color: var(--text-heading); }
      .stat-trend { font-size: var(--font-size-xs); margin-top: 4px; }
    `]
})
export class StatCardComponent {
    @Input() label: string = '';
    @Input() value: string | number = '';
    @Input() icon: string = '';
    @Input() trend: string = '';
    @Input() color: string = '';
    @Input() accentColor: string = '';
    @Input() loading: boolean = false;
}

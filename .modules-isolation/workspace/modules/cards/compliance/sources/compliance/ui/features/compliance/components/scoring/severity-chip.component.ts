import { Component, Input, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'compliance-severity-chip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="sev-chip" [style.background]="bgColor" [style.color]="fgColor">
      {{ label || severity }}
    </span>
  `,
  styles: [`
    .sev-chip {
      display: inline-block; padding: 3px 10px; border-radius: var(--radius-sm);
      font-size: var(--font-size-xs); font-weight: 700; text-transform: capitalize; white-space: nowrap;
    }
  `]
})
export class SeverityChipComponent {
  @Input() severity: string = 'low';
  @Input() label: string = '';

  private colors: Record<string, [string, string]> = {
    critical: ['rgba(var(--color-red-600-rgb), .12)', 'var(--error)'],
    high:     ['rgba(var(--color-orange-600-rgb), .12)', '#ea580c'],
    medium:   ['rgba(var(--color-amber-700-rgb), .12)', '#b45309'],
    low:      ['rgba(var(--color-blue-600-rgb), .12)', '#2563eb'],
  };

  get bgColor(): string { return (this.colors[this.severity] || this.colors['low'])[0]; }
  get fgColor(): string { return (this.colors[this.severity] || this.colors['low'])[1]; }
}

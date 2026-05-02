import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-health-strip',
    standalone: true,
    imports: [CommonModule],
    template: `
      <div class="health-strip" [ngClass]="'health-' + level">
        <div class="health-bar" [style.width.%]="score"></div>
      </div>
    `,
    styles: [`
      .health-strip { height: 6px; border-radius: 3px; background: var(--surface-hover); overflow: hidden; }
      .health-bar { height: 100%; border-radius: 3px; transition: width 0.3s ease; }
      .health-good .health-bar { background: var(--clr-success, #2e7d32); }
      .health-warning .health-bar { background: var(--clr-warning, #f57f17); }
      .health-critical .health-bar { background: var(--clr-danger, #c62828); }
    `]
})
export class HealthStripComponent {
    @Input() score: number = 0;
    @Input() level: 'good' | 'warning' | 'critical' = 'good';
    @Input() label: string = '';
}

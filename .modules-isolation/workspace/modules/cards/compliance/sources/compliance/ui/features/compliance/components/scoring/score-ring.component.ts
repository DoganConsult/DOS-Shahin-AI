import { Component, Input, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'compliance-score-ring',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="score-ring" [class.good]="score >= 70" [class.warn]="score >= 40 && score < 70" [class.bad]="score < 40">
      <span class="score-val">{{ score }}%</span>
      <span class="score-lbl">{{ label }}</span>
    </div>
  `,
  styles: [`
    .score-ring {
      text-align: center; padding: 24px 32px; border-radius: var(--radius-xl);
      border: 3px solid var(--surface-border, var(--border-subtle));
      display: inline-flex; flex-direction: column; align-items: center; gap: 6px;
    }
    .score-ring.good { border-color: var(--success); background: rgba(var(--module-accent-green-rgb), .04); }
    .score-ring.warn { border-color: #facc15; background: rgba(var(--module-accent-yellow-rgb), .04); }
    .score-ring.bad  { border-color: #f87171; background: rgba(var(--module-accent-red-rgb), .04); }
    .score-val { font-size: var(--font-size-6xl); font-weight: 800; color: var(--text-color, #111); line-height: 1; }
    .score-lbl { font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary, var(--text-muted)); text-transform: uppercase; letter-spacing: .5px; }
  `]
})
export class ScoreRingComponent {
  @Input() score: number = 0;
  @Input() label: string = '';
}

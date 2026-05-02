import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Circular SVG progress ring indicator.
 * Renders a background circle and a progress arc with status-based coloring.
 * Used in onboarding step lists and provisioning dashboards.
 */
@Component({
  selector: 'app-progress-ring',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ring-wrap" [style.width.px]="size" [style.height.px]="size">
      <svg [attr.viewBox]="'0 0 ' + size + ' ' + size" class="ring-svg">
        <!-- Background circle -->
        <circle
          [attr.cx]="size / 2"
          [attr.cy]="size / 2"
          [attr.r]="radius"
          fill="none"
          [attr.stroke]="'var(--border-subtle, rgba(var(--color-black-rgb), 0.08))'"
          [attr.stroke-width]="strokeWidth"
        />
        <!-- Progress arc -->
        <circle
          class="ring-progress"
          [class.running]="status === 'running'"
          [class.completed]="status === 'completed'"
          [attr.cx]="size / 2"
          [attr.cy]="size / 2"
          [attr.r]="radius"
          fill="none"
          [attr.stroke]="progressColor"
          [attr.stroke-width]="strokeWidth"
          [attr.stroke-dasharray]="circumference"
          [attr.stroke-dashoffset]="dashOffset"
          stroke-linecap="round"
          [style.transform]="'rotate(-90deg)'"
          [style.transform-origin]="'50% 50%'"
        />
      </svg>
      <!-- Center icon -->
      <div class="ring-icon">
        <i *ngIf="status === 'completed'" class="pi pi-check" style="color:var(--success, #24a148)"></i>
        <i *ngIf="status === 'running'" class="pi pi-spin pi-spinner" style="color:var(--primary, #0f62fe)"></i>
        <i *ngIf="status === 'queued'" class="pi pi-circle" style="color:var(--text-muted, #6f6f6f); font-size:0.5em"></i>
      </div>
    </div>
  `,
  styles: [`
    :host { display: inline-block; }
    .ring-wrap { position: relative; display: inline-flex; align-items: center; justify-content: center; }
    .ring-svg { display: block; }
    .ring-progress { transition: stroke-dashoffset 0.8s ease; }
    .ring-progress.running { animation: ringPulse 2s ease-in-out infinite; }
    .ring-icon {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.7em;
    }
    @keyframes ringPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `],
})
export class ProgressRingComponent {
  /** Completion percentage (0-100). */
  @Input() percent = 0;

  /** Outer dimension of the ring in pixels. */
  @Input() size = 40;

  /** Width of the circle stroke in pixels. */
  @Input() strokeWidth = 3;

  /** Visual status controlling color and center icon. */
  @Input() status: 'completed' | 'running' | 'queued' = 'queued';

  /** Inner radius derived from size and stroke width. */
  get radius(): number {
    return (this.size - this.strokeWidth) / 2;
  }

  /** Full circumference used for dash-array calculation. */
  get circumference(): number {
    return 2 * Math.PI * this.radius;
  }

  /** Dash offset representing the unfilled portion of the ring. */
  get dashOffset(): number {
    return this.circumference * (1 - this.percent / 100);
  }

  /** Stroke color based on current status. */
  get progressColor(): string {
    if (this.status === 'completed') return 'var(--success, #24a148)';
    if (this.status === 'running') return 'var(--primary, #0f62fe)';
    return 'var(--border-subtle, rgba(var(--color-black-rgb), 0.08))';
  }
}

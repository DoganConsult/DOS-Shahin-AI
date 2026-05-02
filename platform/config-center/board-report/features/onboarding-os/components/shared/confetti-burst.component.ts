import { Component, Input, OnChanges, OnDestroy, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * ConfettiBurstComponent - CSS-only confetti burst animation.
 * Triggered by a boolean input. 30 particles with randomized properties.
 * pointer-events: none overlay, prefers-reduced-motion safe.
 */
@Component({
    selector: 'app-confetti-burst',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="confetti-container" *ngIf="active" aria-hidden="true">
      <span *ngFor="let p of particles" class="confetti-particle"
        [class.circle]="p.circle"
        [style.--angle]="p.angle + 'deg'"
        [style.--distance]="p.distance + 'px'"
        [style.--rotation]="p.rotation + 'deg'"
        [style.--scale]="p.scale"
        [style.--color]="p.color"
        [style.--delay]="p.delay + 'ms'"
        [style.--size]="p.size + 'px'">
      </span>
    </div>
  `,
    styles: [`
    .confetti-container {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: var(--z-elevated, 10);
    }

    .confetti-particle {
      position: absolute;
      top: 50%;
      left: 50%;
      width: var(--size, 8px);
      height: var(--size, 8px);
      background: var(--color, var(--primary, #0f62fe));
      border-radius: 2px;
      animation: confetti-burst 2.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) var(--delay, 0ms) forwards;
      opacity: 0;
    }

    .confetti-particle.circle {
      border-radius: 50%;
    }

    @keyframes confetti-burst {
      0%   { opacity: 1; transform: translate(0, 0) rotate(0deg) scale(var(--scale, 1)); }
      15%  { opacity: 1; }
      100% {
        opacity: 0;
        transform:
          translate(
            calc(cos(var(--angle, 0deg)) * var(--distance, 120px)),
            calc(sin(var(--angle, 0deg)) * var(--distance, 120px))
          )
          rotate(var(--rotation, 360deg))
          scale(0.2);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .confetti-particle { animation: none; display: none; }
    }
  `]
})
export class ConfettiBurstComponent implements OnChanges, OnDestroy {
  @Input() trigger = false;

  active = false;
  private burstTimer: ReturnType<typeof setTimeout> | null = null;
  particles: {
    angle: number;
    distance: number;
    rotation: number;
    scale: number;
    color: string;
    delay: number;
    size: number;
    circle: boolean;
  }[] = [];

  private readonly COLORS = [
    'var(--primary, #0f62fe)',
    'var(--success, #24a148)',
    '#f1c21b',
    '#009d9a',
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['trigger']?.currentValue && !changes['trigger']?.previousValue) {
      this.burst();
    }
  }

  private burst(): void {
    this.particles = Array.from({ length: 30 }, () => ({
      angle: Math.random() * 360,
      distance: Math.random() * 140 + 60,
      rotation: Math.random() * 720 - 360,
      scale: Math.random() * 0.6 + 0.7,
      color: this.COLORS[Math.floor(Math.random() * this.COLORS.length)],
      delay: Math.random() * 350,
      size: Math.random() * 6 + 4,
      circle: Math.random() > 0.5,
    }));
    this.active = true;

    this.burstTimer = setTimeout(() => { this.active = false; }, 2500);
  }

  ngOnDestroy(): void {
    if (this.burstTimer) {
      clearTimeout(this.burstTimer);
      this.burstTimer = null;
    }
  }
}

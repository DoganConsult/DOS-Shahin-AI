import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * DosSkeleton — animated bone loader matching DOS surface tokens.
 *
 * Use whenever a section is waiting on data and you want to preserve
 * layout (so cards don't pop in). Renders one or more rows. Automatic
 * shimmer animation; respects `prefers-reduced-motion`.
 *
 * Inputs:
 *   shape   — 'line' (default) | 'circle' | 'square' | 'tile'
 *   rows    — number of lines (line shape only). default 3
 *   width   — CSS length, optional
 *   height  — CSS length, optional
 *   inline  — render inline-block (for inline metric placeholders)
 */
@Component({
  selector: 'dos-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shape === 'line') {
      <div class="dos-sk dos-sk--lines" role="status" [attr.aria-label]="ariaLabel">
        @for (i of rowsArr; track i) {
          <span
            class="dos-sk__line"
            [style.width]="lineWidth(i)"
            [style.height]="height || null"
          ></span>
        }
      </div>
    } @else {
      <span
        class="dos-sk"
        [class.dos-sk--circle]="shape === 'circle'"
        [class.dos-sk--square]="shape === 'square'"
        [class.dos-sk--tile]="shape === 'tile'"
        [class.dos-sk--inline]="inline"
        role="status"
        [attr.aria-label]="ariaLabel"
        [style.width]="width || null"
        [style.height]="height || null"
      ></span>
    }
  `,
  styles: [`
    .dos-sk {
      display: block;
      position: relative;
      overflow: hidden;
      background: var(--dos-color-surface-muted);
      border-radius: var(--dos-radius-md);
    }
    .dos-sk--inline { display: inline-block; vertical-align: middle; }
    .dos-sk--circle { border-radius: 999px; aspect-ratio: 1 / 1; width: 2rem; }
    .dos-sk--square { border-radius: var(--dos-radius-md); aspect-ratio: 1 / 1; width: 3rem; }
    .dos-sk--tile   { border-radius: var(--dos-radius-card); height: 7rem; }

    .dos-sk--lines { display: flex; flex-direction: column; gap: var(--dos-space-2); }
    .dos-sk__line {
      display: block;
      height: 12px;
      border-radius: var(--dos-radius-sm);
      background: var(--dos-color-surface-muted);
      position: relative;
      overflow: hidden;
    }

    .dos-sk::after,
    .dos-sk__line::after {
      content: '';
      position: absolute;
      inset: 0;
      background: var(--dos-gradient-shimmer);
      animation: dos-sk-shimmer 1.6s var(--dos-ease-emphasized) infinite;
    }
    @keyframes dos-sk-shimmer {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    @media (prefers-reduced-motion: reduce) {
      .dos-sk::after, .dos-sk__line::after { animation: none; opacity: .4; }
    }
  `],
})
export class DosSkeletonComponent {
  @Input() shape: 'line' | 'circle' | 'square' | 'tile' = 'line';
  @Input() rows = 3;
  @Input() width?: string;
  @Input() height?: string;
  @Input() inline = false;
  @Input() ariaLabel = 'Loading';

  get rowsArr(): number[] {
    return Array.from({ length: Math.max(1, this.rows) }, (_, i) => i);
  }
  lineWidth(i: number): string {
    const widths = ['72%', '56%', '38%', '64%', '46%'];
    return widths[i % widths.length];
  }
}

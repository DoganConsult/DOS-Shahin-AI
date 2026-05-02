var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
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
let DosSkeletonComponent = class DosSkeletonComponent {
    shape = 'line';
    rows = 3;
    width;
    height;
    inline = false;
    ariaLabel = 'Loading';
    get rowsArr() {
        return Array.from({ length: Math.max(1, this.rows) }, (_, i) => i);
    }
    lineWidth(i) {
        const widths = ['72%', '56%', '38%', '64%', '46%'];
        return widths[i % widths.length];
    }
};
__decorate([
    Input(),
    __metadata("design:type", String)
], DosSkeletonComponent.prototype, "shape", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosSkeletonComponent.prototype, "rows", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosSkeletonComponent.prototype, "width", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosSkeletonComponent.prototype, "height", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosSkeletonComponent.prototype, "inline", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosSkeletonComponent.prototype, "ariaLabel", void 0);
DosSkeletonComponent = __decorate([
    Component({
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
], DosSkeletonComponent);
export { DosSkeletonComponent };
//# sourceMappingURL=skeleton.component.js.map
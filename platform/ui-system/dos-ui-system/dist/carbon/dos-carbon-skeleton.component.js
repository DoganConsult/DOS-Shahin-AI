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
import { SkeletonModule } from 'carbon-components-angular';
/**
 * Carbon-backed skeleton placeholder. Three shapes:
 *   - 'text'      → cds-skeleton-text (one or many lines)
 *   - 'placeholder' → cds-skeleton-placeholder (rectangle)
 *   - 'icon'      → cds-skeleton-placeholder small square
 *
 * For DOS-native skeleton (with shimmer + tone tokens) use
 * `<dos-skeleton>` from `@dos/ui-system`. This component is the
 * Carbon-compliant variant for surfaces inside Carbon contexts.
 */
let DosCarbonSkeletonComponent = class DosCarbonSkeletonComponent {
    shape = 'text';
    paragraph = false;
    lineCount = 3;
    width = '100%';
    heading = false;
};
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonSkeletonComponent.prototype, "shape", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSkeletonComponent.prototype, "paragraph", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSkeletonComponent.prototype, "lineCount", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSkeletonComponent.prototype, "width", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSkeletonComponent.prototype, "heading", void 0);
DosCarbonSkeletonComponent = __decorate([
    Component({
        selector: 'dos-carbon-skeleton',
        standalone: true,
        imports: [CommonModule, SkeletonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    @switch (shape) {
      @case ('text') {
        <cds-skeleton-text
          [paragraph]="paragraph"
          [lineCount]="lineCount"
          [width]="width"
          [heading]="heading"
        ></cds-skeleton-text>
      }
      @default {
        <cds-skeleton-placeholder></cds-skeleton-placeholder>
      }
    }
  `,
    })
], DosCarbonSkeletonComponent);
export { DosCarbonSkeletonComponent };
//# sourceMappingURL=dos-carbon-skeleton.component.js.map
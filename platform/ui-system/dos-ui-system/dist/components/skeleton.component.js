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
import { DosCarbonSkeletonComponent } from '../carbon/dos-carbon-skeleton.component';
/**
 * DosSkeleton — loading placeholder.
 * Refined to use Carbon Skeleton policies.
 */
let DosSkeletonComponent = class DosSkeletonComponent {
    shape = 'line';
    rows = 3;
    width;
    height;
    inline = false;
    ariaLabel = 'Loading';
    mapShape(s) {
        return s === 'line' ? 'text' : 'placeholder';
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
        imports: [CommonModule, DosCarbonSkeletonComponent],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <dos-carbon-skeleton
      [shape]="mapShape(shape)"
      [paragraph]="shape === 'line' && rows > 1"
      [lineCount]="rows"
      [width]="width || '100%'"
    ></dos-carbon-skeleton>
  `,
    })
], DosSkeletonComponent);
export { DosSkeletonComponent };
//# sourceMappingURL=skeleton.component.js.map
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
import { LoadingModule } from 'carbon-components-angular';
/**
 * Carbon-backed full-screen / overlay loading spinner.
 * Use for blocking page-level loads. For inline / button loads use
 * `<dos-carbon-inline-loading>`.
 */
let DosCarbonLoadingComponent = class DosCarbonLoadingComponent {
    isActive = true;
    size = 'normal';
    overlay = false;
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonLoadingComponent.prototype, "isActive", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonLoadingComponent.prototype, "size", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonLoadingComponent.prototype, "overlay", void 0);
DosCarbonLoadingComponent = __decorate([
    Component({
        selector: 'dos-carbon-loading',
        standalone: true,
        imports: [CommonModule, LoadingModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-loading
      [isActive]="isActive"
      [size]="size"
      [overlay]="overlay"
    ></cds-loading>
  `,
    })
], DosCarbonLoadingComponent);
export { DosCarbonLoadingComponent };
//# sourceMappingURL=dos-carbon-loading.component.js.map
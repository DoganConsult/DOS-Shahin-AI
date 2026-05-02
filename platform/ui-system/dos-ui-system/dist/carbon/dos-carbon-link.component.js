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
import { LinkModule } from 'carbon-components-angular';
/**
 * Carbon-backed link wrapper. Visited / inline / disabled / size variants.
 */
let DosCarbonLinkComponent = class DosCarbonLinkComponent {
    href = '#';
    target = '_self';
    rel = '';
    size = 'md';
    inline = false;
    disabled = false;
    visited = false;
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonLinkComponent.prototype, "href", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonLinkComponent.prototype, "target", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonLinkComponent.prototype, "rel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonLinkComponent.prototype, "size", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonLinkComponent.prototype, "inline", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonLinkComponent.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonLinkComponent.prototype, "visited", void 0);
DosCarbonLinkComponent = __decorate([
    Component({
        selector: 'dos-carbon-link',
        standalone: true,
        imports: [CommonModule, LinkModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <a
      cdsLink
      [size]="size"
      [inline]="inline"
      [disabled]="disabled"
      [visited]="visited"
      [href]="href"
      [target]="target"
      [rel]="rel"
    ><ng-content></ng-content></a>
  `,
    })
], DosCarbonLinkComponent);
export { DosCarbonLinkComponent };
//# sourceMappingURL=dos-carbon-link.component.js.map
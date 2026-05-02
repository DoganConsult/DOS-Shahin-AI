var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
let DosStatusBannerComponent = class DosStatusBannerComponent {
    kind = 'info';
    title = '';
};
__decorate([
    Input(),
    __metadata("design:type", String)
], DosStatusBannerComponent.prototype, "kind", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosStatusBannerComponent.prototype, "title", void 0);
DosStatusBannerComponent = __decorate([
    Component({
        selector: 'dos-status-banner',
        standalone: true,
        imports: [CommonModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <div class="dos-status-banner" role="status" [attr.data-kind]="kind">
      @if (title) { <strong>{{ title }}</strong>&nbsp; }
      <span><ng-content></ng-content></span>
    </div>
  `,
    })
], DosStatusBannerComponent);
export { DosStatusBannerComponent };
//# sourceMappingURL=status-banner.component.js.map
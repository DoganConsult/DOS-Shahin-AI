var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginationModule } from 'carbon-components-angular';
/**
 * Carbon-backed pagination control. Use with smart-grid surfaces.
 */
let DosCarbonPaginationComponent = class DosCarbonPaginationComponent {
    currentPage = 1;
    pageLength = 10;
    totalDataLength = 0;
    pageInputDisabled = false;
    pagesUnknown = false;
    skeleton = false;
    size = 'md';
    pageOptions = [10, 20, 30, 50, 100];
    pageChange = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonPaginationComponent.prototype, "currentPage", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonPaginationComponent.prototype, "pageLength", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonPaginationComponent.prototype, "totalDataLength", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonPaginationComponent.prototype, "pageInputDisabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonPaginationComponent.prototype, "pagesUnknown", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonPaginationComponent.prototype, "skeleton", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonPaginationComponent.prototype, "size", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosCarbonPaginationComponent.prototype, "pageOptions", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonPaginationComponent.prototype, "pageChange", void 0);
DosCarbonPaginationComponent = __decorate([
    Component({
        selector: 'dos-carbon-pagination',
        standalone: true,
        imports: [CommonModule, PaginationModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-pagination
      [model]="{
        currentPage: currentPage,
        pageLength: pageLength,
        totalDataLength: totalDataLength
      }"
      [pageInputDisabled]="pageInputDisabled"
      [pagesUnknown]="pagesUnknown"
      [skeleton]="skeleton"
      [itemsPerPageOptions]="pageOptions"
      (selectPage)="pageChange.emit($event)"
    ></cds-pagination>
  `,
    })
], DosCarbonPaginationComponent);
export { DosCarbonPaginationComponent };
//# sourceMappingURL=dos-carbon-pagination.component.js.map
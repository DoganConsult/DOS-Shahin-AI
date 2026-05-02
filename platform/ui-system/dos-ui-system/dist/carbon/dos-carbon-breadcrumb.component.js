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
import { BreadcrumbModule } from 'carbon-components-angular';
/**
 * Carbon-backed breadcrumb trail.
 */
let DosCarbonBreadcrumbComponent = class DosCarbonBreadcrumbComponent {
    items = [];
    noTrailingSlash = false;
    skeleton = false;
    itemClick = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosCarbonBreadcrumbComponent.prototype, "items", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonBreadcrumbComponent.prototype, "noTrailingSlash", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonBreadcrumbComponent.prototype, "skeleton", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonBreadcrumbComponent.prototype, "itemClick", void 0);
DosCarbonBreadcrumbComponent = __decorate([
    Component({
        selector: 'dos-carbon-breadcrumb',
        standalone: true,
        imports: [CommonModule, BreadcrumbModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-breadcrumb [noTrailingSlash]="noTrailingSlash" [skeleton]="skeleton">
      <cds-breadcrumb-item
        *ngFor="let it of items"
        [href]="it.href || '#'"
        [aria-current]="it.current ? 'page' : null"
        (click)="itemClick.emit(it)"
      >{{ it.label }}</cds-breadcrumb-item>
    </cds-breadcrumb>
  `,
    })
], DosCarbonBreadcrumbComponent);
export { DosCarbonBreadcrumbComponent };
//# sourceMappingURL=dos-carbon-breadcrumb.component.js.map
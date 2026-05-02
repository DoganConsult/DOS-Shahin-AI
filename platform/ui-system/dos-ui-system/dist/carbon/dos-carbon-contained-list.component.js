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
import { ContainedListModule } from 'carbon-components-angular';
/**
 * Carbon-backed contained list. Three kinds (on-page / disclosed / pageable).
 */
let DosCarbonContainedListComponent = class DosCarbonContainedListComponent {
    label = '';
    items = [];
    kind = 'on-page';
    size = 'md';
    action = null;
    isInset = false;
    itemClick = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonContainedListComponent.prototype, "label", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosCarbonContainedListComponent.prototype, "items", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonContainedListComponent.prototype, "kind", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonContainedListComponent.prototype, "size", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonContainedListComponent.prototype, "action", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonContainedListComponent.prototype, "isInset", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonContainedListComponent.prototype, "itemClick", void 0);
DosCarbonContainedListComponent = __decorate([
    Component({
        selector: 'dos-carbon-contained-list',
        standalone: true,
        imports: [CommonModule, ContainedListModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-contained-list
      [label]="label"
      [size]="size"
      [kind]="kind"
      [action]="action"
      [isInset]="isInset"
    >
      <cds-contained-list-item
        *ngFor="let item of items"
        [disabled]="item.disabled || false"
        (clicked)="itemClick.emit(item)"
      >{{ item.content }}</cds-contained-list-item>
    </cds-contained-list>
  `,
    })
], DosCarbonContainedListComponent);
export { DosCarbonContainedListComponent };
//# sourceMappingURL=dos-carbon-contained-list.component.js.map
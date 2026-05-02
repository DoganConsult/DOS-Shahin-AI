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
import { TreeviewModule } from 'carbon-components-angular';
/**
 * Carbon-backed tree view. Hierarchical navigation / explorer.
 */
let DosCarbonTreeviewComponent = class DosCarbonTreeviewComponent {
    nodes = [];
    label = '';
    hideLabel = false;
    multiselect = false;
    /** Carbon tree-view supports 'xs' | 'sm' only. */
    size = 'sm';
    select = new EventEmitter();
    toggle = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosCarbonTreeviewComponent.prototype, "nodes", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTreeviewComponent.prototype, "label", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTreeviewComponent.prototype, "hideLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTreeviewComponent.prototype, "multiselect", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonTreeviewComponent.prototype, "size", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonTreeviewComponent.prototype, "select", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonTreeviewComponent.prototype, "toggle", void 0);
DosCarbonTreeviewComponent = __decorate([
    Component({
        selector: 'dos-carbon-treeview',
        standalone: true,
        imports: [CommonModule, TreeviewModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-tree-view
      [tree]="nodes"
      [size]="size"
      [label]="label"
      [hideLabel]="hideLabel"
      [isMultiSelect]="multiselect"
      (select)="select.emit($event)"
      (toggle)="toggle.emit($event)"
    ></cds-tree-view>
  `,
    })
], DosCarbonTreeviewComponent);
export { DosCarbonTreeviewComponent };
//# sourceMappingURL=dos-carbon-treeview.component.js.map
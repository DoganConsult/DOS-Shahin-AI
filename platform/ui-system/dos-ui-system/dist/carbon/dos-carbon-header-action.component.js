var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIShellModule } from 'carbon-components-angular';
/**
 * Carbon UIShell `cds-header-action` wrapper. Renders a single header action
 * slot. Use this inside `<dos-carbon-header-shell>` or directly inside a
 * `cds-header-global` slot via `headerGlobal` projection.
 */
let DosCarbonHeaderActionComponent = class DosCarbonHeaderActionComponent {
    description = '';
    active = false;
    selected = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonHeaderActionComponent.prototype, "description", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonHeaderActionComponent.prototype, "active", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonHeaderActionComponent.prototype, "selected", void 0);
DosCarbonHeaderActionComponent = __decorate([
    Component({
        selector: 'dos-carbon-header-action',
        standalone: true,
        imports: [CommonModule, UIShellModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-header-action
      [description]="description"
      [active]="active"
      (selected)="selected.emit()"
    >
      <ng-content></ng-content>
    </cds-header-action>
  `,
    })
], DosCarbonHeaderActionComponent);
export { DosCarbonHeaderActionComponent };
//# sourceMappingURL=dos-carbon-header-action.component.js.map
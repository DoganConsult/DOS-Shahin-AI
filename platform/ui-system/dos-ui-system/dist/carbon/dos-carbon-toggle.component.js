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
import { FormsModule } from '@angular/forms';
import { ToggleModule } from 'carbon-components-angular';
/**
 * Carbon-backed toggle. Carbon's `cds-toggle` is a ControlValueAccessor —
 * checked state binds via ngModel.
 */
let DosCarbonToggleComponent = class DosCarbonToggleComponent {
    label = '';
    checked = false;
    skeleton = false;
    hideLabel = false;
    onText = 'On';
    offText = 'Off';
    size = 'md';
    checkedChange = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonToggleComponent.prototype, "label", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonToggleComponent.prototype, "checked", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonToggleComponent.prototype, "skeleton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonToggleComponent.prototype, "hideLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonToggleComponent.prototype, "onText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonToggleComponent.prototype, "offText", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonToggleComponent.prototype, "size", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonToggleComponent.prototype, "checkedChange", void 0);
DosCarbonToggleComponent = __decorate([
    Component({
        selector: 'dos-carbon-toggle',
        standalone: true,
        imports: [CommonModule, FormsModule, ToggleModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-toggle
      [size]="size"
      [skeleton]="skeleton"
      [hideLabel]="hideLabel"
      [label]="label"
      [offText]="offText"
      [onText]="onText"
      [(ngModel)]="checked"
      (ngModelChange)="checkedChange.emit($event)"
    ></cds-toggle>
  `,
    })
], DosCarbonToggleComponent);
export { DosCarbonToggleComponent };
//# sourceMappingURL=dos-carbon-toggle.component.js.map
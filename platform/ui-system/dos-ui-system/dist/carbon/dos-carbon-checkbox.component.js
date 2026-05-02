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
import { CheckboxModule } from 'carbon-components-angular';
/**
 * Carbon-backed checkbox wrapper. One-source rule: import this from
 * @dos/ui-system, never `cds-checkbox` directly from products/modules.
 */
let DosCarbonCheckboxComponent = class DosCarbonCheckboxComponent {
    label = '';
    checked = false;
    indeterminate = false;
    disabled = false;
    readOnly = false;
    skeleton = false;
    invalid = false;
    invalidText = '';
    warn = false;
    warnText = '';
    helperText = '';
    hideLabel = false;
    name = '';
    value = '';
    checkedChange = new EventEmitter();
    indeterminateChange = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonCheckboxComponent.prototype, "label", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonCheckboxComponent.prototype, "checked", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonCheckboxComponent.prototype, "indeterminate", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonCheckboxComponent.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonCheckboxComponent.prototype, "readOnly", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonCheckboxComponent.prototype, "skeleton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonCheckboxComponent.prototype, "invalid", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonCheckboxComponent.prototype, "invalidText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonCheckboxComponent.prototype, "warn", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonCheckboxComponent.prototype, "warnText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonCheckboxComponent.prototype, "helperText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonCheckboxComponent.prototype, "hideLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonCheckboxComponent.prototype, "name", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonCheckboxComponent.prototype, "value", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonCheckboxComponent.prototype, "checkedChange", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonCheckboxComponent.prototype, "indeterminateChange", void 0);
DosCarbonCheckboxComponent = __decorate([
    Component({
        selector: 'dos-carbon-checkbox',
        standalone: true,
        imports: [CommonModule, CheckboxModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-checkbox
      [checked]="checked"
      [disabled]="disabled"
      [readOnly]="readOnly"
      [indeterminate]="indeterminate"
      [skeleton]="skeleton"
      [invalid]="invalid"
      [invalidText]="invalidText"
      [warn]="warn"
      [warnText]="warnText"
      [helperText]="helperText"
      [hideLabel]="hideLabel"
      [name]="name"
      [value]="value"
      (checkedChange)="checkedChange.emit($event)"
      (indeterminateChange)="indeterminateChange.emit($event)"
    >{{ label }}</cds-checkbox>
  `,
    })
], DosCarbonCheckboxComponent);
export { DosCarbonCheckboxComponent };
//# sourceMappingURL=dos-carbon-checkbox.component.js.map
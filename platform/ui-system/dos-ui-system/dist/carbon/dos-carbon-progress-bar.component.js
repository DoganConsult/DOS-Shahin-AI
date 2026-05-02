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
import { ProgressBarModule } from 'carbon-components-angular';
/**
 * Carbon-backed determinate / indeterminate progress bar.
 */
let DosCarbonProgressBarComponent = class DosCarbonProgressBarComponent {
    label = '';
    helperText = '';
    value = 0;
    max = 100;
    type = 'default';
    size = 'big';
    status = 'active';
    hideLabel = false;
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonProgressBarComponent.prototype, "label", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonProgressBarComponent.prototype, "helperText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonProgressBarComponent.prototype, "value", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonProgressBarComponent.prototype, "max", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonProgressBarComponent.prototype, "type", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonProgressBarComponent.prototype, "size", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonProgressBarComponent.prototype, "status", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonProgressBarComponent.prototype, "hideLabel", void 0);
DosCarbonProgressBarComponent = __decorate([
    Component({
        selector: 'dos-carbon-progress-bar',
        standalone: true,
        imports: [CommonModule, ProgressBarModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-progress-bar
      [label]="label"
      [helperText]="helperText"
      [type]="type"
      [size]="size"
      [status]="status"
      [hideLabel]="hideLabel"
      [value]="value"
      [max]="max"
    ></cds-progress-bar>
  `,
    })
], DosCarbonProgressBarComponent);
export { DosCarbonProgressBarComponent };
//# sourceMappingURL=dos-carbon-progress-bar.component.js.map
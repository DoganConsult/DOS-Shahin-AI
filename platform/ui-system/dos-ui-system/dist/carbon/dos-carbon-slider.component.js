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
import { SliderModule } from 'carbon-components-angular';
/**
 * Carbon-backed slider wrapper. Carbon's `cds-slider` only exposes:
 *   min/max/step/value/id/shiftMultiplier/skeleton/label/disabled/readonly/disableArrowKeys
 * Helper / warn / invalid states ride on the parent form context.
 */
let DosCarbonSliderComponent = class DosCarbonSliderComponent {
    label = '';
    min = 0;
    max = 100;
    step = 1;
    value = 0;
    shiftMultiplier = 4;
    disabled = false;
    readonly = false;
    skeleton = false;
    disableArrowKeys = false;
    valueChange = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSliderComponent.prototype, "label", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSliderComponent.prototype, "min", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSliderComponent.prototype, "max", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSliderComponent.prototype, "step", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSliderComponent.prototype, "value", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSliderComponent.prototype, "shiftMultiplier", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSliderComponent.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSliderComponent.prototype, "readonly", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSliderComponent.prototype, "skeleton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonSliderComponent.prototype, "disableArrowKeys", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonSliderComponent.prototype, "valueChange", void 0);
DosCarbonSliderComponent = __decorate([
    Component({
        selector: 'dos-carbon-slider',
        standalone: true,
        imports: [CommonModule, SliderModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-slider
      [min]="min"
      [max]="max"
      [step]="step"
      [value]="value"
      [disabled]="disabled"
      [readonly]="readonly"
      [skeleton]="skeleton"
      [shiftMultiplier]="shiftMultiplier"
      [disableArrowKeys]="disableArrowKeys"
      [label]="label"
      (valueChange)="valueChange.emit($event)"
    ></cds-slider>
  `,
    })
], DosCarbonSliderComponent);
export { DosCarbonSliderComponent };
//# sourceMappingURL=dos-carbon-slider.component.js.map
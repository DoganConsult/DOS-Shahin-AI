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
import { InputModule } from 'carbon-components-angular';
/**
 * Carbon-backed numeric input. Carbon ships `cdsNumber` as a directive
 * applied to a native `<input type="number">`. This wrapper composes
 * the directive with `cds-text-label` for label + helper-text rhythm.
 */
let DosCarbonNumberInputComponent = class DosCarbonNumberInputComponent {
    label = '';
    helperText = '';
    value = 0;
    min;
    max;
    step = 1;
    size = 'md';
    theme = 'light';
    disabled = false;
    invalid = false;
    invalidText = '';
    valueChange = new EventEmitter();
    onInput(ev) {
        const raw = ev.target.value;
        const num = Number(raw);
        this.value = Number.isFinite(num) ? num : null;
        this.valueChange.emit(this.value);
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonNumberInputComponent.prototype, "label", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonNumberInputComponent.prototype, "helperText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], DosCarbonNumberInputComponent.prototype, "value", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], DosCarbonNumberInputComponent.prototype, "min", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], DosCarbonNumberInputComponent.prototype, "max", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonNumberInputComponent.prototype, "step", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonNumberInputComponent.prototype, "size", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonNumberInputComponent.prototype, "theme", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonNumberInputComponent.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonNumberInputComponent.prototype, "invalid", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonNumberInputComponent.prototype, "invalidText", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonNumberInputComponent.prototype, "valueChange", void 0);
DosCarbonNumberInputComponent = __decorate([
    Component({
        selector: 'dos-carbon-number-input',
        standalone: true,
        imports: [CommonModule, InputModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-text-label
      [helperText]="helperText"
      [invalid]="invalid"
      [invalidText]="invalidText"
    >
      {{ label }}
      <input
        cdsNumber
        type="number"
        [size]="size"
        [disabled]="disabled"
        [attr.min]="min"
        [attr.max]="max"
        [attr.step]="step"
        [value]="value"
        (input)="onInput($event)"
      />
    </cds-text-label>
  `,
    })
], DosCarbonNumberInputComponent);
export { DosCarbonNumberInputComponent };
//# sourceMappingURL=dos-carbon-number-input.component.js.map
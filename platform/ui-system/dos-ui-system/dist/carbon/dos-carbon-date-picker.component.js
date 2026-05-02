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
import { DatePickerModule } from 'carbon-components-angular';
/**
 * Carbon-backed date picker (single / range / simple). Uses flatpickr
 * under the hood.
 */
let DosCarbonDatePickerComponent = class DosCarbonDatePickerComponent {
    label = '';
    helperText = '';
    placeholder = 'mm/dd/yyyy';
    value = [];
    range = false;
    dateFormat = 'm/d/Y';
    language = 'en';
    size = 'md';
    theme = 'light';
    disabled = false;
    readonly = false;
    skeleton = false;
    invalid = false;
    invalidText = '';
    warn = false;
    warnText = '';
    valueChange = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDatePickerComponent.prototype, "label", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDatePickerComponent.prototype, "helperText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDatePickerComponent.prototype, "placeholder", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosCarbonDatePickerComponent.prototype, "value", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDatePickerComponent.prototype, "range", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDatePickerComponent.prototype, "dateFormat", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDatePickerComponent.prototype, "language", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonDatePickerComponent.prototype, "size", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonDatePickerComponent.prototype, "theme", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDatePickerComponent.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDatePickerComponent.prototype, "readonly", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDatePickerComponent.prototype, "skeleton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDatePickerComponent.prototype, "invalid", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDatePickerComponent.prototype, "invalidText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDatePickerComponent.prototype, "warn", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonDatePickerComponent.prototype, "warnText", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonDatePickerComponent.prototype, "valueChange", void 0);
DosCarbonDatePickerComponent = __decorate([
    Component({
        selector: 'dos-carbon-date-picker',
        standalone: true,
        imports: [CommonModule, DatePickerModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-date-picker
      [label]="label"
      [helperText]="helperText"
      [placeholder]="placeholder"
      [size]="size"
      [theme]="theme"
      [disabled]="disabled"
      [skeleton]="skeleton"
      [readonly]="readonly"
      [invalid]="invalid"
      [invalidText]="invalidText"
      [warn]="warn"
      [warnText]="warnText"
      [range]="range"
      [dateFormat]="dateFormat"
      [language]="language"
      [value]="value"
      (valueChange)="valueChange.emit($event)"
    ></cds-date-picker>
  `,
    })
], DosCarbonDatePickerComponent);
export { DosCarbonDatePickerComponent };
//# sourceMappingURL=dos-carbon-date-picker.component.js.map
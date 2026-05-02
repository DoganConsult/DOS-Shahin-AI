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
import { TimePickerModule, TimePickerSelectModule } from 'carbon-components-angular';
/**
 * Carbon-backed time picker. Optional `am/pm` and `tz` selectors live
 * inside `cds-timepicker-select` slots.
 */
let DosCarbonTimePickerComponent = class DosCarbonTimePickerComponent {
    label = '';
    value = '';
    ampm = 'AM';
    timezone = '';
    timezones = [];
    showAmPm = true;
    pattern = '(1[012]|[1-9]):[0-5][0-9](\\\\s)?';
    maxlength = 5;
    placeholder = 'hh:mm';
    size = 'md';
    theme = 'light';
    disabled = false;
    readonly = false;
    skeleton = false;
    invalid = false;
    invalidText = '';
    valueChange = new EventEmitter();
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTimePickerComponent.prototype, "label", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTimePickerComponent.prototype, "value", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonTimePickerComponent.prototype, "ampm", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTimePickerComponent.prototype, "timezone", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosCarbonTimePickerComponent.prototype, "timezones", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTimePickerComponent.prototype, "showAmPm", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTimePickerComponent.prototype, "pattern", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTimePickerComponent.prototype, "maxlength", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTimePickerComponent.prototype, "placeholder", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonTimePickerComponent.prototype, "size", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonTimePickerComponent.prototype, "theme", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTimePickerComponent.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTimePickerComponent.prototype, "readonly", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTimePickerComponent.prototype, "skeleton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTimePickerComponent.prototype, "invalid", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTimePickerComponent.prototype, "invalidText", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonTimePickerComponent.prototype, "valueChange", void 0);
DosCarbonTimePickerComponent = __decorate([
    Component({
        selector: 'dos-carbon-time-picker',
        standalone: true,
        imports: [CommonModule, TimePickerModule, TimePickerSelectModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-timepicker
      [label]="label"
      [size]="size"
      [theme]="theme"
      [disabled]="disabled"
      [skeleton]="skeleton"
      [invalid]="invalid"
      [invalidText]="invalidText"
      [pattern]="pattern"
      [maxLength]="maxlength"
      [placeholder]="placeholder"
      [value]="value"
      (valueChange)="valueChange.emit($event)"
    >
      @if (showAmPm) {
        <cds-timepicker-select [(ngModel)]="ampm" name="ampm" [disabled]="disabled">
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </cds-timepicker-select>
      }
      @if (timezones.length > 0) {
        <cds-timepicker-select [(ngModel)]="timezone" name="tz" [disabled]="disabled">
          <option *ngFor="let tz of timezones" [value]="tz">{{ tz }}</option>
        </cds-timepicker-select>
      }
    </cds-timepicker>
  `,
    })
], DosCarbonTimePickerComponent);
export { DosCarbonTimePickerComponent };
//# sourceMappingURL=dos-carbon-time-picker.component.js.map
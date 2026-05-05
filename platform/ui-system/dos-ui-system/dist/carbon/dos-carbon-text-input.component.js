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
import { InputModule } from 'carbon-components-angular';
let __dosCarbonTextSeq = 0;
let DosCarbonTextInputComponent = class DosCarbonTextInputComponent {
    label = '';
    value = '';
    placeholder = '';
    helperText = '';
    invalid = false;
    invalidText = '';
    disabled = false;
    readonly = false;
    size = 'md';
    theme = 'light';
    name = '';
    id = '';
    autocomplete = null;
    inputmode = null;
    type = 'text';
    valueChange = new EventEmitter();
    blurred = new EventEmitter();
    _autoId = `dos-carbon-text-${++__dosCarbonTextSeq}`;
    get fieldId() {
        return this.id || this.name || this._autoId;
    }
    onInput(ev) {
        const v = ev.target.value;
        this.value = v;
        this.valueChange.emit(v);
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTextInputComponent.prototype, "label", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTextInputComponent.prototype, "value", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTextInputComponent.prototype, "placeholder", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTextInputComponent.prototype, "helperText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTextInputComponent.prototype, "invalid", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTextInputComponent.prototype, "invalidText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTextInputComponent.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTextInputComponent.prototype, "readonly", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonTextInputComponent.prototype, "size", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonTextInputComponent.prototype, "theme", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTextInputComponent.prototype, "name", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTextInputComponent.prototype, "id", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonTextInputComponent.prototype, "autocomplete", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonTextInputComponent.prototype, "inputmode", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonTextInputComponent.prototype, "type", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonTextInputComponent.prototype, "valueChange", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonTextInputComponent.prototype, "blurred", void 0);
DosCarbonTextInputComponent = __decorate([
    Component({
        selector: 'dos-carbon-text-input',
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
        cdsText
        [theme]="theme"
        [size]="size"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [readonly]="readonly"
        [attr.name]="name || null"
        [attr.id]="fieldId"
        [attr.autocomplete]="autocomplete"
        [attr.inputmode]="inputmode"
        [attr.type]="type"
        [value]="value"
        (input)="onInput($event)"
        (blur)="blurred.emit()"
      />
    </cds-text-label>
  `,
    })
], DosCarbonTextInputComponent);
export { DosCarbonTextInputComponent };
//# sourceMappingURL=dos-carbon-text-input.component.js.map
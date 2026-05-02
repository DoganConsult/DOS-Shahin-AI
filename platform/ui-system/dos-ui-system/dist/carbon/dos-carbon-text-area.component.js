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
 * Carbon-backed text-area wrapper. Multi-line input with Carbon's
 * `cdsTextArea` directive for native styling + a11y.
 */
let DosCarbonTextAreaComponent = class DosCarbonTextAreaComponent {
    label = '';
    value = '';
    placeholder = '';
    helperText = '';
    invalid = false;
    invalidText = '';
    disabled = false;
    readonly = false;
    rows = 4;
    cols;
    maxlength;
    theme = 'light';
    valueChange = new EventEmitter();
    blurred = new EventEmitter();
    onInput(ev) {
        const v = ev.target.value;
        this.value = v;
        this.valueChange.emit(v);
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTextAreaComponent.prototype, "label", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTextAreaComponent.prototype, "value", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTextAreaComponent.prototype, "placeholder", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTextAreaComponent.prototype, "helperText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTextAreaComponent.prototype, "invalid", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTextAreaComponent.prototype, "invalidText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTextAreaComponent.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTextAreaComponent.prototype, "readonly", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonTextAreaComponent.prototype, "rows", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], DosCarbonTextAreaComponent.prototype, "cols", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], DosCarbonTextAreaComponent.prototype, "maxlength", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonTextAreaComponent.prototype, "theme", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonTextAreaComponent.prototype, "valueChange", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonTextAreaComponent.prototype, "blurred", void 0);
DosCarbonTextAreaComponent = __decorate([
    Component({
        selector: 'dos-carbon-text-area',
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
      <textarea
        cdsTextArea
        [theme]="theme"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [readonly]="readonly"
        [rows]="rows"
        [cols]="cols"
        [attr.maxlength]="maxlength"
        [value]="value"
        (input)="onInput($event)"
        (blur)="blurred.emit()"
      ></textarea>
    </cds-text-label>
  `,
    })
], DosCarbonTextAreaComponent);
export { DosCarbonTextAreaComponent };
//# sourceMappingURL=dos-carbon-text-area.component.js.map
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputModule } from 'carbon-components-angular';
/**
 * Carbon-backed password input with show/hide toggle button.
 */
let DosCarbonPasswordInputComponent = class DosCarbonPasswordInputComponent {
    label = '';
    value = '';
    placeholder = '';
    helperText = '';
    invalid = false;
    invalidText = '';
    disabled = false;
    readonly = false;
    autocomplete = 'current-password';
    size = 'md';
    theme = 'light';
    showLabel = 'Show';
    hideLabel = 'Hide';
    valueChange = new EventEmitter();
    blurred = new EventEmitter();
    visible = signal(false);
    onInput(ev) {
        const v = ev.target.value;
        this.value = v;
        this.valueChange.emit(v);
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonPasswordInputComponent.prototype, "label", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonPasswordInputComponent.prototype, "value", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonPasswordInputComponent.prototype, "placeholder", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonPasswordInputComponent.prototype, "helperText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonPasswordInputComponent.prototype, "invalid", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonPasswordInputComponent.prototype, "invalidText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonPasswordInputComponent.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonPasswordInputComponent.prototype, "readonly", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonPasswordInputComponent.prototype, "autocomplete", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonPasswordInputComponent.prototype, "size", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonPasswordInputComponent.prototype, "theme", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonPasswordInputComponent.prototype, "showLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonPasswordInputComponent.prototype, "hideLabel", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonPasswordInputComponent.prototype, "valueChange", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonPasswordInputComponent.prototype, "blurred", void 0);
DosCarbonPasswordInputComponent = __decorate([
    Component({
        selector: 'dos-carbon-password-input',
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
        cdsPassword
        [type]="visible() ? 'text' : 'password'"
        [theme]="theme"
        [size]="size"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [readonly]="readonly"
        [autocomplete]="autocomplete"
        [value]="value"
        (input)="onInput($event)"
        (blur)="blurred.emit()"
      />
      <button
        type="button"
        class="dos-cb-pwd__toggle"
        [attr.aria-label]="visible() ? hideLabel : showLabel"
        (click)="visible.set(!visible())"
      >{{ visible() ? hideLabel : showLabel }}</button>
    </cds-text-label>
  `,
        styles: [`
    .dos-cb-pwd__toggle {
      appearance: none;
      cursor: pointer;
      background: transparent;
      border: 0;
      color: var(--cds-link-primary);
      font: 600 var(--dos-caption-size, .75rem)/1 inherit;
      margin-inline-start: var(--dos-space-2, .5rem);
    }
  `],
    })
], DosCarbonPasswordInputComponent);
export { DosCarbonPasswordInputComponent };
//# sourceMappingURL=dos-carbon-password-input.component.js.map
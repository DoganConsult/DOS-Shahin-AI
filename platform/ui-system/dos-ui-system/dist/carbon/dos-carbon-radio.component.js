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
import { RadioModule } from 'carbon-components-angular';
/**
 * Carbon-backed radio group. Carbon's `cds-radio-group` exposes
 * `value` two-way and emits `change` when the selection changes.
 */
let DosCarbonRadioComponent = class DosCarbonRadioComponent {
    options = [];
    value = null;
    name = '';
    legend = '';
    orientation = 'vertical';
    helperText = '';
    invalid = false;
    invalidText = '';
    warn = false;
    warnText = '';
    skeleton = false;
    disabled = false;
    valueChange = new EventEmitter();
    onChange(ev) {
        const v = ev?.value ?? null;
        this.value = v;
        this.valueChange.emit(v);
    }
};
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosCarbonRadioComponent.prototype, "options", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonRadioComponent.prototype, "value", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonRadioComponent.prototype, "name", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonRadioComponent.prototype, "legend", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonRadioComponent.prototype, "orientation", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonRadioComponent.prototype, "helperText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonRadioComponent.prototype, "invalid", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonRadioComponent.prototype, "invalidText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonRadioComponent.prototype, "warn", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonRadioComponent.prototype, "warnText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonRadioComponent.prototype, "skeleton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonRadioComponent.prototype, "disabled", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonRadioComponent.prototype, "valueChange", void 0);
DosCarbonRadioComponent = __decorate([
    Component({
        selector: 'dos-carbon-radio',
        standalone: true,
        imports: [CommonModule, RadioModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-radio-group
      [orientation]="orientation"
      [legend]="legend"
      [helperText]="helperText"
      [invalid]="invalid"
      [invalidText]="invalidText"
      [warn]="warn"
      [warnText]="warnText"
      [skeleton]="skeleton"
      [name]="name"
      [disabled]="disabled"
      [value]="value"
      (change)="onChange($event)"
    >
      <cds-radio
        *ngFor="let opt of options"
        [value]="opt.value"
        [disabled]="opt.disabled || false"
      >{{ opt.label }}</cds-radio>
    </cds-radio-group>
  `,
    })
], DosCarbonRadioComponent);
export { DosCarbonRadioComponent };
//# sourceMappingURL=dos-carbon-radio.component.js.map
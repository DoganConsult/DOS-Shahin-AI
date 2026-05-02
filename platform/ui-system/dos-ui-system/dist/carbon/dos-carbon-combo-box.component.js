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
import { ComboBoxModule } from 'carbon-components-angular';
/**
 * Carbon-backed combo-box. Single-select dropdown with type-ahead filtering.
 */
let DosCarbonComboBoxComponent = class DosCarbonComboBoxComponent {
    label = '';
    helperText = '';
    placeholder = 'Select or type…';
    items = [];
    size = 'md';
    theme = 'light';
    disabled = false;
    skeleton = false;
    invalid = false;
    invalidText = '';
    warn = false;
    warnText = '';
    type = 'single';
    selected = new EventEmitter();
    searched = new EventEmitter();
    onSelected(ev) {
        this.selected.emit(ev?.item ?? null);
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonComboBoxComponent.prototype, "label", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonComboBoxComponent.prototype, "helperText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonComboBoxComponent.prototype, "placeholder", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], DosCarbonComboBoxComponent.prototype, "items", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonComboBoxComponent.prototype, "size", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonComboBoxComponent.prototype, "theme", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonComboBoxComponent.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonComboBoxComponent.prototype, "skeleton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonComboBoxComponent.prototype, "invalid", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonComboBoxComponent.prototype, "invalidText", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonComboBoxComponent.prototype, "warn", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], DosCarbonComboBoxComponent.prototype, "warnText", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], DosCarbonComboBoxComponent.prototype, "type", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonComboBoxComponent.prototype, "selected", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], DosCarbonComboBoxComponent.prototype, "searched", void 0);
DosCarbonComboBoxComponent = __decorate([
    Component({
        selector: 'dos-carbon-combo-box',
        standalone: true,
        imports: [CommonModule, ComboBoxModule],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `
    <cds-combo-box
      [label]="label"
      [helperText]="helperText"
      [placeholder]="placeholder"
      [size]="size"
      [theme]="theme"
      [disabled]="disabled"
      [invalid]="invalid"
      [invalidText]="invalidText"
      [warn]="warn"
      [warnText]="warnText"
      [items]="items"
      [type]="type"
      (selected)="onSelected($event)"
      (search)="searched.emit($event)"
    ></cds-combo-box>
  `,
    })
], DosCarbonComboBoxComponent);
export { DosCarbonComboBoxComponent };
//# sourceMappingURL=dos-carbon-combo-box.component.js.map